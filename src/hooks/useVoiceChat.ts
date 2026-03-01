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
const SEND_SILENCE_MS = 1800; // tempo de silêncio após fala para enviar

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

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

          if (msg.mime_type === "browser" || !msg.audio_b64) {
            setStateSync("speaking");
            setStatusText("Falando...");
            await speakBrowser(msg.text, "pt-BR");
          } else {
            setStateSync("speaking");
            setStatusText("Falando...");
            await playAudio(msg.audio_b64);
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

  // ─── Ação do orb (clique = ativar/cancelar manualmente) ───────────────────

  const toggleListening = useCallback(() => {
    if (stateRef.current === "thinking" || stateRef.current === "speaking") return;

    if (stateRef.current === "listening") {
      // Força envio imediato do que foi capturado até agora
      sendTranscript();
    } else {
      // Ativa captura manual (sem precisar da wake word)
      isCapturingRef.current = true;
      transcriptBufRef.current = "";
      setStateSync("listening");
      setStatusText("Pode falar...");
      setInterimText("");
      // Garante que o recognition está rodando
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

async function playAudio(base64: string) {
  return new Promise<void>((resolve) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const ctx = new AudioContext();
      ctx.decodeAudioData(
        bytes.buffer.slice(0),
        (buffer) => {
          console.log(`[AUDIO] Decodificado | ${buffer.duration.toFixed(1)}s | ${buffer.sampleRate}Hz`);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          src.onended = () => { ctx.close(); resolve(); };
          src.start(0);
          console.log("[AUDIO] Reprodução iniciada");
        },
        (err) => {
          console.error("[AUDIO] decodeAudioData falhou:", err, "— fallback <audio>");
          ctx.close();
          const blob = new Blob([bytes], { type: "audio/wav" });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        }
      );
    } catch (err) {
      console.error("[AUDIO] Erro:", err);
      resolve();
    }
  });
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
