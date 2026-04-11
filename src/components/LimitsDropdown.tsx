interface LimitsFeature {
  enabled: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  label: string;
  unit?: string;
  unlimited?: boolean;
  period?: string;
  budget_exceeded?: boolean;
}

export interface LimitsData {
  plan_name: string;
  plan_code: string;
  resets_at: string | null;
  monthly_resets_at?: string | null;
  features: Record<string, LimitsFeature>;
}

interface LimitsDropdownProps {
  limits: LimitsData;
  limitsHeaderLabel: string;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  showHighlight: boolean;
  onUpgrade: () => void;
  variant?: "desktop" | "mobile";
}

export function LimitsDropdown({
  limits,
  limitsHeaderLabel,
  expanded,
  onToggle,
  onClose,
  showHighlight,
  onUpgrade,
  variant = "desktop",
}: LimitsDropdownProps) {
  const isMobile = variant === "mobile";

  return (
    <div className={isMobile ? "lg:hidden mt-2 relative" : "hidden lg:block relative"}>
      <button
        onClick={onToggle}
        aria-label="Ver limites do plano"
        aria-expanded={expanded}
        className={`px-2.5 rounded-full border text-[10px] tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
          isMobile ? "py-1.5" : "py-1"
        } ${
          showHighlight
            ? "border-accent text-accent bg-accent/10"
            : limitsHeaderLabel.startsWith("\u26A0")
              ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
              : "border-line text-content-3 hover:text-content"
        }`}
      >
        <span>{limitsHeaderLabel}</span>
        <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
      </button>

      {expanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className={`absolute top-full left-0 mt-2 rounded-2xl border border-line bg-surface-up shadow-xl z-50 ${
            isMobile ? "w-[calc(100vw-1.5rem)] max-w-xs p-4" : "w-72 p-3"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider text-content-3">Plano atual</p>
              <p className="text-xs text-content">{limits.plan_name || "Free"}</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {Object.entries(limits.features).map(([key, f]) => {
                if (!f.enabled) {
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[11px] text-content-3">{f.label}</span>
                      <span className="text-[10px] text-content-4 flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Pro
                      </span>
                    </div>
                  );
                }
                if (f.unlimited) {
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[11px] text-content-2">{f.label}</span>
                      <span className="text-[10px] text-accent">Ilimitado</span>
                    </div>
                  );
                }
                if (typeof f.limit !== "number" || f.limit <= 0) return null;
                const pct = Math.min(100, Math.round(((f.used ?? 0) / f.limit) * 100));
                const exhausted = (f.remaining ?? 0) <= 0;
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-content-2">{f.label}</span>
                      <span className={`text-[10px] ${exhausted ? "text-amber-400" : "text-content-3"}`}>
                        {key === "budget" ? `${Math.round(f.used ?? 0)}%` : `${f.used}${f.unit || ""}/${f.limit}${f.unit || ""}`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface border border-line overflow-hidden">
                      <div className={`h-full transition-all ${exhausted ? "bg-amber-500" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                    </div>
                    {exhausted && (
                      <p className="text-[10px] text-amber-400">
                        {isMobile ? "Limite mensal atingido. Compre mais para continuar!" : "Limite mensal encerrou!"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {limits.monthly_resets_at && (
              <p className="mt-3 text-[10px] text-content-4">
                Reseta em: {new Date(limits.monthly_resets_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
              </p>
            )}
            {limits.plan_code === "free" && (
              <button
                onClick={() => { onClose(); onUpgrade(); }}
                className={`w-full px-3 rounded-xl bg-content text-surface text-[11px] font-medium uppercase tracking-wider hover:opacity-90 transition-opacity ${
                  isMobile ? "mt-3 py-2.5" : "mt-2.5 py-2"
                }`}
              >
                Ganhar mais limites
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
