import { useState, useEffect, useCallback } from "react";
import { fetchTasks, createTask, updateTask, deleteTask } from "../lib/api";
import { useWSEvent } from "./useWebSocket";

export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  location: string;
  notes: string;
  status: "pending" | "done";
  created_at: string;
}

export function useTasks(token: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchTasks(token, "all");
      setTasks(data.tasks || []);
    } catch (e) {
      console.error("Erro ao carregar tasks:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useWSEvent("task_updated", () => {
    // Quando o agente ou outro cliente altera uma tarefa, recarregamos
    loadTasks();
  });

  const addTask = async (task: Partial<Task>) => {
    if (!token) return;
    await createTask(token, task);
    loadTasks();
  };

  const toggleTask = async (id: number, currentStatus: "pending" | "done") => {
    if (!token) return;
    const newStatus = currentStatus === "pending" ? "done" : "pending";
    // Atualiza otimisticamente
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
      await updateTask(token, id, { status: newStatus });
    } catch (e) {
      // Reverte se falhar
      loadTasks();
    }
  };

  const removeTask = async (id: number) => {
    if (!token) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTask(token, id);
    } catch (e) {
      loadTasks();
    }
  };

  return {
    tasks,
    loading,
    loadTasks,
    addTask,
    toggleTask,
    removeTask
  };
}
