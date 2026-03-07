import { useState, useRef } from "react";
import { useReminders, type Reminder, type ReminderFilter } from "../hooks/useReminders";
import { Skeleton } from "./ui/Skeleton";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `${diffD}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatNextRun(isoStr: string | null | undefined): string | null {
  if (!isoStr) return null;
  try {
    const dt = new Date(isoStr);
    const now = new Date();
    const diffMs = dt.getTime() - now.getTime();
    if (diffMs < 0) return "em breve";
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "em instantes";
    if (diffMin < 60) return `em ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) {
      const remainMin = diffMin % 60;
      return remainMin > 0 ? `em ${diffH}h${remainMin}min` : `em ${diffH}h`;
    }
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function describeTrigger(r: Reminder): string {
  const cfg = r.trigger_config || {};
  if (r.trigger_type === "date") {
    if (cfg.minutes_from_now) return `Único — agendado ${cfg.minutes_from_now}min após criação`;
    if (cfg.run_date) {
      try {
        const dt = new Date(cfg.run_date);
        return `Único — ${dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
      } catch { return "Único"; }
    }
    return "Disparo único";
  }
  if (r.trigger_type === "cron") {
    return describeCron(cfg.cron_expression || "");
  }
  if (r.trigger_type === "interval") {
    const mins = cfg.interval_minutes || 0;
    if (mins < 60) return `A cada ${mins} minuto${mins > 1 ? "s" : ""}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `A cada ${h}h${m}min` : `A cada ${h} hora${h > 1 ? "s" : ""}`;
  }
  return r.trigger_type;
}

function describeCron(expr: string): string {
  if (!expr) return "Recorrente (cron)";
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return `Cron: ${expr}`;
  const [minute, hour, , , dow] = parts;

  const dowMap: Record<string, string> = {
    "0": "dom", "1": "seg", "2": "ter", "3": "qua", "4": "qui", "5": "sex", "6": "sáb",
    "1-5": "seg-sex", "0-6": "diariamente", "*": "diariamente",
    "1,3,5": "seg/qua/sex", "2,4": "ter/qui",
  };

  const dowLabel = dowMap[dow] || `dias ${dow}`;
  const timeLabel = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  return `${dowLabel[0].toUpperCase() + dowLabel.slice(1)} às ${timeLabel}`;
}

const channelLabels: Record<string, { label: string; icon: string }> = {
  whatsapp_text: { label: "WhatsApp", icon: "💬" },
  web_text: { label: "Web (texto)", icon: "💻" },
  web_voice: { label: "Voz no app", icon: "🔊" },
  web_whatsapp: { label: "Web + WhatsApp", icon: "🔔" },
  whatsapp_call: { label: "Ligação WA", icon: "📞" },
};

function TriggerTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    date: { label: "Único", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    cron: { label: "Recorrente", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    interval: { label: "Intervalo", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  };
  const c = config[type] || { label: type, color: "bg-line/30 text-content-3 border-line" };
  return (
    <span className={`text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-full border ${c.color}`}>
      {c.label}
    </span>
  );
}

function isEffectivelyFired(r: Reminder): boolean {
  if (r.status === "fired") return true;
  if (r.trigger_type === "date" && r.status === "active" && !r.next_run_str) {
    const cfg = r.trigger_config || {};
    if (cfg.minutes_from_now) {
      const created = new Date(r.created_at).getTime();
      const expectedFire = created + cfg.minutes_from_now * 60_000;
      return Date.now() > expectedFire + 60_000;
    }
    if (cfg.run_date) {
      return Date.now() > new Date(cfg.run_date).getTime() + 60_000;
    }
  }
  return false;
}

function StatusDot({ status, effectivelyFired }: { status: string; effectivelyFired: boolean }) {
  if (status === "fired" || effectivelyFired) {
    return (
      <span className="w-4 h-4 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0" title="Concluído">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-green-400">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  return <span className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" title="Ativo" />;
}

function ReminderCard({ r, onRemove }: { r: Reminder; onRemove: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const nextRun = formatNextRun(r.next_run_str);
  const channel = channelLabels[r.notification_channel] || { label: r.notification_channel, icon: "📨" };
  const effectivelyDone = isEffectivelyFired(r);
  const isFired = r.status === "fired" || effectivelyDone;
  const isLongText = r.task_instructions.length > 100;

  return (
    <div className={`p-4 rounded-xl border group relative transition-all ${
      isFired 
        ? "bg-surface-card/50 border-line/50 opacity-70" 
        : "bg-surface-card border-line hover:border-content/20"
    }`}>
      {!isFired && (
        <button
          onClick={() => onRemove(r.id)}
          className="absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-content-3 hover:text-red-500 transition-all bg-surface rounded-md border border-line"
          title="Cancelar aviso"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={r.status} effectivelyFired={effectivelyDone} />
        <TriggerTypeBadge type={r.trigger_type} />
        <span className="text-[10px] text-content-4 ml-auto">{timeAgo(r.created_at)}</span>
      </div>

      {r.title && (
        <p className="text-xs font-medium text-content mb-1">{r.title}</p>
      )}

      <div className="mb-3">
        <p className={`text-sm leading-relaxed ${isFired ? "text-content-3" : "text-content"} ${!expanded && isLongText ? "line-clamp-3" : ""}`}>
          {r.task_instructions}
        </p>
        {isLongText && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-content-3 hover:text-accent mt-1 transition-colors"
          >
            {expanded ? "▲ ver menos" : "▼ ver mais"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-content-3">
        <span className="flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {describeTrigger(r)}
        </span>

        {nextRun && (
          <span className="flex items-center gap-1 text-accent font-medium">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {nextRun}
          </span>
        )}

        {isFired && (
          <span className="flex items-center gap-1 text-green-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-60">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {r.updated_at ? `Disparado ${timeAgo(r.updated_at)}` : "Concluído"}
          </span>
        )}

        <span className="flex items-center gap-1">
          <span className="text-[9px]">{channel.icon}</span>
          {channel.label}
        </span>
      </div>
    </div>
  );
}

function ReminderSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div className="p-4 rounded-xl bg-surface-card border border-line space-y-2.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="w-16 h-4 rounded-full" />
        <div className="flex-1" />
        <Skeleton className="w-12 h-3" />
      </div>
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-3/4 h-3" />
      <div className="flex gap-3 pt-1">
        <Skeleton className="w-24 h-3" />
        <Skeleton className="w-16 h-3" />
      </div>
    </div>
  );
}

type TriggerTab = "date" | "cron" | "interval";

function CreateForm({ onAdd, onClose }: { onAdd: (data: any) => void; onClose: () => void }) {
  const [tab, setTab] = useState<TriggerTab>("date");
  const [instructions, setInstructions] = useState("");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  const [cronExpr, setCronExpr] = useState("");
  const [intervalMin, setIntervalMin] = useState("");
  const [channel, setChannel] = useState("web_voice");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instructions.trim()) return;

    const base = {
      task_instructions: instructions,
      trigger_type: tab,
      title: title || undefined,
      notification_channel: channel,
    };

    if (tab === "date") {
      if (!minutes) return;
      onAdd({ ...base, minutes_from_now: parseInt(minutes) });
    } else if (tab === "cron") {
      if (!cronExpr.trim()) return;
      onAdd({ ...base, cron_expression: cronExpr.trim() });
    } else {
      if (!intervalMin) return;
      onAdd({ ...base, interval_minutes: parseInt(intervalMin) });
    }

    onClose();
  };

  const inputClass = "w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-content transition-colors";

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 rounded-xl bg-surface-card border border-line space-y-3 flex-shrink-0">
      <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-line">
        {(["date", "cron", "interval"] as TriggerTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[10px] font-medium tracking-wider uppercase rounded-md transition-all ${
              tab === t ? "bg-content text-surface shadow-sm" : "text-content-3 hover:text-content"
            }`}
          >
            {t === "date" ? "Único" : t === "cron" ? "Recorrente" : "Intervalo"}
          </button>
        ))}
      </div>

      <div>
        <label className="text-[10px] text-content-3 mb-1 block uppercase tracking-wider">Título (opcional)</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Ex: Lembrete de hidratação" />
      </div>

      <div>
        <label className="text-[10px] text-content-3 mb-1 block uppercase tracking-wider">Instrução para o Teq</label>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          className={`${inputClass} resize-y min-h-[60px] max-h-[160px]`}
          rows={3}
          placeholder="Ex: Hora de beber água! Me manda uma mensagem motivacional."
          required
        />
      </div>

      {tab === "date" && (
        <div>
          <label className="text-[10px] text-content-3 mb-1 block uppercase tracking-wider">Daqui a quantos minutos?</label>
          <input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} className={inputClass} min="1" placeholder="Ex: 30" required />
        </div>
      )}

      {tab === "cron" && (
        <div>
          <label className="text-[10px] text-content-3 mb-1 block uppercase tracking-wider">Expressão cron</label>
          <input type="text" value={cronExpr} onChange={e => setCronExpr(e.target.value)} className={inputClass} placeholder="0 8 * * * (todo dia às 8h)" required />
          <p className="text-[9px] text-content-4 mt-1">Formato: minuto hora dia mês dia-da-semana. Ex: "0 9 * * 1-5" = seg-sex 9h</p>
        </div>
      )}

      {tab === "interval" && (
        <div>
          <label className="text-[10px] text-content-3 mb-1 block uppercase tracking-wider">Intervalo em minutos</label>
          <input type="number" value={intervalMin} onChange={e => setIntervalMin(e.target.value)} className={inputClass} min="1" placeholder="Ex: 60" required />
        </div>
      )}

      <div>
        <label className="text-[10px] text-content-3 mb-1 block uppercase tracking-wider">Canal de notificação</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "web_voice", label: "Voz no app", icon: "🔊" },
            { value: "web_text", label: "Web (texto)", icon: "💻" },
            { value: "whatsapp_text", label: "WhatsApp", icon: "💬" },
            { value: "web_whatsapp", label: "Web + WA", icon: "🔔" },
          ].map(ch => (
            <button
              key={ch.value}
              type="button"
              onClick={() => setChannel(ch.value)}
              className={`py-2 text-[10px] font-medium tracking-wider rounded-lg border transition-all ${
                channel === ch.value 
                  ? "bg-accent/10 border-accent/30 text-accent" 
                  : "bg-surface border-line text-content-3 hover:text-content"
              }`}
            >
              <span className="text-xs">{ch.icon}</span> {ch.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="w-full py-2.5 bg-content text-surface text-xs font-medium rounded-lg uppercase tracking-wider transition-colors hover:bg-content/90">
        Programar
      </button>
    </form>
  );
}

export function RemindersPanel({ token, isMinimized, onToggleMinimize }: { token: string; isMinimized: boolean; onToggleMinimize: () => void }) {
  const { reminders, loading, loadingMore, hasMore, loadMore, filter, setFilter, addReminder, removeReminder } = useReminders(token);
  const [showForm, setShowForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayCount = reminders.length;

  return (
    <div className={`flex flex-col p-6 text-content ${isMinimized ? "" : "h-full"}`}>
      <div className={`flex items-center justify-between ${isMinimized ? "" : "mb-4"}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">Avisos</h2>
          {!loading && displayCount > 0 && (
            <span className="text-[10px] text-content-3 bg-line/40 px-1.5 py-0.5 rounded-full">
              {displayCount}{hasMore ? "+" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isMinimized && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-6 h-6 rounded-full bg-surface-card border border-line flex items-center justify-center hover:text-accent transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {showForm ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M12 5v14M5 12h14" />}
              </svg>
            </button>
          )}
          <button
            onClick={onToggleMinimize}
            className="w-6 h-6 flex items-center justify-center text-content-3 hover:text-content transition-colors"
            title={isMinimized ? "Maximizar" : "Minimizar"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMinimized ? <polyline points="6 9 12 15 18 9" /> : <polyline points="18 15 12 9 6 15" />}
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex gap-1 mb-4 p-0.5 bg-surface rounded-lg border border-line flex-shrink-0">
            {([
              { key: "active" as ReminderFilter, label: "Ativos" },
              { key: "fired" as ReminderFilter, label: "Concluídos" },
              { key: "all" as ReminderFilter, label: "Todos" },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-1 py-1.5 text-[10px] font-medium tracking-wider uppercase rounded-md transition-all ${
                  filter === tab.key ? "bg-content text-surface shadow-sm" : "text-content-3 hover:text-content"
                }`}
              >
                {tab.label}
                {filter === tab.key && displayCount > 0 && (
                  <span className="ml-1 font-bold">{displayCount}{hasMore ? "+" : ""}</span>
                )}
              </button>
            ))}
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-3"
            onScroll={() => {
              const el = scrollRef.current;
              if (!el || loadingMore || !hasMore) return;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) loadMore();
            }}
          >
            {showForm && (
              <CreateForm
                onAdd={(data) => { addReminder(data); setShowForm(false); }}
                onClose={() => setShowForm(false)}
              />
            )}

            {loading && reminders.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => <ReminderSkeleton key={i} delay={i * 100} />)}
              </div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-4 mb-3">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <p className="text-sm text-content-3">
                  {filter === "active" ? "Nenhum aviso ativo." : filter === "fired" ? "Nenhum aviso concluído." : "Nenhum aviso programado."}
                </p>
                {filter === "active" && (
                  <button onClick={() => setShowForm(true)} className="mt-2 text-xs text-accent hover:underline">
                    Criar novo aviso
                  </button>
                )}
              </div>
            ) : (
              <>
                {reminders.map(r => <ReminderCard key={r.id} r={r} onRemove={removeReminder} />)}
                {loadingMore && (
                  <div className="flex justify-center py-3">
                    <span className="text-[10px] text-content-3 animate-pulse">Carregando mais...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
