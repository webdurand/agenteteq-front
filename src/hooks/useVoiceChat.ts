import { useCallback, useEffect, useRef, useState } from "react";

export type ChatState = "idle" | "listening" | "thinking" | "speaking";

export interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";
const WAKE_WORDS = ["teq", "tec", "tech", "tek"];
const SEND_SILENCE_MS = 1800;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

// ─── AudioContext singleton — resumed on first user gesture ───────────────────
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

export function ensureAudioResumed(): void {
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    ctx.resume().then(() => console.log("[AUDIO] AudioContext resumed"));
  }
}

// Auto-resume on first interaction anywhere on the page
const _resumeOnGesture = () => {
  ensureAudioResumed();
  document.removeEventListener("click", _resumeOnGesture);
  document.removeEventListener("touchstart", _resumeOnGesture);
};
document.addEventListener("click", _resumeOnGesture, { capture: true });
document.addEventListener("touchstart", _resumeOnGesture, { capture: true });

export function useVoiceChat(phoneNumber: string | null) {
  const [state, setState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusText, setStatusText] = useState("Diga \"E aí Teq\" ou clique para falar");
  const [interimText, setInterimText] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingPrompt, setOnboardingPrompt] = useState("");
  const [wakeWordActive, setWakeWordActive] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<ChatState>("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isCapturingRef = useRef(false);   // true = passou a wake word, coletando fala
  const transcriptBufRef = useRef("");    // texto acumulado após wake word
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbListeners = useRef<Set<(scale: number) => void>>(new Set());

  const onOrbScale = useCallback((cb: (scale: number) => void) => {
    orbListeners.current.add(cb);
    return () => orbListeners.current.delete(cb);
  }, []);

  const setStateSync = (s: ChatState) => {
    stateRef.current = s;
    setState(s);
  };

  const addMessage = (role: "user" | "agent", text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text, timestamp: new Date() }]);
  };

  // ─── WebSocket ─────────────────────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (!phoneNumber) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}/ws/voice/${phoneNumber}`);
    wsRef.current = ws;

    ws.onopen = () => console.log("[WS] Conectado");
    ws.onclose = (e) => {
      console.log(`[WS] Fechado | code=${e.code} | reconnecting in 3s`);
      setTimeout(() => connectWS(), 3000);
    };
    ws.onerror = (e) => console.error("[WS] Erro:", e);

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      console.log(`[WS] ${msg.type}`, msg.type === "response" ? msg.text?.slice(0, 60) : "");

      switch (msg.type) {
        case "status":
          setStatusText(msg.text);
          break;

        case "transcript":
          if (msg.text && msg.text !== "...") addMessage("user", msg.text);
          setStateSync("thinking");
          setStatusText("Pensando...");
          break;

        case "response": {
          addMessage("agent", msg.text);
          console.log(`[AUDIO] mime=${msg.mime_type} | b64 length=${msg.audio_b64?.length ?? 0}`);

          setStateSync("speaking");
          setStatusText("Falando...");

          if (msg.mime_type === "browser" || !msg.audio_b64) {
            await speakBrowser(msg.text, "pt-BR");
          } else {
            await playAudio(msg.audio_b64, msg.mime_type ?? "audio/wav");
          }

          setStateSync("idle");
          setStatusText("Diga \"E aí Teq\" ou clique para falar");
          setInterimText("");
          restartRecognition();
          break;
        }

        case "onboarding":
          setNeedsOnboarding(true);
          setOnboardingPrompt(msg.text);
          setStateSync("idle");
          setStatusText(msg.text);
          break;

        case "onboarding_complete":
          setNeedsOnboarding(false);
          addMessage("agent", msg.text);
          setStateSync("idle");
          setStatusText("Diga \"E aí Teq\" ou clique para falar");
          restartRecognition();
          break;

        case "error":
          setStateSync("idle");
          setStatusText(msg.message ?? "Erro interno.");
          setInterimText("");
          restartRecognition();
          break;
      }
    };
  }, [phoneNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phoneNumber) {
      connectWS();
      startRecognition();
    }
    return () => {
      wsRef.current?.close();
      stopRecognition();
    };
  }, [phoneNumber, connectWS]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Speech Recognition (wake word + transcrição unificados) ───────────────

  const clearSendTimer = () => {
    if (sendTimerRef.current) { clearTimeout(sendTimerRef.current); sendTimerRef.current = null; }
  };

  const sendTranscript = useCallback(() => {
    clearSendTimer();
    const text = transcriptBufRef.current.trim();
    isCapturingRef.current = false;
    transcriptBufRef.current = "";
    setInterimText("");

    if (!text || stateRef.current !== "listening") return;

    console.log(`[STT] Enviando: "${text}"`);
    addMessage("user", text);
    setStateSync("thinking");
    setStatusText("Pensando...");

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "user_message", text }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn("[STT] SpeechRecognition não suportado neste browser (use Chrome/Edge)");
      return;
    }

    // Para a instância anterior sem disparar restart
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "pt-BR";
    r.maxAlternatives = 2;

    // Guarda referência ANTES de registrar onend para checar se ainda é a instância ativa
    recognitionRef.current = r;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      if (stateRef.current === "thinking" || stateRef.current === "speaking") return;

      let interimConcat = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (!isCapturingRef.current) {
          if (WAKE_WORDS.some((w) => norm.includes(w))) {
            console.log(`[STT] Wake word detectada: "${text}"`);
            isCapturingRef.current = true;
            setStateSync("listening");
            setStatusText("Pode falar...");
            setWakeWordActive(false);

            const wakeEnd = WAKE_WORDS.reduce((idx, w) => {
              const i = norm.indexOf(w);
              return i !== -1 ? Math.max(idx, i + w.length) : idx;
            }, 0);
            const afterWake = text.slice(wakeEnd).trim();
            if (afterWake) transcriptBufRef.current = afterWake;
          }
        } else {
          if (result.isFinal) {
            transcriptBufRef.current += (transcriptBufRef.current ? " " : "") + text;
            clearSendTimer();
            sendTimerRef.current = setTimeout(sendTranscript, SEND_SILENCE_MS);
          } else {
            interimConcat += text;
          }
        }
      }

      if (isCapturingRef.current) {
        setInterimText(transcriptBufRef.current + (interimConcat ? " " + interimConcat : ""));
      }
    };

    r.onstart = () => {
      console.log("[STT] Reconhecimento ativo");
      setWakeWordActive(true);
    };

    r.onend = () => {
      // Só reinicia se esta instância ainda é a ativa — evita loop do StrictMode
      if (recognitionRef.current !== r) return;
      recognitionRef.current = null;
      setWakeWordActive(false);

      if (stateRef.current === "idle" || stateRef.current === "listening") {
        console.log("[STT] Reiniciando reconhecimento...");
        setTimeout(() => startRecognition(), 500);
      }
    };

    r.onerror = (e: Event & { error?: string }) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.error("[STT] Permissão de microfone negada");
        recognitionRef.current = null;
        return;
      }
      if (e.error !== "no-speech") console.error("[STT] Erro:", e.error);
    };

    try {
      r.start();
    } catch {
      /* já rodando */
    }
  }, [sendTranscript]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      // Nulifica onend ANTES de parar para não disparar restart
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setWakeWordActive(false);
  }, []);

  const restartRecognition = useCallback(() => {
    stopRecognition();
    setTimeout(() => startRecognition(), 300);
  }, [startRecognition, stopRecognition]);

  // ─── Visibility change — retoma WS e recognition ao voltar à aba ───────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible" || !phoneNumber) return;

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWS();
      }
      if (
        (stateRef.current === "idle" || stateRef.current === "listening") &&
        !recognitionRef.current
      ) {
        startRecognition();
      }
      ensureAudioResumed();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phoneNumber, connectWS, startRecognition]);

  // ─── Ação do orb (clique = ativar/cancelar manualmente) ───────────────────

  const toggleListening = useCallback(() => {
    ensureAudioResumed();

    if (stateRef.current === "thinking" || stateRef.current === "speaking") return;

    if (stateRef.current === "listening") {
      sendTranscript();
    } else {
      isCapturingRef.current = true;
      transcriptBufRef.current = "";
      setStateSync("listening");
      setStatusText("Pode falar...");
      setInterimText("");
      if (!recognitionRef.current) startRecognition();
    }
  }, [sendTranscript, startRecognition]);

  const sendName = useCallback((name: string) => {
    wsRef.current?.send(JSON.stringify({ type: "name", value: name }));
  }, []);

  return {
    state,
    messages,
    statusText,
    interimText,
    needsOnboarding,
    onboardingPrompt,
    wakeWordActive,
    toggleListening,
    sendName,
    onOrbScale,
  };
}

