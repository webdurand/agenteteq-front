import { useState, useEffect, useCallback, useRef } from "react";
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

const PAGE_SIZE = 30;

export function useTasks(token: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const loadTasks = useCallback(async (reset = true) => {
    if (!token) return;
    try {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }
      const data = await fetchTasks(token, "all", PAGE_SIZE, offsetRef.current);
      const newTasks: Task[] = data.tasks || [];
      setHasMore(data.has_more ?? false);
      if (reset) {
        setTasks(newTasks);
      } else {
        setTasks(prev => [...prev, ...newTasks]);
      }
      offsetRef.current += newTasks.length;
    } catch (e) {
      console.error("Erro ao carregar tasks:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    loadTasks(true);
  }, [loadTasks]);

  useWSEvent("task_updated", () => {
    loadTasks(true);
  });

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) loadTasks(false);
  }, [loadTasks, loadingMore, hasMore]);

  const addTask = async (task: Partial<Task>) => {
    if (!token) return;
    await createTask(token, task);
    loadTasks(true);
  };

  const toggleTask = async (id: number, currentStatus: "pending" | "done") => {
    if (!token) return;
    const newStatus = currentStatus === "pending" ? "done" : "pending";
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
      await updateTask(token, id, { status: newStatus });
    } catch (e) {
      loadTasks(true);
    }
  };

  const editTask = async (id: number, data: Partial<Task>) => {
    if (!token) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    try {
      await updateTask(token, id, data);
    } catch (e) {
      loadTasks(true);
    }
  };

  const removeTask = async (id: number) => {
    if (!token) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTask(token, id);
    } catch (e) {
      loadTasks(true);
    }
  };

  return {
    tasks,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    loadTasks,
    addTask,
    editTask,
    toggleTask,
    removeTask
  };
}
