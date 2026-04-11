import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ProductOnboardingModalProps {
  open: boolean;
  onFinish: (hideNextTimes: boolean, suggestedPrompt?: string) => void;
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
    description: "Voce tem um total de runs por periodo. No Premium, voce ganha mais limites para executar mais.",
  },
  {
    title: "Vamos comecar!",
    description: "Experimente pedir algo ao Teq. Escolha uma sugestao abaixo ou escreva o que quiser.",
  },
];

const SUGGESTED_PROMPTS = [
  "Cria um carrossel sobre produtividade",
  "O que tem na minha agenda amanha?",
  "Gera uma imagem de um por do sol futurista",
  "Me ajuda a planejar conteudo da semana",
];

function Illustration({ step }: { step: number }) {
  const colors = [
    { bg: "from-amber-200/40 via-yellow-200/30 to-orange-200/40", icon: "M12 5v14M5 12h14" },
    { bg: "from-blue-200/40 via-cyan-200/30 to-indigo-200/40", icon: "M5 17l5-5 4 4 5-7" },
    { bg: "from-emerald-200/40 via-teal-200/30 to-lime-200/40", icon: "M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4" },
    { bg: "from-violet-200/40 via-fuchsia-200/30 to-pink-200/40", icon: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" },
    { bg: "from-rose-200/40 via-pink-200/30 to-red-200/40", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setHideNextTimes(false);
      dialogRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onFinish(hideNextTimes);
    }
  }, [onFinish, hideNextTimes]);

  const isLastStep = stepIndex === STEPS.length - 1;
  const isPremiumStep = stepIndex === STEPS.length - 2;
  const current = STEPS[stepIndex];

  const dots = useMemo(
    () => STEPS.map((_, i) => i === stepIndex),
    [stepIndex],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-surface sm:bg-surface/90 sm:backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tour do produto"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full sm:max-w-xl sm:max-h-[90vh] overflow-y-auto scrollbar-thin sm:rounded-3xl sm:border sm:border-line bg-surface-up sm:shadow-2xl flex flex-col outline-none"
      >
        <div className="flex-1 flex flex-col justify-center p-5 sm:p-8">
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

          <h2 className="mt-6 text-2xl sm:text-3xl font-light text-content">{current.title}</h2>
          <p className="mt-3 text-sm sm:text-base text-content-2 leading-relaxed">{current.description}</p>

          {isLastStep && (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => onFinish(hideNextTimes, prompt)}
                    className="px-3 py-2 rounded-xl border border-line bg-surface-card/50 text-sm text-content-2 hover:text-content hover:border-line-strong transition-all text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <label className="mt-5 flex items-start gap-2 text-sm text-content-3">
                <input
                  type="checkbox"
                  checked={hideNextTimes}
                  onChange={(e) => setHideNextTimes(e.target.checked)}
                  className="mt-0.5"
                />
                Nao exibir esse onboarding novamente
              </label>
            </>
          )}
        </div>

        <div className="flex-shrink-0 p-5 sm:p-8 pt-0 sm:pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
            {!isLastStep && !isPremiumStep && (
              <button
                onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))}
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-content text-surface text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
              >
                Proximo
              </button>
            )}

            {isPremiumStep && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={onSeeLimits}
                  className="px-4 py-3.5 rounded-full border border-line text-content text-xs font-medium uppercase tracking-wider hover:bg-surface-card transition-colors"
                >
                  Ver meus limites
                </button>
                <button
                  onClick={() => onOpenCheckout(hideNextTimes)}
                  className="px-6 py-3.5 rounded-full bg-content text-surface text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
                >
                  Assinar agora
                </button>
                <button
                  onClick={() => setStepIndex(STEPS.length - 1)}
                  className="px-4 py-3.5 rounded-full border border-line text-content text-xs font-medium uppercase tracking-wider hover:bg-surface-card transition-colors"
                >
                  Proximo
                </button>
              </div>
            )}

            {isLastStep && (
              <button
                onClick={() => onFinish(hideNextTimes)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-content text-surface text-sm font-medium tracking-wider uppercase hover:opacity-90 transition-opacity"
              >
                Comecar a usar o Teq
              </button>
            )}

            <button
              onClick={() => onFinish(hideNextTimes)}
              className="px-4 py-2 text-xs uppercase tracking-wider text-content-3 hover:text-content transition-colors"
            >
              Pular tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
