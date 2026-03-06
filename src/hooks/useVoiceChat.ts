import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioCtx, ensureAudioResumed, getPlaybackAnalyser, startMicAnalysis, getMicStream } from "../lib/audioCtx";
import { sfx } from "../lib/sounds";
import { wsClient } from "./useWebSocket";
import { useHistory } from "./useHistory";

export type ChatState = "idle" | "listening" | "thinking" | "speaking";

export interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

const WAKE_WORDS = ["teq", "tec", "tech", "tek"];
const CANCEL_PHRASES = [
  "para", "parar", "para de falar", "parar de falar", "para falar", "parar falar", 
  "cancelar", "cancela", "pode cancelar", "chega", "silencio", "fica quieto", 
  "encerrar", "encerra", "sai", "sair"
];
const SEND_SILENCE_MS = 600;
const IDLE_TIMEOUT_MS = 10000;

function matchesCancelPhrase(norm: string): boolean {
  return CANCEL_PHRASES.some((p) => {
    if (!p.includes(" ")) return norm === p;
    if (norm === p) return true;
    if (norm.startsWith(p + " ")) {
      const extraWords = norm.split(/\s+/).length - p.split(/\s+/).length;
      return extraWords <= 2;
    }
    return false;
  });
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceChat(token: string | null) {
  const [state, setState] = useState<ChatState>("idle");
  const { messages, setMessages, isLoading: historyLoading, isInitialLoading: historyInitialLoading, hasMore: historyHasMore, loadMore: historyLoadMore } = useHistory(token);
  const [statusText, setStatusText] = useState("Diga \"E aí Teq\" ou clique para falar");
  const [interimText, setInterimText] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingPrompt, setOnboardingPrompt] = useState("");
  const [imageEditingPrompt, setImageEditingPrompt] = useState<string | null>(null);
  const [wakeWordActive, setWakeWordActive] = useState(false);

  const stateRef = useRef<ChatState>("idle");
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
  const recognitionPausedRef = useRef(false);
  const lastSpeechActivityRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

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

  // ─── WebSocket Event Handling ──────────────────────────────────────────────

  useEffect(() => {
    if (token) {
      wsClient.setToken(token);
    }
  }, [token]);

  useEffect(() => {
    const handleMessage = async (msg: any) => {
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

          if (msg.mime_type !== "none") {
            sfx.messageReceived();
          }
          addMessage("agent", msg.text);

          setStateSync("speaking");
          setStatusText(msg.mime_type !== "none" ? "Falando..." : "Diga \"E aí Teq\" ou clique para falar");

          recognitionPausedRef.current = true;
          stopRecognition();

          if (msg.mime_type !== "none") {
            if (msg.mime_type === "browser" || !msg.audio_b64) {
              await speakBrowser(msg.text, "pt-BR");
            } else {
              await playAudio(msg.audio_b64, msg.mime_type ?? "audio/wav");
            }
          } else {
            // Em mode="text", resolve imediatamente
            await new Promise(r => setTimeout(r, 100));
          }

          if (requestGenRef.current !== genAtReceive) {
            console.log("[WS] Geração mudou durante playback, ignorando transição");
            break;
          }

          setInterimText("");

          if (msg.needs_follow_up && msg.mime_type !== "none") {
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
          
          recognitionPausedRef.current = false;
          setTimeout(() => startRecognition(), 400);
          
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

        case "carousel_generating": {
          const placeholderId = `carousel_gen_${msg.carousel_id}`;
          const numSlides = msg.num_slides ?? 0;
          const placeholderText = `__CAROUSEL_GENERATING__${JSON.stringify({ carousel_id: msg.carousel_id, num_slides: numSlides })}`;
          setMessages((prev) => [...prev, { id: placeholderId, role: "agent", text: placeholderText, timestamp: new Date() }]);
          break;
        }

        case "carousel_ready": {
          const slides = msg.slides ?? [];
          const lines = slides.map((s: any, i: number) => {
            const num = s.slide_number ?? (i + 1);
            const style = s.style ? ` — ${s.style}` : "";
            return `**Slide ${num}${style}**\n${s.image_url}`;
          });
          const formatted = `🎨 Carrossel pronto! Confira os ${slides.length} slides:\n\n${lines.join("\n\n")}`;
          setMessages((prev) => {
            const genIdx = prev.findIndex((m) => m.id.startsWith("carousel_gen_"));
            if (genIdx >= 0) {
              const updated = [...prev];
              updated[genIdx] = { ...updated[genIdx], text: formatted };
              return updated;
            }
            return [...prev, { id: crypto.randomUUID(), role: "agent", text: formatted, timestamp: new Date() }];
          });
          break;
        }

        case "image_editing": {
          setImageEditingPrompt(msg.prompt ?? "");
          break;
        }

        case "image_edit_ready": {
          setImageEditingPrompt(null);
          const url = msg.image_url;
          const error = msg.error;
          const resultText = url
            ? `Pronto! Aqui está a imagem editada:\n${url}`
            : `Não consegui editar a imagem: ${error || "erro desconhecido"}`;
          addMessage("agent", resultText);
          break;
        }
      }
    };

    const cleanup = wsClient.on("message", handleMessage);
    return cleanup;
  }, []);

  useEffect(() => {
    if (token) {
      startRecognition();
      startMicAnalysis();
    }
    return () => stopRecognition();
  }, [token]);

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
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    
    sfx.micClose();
    setStateSync("idle");
    setStatusText("Diga \"E aí Teq\" ou clique para falar");
  }, []);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(cancelCapture, IDLE_TIMEOUT_MS);
  }, [cancelCapture]);

  const sendTranscript = useCallback((blob?: Blob) => {
    if (blob instanceof Blob) {
      clearSendTimer();
      clearIdleTimer();
      isCapturingRef.current = false;
      transcriptBufRef.current = "";
      setInterimText("");
      sfx.micClose();
      setStateSync("thinking");
      setStatusText("Pensando...");
      wsClient.send(blob);
      return;
    }

    const elapsed = Date.now() - lastSpeechActivityRef.current;
    if (elapsed < SEND_SILENCE_MS) {
      clearSendTimer();
      sendTimerRef.current = setTimeout(() => sendTranscript(), SEND_SILENCE_MS - elapsed);
      return;
    }

    clearSendTimer();
    clearIdleTimer();
    const text = transcriptBufRef.current.trim();
    isCapturingRef.current = false;
    transcriptBufRef.current = "";
    setInterimText("");

    if (!text || stateRef.current !== "listening") {
      if (!text && stateRef.current === "listening") cancelCapture();
      return;
    }

    sfx.micClose();
    addMessage("user", text);
    setStateSync("thinking");
    setStatusText("Pensando...");

    wsClient.send(JSON.stringify({ type: "user_message", text }));
  }, [cancelCapture]);

  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    const r: any = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "pt-BR";
    r.maxAlternatives = 2;
    recognitionRef.current = r;

    r.onresult = (event: any) => {
      if (recognitionPausedRef.current) return;
      lastSpeechActivityRef.current = Date.now();
      const busy = stateRef.current === "thinking" || stateRef.current === "speaking";
      let interimConcat = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const normForPos = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const norm = normForPos.trim();

        if (!isCapturingRef.current) {
          if (busy && result.isFinal && matchesCancelPhrase(norm)) {
            stopPlayback();
            requestGenRef.current++;
            wsClient.send(JSON.stringify({ type: "cancel" }));
            clearSendTimer(); clearIdleTimer();
            isCapturingRef.current = false;
            transcriptBufRef.current = "";
            setInterimText("");
            sfx.micClose();
            setStateSync("idle");
            setStatusText("Diga \"E aí Teq\" ou clique para falar");
            break;
          }

          const withinCooldown = Date.now() - wakeCooldownRef.current < 2500;
          const alreadyProcessed = i <= lastWakeResultIdxRef.current;

          if (!withinCooldown && !alreadyProcessed && WAKE_WORDS.some((w) => norm.includes(w))) {
            if (busy) {
              stopPlayback();
              requestGenRef.current++;
              wsClient.send(JSON.stringify({ type: "cancel" }));
            }
            sfx.micOpen();
            isCapturingRef.current = true;
            transcriptBufRef.current = "";
            setStateSync("listening");
            setStatusText("Pode falar...");
            setWakeWordActive(false);
            startIdleTimer();
            lastWakeResultIdxRef.current = i;
            wakeCooldownRef.current = Date.now();
          }
        }
        
        if (isCapturingRef.current && !busy) {
          let segText = text;
          if (i === lastWakeResultIdxRef.current) {
            const wakeEnd = WAKE_WORDS.reduce((idx, w) => {
              const wIdx = normForPos.indexOf(w);
              return wIdx !== -1 ? Math.max(idx, wIdx + w.length) : idx;
            }, 0);
            segText = text.slice(wakeEnd).trim();
          } else if (i < lastWakeResultIdxRef.current) {
            continue;
          }

          if (!segText && !result.isFinal) continue;

          const segNorm = segText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

          if (result.isFinal) {
            if (segNorm && matchesCancelPhrase(segNorm)) {
              clearSendTimer(); clearIdleTimer();
              isCapturingRef.current = false;
              transcriptBufRef.current = "";
              setInterimText("");
              sfx.micClose();
              setStateSync("idle");
              setStatusText("Diga \"E aí Teq\" ou clique para falar");
              break;
            }

            if (segText) transcriptBufRef.current += (transcriptBufRef.current ? " " : "") + segText.trim();
            clearSendTimer(); clearIdleTimer();
            sendTimerRef.current = setTimeout(sendTranscript, SEND_SILENCE_MS);
          } else {
            startIdleTimer();
            interimConcat += segText;
            if (sendTimerRef.current) {
              clearSendTimer();
              sendTimerRef.current = setTimeout(sendTranscript, SEND_SILENCE_MS);
            }
          }
        }
      }

      if (isCapturingRef.current) {
        setInterimText(transcriptBufRef.current + (interimConcat ? " " + interimConcat : ""));
      }
    };

    r.onstart = () => {
      sttFailCountRef.current = 0;
      sttLastErrorRef.current = null;
      lastWakeResultIdxRef.current = -1;
      setWakeWordActive(true);
    };

    r.onend = () => {
      if (recognitionRef.current !== r) return;
      recognitionRef.current = null;
      setWakeWordActive(false);

      if (recognitionPausedRef.current) return;

      const MAX_RETRIES = 10;
      if (sttLastErrorRef.current === "aborted") sttFailCountRef.current++;

      if (sttFailCountRef.current >= MAX_RETRIES) {
        sttFailCountRef.current = 0;
        return;
      }

      const delay = sttLastErrorRef.current === "aborted"
        ? Math.min(500 * Math.pow(2, sttFailCountRef.current), 30000) : 150;

      setTimeout(() => startRecognition(), delay);
    };

    r.onerror = (e: Event & { error?: string }) => {
      sttLastErrorRef.current = e.error ?? null;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        recognitionRef.current = null;
        return;
      }
    };

    try { r.start(); } catch { /* ignore */ }
  }, [sendTranscript]);

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
      if (document.visibilityState !== "visible" || !token) return;
      wsClient.connect();
      if ((stateRef.current === "idle" || stateRef.current === "listening") && !recognitionRef.current) {
        startRecognition();
      }
      ensureAudioResumed();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [token, startRecognition]);

  // ─── Ação do orb ───────────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    ensureAudioResumed();
    if (stateRef.current === "thinking") return;

    if (stateRef.current === "speaking") {
      stopPlayback();
      requestGenRef.current++;
      wsClient.send(JSON.stringify({ type: "cancel" }));
      recognitionPausedRef.current = false;
      setStateSync("idle");
      setStatusText("Diga \"E aí Teq\" ou clique para falar");
      setTimeout(() => startRecognition(), 500);
      return;
    }

    const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    if (stateRef.current === "listening") {
      if (!hasSpeechRecognition && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else {
        sendTranscript();
      }
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
      
      if (hasSpeechRecognition) {
        if (!recognitionRef.current) startRecognition();
      } else {
        const stream = getMicStream();
        if (stream) {
          try {
            audioChunksRef.current = [];
            const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mr.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mr.onstop = () => {
              if (audioChunksRef.current.length > 0) {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                sendTranscript(blob);
              }
              audioChunksRef.current = [];
            };
            mediaRecorderRef.current = mr;
            mr.start();
          } catch (e) {
            console.error("Erro ao iniciar MediaRecorder", e);
            setStateSync("idle");
            setStatusText("Erro ao acessar microfone.");
            isCapturingRef.current = false;
          }
        } else {
          startMicAnalysis().then(() => {
            const newStream = getMicStream();
            if (newStream) {
              toggleListening();
            } else {
              setStateSync("idle");
              setStatusText("Microfone não disponível.");
              isCapturingRef.current = false;
            }
          });
        }
      }
    }
  }, [sendTranscript, startRecognition, startIdleTimer]);

  const sendName = useCallback((name: string) => {
    wsClient.send(JSON.stringify({ type: "name", value: name }));
  }, []);

  const sendMessageText = useCallback((text: string, images?: string[]) => {
    const messageParts = [text];
    if (images && images.length > 0) {
      images.forEach((img) => messageParts.push(img));
    }
    const displayMessage = messageParts.filter(Boolean).join("\n");
    
    addMessage("user", displayMessage || "[Imagem anexada]");
    setStateSync("thinking");
    setStatusText("Pensando...");
    
    const payload: any = { type: "user_message", text, mode: "text" };
    if (images && images.length > 0) {
      payload.images = images;
    }
    wsClient.send(JSON.stringify(payload));
  }, []);

  return {
    state,
    messages,
    statusText,
    interimText,
    needsOnboarding,
    onboardingPrompt,
    wakeWordActive,
    imageEditingPrompt,
    toggleListening,
    sendName,
    sendMessageText,
    onOrbScale,
    historyLoading,
    historyInitialLoading,
    historyHasMore,
    historyLoadMore,
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
    try { _currentSource.stop(); } catch { /* ignore */ }
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
      if (ctx.state !== "running") return resolve(false);

      const analyser = getPlaybackAnalyser();
      ctx.decodeAudioData(
        bytes.buffer.slice(0) as ArrayBuffer,
        (buffer) => {
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(analyser);
          src.onended = () => { _currentSource = null; resolve(true); };
          _currentSource = src;
          src.start(0);
        },
        () => resolve(false),
      );
    } catch { resolve(false); }
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
    audio.play().catch(() => { _currentElement = null; URL.revokeObjectURL(url); resolve(); });
  });
}

async function playAudio(base64: string, mimeType: string = "audio/wav") {
  const bytes = b64ToBytes(base64);
  const ctx = getAudioCtx();
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});

  const ok = await playWithAnalyser(bytes);
  if (!ok) await playWithElement(bytes, mimeType);
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
