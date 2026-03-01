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
const CANCEL_PHRASES = [
  "para",
  "parar",
  "para de falar",
  "parar de falar",
  "para falar",
  "parar falar",
  "cancelar",
  "cancela",
  "pode cancelar",
  "chega",
  "silencio",
  "fica quieto",
  "encerrar",
  "encerra",
  "sai",
  "sair",
];
const SEND_SILENCE_MS = 1800;
const IDLE_TIMEOUT_MS = 8000;

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
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGenRef = useRef(0);
  const orbListeners = useRef<Set<(scale: number) => void>>(new Set());
  const sttFailCountRef = useRef(0);
  const sttLastErrorRef = useRef<string | null>(null);
  const lastWakeResultIdxRef = useRef(-1);
  const wakeCooldownRef = useRef(0);

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

      const genAtReceive = requestGenRef.current;

      switch (msg.type) {
        case "status":
          setStatusText(msg.text);
          break;

        case "transcript":
          if (requestGenRef.current !== genAtReceive) break;
          if (msg.text && msg.text !== "...") addMessage("user", msg.text);
          sfx.thinking();
          setStateSync("thinking");
          setStatusText("Pensando...");
          break;

        case "response": {
          if (requestGenRef.current !== genAtReceive) {
            console.log("[WS] Resposta descartada (geração antiga)");
            addMessage("agent", msg.text);
            break;
          }

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

          if (requestGenRef.current !== genAtReceive) {
            console.log("[WS] Geração mudou durante playback, ignorando transição");
            break;
          }

          setInterimText("");

          if (msg.needs_follow_up) {
            sfx.micOpen();
            isCapturingRef.current = true;
            transcriptBufRef.current = "";
            setStateSync("listening");
            setStatusText("Pode falar...");
            startIdleTimer();
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

  const clearIdleTimer = () => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
  };

  const cancelCapture = useCallback(() => {
    clearSendTimer();
    clearIdleTimer();
    isCapturingRef.current = false;
    transcriptBufRef.current = "";
    setInterimText("");
    sfx.micClose();
    setStateSync("idle");
    setStatusText("Diga \"E aí Teq\" ou clique para falar");
    console.log("[STT] Captura cancelada (inatividade ou vazio)");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(cancelCapture, IDLE_TIMEOUT_MS);
  }, [cancelCapture]);

  const sendTranscript = useCallback(() => {
    clearSendTimer();
    clearIdleTimer();
    const text = transcriptBufRef.current.trim();
    isCapturingRef.current = false;
    transcriptBufRef.current = "";
    setInterimText("");

    if (!text || stateRef.current !== "listening") {
      if (!text && stateRef.current === "listening") {
        cancelCapture();
      }
      return;
    }

    sfx.micClose();
    console.log(`[STT] Enviando: "${text}"`);
    addMessage("user", text);
    setStateSync("thinking");
    setStatusText("Pensando...");

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "user_message", text }));
    }
  }, [cancelCapture]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const busy = stateRef.current === "thinking" || stateRef.current === "speaking";

      let interimConcat = "";
      let wakeWordFound = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (wakeWordFound) break;

        const result = event.results[i];
        const text = result[0].transcript;
        // normForPos preserva espacos para calcular offset corretamente em text.slice()
        const normForPos = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const norm = normForPos.trim();

        if (!isCapturingRef.current) {
          // Detectar cancel phrase quando Teq está falando/pensando
          if (busy && result.isFinal && CANCEL_PHRASES.some((p) => norm === p || norm.startsWith(p + " "))) {
            console.log(`[STT] Cancel phrase detectada durante ${stateRef.current}: "${text}"`);
            stopPlayback();
            requestGenRef.current++;
            console.log(`[STT] Geração incrementada para ${requestGenRef.current}`);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: "cancel" }));
              console.log("[WS] Cancelamento enviado ao backend");
            }
            clearSendTimer();
            clearIdleTimer();
            isCapturingRef.current = false;
            transcriptBufRef.current = "";
            setInterimText("");
            sfx.micClose();
            setStateSync("idle");
            setStatusText("Diga \"E aí Teq\" ou clique para falar");
            wakeWordFound = true;
            break;
          }

          // Guard: cooldown de 2.5s e indice para evitar re-deteccao do mesmo segmento
          const withinCooldown = Date.now() - wakeCooldownRef.current < 2500;
          const alreadyProcessed = i <= lastWakeResultIdxRef.current;

          if (!withinCooldown && !alreadyProcessed && WAKE_WORDS.some((w) => norm.includes(w))) {
            console.log(`[STT] Wake word detectada (interrompendo ${stateRef.current}): "${text}"`);
            if (busy) {
              stopPlayback();
              requestGenRef.current++;
              console.log(`[STT] Geração incrementada para ${requestGenRef.current}`);
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "cancel" }));
                console.log("[WS] Cancelamento enviado ao backend");
              }
            }
            sfx.micOpen();
            isCapturingRef.current = true;
            transcriptBufRef.current = "";
            setStateSync("listening");
            setStatusText("Pode falar...");
            setWakeWordActive(false);
            startIdleTimer();

            // Usar normForPos (sem trim) para alinhar offset com text original
            const wakeEnd = WAKE_WORDS.reduce((idx, w) => {
              const wIdx = normForPos.indexOf(w);
              return wIdx !== -1 ? Math.max(idx, wIdx + w.length) : idx;
            }, 0);
            const afterWake = text.slice(wakeEnd).trim();
            if (afterWake) transcriptBufRef.current = afterWake;

            lastWakeResultIdxRef.current = i;
            wakeCooldownRef.current = Date.now();

            wakeWordFound = true;
            break;
          }
        } else if (!busy) {
          // Pular resultados do mesmo segmento onde a wake word foi detectada
          if (i <= lastWakeResultIdxRef.current) continue;
          if (result.isFinal) {
            // Detectar cancel phrase durante captura ativa
            if (CANCEL_PHRASES.some((p) => norm === p || norm.startsWith(p + " "))) {
              console.log(`[STT] Cancel phrase detectada durante escuta: "${text}"`);
              clearSendTimer();
              clearIdleTimer();
              isCapturingRef.current = false;
              transcriptBufRef.current = "";
              setInterimText("");
              sfx.micClose();
              setStateSync("idle");
              setStatusText("Diga \"E aí Teq\" ou clique para falar");
              wakeWordFound = true;
              break;
            }

            transcriptBufRef.current += (transcriptBufRef.current ? " " : "") + text;
            clearSendTimer();
            clearIdleTimer();
            sendTimerRef.current = setTimeout(sendTranscript, SEND_SILENCE_MS);
          } else {
            startIdleTimer();
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
      sttFailCountRef.current = 0;
      sttLastErrorRef.current = null;
      lastWakeResultIdxRef.current = -1;
      setWakeWordActive(true);
    };

    r.onend = () => {
      if (recognitionRef.current !== r) return;
      recognitionRef.current = null;
      setWakeWordActive(false);

      const MAX_RETRIES = 10;
      if (sttLastErrorRef.current === "aborted") {
        sttFailCountRef.current++;
      }

      if (sttFailCountRef.current >= MAX_RETRIES) {
        console.warn(`[STT] ${MAX_RETRIES} falhas consecutivas, parando auto-restart. Clique no orb para reativar.`);
        sttFailCountRef.current = 0;
        return;
      }

      const delay = sttLastErrorRef.current === "aborted"
        ? Math.min(500 * Math.pow(2, sttFailCountRef.current), 30000)
        : 500;

      console.log(`[STT] Reconhecimento encerrou (state=${stateRef.current}), reiniciando em ${delay}ms...`);
      setTimeout(() => startRecognition(), delay);
    };

    r.onerror = (e: Event & { error?: string }) => {
      sttLastErrorRef.current = e.error ?? null;

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.error("[STT] Permissão de microfone negada");
        recognitionRef.current = null;
        return;
      }
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("[STT] Erro:", e.error);
      }
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
      sttFailCountRef.current = 0;
      sttLastErrorRef.current = null;
      sfx.micOpen();
      isCapturingRef.current = true;
      transcriptBufRef.current = "";
      setStateSync("listening");
      setStatusText("Pode falar...");
      setInterimText("");
      startIdleTimer();
      if (!recognitionRef.current) startRecognition();
    }
  }, [sendTranscript, startRecognition, startIdleTimer]);

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

let _currentSource: AudioBufferSourceNode | null = null;
let _currentElement: HTMLAudioElement | null = null;

export function stopPlayback() {
  if (_currentSource) {
    try { _currentSource.stop(); } catch { /* already stopped */ }
    _currentSource = null;
  }
  if (_currentElement) {
    _currentElement.pause();
    _currentElement.src = "";
    _currentElement = null;
  }
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
        bytes.buffer.slice(0) as ArrayBuffer,
        (buffer) => {
          console.log(`[AUDIO] Analyser | ${buffer.duration.toFixed(1)}s | ${buffer.sampleRate}Hz`);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(analyser);
          src.onended = () => { _currentSource = null; resolve(true); };
          _currentSource = src;
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
    const blob = new Blob([bytes as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    _currentElement = audio;
    audio.onended = () => { _currentElement = null; URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { _currentElement = null; URL.revokeObjectURL(url); resolve(); };
    audio.play()
      .then(() => console.log("[AUDIO] Reprodução via <audio> (sem analyser)"))
      .catch(() => { _currentElement = null; URL.revokeObjectURL(url); resolve(); });
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
