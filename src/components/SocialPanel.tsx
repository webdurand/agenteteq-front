import { useState, useRef, useEffect } from "react";
import { useSocial, type TrackedAccount } from "../hooks/useSocial";
import { Skeleton } from "./ui/Skeleton";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: "\u{1F4F8}" },
  { value: "youtube", label: "YouTube", icon: "\u{1F3AC}" },
] as const;

type PlatformValue = typeof PLATFORMS[number]["value"];

const PLATFORM_ICONS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.value, p.icon])
);

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return "nunca";
  try {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  } catch {
    return isoStr;
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function SocialPanel({
  token,
  isMinimized,
  onToggleMinimize,
}: {
  token: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const { accounts, loading, addAccount, removeAccount, refresh } = useSocial(token);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPlatform, setNewPlatform] = useState<PlatformValue>("instagram");
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPlatformDropdownOpen(false);
      }
    };
    if (platformDropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [platformDropdownOpen]);

  const selectedPlatform = PLATFORMS.find((p) => p.value === newPlatform) || PLATFORMS[0];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setAddLoading(true);
    setAddError("");
    try {
      await addAccount(newPlatform, newUsername.trim());
      setNewUsername("");
      setNewPlatform("instagram");
      setShowAddForm(false);
    } catch (err: any) {
      setAddError(err.message || "Erro ao adicionar conta");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className={`flex flex-col p-6 text-content ${isMinimized ? "" : "h-full"}`}>
      <button
        onClick={onToggleMinimize}
        className={`flex items-center justify-between w-full text-left cursor-pointer ${isMinimized ? "" : "mb-6"}`}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">
            Referencias
          </h2>
          {accounts.length > 0 && (
            <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
              {accounts.length}
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
                {/* Platform dropdown */}
                <div className="relative flex-shrink-0" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
                    className="flex items-center gap-1 bg-surface-card border border-line rounded-xl px-2.5 py-3 text-sm hover:border-content/30 transition-colors"
                    title={selectedPlatform.label}
                  >
                    <span>{selectedPlatform.icon}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-content-3">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {platformDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-surface-up border border-line rounded-xl overflow-hidden shadow-lg z-50 min-w-[140px]">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => { setNewPlatform(p.value); setPlatformDropdownOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                            newPlatform === p.value ? "text-accent bg-accent/10" : "text-content hover:bg-surface-up"
                          }`}
                        >
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={newPlatform === "youtube" ? "@canal" : "@username"}
                  className="flex-1 min-w-0 bg-surface-card border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-content transition-colors placeholder:text-content-3"
                  disabled={addLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newUsername.trim() || addLoading}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-card border border-line text-content-3 hover:text-accent hover:border-accent/30 disabled:opacity-30 transition-all flex-shrink-0 self-center"
                  title="Adicionar"
                >
                  {addLoading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray="31.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setAddError(""); }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-card border border-line text-content-3 hover:text-red-400 hover:border-red-400/30 transition-all flex-shrink-0 self-center"
                  title="Cancelar"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-line text-content-3 text-sm hover:text-accent hover:border-accent/30 transition-all"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Monitorar conta
              </button>
            )}
            {addError && (
              <p className="text-xs text-red-400 mt-2">{addError}</p>
            )}
          </div>

          {/* Account list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-content-3">
                  Nenhuma conta monitorada.
                </p>
                <p className="text-xs text-content-3 mt-1">
                  Peca ao Teq para monitorar uma conta ou clique em "Monitorar conta" acima.
                </p>
              </div>
            ) : (
              accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  expanded={expandedId === account.id}
                  onToggle={() =>
                    setExpandedId(expandedId === account.id ? null : account.id)
                  }
                  onRemove={() => removeAccount(account.id)}
                  onRefresh={() => refresh(account.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AccountCard({
  account,
  expanded,
  onToggle,
  onRemove,
  onRefresh,
}: {
  account: TrackedAccount;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRefresh: () => void;
}) {
  const icon = PLATFORM_ICONS[account.platform] || "\u{1F310}";

  return (
    <div className="rounded-xl border border-line bg-surface-card/50 overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-card/80 transition-colors cursor-pointer"
      >
        <span className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center flex-shrink-0 overflow-hidden">
          {account.profile_pic_url ? (
            <img
              src={account.profile_pic_url}
              alt={account.username}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-lg">{icon}</span>
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">
              @{account.username}
            </span>
            <span className="text-[10px] text-content-3 bg-surface-card px-1.5 py-0.5 rounded capitalize">
              {account.platform}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-content-3 mt-0.5">
            <span>{formatNumber(account.followers_count)} {account.platform === "youtube" ? "inscritos" : "seguidores"}</span>
            <span>·</span>
            <span>{formatRelativeTime(account.last_fetched_at)} atras</span>
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
          {account.display_name && (
            <p className="text-xs font-medium">{account.display_name}</p>
          )}
          {account.bio && (
            <p className="text-xs text-content-3 line-clamp-3">{account.bio}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onRefresh}
              className="flex-1 text-xs py-1.5 rounded-lg border border-line text-content-3 hover:text-accent hover:border-accent/30 transition-all"
            >
              Atualizar
            </button>
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
