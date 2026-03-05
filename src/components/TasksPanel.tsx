import { useState } from "react";
import { useTasks, type Task } from "../hooks/useTasks";

export function TasksPanel({ token, isMinimized, onToggleMinimize }: { token: string, isMinimized: boolean, onToggleMinimize: () => void }) {
  const { tasks, loading, addTask, toggleTask, removeTask } = useTasks(token);
  const [newTaskTitle, setNewTaskTitle] = useState("");

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
          <form onSubmit={handleAdd} className="mb-6">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Nova tarefa..."
              className="w-full bg-surface-card border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-content transition-colors placeholder:text-content-3"
            />
          </form>

          <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 space-y-4">
            {loading && tasks.length === 0 ? (
              <p className="text-xs text-content-3">Carregando...</p>
            ) : (
              <>
                <TaskList items={pendingTasks} onToggle={toggleTask} onRemove={removeTask} />
                
                {doneTasks.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xs font-medium tracking-wider uppercase text-content-3 mb-4">Concluídas</h3>
                    <TaskList items={doneTasks} onToggle={toggleTask} onRemove={removeTask} />
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

function TaskList({ items, onToggle, onRemove }: { items: Task[], onToggle: (id: number, status: "pending"|"done") => void, onRemove: (id: number) => void }) {
  return (
    <div className="space-y-3">
      {items.map((task) => (
        <div key={task.id} className="flex items-start gap-3 group">
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
            <p className={`text-sm leading-snug ${task.status === "done" ? "text-content-3 line-through" : "text-content"}`}>
              {task.title}
            </p>
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
            className="opacity-0 group-hover:opacity-100 p-1 text-content-3 hover:text-red-500 transition-all"
            title="Excluir tarefa"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
