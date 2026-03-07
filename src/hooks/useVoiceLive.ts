import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioCtx, ensureAudioResumed, getPlaybackAnalyser, startMicAnalysis, getMicStream, hasUserGestured } from "../lib/audioCtx";
import { sfx } from "../lib/sounds";

export type LiveChatState = "connecting" | "idle" | "listening" | "thinking" | "speaking";
const VAD_RMS_THRESHOLD = 0.015;
const VAD_START_MS = 100;
const VAD_END_MS = 800;

// Simples buffer circular para tocar audio em stream continuo
class AudioStreamPlayer {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private nextPlayTime: number = 0;

  constructor() {
    this.ctx = getAudioCtx();
    this.analyser = getPlaybackAnalyser();
  }

  playChunk(pcmData: Uint8Array, sampleRate: number = 24000) {
    if (this.ctx.state === "suspended") this.ctx.resume();

    // pcmData is 16-bit PCM little endian
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

    const currentTime = this.ctx.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  stop() {
    // Para parar um stream, podemos simplismente resetar o nextPlayTime e suspender/retomar (ou recriar o player na pratica)
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
  const speechSinceRef = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const orbListeners = useRef<Set<(scale: number) => void>>(new Set());

  const setStateSync = (s: LiveChatState) => {
    const prev = stateRef.current;
    if (prev === "thinking" && s !== "thinking") {
      sfx.stopThinking();
    }
    if (s === "thinking" && prev !== "thinking") {
      sfx.thinking();
    }
    stateRef.current = s;
    setState(s);
  };

  const onOrbScale = useCallback((cb: (scale: number) => void) => {
    orbListeners.current.add(cb);
    return () => orbListeners.current.delete(cb);
  }, []);

  const connectWs = useCallback(() => {
    if (!token) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(`${wsUrl}/ws/voice-live?token=${token}`);
    wsRef.current = ws;
    playerRef.current = new AudioStreamPlayer();

    ws.onopen = () => {
      console.log("[VOICE LIVE] WebSocket conectado");
      if (hasUserGestured()) {
        startMicCapture();
      } else {
        console.log("[VOICE LIVE] Aguardando gesto do usuário para iniciar mic");
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "status":
          setStatusText(msg.text);
          if (stateRef.current === "connecting") {
            setStateSync("idle");
          }
          break;
        case "audio":
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
        case "tool_call_start":
          setStateSync("thinking");
          break;
        case "turn_complete":
          setStateSync("idle");
          setStatusText("Pode falar...");
          break;
        case "task_updated":
        case "reminder_updated":
          // Emite um evento custom local para o Dashboard reagir
          window.dispatchEvent(new CustomEvent("ws_event", { detail: { type: msg.type } }));
          break;
      }
    };

    ws.onclose = () => {
      console.log("[VOICE LIVE] WebSocket fechado");
      stopMicCapture();
      setStateSync("idle");
    };

  }, [token]);

  useEffect(() => {
    if (token) {
      connectWs();
      startMicAnalysis();
    }
    return () => {
      if (wsRef.current) wsRef.current.close();
      stopMicCapture();
    };
  }, [token, connectWs]);

  const sendPcmChunk = useCallback((pcmBuffer: ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const pcmData = new Int16Array(pcmBuffer);
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) sum += pcmData[i] * pcmData[i];
    const rmsVal = Math.sqrt(sum / pcmData.length) / 32768;

    if (stateRef.current !== "speaking" && stateRef.current !== "thinking") {
      const now = performance.now();
      if (rmsVal >= VAD_RMS_THRESHOLD) {
        silenceSinceRef.current = null;
        if (speechSinceRef.current === null) speechSinceRef.current = now;
        if (now - speechSinceRef.current >= VAD_START_MS && stateRef.current !== "listening") {
          setStateSync("listening");
          setStatusText("Ouvindo...");
        }
      } else {
        speechSinceRef.current = null;
        if (silenceSinceRef.current === null) silenceSinceRef.current = now;
        if (now - silenceSinceRef.current >= VAD_END_MS && stateRef.current === "listening") {
          setStateSync("idle");
          setStatusText("Pode falar...");
        }
      }
    } else {
      speechSinceRef.current = null;
      silenceSinceRef.current = null;
    }

    if (stateRef.current === "speaking") {
      if (rmsVal > 0.05) {
        playerRef.current?.stop();
        setStateSync("listening");
        setStatusText("Ouvindo...");
        wsRef.current.send(JSON.stringify({ type: "cancel" }));
      }
    }

    const bytes = new Uint8Array(pcmBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: btoa(binary) }));
  }, []);

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
       if (stateRef.current === "speaking" || stateRef.current === "thinking") {
           wsRef.current.send(JSON.stringify({ type: "cancel" }));
           playerRef.current?.stop();
           setStateSync("idle");
       } else if (!isCapturingRef.current) {
           await startMicCapture();
       }
    } else {
       connectWs();
    }
  }, [connectWs]);

  return {
    state,
    statusText,
    toggleListening,
    onOrbScale,
  };
}
