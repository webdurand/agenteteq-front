import { useEffect, useRef } from "react";
import type { ChatState } from "../hooks/useVoiceChat";
import { getPlaybackAmplitude, getMicAmplitude } from "../lib/audioCtx";

interface OrbProps {
  state: ChatState;
  onOrbScale: (cb: (s: number) => void) => () => void;
  onClick: () => void;
}

interface WaveParams {
  amp1: number;
  amp2: number;
  freq1: number;
  freq2: number;
  speed1: number;
  speed2: number;
  rotSpeed: number;
  distortSpan: number;
  baseAlpha: number;
  waveAlpha: number;
  glowBlur: number;
  glowAlpha: number;
}

const PARAM_KEYS: (keyof WaveParams)[] = [
  "amp1", "amp2", "freq1", "freq2", "speed1", "speed2",
  "rotSpeed", "distortSpan", "baseAlpha", "waveAlpha", "glowBlur", "glowAlpha",
];

function getTargetParams(state: ChatState): WaveParams {
  switch (state) {
    case "listening":
      return {
        amp1: 4, amp2: 2.5, freq1: 5, freq2: 8,
        speed1: 1.8, speed2: 2.5,
        rotSpeed: 0.25, distortSpan: Math.PI * 1.2,
        baseAlpha: 0.4, waveAlpha: 0.7,
        glowBlur: 14, glowAlpha: 0.3,
      };
    case "thinking":
      return {
        amp1: 2.5, amp2: 1.5, freq1: 4, freq2: 7,
        speed1: 1.5, speed2: 2,
        rotSpeed: 0.8, distortSpan: Math.PI * 0.6,
        baseAlpha: 0.3, waveAlpha: 0.5,
        glowBlur: 16, glowAlpha: 0.25,
      };
    case "speaking":
      return {
        amp1: 5, amp2: 3, freq1: 3, freq2: 6,
        speed1: 2, speed2: 3,
        rotSpeed: 0.35, distortSpan: Math.PI * 1.5,
        baseAlpha: 0.35, waveAlpha: 0.75,
        glowBlur: 18, glowAlpha: 0.35,
      };
    default:
      return {
        amp1: 2, amp2: 1, freq1: 3, freq2: 5,
        speed1: 0.6, speed2: 0.9,
        rotSpeed: 0.04, distortSpan: Math.PI * 0.7,
        baseAlpha: 0.2, waveAlpha: 0.35,
        glowBlur: 8, glowAlpha: 0.12,
      };
  }
}

const SIZE = 256;
const RADIUS = 90;
const SEGMENTS = 512;
const SMOOTHING = 0.04;

