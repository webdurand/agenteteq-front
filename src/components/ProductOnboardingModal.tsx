import { useEffect, useMemo, useState } from "react";

interface ProductOnboardingModalProps {
  open: boolean;
  onFinish: (hideNextTimes: boolean) => void;
  onOpenCheckout: (hideNextTimes: boolean) => void;
  onSeeLimits: () => void;
}

interface OnboardingStep {
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Bem-vindo ao Teq",
    description: "Bem-vindo ao Teq. Veja como usar ele da melhor forma possível.",
  },
  {
    title: "O Teq pode fazer isso por você",
    description: "Criar imagens, gerar carrosséis e postar suas ideias no backlog de ideias (blog Diário Teq).",
  },
  {
    title: "O pulo do gato",
    description: "Você pode pedir para o Teq marcar compromissos e executar tarefas na frequência que escolher.",
  },
  {
    title: "Limites e vantagens do Premium",
    description: "Você tem um total de runs por período. No Premium, você ganha mais limites para executar mais.",
  },
];

function Illustration({ step }: { step: number }) {
  const colors = [
    { bg: "from-amber-200/40 via-yellow-200/30 to-orange-200/40", icon: "M12 5v14M5 12h14" },
    { bg: "from-blue-200/40 via-cyan-200/30 to-indigo-200/40", icon: "M5 17l5-5 4 4 5-7" },
    { bg: "from-emerald-200/40 via-teal-200/30 to-lime-200/40", icon: "M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4" },
    { bg: "from-violet-200/40 via-fuchsia-200/30 to-pink-200/40", icon: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" },
  ][step];

  return (
    <div className={`w-full h-52 rounded-3xl border border-line bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
      <div className="w-24 h-24 rounded-full bg-surface/80 border border-line flex items-center justify-center shadow-lg">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-content">
          <path d={colors.icon} />
        </svg>
      </div>
    </div>
  );
}

export function ProductOnboardingModal({ open, onFinish, onOpenCheckout, onSeeLimits }: ProductOnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [hideNextTimes, setHideNextTimes] = useState(false);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setHideNextTimes(false);
    }
  }, [open]);

  const isLastStep = stepIndex === STEPS.length - 1;
  const current = STEPS[stepIndex];

  const dots = useMemo(
    () => STEPS.map((_, i) => i === stepIndex),
    [stepIndex],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-surface/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-3xl border border-line bg-surface-up shadow-2xl p-6 sm:p-8">
        <Illustration step={stepIndex} />

        <div className="flex items-center justify-center gap-2 mt-5">
          {dots.map((active, idx) => (
            <span
              key={idx}
              className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                active
                  ? "bg-content border-content"
                  : "bg-content-4/70 border-content-3/70"
              }`}
            />
          ))}
        </div>

        <h2 className="mt-6 text-3xl font-light text-content">{current.title}</h2>
        <p className="mt-3 text-content-2 leading-relaxed">{current.description}</p>

        {isLastStep && (
          <label className="mt-5 flex items-start gap-2 text-sm text-content-3">
            <input
              type="checkbox"
              checked={hideNextTimes}
              onChange={(e) => setHideNextTimes(e.target.checked)}
              className="mt-0.5"
            />
            Não exibir esse onboarding novamente
          </label>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => onFinish(hideNextTimes)}
            className="px-4 py-2 text-xs uppercase tracking-wider text-content-3 hover:text-content transition-colors"
          >
            Pular tour
          </button>

          {!isLastStep ? (
            <button
              onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))}
              className="px-6 py-3 rounded-full bg-content text-surface text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
            >
              Próximo
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onSeeLimits}
                className="px-4 py-3 rounded-full border border-line text-content text-xs font-medium uppercase tracking-wider hover:bg-surface-card transition-colors"
              >
                Ver meus limites
              </button>
              <button
                onClick={() => onOpenCheckout(hideNextTimes)}
                className="px-6 py-3 rounded-full bg-content text-surface text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
              >
                Assinar agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
