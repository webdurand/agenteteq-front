import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioCtx, ensureAudioResumed, getPlaybackAnalyser, startMicAnalysis } from "../lib/audioCtx";
import { sfx } from "../lib/sounds";

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
  const isCapturingRef = useRef(false);
  const transcriptBufRef = useRef("");
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
          sfx.thinking();
          setStateSync("thinking");
          setStatusText("Pensando...");
          break;

        case "response": {
          sfx.messageReceived();
          addMessage("agent", msg.text);
          console.log(`[AUDIO] mime=${msg.mime_type} | b64 length=${msg.audio_b64?.length ?? 0}`);

          setStateSync("speaking");
          setStatusText("Falando...");

          if (msg.mime_type === "browser" || !msg.audio_b64) {
            await speakBrowser(msg.text, "pt-BR");
          } else {
            await playAudio(msg.audio_b64, msg.mime_type ?? "audio/wav");
          }

          setInterimText("");

          if (looksLikeFollowUp(msg.text)) {
            sfx.micOpen();
            isCapturingRef.current = true;
            transcriptBufRef.current = "";
            setStateSync("listening");
            setStatusText("Pode falar...");
          } else {
            setStateSync("idle");
            setStatusText("Diga \"E aí Teq\" ou clique para falar");
          }
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
      startMicAnalysis();
    }
    return () => {
      wsRef.current?.close();
      stopRecognition();
    };
  }, [phoneNumber, connectWS]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Speech Recognition ────────────────────────────────────────────────────

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

    sfx.micClose();
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
            sfx.micOpen();
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
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setWakeWordActive(false);
  }, []);

  const restartRecognition = useCallback(() => {
    stopRecognition();
    setTimeout(() => startRecognition(), 300);
  }, [startRecognition, stopRecognition]);

  // ─── Visibility change ─────────────────────────────────────────────────────
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

  // ─── Ação do orb ───────────────────────────────────────────────────────────

  const toggleListening = useCallback(() => {
    ensureAudioResumed();

    if (stateRef.current === "thinking" || stateRef.current === "speaking") return;

    if (stateRef.current === "listening") {
      sendTranscript();
    } else {
      sfx.micOpen();
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

// ─── Detecção de follow-up ────────────────────────────────────────────────────

function looksLikeFollowUp(text: string): boolean {
  const cleaned = text.trim().replace(/[\s\u{FE00}-\u{FE0F}\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]+$/u, "");
  return cleaned.endsWith("?");
}

// ─── Helpers de áudio ─────────────────────────────────────────────────────────

function b64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function playWithAnalyser(bytes: Uint8Array): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioCtx();
      if (ctx.state !== "running") {
        resolve(false);
        return;
      }

      const analyser = getPlaybackAnalyser();

      ctx.decodeAudioData(
        bytes.buffer.slice(0),
        (buffer) => {
          console.log(`[AUDIO] Analyser | ${buffer.duration.toFixed(1)}s | ${buffer.sampleRate}Hz`);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(analyser);
          src.onended = () => resolve(true);
          src.start(0);
        },
        () => resolve(false),
      );
    } catch {
      resolve(false);
    }
  });
}

function playWithElement(bytes: Uint8Array, mimeType: string): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play()
      .then(() => console.log("[AUDIO] Reprodução via <audio> (sem analyser)"))
      .catch(() => { URL.revokeObjectURL(url); resolve(); });
  });
}

async function playAudio(base64: string, mimeType: string = "audio/wav") {
  const bytes = b64ToBytes(base64);
  console.log(`[AUDIO] Tentando reproduzir ${bytes.length} bytes (${mimeType})`);

  const ctx = getAudioCtx();
  if (ctx.state === "suspended") {
    await ctx.resume().catch(() => {});
  }

  const ok = await playWithAnalyser(bytes);
  if (!ok) {
    console.warn("[AUDIO] Fallback para <audio> element");
    await playWithElement(bytes, mimeType);
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