export function Orb({ state, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<ChatState>(state);
  const curRef = useRef<WaveParams | null>(null);
  const angleRef = useRef(Math.PI * 1.15);
  const prevTimeRef = useRef(0);
  const reactRef = useRef(0);

  stateRef.current = state;
  const isClickable = state === "idle" || state === "listening";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drawCtx = canvas.getContext("2d");
    if (!drawCtx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    drawCtx.scale(dpr, dpr);

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    if (!curRef.current) {
      curRef.current = { ...getTargetParams(stateRef.current) };
    }

    const draw = (now: number) => {
      const dt = prevTimeRef.current ? (now - prevTimeRef.current) / 1000 : 1 / 60;
      prevTimeRef.current = now;
      const t = now / 1000;

      drawCtx.clearRect(0, 0, SIZE, SIZE);

      const isDark = document.documentElement.classList.contains("dark");
      const waveRGB = isDark ? "255, 255, 255" : "0, 0, 0";
      const glowRGB = isDark ? "200, 200, 200" : "80, 80, 80";

      const currentState = stateRef.current;
      const target = getTargetParams(currentState);
      const cur = curRef.current!;
      const factor = 1 - Math.pow(SMOOTHING, dt);

      for (const k of PARAM_KEYS) {
        cur[k] += (target[k] - cur[k]) * factor;
      }

      // Audio-reactive amplitude
      let rawAmp = 0;
      if (currentState === "speaking") {
        rawAmp = getPlaybackAmplitude();
      } else if (currentState === "listening") {
        rawAmp = getMicAmplitude();
      }
      const targetReact = Math.min(rawAmp * 3, 1);
      const reactSmooth = targetReact > reactRef.current ? 0.18 : 0.06;
      reactRef.current += (targetReact - reactRef.current) * reactSmooth;
      const react = reactRef.current;

      const ampBoost = 1 + react * 0.8;
      const glowBoost = 1 + react * 0.3;

      angleRef.current = (angleRef.current + cur.rotSpeed * dt) % (Math.PI * 2);
      const center = angleRef.current;
      const halfSpan = cur.distortSpan / 2;

      const envelope = (angle: number): number => {
        const delta =
          ((angle - center) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) -
          Math.PI;
        if (Math.abs(delta) > halfSpan) return 0;
        return Math.cos((delta / halfSpan) * (Math.PI / 2));
      };

      const WAVE_LAYERS = [
        { radiusOff:  0, ampScale: 1.0,  phaseOff: 0,        alpha: 1.0 },
        { radiusOff:  6, ampScale: 0.6,  phaseOff: 0.9,      alpha: 0.45 },
        { radiusOff: -6, ampScale: 0.5,  phaseOff: 1.8,      alpha: 0.35 },
        { radiusOff: 12, ampScale: 0.35, phaseOff: 2.6,      alpha: 0.2 },
      ];

      for (const layer of WAVE_LAYERS) {
        const layerR = RADIUS + layer.radiusOff;
        const lAlpha = cur.waveAlpha * layer.alpha + react * 0.04;
        drawCtx.save();
        drawCtx.beginPath();
        for (let i = 0; i <= SEGMENTS; i++) {
          const angle = (i / SEGMENTS) * Math.PI * 2;
          const env = envelope(angle);
          const wave =
            env *
            layer.ampScale *
            (Math.sin(angle * cur.freq1 + t * cur.speed1 + layer.phaseOff) * cur.amp1 * ampBoost +
              Math.sin(angle * cur.freq2 - t * cur.speed2 + layer.phaseOff) * cur.amp2 * ampBoost);
          const r = layerR + wave;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) drawCtx.moveTo(x, y);
          else drawCtx.lineTo(x, y);
        }
        drawCtx.closePath();
        drawCtx.strokeStyle = `rgba(${waveRGB}, ${Math.min(lAlpha, 1)})`;
        drawCtx.lineWidth = layer.alpha > 0.5 ? 1.0 + react * 0.2 : 0.6;
        drawCtx.shadowColor = `rgba(${glowRGB}, ${cur.glowAlpha * glowBoost * layer.alpha})`;
        drawCtx.shadowBlur = cur.glowBlur * glowBoost * layer.alpha;
        drawCtx.stroke();
        drawCtx.restore();
      }

      // Base circle
      drawCtx.save();
      drawCtx.beginPath();
      drawCtx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
      drawCtx.strokeStyle = `rgba(${waveRGB}, ${cur.baseAlpha})`;
      drawCtx.lineWidth = 0.8;
      drawCtx.shadowColor = `rgba(${glowRGB}, ${cur.glowAlpha * 0.4})`;
      drawCtx.shadowBlur = cur.glowBlur * 0.4;
      drawCtx.stroke();
      drawCtx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <button
        onClick={isClickable ? onClick : undefined}
        className={`flex items-center justify-center ${isClickable ? "cursor-pointer active:opacity-80" : "cursor-default"}`}
        aria-label={state === "listening" ? "Parar de ouvir" : "Falar com Teq"}
      >
        <canvas
          ref={canvasRef}
          style={{ width: SIZE, height: SIZE }}
        />
      </button>
    </div>
  );
}
