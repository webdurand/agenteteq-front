interface PremiumLimitsCardProps {
  planName: "free" | "premium";
  runsLimit: number;
  runsUsed: number;
  runsRemaining: number;
  resetsAt: string | null;
  onUpgrade: () => void;
  highlighted?: boolean;
}

export function PremiumLimitsCard({
  planName,
  runsLimit,
  runsUsed,
  runsRemaining,
  resetsAt,
  onUpgrade,
  highlighted = false,
}: PremiumLimitsCardProps) {
  const progress = runsLimit > 0 ? Math.min(100, Math.max(0, Math.round((runsUsed / runsLimit) * 100))) : 0;
  const isFree = planName === "free";

  return (
    <div className={`rounded-2xl border p-3 bg-surface-card transition-all ${
      highlighted ? "border-accent shadow-[0_0_0_1px_rgba(120,119,255,0.25)]" : "border-line"
    }`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-content-3">Plano atual</p>
            <p className="text-sm font-medium text-content">{isFree ? "Free Tier" : "Premium"}</p>
          </div>
          <p className="text-lg font-light text-content whitespace-nowrap">
            {runsRemaining}
            <span className="text-xs text-content-4">/{runsLimit}</span>
          </p>
        </div>

        <p className="text-xs text-content-2">Runs restantes</p>
        <div className="h-1.5 rounded-full bg-surface border border-line overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-content-3">
          {resetsAt ? `Reseta em: ${new Date(resetsAt).toLocaleString("pt-BR")}` : "Sem previsão de reset"}
        </p>
        {isFree && (
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
              Ganhe mais limites com o Premium
            </span>
            <button
              onClick={onUpgrade}
              className="px-3 py-2 rounded-xl bg-content text-surface text-[11px] font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Ganhar mais limites
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
