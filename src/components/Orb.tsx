import { useEffect, useRef } from "react";
import type { LiveChatState } from "../hooks/useVoiceLive";
import { getMicAmplitude, getPlaybackAmplitude } from "../lib/audioCtx";

interface OrbProps {
  state: LiveChatState;
  onClick: () => void;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface OrbStyle {
  core: RgbColor;
  glow: RgbColor;
  wave: RgbColor;
  pulseSpeed: number;
  waveSpeed: number;
  waveAmp: number;
  baseGlow: number;
  alpha: number;
}

const SIZE = 256;
const CORE_RADIUS = 68;
const WAVE_SEGMENTS = 220;
const SMOOTHING = 0.05;

function rgb(r: number, g: number, b: number): RgbColor {
  return { r, g, b };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

function colorToRgba(color: RgbColor, alpha: number): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

function getStyleByState(state: LiveChatState): OrbStyle {
  switch (state) {
    case "listening":
      return {
        core: rgb(100, 191, 255),
        glow: rgb(37, 130, 255),
        wave: rgb(120, 222, 255),
        pulseSpeed: 1.3,
        waveSpeed: 2.2,
        waveAmp: 7,
        baseGlow: 20,
        alpha: 0.95,
      };
    case "speaking":
      return {
        core: rgb(182, 126, 255),
        glow: rgb(145, 95, 255),
        wave: rgb(220, 156, 255),
        pulseSpeed: 1.8,
        waveSpeed: 2.8,
        waveAmp: 9,
        baseGlow: 24,
        alpha: 0.95,
      };
    case "processing":
      return {
        core: rgb(255, 195, 90),
        glow: rgb(255, 154, 58),
        wave: rgb(255, 223, 130),
        pulseSpeed: 2.2,
        waveSpeed: 3.1,
        waveAmp: 6,
        baseGlow: 26,
        alpha: 0.92,
      };
    case "muted":
      return {
        core: rgb(120, 128, 146),
        glow: rgb(82, 92, 112),
        wave: rgb(148, 156, 176),
        pulseSpeed: 0.55,
        waveSpeed: 1.0,
        waveAmp: 2.5,
        baseGlow: 10,
        alpha: 0.48,
      };
    case "idle":
    case "connecting":
    default:
      return {
        core: rgb(140, 154, 188),
        glow: rgb(112, 126, 164),
        wave: rgb(168, 182, 214),
        pulseSpeed: 0.8,
        waveSpeed: 1.4,
        waveAmp: 3.5,
        baseGlow: 14,
        alpha: 0.72,
      };
  }
}

export function Orb({ state, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const prevTimeRef = useRef(0);
  const stateRef = useRef<LiveChatState>(state);
  const currentStyleRef = useRef<OrbStyle>(getStyleByState(state));
  const reactRef = useRef(0);

  stateRef.current = state;
  const isClickable = state !== "connecting";

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

    const drawWave = (
      phase: number,
      radiusBase: number,
      amp: number,
      speed: number,
      color: RgbColor,
      alpha: number,
      inverse = false,
    ) => {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= WAVE_SEGMENTS; i++) {
        const a = (i / WAVE_SEGMENTS) * Math.PI * 2;
        const direction = inverse ? -1 : 1;
        const deform =
          Math.sin(a * 3 + phase * speed * direction) * amp +
          Math.sin(a * 5 - phase * speed * 0.6 * direction) * amp * 0.35;
        const r = radiusBase + deform;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = colorToRgba(color, alpha);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };

    const draw = (now: number) => {
      const dt = prevTimeRef.current ? (now - prevTimeRef.current) / 1000 : 1 / 60;
      prevTimeRef.current = now;
      const t = now / 1000;

      ctx.clearRect(0, 0, SIZE, SIZE);

      const targetStyle = getStyleByState(stateRef.current);
      const cur = currentStyleRef.current;
      const factor = 1 - Math.pow(SMOOTHING, dt);
      cur.core = lerpColor(cur.core, targetStyle.core, factor);
      cur.glow = lerpColor(cur.glow, targetStyle.glow, factor);
      cur.wave = lerpColor(cur.wave, targetStyle.wave, factor);
      cur.pulseSpeed = lerp(cur.pulseSpeed, targetStyle.pulseSpeed, factor);
      cur.waveSpeed = lerp(cur.waveSpeed, targetStyle.waveSpeed, factor);
      cur.waveAmp = lerp(cur.waveAmp, targetStyle.waveAmp, factor);
      cur.baseGlow = lerp(cur.baseGlow, targetStyle.baseGlow, factor);
      cur.alpha = lerp(cur.alpha, targetStyle.alpha, factor);

      let rawAmp = 0;
      if (stateRef.current === "speaking") {
        rawAmp = getPlaybackAmplitude();
      } else if (stateRef.current === "listening") {
        rawAmp = getMicAmplitude();
      } else if (stateRef.current === "processing") {
        rawAmp = 0.35 + Math.sin(t * 4.2) * 0.15;
      }
      const targetReact = Math.min(Math.max(rawAmp * 3.2, 0), 1);
      const reactSmooth = targetReact > reactRef.current ? 0.18 : 0.06;
      reactRef.current += (targetReact - reactRef.current) * reactSmooth;
      const react = reactRef.current;

      const pulse = 1 + Math.sin(t * cur.pulseSpeed * 2.4) * 0.02 + react * 0.045;
      const radius = CORE_RADIUS * pulse;
      const glowBlur = cur.baseGlow + react * 24;
      const waveAmp = cur.waveAmp * (1 + react * 0.85);

      const coreGradient = ctx.createRadialGradient(
        cx - 8,
        cy - 12,
        radius * 0.08,
        cx,
        cy,
        radius * 1.15,
      );
      coreGradient.addColorStop(0, colorToRgba(cur.core, 0.95 * cur.alpha));
      coreGradient.addColorStop(0.58, colorToRgba(lerpColor(cur.core, cur.glow, 0.35), 0.72 * cur.alpha));
      coreGradient.addColorStop(1, colorToRgba(cur.glow, 0.1 * cur.alpha));

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.shadowColor = colorToRgba(cur.glow, 0.75 * cur.alpha);
      ctx.shadowBlur = glowBlur;
      ctx.fill();
      ctx.restore();

      // Halo externo
      const haloGradient = ctx.createRadialGradient(cx, cy, radius * 1.05, cx, cy, radius * 1.85);
      haloGradient.addColorStop(0, colorToRgba(cur.glow, 0.22 * cur.alpha));
      haloGradient.addColorStop(1, colorToRgba(cur.glow, 0));
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.82, 0, Math.PI * 2);
      ctx.fillStyle = haloGradient;
      ctx.fill();
      ctx.restore();

      const processingInverse = stateRef.current === "speaking";
      drawWave(t, radius + 18, waveAmp, cur.waveSpeed, cur.wave, 0.38 * cur.alpha + react * 0.15, processingInverse);
      drawWave(t + 0.75, radius + 28, waveAmp * 0.72, cur.waveSpeed * 0.88, cur.wave, 0.22 * cur.alpha + react * 0.1, processingInverse);
      drawWave(t + 1.4, radius + 38, waveAmp * 0.5, cur.waveSpeed * 0.74, cur.wave, 0.12 * cur.alpha + react * 0.08, processingInverse);

      if (stateRef.current === "processing") {
        const ringRadius = radius + 13 + Math.sin(t * 7) * 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = colorToRgba(cur.wave, 0.35 + react * 0.25);
        ctx.lineWidth = 1.4;
        ctx.shadowColor = colorToRgba(cur.wave, 0.45);
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full max-w-[256px] aspect-square">
      <button
        onClick={isClickable ? onClick : undefined}
        className={`w-full h-full flex items-center justify-center ${isClickable ? "cursor-pointer active:opacity-80" : "cursor-default"}`}
        aria-label={state === "processing" ? "Interromper processamento" : state === "muted" ? "Ativar microfone" : "Pausar microfone"}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", maxWidth: SIZE, maxHeight: SIZE }} />
      </button>
    </div>
  );
}
