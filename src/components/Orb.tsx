import { useEffect, useRef } from "react";
import type { ChatState } from "../hooks/useVoiceChat";

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
  distortCenter: number | null;
  distortSpan: number;
  baseAlpha: number;
  waveAlpha: number;
  glowBlur: number;
  glowAlpha: number;
}

function getParams(state: ChatState, t: number): WaveParams {
  switch (state) {
    case "listening":
      return {
        amp1: 9, amp2: 5, freq1: 5, freq2: 8,
        speed1: 2.5, speed2: 3.5,
        distortCenter: t * 0.3, distortSpan: Math.PI * 1.2,
        baseAlpha: 0.45, waveAlpha: 0.85,
        glowBlur: 22, glowAlpha: 0.55,
      };
    case "thinking":
      return {
        amp1: 5, amp2: 3, freq1: 4, freq2: 7,
        speed1: 2, speed2: 3,
        distortCenter: t * 1.2, distortSpan: Math.PI * 0.6,
        baseAlpha: 0.35, waveAlpha: 0.75,
        glowBlur: 28, glowAlpha: 0.45,
      };
    case "speaking":
      return {
        amp1: 11, amp2: 7, freq1: 3, freq2: 6,
        speed1: 3, speed2: 4,
        distortCenter: t * 0.5, distortSpan: Math.PI * 1.5,
        baseAlpha: 0.4, waveAlpha: 0.9,
        glowBlur: 32, glowAlpha: 0.6,
      };
    default:
      return {
        amp1: 4, amp2: 2, freq1: 3, freq2: 5,
        speed1: 0.8, speed2: 1.2,
        distortCenter: null, distortSpan: Math.PI * 0.7,
        baseAlpha: 0.3, waveAlpha: 0.55,
        glowBlur: 14, glowAlpha: 0.25,
      };
  }
}

const SIZE = 256;
const RADIUS = 90;
const SEGMENTS = 512;
const IDLE_DISTORT_CENTER = Math.PI * 1.15;

export function Orb({ state, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const isClickable = state === "idle" || state === "listening";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const p = getParams(state, t);
      const center = p.distortCenter ?? IDLE_DISTORT_CENTER;
      const halfSpan = p.distortSpan / 2;

      const envelope = (angle: number): number => {
        const delta =
          ((angle - center) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) -
          Math.PI;
        if (Math.abs(delta) > halfSpan) return 0;
        const x = delta / halfSpan;
        return Math.cos(x * (Math.PI / 2));
      };

      // Wave path
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= SEGMENTS; i++) {
        const angle = (i / SEGMENTS) * Math.PI * 2;
        const env = envelope(angle);
        const wave =
          env *
          (Math.sin(angle * p.freq1 + t * p.speed1) * p.amp1 +
            Math.sin(angle * p.freq2 - t * p.speed2) * p.amp2);
        const r = RADIUS + wave;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(190, 215, 255, ${p.waveAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = `rgba(110, 175, 255, ${p.glowAlpha})`;
      ctx.shadowBlur = p.glowBlur;
      ctx.stroke();
      ctx.restore();

      // Base circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(190, 215, 255, ${p.baseAlpha})`;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = `rgba(110, 175, 255, ${p.glowAlpha * 0.4})`;
      ctx.shadowBlur = p.glowBlur * 0.4;
      ctx.stroke();
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [state]);

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
