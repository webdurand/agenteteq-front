import { useState } from "react";
import { useContentPlans, type ContentPlan } from "../hooks/useContentPlans";
import { Skeleton } from "./ui/Skeleton";

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  idea: { icon: "\u{1F4A1}", label: "Ideia", color: "text-yellow-400" },
  planned: { icon: "\u{1F4C5}", label: "Planejado", color: "text-blue-400" },
  producing: { icon: "\u{1F528}", label: "Produzindo", color: "text-orange-400" },
  ready: { icon: "\u2705", label: "Pronto", color: "text-green-400" },
  published: { icon: "\u{1F4E4}", label: "Publicado", color: "text-content-3" },
};

const CONTENT_TYPES: Record<string, string> = {
  post: "Post",
  carousel: "Carrossel",
  video: "Video",
  reels: "Reels",
  blog: "Blog",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Sem data";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function ContentCalendarPanel({
  token,
  isMinimized,
  onToggleMinimize,
}: {
  token: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const { plans, loading, addPlan, editPlan, removePlan } = useContentPlans(token);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAddLoading(true);
    try {
      await addPlan({ title: newTitle.trim() });
      setNewTitle("");
      setShowAddForm(false);
    } finally {
      setAddLoading(false);
    }
  };

  // Group by status for display
  const activePlans = plans.filter((p) => p.status !== "published");
  const publishedPlans = plans.filter((p) => p.status === "published");

  return (
    <div className={`flex flex-col p-6 text-content ${isMinimized ? "" : "h-full"}`}>
      <button
        onClick={onToggleMinimize}
        className={`flex items-center justify-between w-full text-left cursor-pointer ${isMinimized ? "" : "mb-6"}`}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">
            Calendario
          </h2>
          {activePlans.length > 0 && (
            <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
              {activePlans.length}
            </span>
          )}
        </div>
        <span className="w-6 h-6 flex items-center justify-center text-content-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isMinimized ? (
              <polyline points="6 9 12 15 18 9" />
            ) : (
              <polyline points="18 15 12 9 6 15" />
            )}
          </svg>
        </span>
      </button>

      {!isMinimized && (
        <>
          {/* Add button / form */}
          <div className="mb-4">
            {showAddForm ? (
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Titulo do conteudo..."
                  className="flex-1 min-w-0 bg-surface-card border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-content transition-colors placeholder:text-content-3"
                  disabled={addLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newTitle.trim() || addLoading}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-card border border-line text-content-3 hover:text-accent hover:border-accent/30 disabled:opacity-30 transition-all flex-shrink-0 self-center"
                  title="Adicionar"
                >
                  {addLoading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-card border border-line text-content-3 hover:text-red-400 hover:border-red-400/30 transition-all flex-shrink-0 self-center"
                  title="Cancelar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-line text-content-3 text-sm hover:text-accent hover:border-accent/30 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Planejar conteudo
              </button>
            )}
          </div>

          {/* Plans list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : activePlans.length === 0 && publishedPlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-content-3">Nenhum conteudo planejado.</p>
                <p className="text-xs text-content-3 mt-1">
                  Peca ao Teq para planejar um conteudo ou clique acima.
                </p>
              </div>
            ) : (
              <>
                {activePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    expanded={expandedId === plan.id}
                    onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                    onEdit={editPlan}
                    onRemove={() => removePlan(plan.id)}
                  />
                ))}
                {publishedPlans.length > 0 && (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-content-3 pt-3 pb-1">
                      Publicados ({publishedPlans.length})
                    </p>
                    {publishedPlans.slice(0, 5).map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        expanded={expandedId === plan.id}
                        onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                        onEdit={editPlan}
                        onRemove={() => removePlan(plan.id)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  expanded,
  onToggle,
  onEdit,
  onRemove,
}: {
  plan: ContentPlan;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (id: number, data: Partial<ContentPlan>) => void;
  onRemove: () => void;
}) {
  const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.idea;
  const typeLabel = CONTENT_TYPES[plan.content_type] || plan.content_type;
  const platforms = (plan.platforms || []).join(", ");

  const nextStatuses: Record<string, string> = {
    idea: "planned",
    planned: "producing",
    producing: "ready",
    ready: "published",
  };
  const nextStatus = nextStatuses[plan.status];

  return (
    <div className="rounded-xl border border-line bg-surface-card/50 overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-card/80 transition-colors cursor-pointer"
      >
        <span className="w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center flex-shrink-0 text-base">
          {status.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{plan.title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-content-3 mt-0.5">
            <span className="bg-surface-card px-1.5 py-0.5 rounded text-[10px]">
              {typeLabel}
            </span>
            {platforms && <span>{platforms}</span>}
            <span>·</span>
            <span>{formatDate(plan.scheduled_at)}</span>
          </div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`text-content-3 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-line pt-3 space-y-2">
          {plan.description && (
            <p className="text-xs text-content-3 line-clamp-3">{plan.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className={status.color}>{status.label}</span>
            {plan.scheduled_at && (
              <>
                <span className="text-content-3">·</span>
                <span className="text-content-3">{formatDate(plan.scheduled_at)}</span>
              </>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            {nextStatus && (
              <button
                onClick={() => onEdit(plan.id, { status: nextStatus as ContentPlan["status"] })}
                className="flex-1 text-xs py-1.5 rounded-lg border border-line text-content-3 hover:text-accent hover:border-accent/30 transition-all"
              >
                {STATUS_CONFIG[nextStatus]?.icon} {STATUS_CONFIG[nextStatus]?.label}
              </button>
            )}
            <button
              onClick={onRemove}
              className="flex-1 text-xs py-1.5 rounded-lg border border-line text-content-3 hover:text-red-400 hover:border-red-400/30 transition-all"
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
