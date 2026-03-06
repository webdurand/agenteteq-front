import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioCtx, ensureAudioResumed, getPlaybackAnalyser, startMicAnalysis, getMicStream } from "../lib/audioCtx";
import { sfx } from "../lib/sounds";

export type LiveChatState = "idle" | "listening" | "thinking" | "speaking";

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
  const [state, setState] = useState<LiveChatState>("idle");
  const [statusText, setStatusText] = useState("Diga 'Teq' ou comece a falar");
  
  const stateRef = useRef<LiveChatState>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<AudioStreamPlayer | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isCapturingRef = useRef(false);
  const orbListeners = useRef<Set<(scale: number) => void>>(new Set());

  const setStateSync = (s: LiveChatState) => {
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
      startMicCapture(); // tenta iniciar captura assim que conecta
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "status":
          setStatusText(msg.text);
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
          sfx.thinking(); // sutil beep de "carregando"
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

  // Usamos ScriptProcessorNode por simplicidade no React (deprecated mas funciona bem)
  // O ideal seria AudioWorklet, mas ScriptProcessor e mto mais facil de integrar inline.
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
      // O modelo espera 16kHz. O ctx pode estar em 44.1 ou 48kHz.
      // Vamos fazer um downsample simples.
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const inputSampleRate = ctx.sampleRate;
        const targetSampleRate = 16000;
        
        // Simples downsample ignorando low-pass filter (aceitavel pra voz falada)
        const ratio = inputSampleRate / targetSampleRate;
        const outLength = Math.floor(inputData.length / ratio);
        const pcmData = new Int16Array(outLength);
        
        for (let i = 0; i < outLength; i++) {
          const s = Math.max(-1, Math.min(1, inputData[Math.floor(i * ratio)]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Se o state for speaking, detectamos se o usuario falou alto pra dar barge-in local
        let isLoud = false;
        if (stateRef.current === "speaking") {
           let sum = 0;
           for(let i=0; i<outLength; i++) sum += pcmData[i]*pcmData[i];
           const rms = Math.sqrt(sum / outLength) / 32768;
           if (rms > 0.05) isLoud = true;
        }

        if (isLoud) {
           // Barge-in (para o player)
           playerRef.current?.stop();
           setStateSync("listening");
           setStatusText("Ouvindo...");
           wsRef.current.send(JSON.stringify({ type: "cancel" }));
        }

        // Converte pra base64
        const buffer = new ArrayBuffer(pcmData.length * 2);
        new DataView(buffer).set(pcmData);
        // Base64 em JS precisa de strings chars
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);

        wsRef.current.send(JSON.stringify({ type: "audio_chunk", data: b64 }));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // necessario no chrome
      
      micProcessorRef.current = processor;
      isCapturingRef.current = true;

    } catch (e) {
      console.error("[VOICE LIVE] Erro ao capturar mic", e);
    }
  };

  const stopMicCapture = () => {
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    isCapturingRef.current = false;
  };

  const toggleListening = useCallback(() => {
    ensureAudioResumed();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
       // O microfone ja estara mandando. Se ele quiser cancelar o speech:
       if (stateRef.current === "speaking" || stateRef.current === "thinking") {
           wsRef.current.send(JSON.stringify({ type: "cancel" }));
           playerRef.current?.stop();
           setStateSync("idle");
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
