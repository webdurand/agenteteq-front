import { useState, useRef } from "react";
import { useTasks, type Task } from "../hooks/useTasks";
import { Skeleton } from "./ui/Skeleton";

export function TasksPanel({ token, isMinimized, onToggleMinimize }: { token: string, isMinimized: boolean, onToggleMinimize: () => void }) {
  const { tasks, loading, loadingMore, hasMore, loadMore, addTask, toggleTask, removeTask, editTask } = useTasks(token);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({ title: newTaskTitle });
    setNewTaskTitle("");
  };

  return (
    <div className={`flex flex-col p-6 text-content ${isMinimized ? "" : "h-full"}`}>
      <div className={`flex items-center justify-between ${isMinimized ? "" : "mb-6"}`}>
        <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">Tarefas</h2>
        <button 
          onClick={onToggleMinimize}
          className="w-6 h-6 flex items-center justify-center text-content-3 hover:text-content transition-colors"
          title={isMinimized ? "Maximizar" : "Minimizar"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMinimized ? <polyline points="6 9 12 15 18 9"></polyline> : <polyline points="18 15 12 9 6 15"></polyline>}
          </svg>
        </button>
      </div>
      
      {!isMinimized && (
        <>
          <form onSubmit={handleAdd} className="mb-6 flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Nova tarefa..."
              className="flex-1 min-w-0 bg-surface-card border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-content transition-colors placeholder:text-content-3"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-card border border-line text-content-3 hover:text-accent hover:border-accent/30 disabled:opacity-30 disabled:hover:text-content-3 disabled:hover:border-line transition-all flex-shrink-0 self-center"
              title="Adicionar tarefa"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </form>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scrollbar-thin pr-2 space-y-4"
            onScroll={() => {
              const el = scrollRef.current;
              if (!el || loadingMore || !hasMore) return;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) loadMore();
            }}
          >
            {loading && tasks.length === 0 ? (
              <div className="space-y-4">
                {[
                  { w: "w-3/4", sub: true },
                  { w: "w-2/5", sub: false },
                  { w: "w-[90%]", sub: false },
                ].map((cfg, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="w-5 h-5 rounded shrink-0" delay={i * 80} />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className={`h-4 rounded ${cfg.w}`} delay={i * 80} />
                      {cfg.sub && <Skeleton className="h-3 w-20 rounded" delay={150} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <TaskList items={pendingTasks} onToggle={toggleTask} onRemove={removeTask} onEdit={editTask} />
                
                {doneTasks.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xs font-medium tracking-wider uppercase text-content-3 mb-4">Concluídas</h3>
                    <TaskList items={doneTasks} onToggle={toggleTask} onRemove={removeTask} onEdit={editTask} />
                  </div>
                )}
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

function TaskItem({ task, onToggle, onRemove, onEdit }: {
  task: Task;
  onToggle: (id: number, status: "pending" | "done") => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, data: Partial<Task>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);

  const save = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title) {
      onEdit(task.id, { title: trimmed });
    } else {
      setEditValue(task.title);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-3 group">
      <button 
        onClick={() => onToggle(task.id, task.status)}
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border border-line flex items-center justify-center text-accent hover:border-content transition-colors"
      >
        {task.status === "done" && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setEditValue(task.title); setEditing(false); }
            }}
            onBlur={save}
            autoFocus
            className="w-full bg-surface border border-line rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-content transition-colors"
          />
        ) : (
          <p 
            onClick={() => { setEditValue(task.title); setEditing(true); }}
            className={`text-sm leading-snug cursor-pointer hover:text-accent/80 transition-colors ${task.status === "done" ? "text-content-3 line-through" : "text-content"}`}
            title="Clique para editar"
          >
            {task.title}
          </p>
        )}
        {task.due_date && (
          <p className="text-[10px] text-content-3 mt-1 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {task.due_date}
          </p>
        )}
      </div>

      <button 
        onClick={() => onRemove(task.id)}
        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-content-3 hover:text-red-500 transition-all"
        title="Excluir tarefa"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );
}

function TaskList({ items, onToggle, onRemove, onEdit }: {
  items: Task[];
  onToggle: (id: number, status: "pending" | "done") => void;
  onRemove: (id: number) => void;
  onEdit: (id: number, data: Partial<Task>) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onRemove={onRemove} onEdit={onEdit} />
      ))}
    </div>
  );
}