// ─── Helpers de áudio ─────────────────────────────────────────────────────────

function b64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function playWithElement(bytes: Uint8Array, mimeType: string): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = (e) => {
      console.error("[AUDIO] <audio> element error:", e);
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.play()
      .then(() => console.log("[AUDIO] Reprodução iniciada via <audio>"))
      .catch((err) => {
        console.warn("[AUDIO] <audio>.play() bloqueado:", err.message);
        URL.revokeObjectURL(url);
        resolve();
      });
  });
}

function playWithAudioContext(bytes: Uint8Array): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      ctx.decodeAudioData(
        bytes.buffer.slice(0),
        (buffer) => {
          console.log(`[AUDIO] AudioContext | ${buffer.duration.toFixed(1)}s | ${buffer.sampleRate}Hz`);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          src.onended = () => resolve();
          src.start(0);
        },
        (err) => {
          console.error("[AUDIO] decodeAudioData falhou:", err);
          resolve();
        },
      );
    } catch (err) {
      console.error("[AUDIO] AudioContext erro:", err);
      resolve();
    }
  });
}

async function playAudio(base64: string, mimeType: string = "audio/wav") {
  const bytes = b64ToBytes(base64);
  console.log(`[AUDIO] Tentando reproduzir ${bytes.length} bytes (${mimeType})`);

  try {
    await playWithElement(bytes, mimeType);
  } catch {
    console.warn("[AUDIO] Fallback para AudioContext");
    await playWithAudioContext(bytes);
  }
}

function speakBrowser(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
