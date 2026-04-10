import { useState, useEffect, useCallback } from "react";
import { getQueueActive, getQueueHistory } from "../lib/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Task {
  task_id: string;
  type: string;
  status: string;
  created_at: string;
  completed_at?: string;
  current_step?: string;
  step_detail?: string;
  progress_pct?: number;
  title?: string;
  error?: string;
}

interface Props {
  token: string;
}

async function cancelTask(token: string, taskId: string) {
  const res = await fetch(`${API_URL}/api/video/${taskId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erro ao cancelar");
  return res.json();
}

const STEP_LABELS: Record<string, string> = {
  generating_voice: "Gerando voz (ElevenLabs)",
  syncing_captions: "Sincronizando legendas",
  generating_avatar: "Gerando avatar",
  generating_scenes: "Gerando vídeo (HeyGen)",
  generating_broll: "Gerando B-roll",
  assembling: "Montando vídeo",
  encoding: "Encodando",
  uploading: "Fazendo upload",
  processing: "Processando (HeyGen)",
  done: "Concluído",
  failed: "Falhou",
};

const STEP_ORDER = [
  "generating_voice",
  "syncing_captions",
  "generating_scenes",
  "generating_avatar",
  "generating_broll",
  "assembling",
  "encoding",
  "uploading",
];

function getStepProgress(step: string): number {
  if (step === "done") return 100;
  if (step === "processing") return 50;
  const idx = STEP_ORDER.indexOf(step);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STEP_ORDER.length) * 100);
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Na fila" },
  processing: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Processando" },
  done: { bg: "bg-green-500/20", text: "text-green-400", label: "Concluído" },
  failed: { bg: "bg-red-500/20", text: "text-red-400", label: "Falhou" },
  cancelled: { bg: "bg-content-4/20", text: "text-content-3", label: "Cancelado" },
};

export default function QueuePanel({ token }: Props) {
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");

  const reload = useCallback(async () => {
    try {
      const [activeData, historyData] = await Promise.all([
        getQueueActive(token),
        getQueueHistory(token, 20),
      ]);
      setActiveTasks(activeData.tasks || []);
      setHistory(historyData.tasks || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [reload]);

  const totalActive = activeTasks.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-content">Fila de Processos</h2>
        {totalActive > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 font-medium">
            {totalActive} ativo{totalActive > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-surface">
        <button
          onClick={() => setTab("active")}
          className={`flex-1 text-sm py-2 rounded-md transition ${
            tab === "active"
              ? "bg-surface-card text-content font-medium shadow-sm"
              : "text-content-3 hover:text-content"
          }`}
        >
          Ativos {totalActive > 0 && `(${totalActive})`}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 text-sm py-2 rounded-md transition ${
            tab === "history"
              ? "bg-surface-card text-content font-medium shadow-sm"
              : "text-content-3 hover:text-content"
          }`}
        >
          Historico
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "active" ? (
        activeTasks.length === 0 ? (
          <p className="text-center text-content-3 py-8 text-sm">
            Nenhum processo ativo no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <TaskCard key={task.task_id} task={task} token={token} onCancel={reload} />
            ))}
          </div>
        )
      ) : history.length === 0 ? (
        <p className="text-center text-content-3 py-8 text-sm">
          Nenhum processo no historico.
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((task) => (
            <TaskHistoryRow key={task.task_id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, token, onCancel }: { task: Task; token: string; onCancel: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const step = task.current_step || task.status;
  const progress = getStepProgress(step);
  const label = task.step_detail || STEP_LABELS[step] || step;

  const handleCancel = async () => {
    if (!confirm("Cancelar este processo?")) return;
    setCancelling(true);
    try {
      await cancelTask(token, task.task_id);
      onCancel();
    } catch {
      // silent
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-line bg-surface-card">
      {/* Row 1: Title + Cancel */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-content truncate">
            {task.title || task.type}
          </span>
          <span className="text-xs text-content-3 shrink-0">
            {task.task_id.slice(0, 8)}
          </span>
        </div>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="text-xs px-2 py-1 rounded-lg border border-line text-content-3 hover:border-red-500 hover:text-red-400 transition disabled:opacity-50 shrink-0 ml-2"
          title="Cancelar"
        >
          {cancelling ? "..." : "Cancelar"}
        </button>
      </div>

      {/* Row 2: Badge + Step label */}
      <div className="flex items-center gap-2 mb-2">
        <StatusBadge status={task.status} />
        <span className="text-xs text-content-3">{label}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-content-3 mb-1">
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {task.error && (
        <div className="mt-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
          {task.error}
        </div>
      )}
    </div>
  );
}

function TaskHistoryRow({ task }: { task: Task }) {
  const badge = STATUS_BADGE[task.status] || STATUS_BADGE.pending;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface-card">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${task.status === "done" ? "bg-green-400" : task.status === "failed" ? "bg-red-400" : "bg-content-4"}`} />
        <div>
          <span className="text-sm text-content">{task.title || task.type}</span>
          <span className="text-xs text-content-3 ml-2">
            {new Date(task.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
      <StatusBadge status={task.status} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.pending;
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
}
