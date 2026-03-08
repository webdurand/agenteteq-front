import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioCtx, ensureAudioResumed, getPlaybackAnalyser, startMicAnalysis, getMicStream, hasUserGestured } from "../lib/audioCtx";

export type LiveChatState = "connecting" | "idle" | "listening" | "speaking" | "processing" | "muted";
const LIVE_IDLE_TIMEOUT_MS = 90_000;
const MIC_ACTIVITY_THRESHOLD = 0.01;

class AudioStreamPlayer {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor() {
    this.ctx = getAudioCtx();
    this.analyser = getPlaybackAnalyser();
  }

  playChunk(pcmData: Uint8Array, sampleRate: number = 24000) {
    if (this.ctx.state === "suspended") this.ctx.resume();

    const numSamples = pcmData.length / 2;
    const float32Data = new Float32Array(numSamples);
    const dataView = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32Data[i] = int16 / 32768.0;
    }

    const audioBuffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.analyser);

    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx >= 0) this.activeSources.splice(idx, 1);
    };

    const currentTime = this.ctx.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  stop() {
    for (const src of this.activeSources) {
      try { src.stop(); src.disconnect(); } catch { /* already stopped */ }
    }
    this.activeSources = [];
    this.nextPlayTime = 0;
  }
}

export function useVoiceLive(token: string | null) {
  const [state, setState] = useState<LiveChatState>("connecting");
  const [statusText, setStatusText] = useState("");
  
  const stateRef = useRef<LiveChatState>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<AudioStreamPlayer | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isCapturingRef = useRef(false);
  const isMutedRef = useRef(false);
  const idleCheckRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef(Date.now());

  const setStateSync = (s: LiveChatState) => {
    stateRef.current = s;
    setState(s);
  };

  const markActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now();
  }, []);

  const connectWs = useCallback(() => {
    if (!token) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Para qualquer áudio residual do player anterior
    playerRef.current?.stop();

    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(`${wsUrl}/ws/voice-live?token=${token}`);
    wsRef.current = ws;
    playerRef.current = new AudioStreamPlayer();
    setStateSync("connecting");
    setStatusText("Conectando ao modelo de voz...");

    ws.onopen = () => {
      console.log("[VOICE LIVE] WebSocket conectado");
      markActivity();
      if (hasUserGestured()) {
        isMutedRef.current = false;
        startMicCapture();
      } else {
        console.log("[VOICE LIVE] Aguardando gesto do usuário para iniciar mic");
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "status":
          markActivity();
          setStatusText(msg.text);
          if (stateRef.current === "connecting") {
            setStateSync(isMutedRef.current ? "muted" : "listening");
          }
          break;
        case "audio":
          markActivity();
          if (msg.audio_b64) {
            if (stateRef.current !== "speaking") {
              setStateSync("speaking");
              setStatusText("Falando...");
            }
            const binary = atob(msg.audio_b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            playerRef.current?.playChunk(bytes, 24000); // Gemini envia 24kHz
          }
          break;
        case "turn_complete":
          markActivity();
          if (isMutedRef.current) {
            setStateSync("muted");
            setStatusText("Microfone pausado");
          } else {
            setStateSync("listening");
            setStatusText("Pode falar...");
          }
          break;
        case "tool_call_start":
          markActivity();
          setStateSync("processing");
          setStatusText(msg.label || `Executando ${msg.name || "acao"}...`);
          break;
        case "tool_call_end":
          markActivity();
          break;
        case "interrupted":
          playerRef.current?.stop();
          break;
        case "feature_blocked":
          console.log("[VOICE LIVE] Feature bloqueada:", msg.feature, msg.message);
          setStatusText(msg.message || "Funcionalidade não disponível no seu plano.");
          setStateSync("idle");
          break;
        case "error":
          console.log("[VOICE LIVE] Erro:", msg.message);
          setStatusText(msg.message || "Erro na conexão.");
          setStateSync("idle");
          break;
      }
    };

    ws.onclose = () => {
      console.log("[VOICE LIVE] WebSocket fechado");
      playerRef.current?.stop();
      stopMicCapture();
      isMutedRef.current = false;
      setStateSync("idle");
      setStatusText("");
    };

  }, [token, markActivity]);

  useEffect(() => {
    if (token) {
      connectWs();
      startMicAnalysis();
      lastActivityAtRef.current = Date.now();
      idleCheckRef.current = window.setInterval(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (Date.now() - lastActivityAtRef.current > LIVE_IDLE_TIMEOUT_MS) {
          setStatusText("Sessão pausada por inatividade.");
          stopMicCapture();
          ws.close(1000, "idle_timeout");
        }
      }, 5000);
    }
    return () => {
      if (idleCheckRef.current !== null) {
        window.clearInterval(idleCheckRef.current);
        idleCheckRef.current = null;
      }
      if (wsRef.current) wsRef.current.close();
      stopMicCapture();
    };
  }, [token, connectWs]);

  const sendPcmChunk = useCallback((pcmBuffer: ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isMutedRef.current) return;
    if (stateRef.current === "processing") return;

    const pcmData = new Int16Array(pcmBuffer);
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) sum += pcmData[i] * pcmData[i];
    const rmsVal = Math.sqrt(sum / pcmData.length) / 32768;
    if (rmsVal > MIC_ACTIVITY_THRESHOLD) {
      markActivity();
      if (stateRef.current !== "speaking" && stateRef.current !== "connecting" && stateRef.current !== "listening") {
        setStateSync("listening");
        setStatusText("Ouvindo...");
      }
      if (stateRef.current === "speaking") {
        playerRef.current?.stop();
        setStateSync("listening");
        setStatusText("Ouvindo...");
      }
    }

    const bytes = new Uint8Array(pcmBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: btoa(binary) }));
  }, [markActivity]);

  const startMicCapture = async () => {
    if (isCapturingRef.current) return;
    try {
      const ctx = getAudioCtx();
      await ensureAudioResumed();
      
      let stream = getMicStream();
      if (!stream) {
        await startMicAnalysis();
        stream = getMicStream();
        if (!stream) throw new Error("Sem microfone");
      }

      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      const useWorklet = typeof ctx.audioWorklet !== "undefined";

      if (useWorklet) {
        try {
          await ctx.audioWorklet.addModule("/mic-processor.js");
          const workletNode = new AudioWorkletNode(ctx, "mic-processor");
          workletNode.port.onmessage = (e) => {
            if (e.data?.pcm) sendPcmChunk(e.data.pcm);
          };
          source.connect(workletNode);
          workletNode.connect(ctx.destination);
          micProcessorRef.current = workletNode;
          console.log("[VOICE LIVE] Mic via AudioWorklet");
        } catch (workletErr) {
          console.warn("[VOICE LIVE] AudioWorklet falhou, usando ScriptProcessor:", workletErr);
          setupScriptProcessor(ctx, source);
        }
      } else {
        setupScriptProcessor(ctx, source);
      }

      isCapturingRef.current = true;
      if (stateRef.current !== "speaking" && !isMutedRef.current) {
        setStateSync("listening");
        setStatusText("Pode falar...");
      }
    } catch (e) {
      console.error("[VOICE LIVE] Erro ao capturar mic", e);
    }
  };

  const setupScriptProcessor = (ctx: AudioContext, source: MediaStreamAudioSourceNode) => {
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const ratio = ctx.sampleRate / 16000;
      const outLength = Math.floor(inputData.length / ratio);
      const pcmData = new Int16Array(outLength);
      for (let i = 0; i < outLength; i++) {
        const s = Math.max(-1, Math.min(1, inputData[Math.floor(i * ratio)]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      sendPcmChunk(pcmData.buffer);
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    micProcessorRef.current = processor;
    console.log("[VOICE LIVE] Mic via ScriptProcessor (fallback)");
  };

  const stopMicCapture = () => {
    if (micSourceRef.current) {
      try { micSourceRef.current.disconnect(); } catch { /* ignore */ }
      micSourceRef.current = null;
    }
    if (micProcessorRef.current) {
      try { micProcessorRef.current.disconnect(); } catch { /* ignore */ }
      micProcessorRef.current = null;
    }
    isCapturingRef.current = false;
  };

  const toggleListening = useCallback(async () => {
    await ensureAudioResumed();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (stateRef.current === "processing") {
        markActivity();
        setStateSync("listening");
        setStatusText("Pode falar...");
        return;
      }
      if (isMutedRef.current) {
        isMutedRef.current = false;
        markActivity();
        if (!isCapturingRef.current) {
          await startMicCapture();
        }
        setStateSync("listening");
        setStatusText("Pode falar...");
      } else {
        isMutedRef.current = true;
        stopMicCapture();
        setStateSync("muted");
        setStatusText("Microfone pausado");
      }
    } else {
      isMutedRef.current = false;
      connectWs();
    }
  }, [connectWs, markActivity]);

  return {
    state,
    statusText,
    toggleListening,
  };
}
