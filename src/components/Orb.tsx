import { useEffect, useRef, useState } from "react";
import type { ChatState } from "../hooks/useVoiceChat";

interface OrbProps {
  state: ChatState;
  onOrbScale: (cb: (s: number) => void) => () => void;
  onClick: () => void;
}

export function Orb({ state, onOrbScale, onClick }: OrbProps) {
  const [dynamicScale, setDynamicScale] = useState(1);
  const orbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state !== "listening") {
      setDynamicScale(1);
      return;
    }
    return onOrbScale((scale) => setDynamicScale(scale));
  }, [state, onOrbScale]);

  const glowClass = {
    idle: "orb-glow-idle",
    listening: "orb-glow-listen",
    thinking: "orb-glow-think",
    speaking: "orb-glow-speak",
  }[state];

  const animClass = {
    idle: "animate-orb-idle",
    listening: "",
    thinking: "animate-orb-think",
    speaking: "animate-orb-idle",
  }[state];

  const isClickable = state === "idle" || state === "listening";

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Ondas de fundo — visíveis só no estado listening */}
      {state === "listening" && (
        <>
          <span className="absolute inset-0 rounded-full bg-navy-400 opacity-20 animate-wave-out" />
          <span
            className="absolute inset-0 rounded-full bg-navy-400 opacity-15 animate-wave-out"
            style={{ animationDelay: "0.5s" }}
          />
          <span
            className="absolute inset-0 rounded-full bg-navy-400 opacity-10 animate-wave-out"
            style={{ animationDelay: "1s" }}
          />
        </>
      )}

      {/* Orb principal */}
      <button
        ref={orbRef}
        onClick={isClickable ? onClick : undefined}
        className={[
          "relative w-48 h-48 rounded-full transition-all duration-300",
          glowClass,
          animClass,
          isClickable ? "cursor-pointer active:scale-95" : "cursor-default",
        ].join(" ")}
        style={{
          background:
            "radial-gradient(circle at 38% 35%, #1e40af 0%, #1e3a8a 40%, #0a1628 75%, #030712 100%)",
          transform:
            state === "listening"
              ? `scale(${dynamicScale})`
              : undefined,
        }}
        aria-label={state === "listening" ? "Parar de ouvir" : "Falar com Teq"}
      >
        {/* Reflexo interno */}
        <span
          className="absolute top-6 left-8 w-16 h-10 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse, rgba(147,197,253,0.6) 0%, transparent 70%)",
          }}
        />

        {/* Ícone central contextual */}
        <span className="absolute inset-0 flex items-center justify-center">
          {state === "thinking" ? (
            <ThinkingDots />
          ) : state === "speaking" ? (
            <SpeakingBars />
          ) : state === "listening" ? (
            <MicIcon active />
          ) : (
            <MicIcon active={false} />
          )}
        </span>
      </button>
    </div>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-opacity duration-300 ${active ? "opacity-90" : "opacity-40"}`}
    >
      <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" className="text-navy-200" />
      <path
        d="M5 10a7 7 0 0 0 14 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-navy-200"
      />
      <line
        x1="12"
        y1="19"
        x2="12"
        y2="22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-navy-200"
      />
      <line
        x1="9"
        y1="22"
        x2="15"
        y2="22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-navy-200"
      />
    </svg>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1.5 items-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-navy-300 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function SpeakingBars() {
  return (
    <div className="flex gap-1 items-end h-8">
      {[0.6, 1, 0.7, 0.9, 0.5].map((h, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm bg-navy-300 animate-bounce"
          style={{
            height: `${h * 24}px`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
