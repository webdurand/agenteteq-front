import { useState, useEffect, useCallback, useRef } from "react";
import { fetchReminders, createReminder, cancelReminder } from "../lib/api";
import { useWSEvent } from "./useWebSocket";

export interface Reminder {
  id: number;
  title: string;
  task_instructions: string;
  trigger_type: "date" | "cron" | "interval";
  trigger_config: {
    minutes_from_now?: number;
    run_date?: string;
    cron_expression?: string;
    interval_minutes?: number;
    timezone?: string;
  };
  notification_channel: string;
  status: "active" | "fired" | "cancelled";
  apscheduler_job_id: string;
  created_at: string;
  updated_at?: string;
  next_run_str?: string | null;
}

export type ReminderFilter = "active" | "fired" | "all";

const PAGE_SIZE = 15;

export function useReminders(token: string | null) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<ReminderFilter>("active");
  const offsetRef = useRef(0);

  const loadReminders = useCallback(async (reset = true) => {
    if (!token) return;
    try {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }
      const data = await fetchReminders(token, filter, PAGE_SIZE, offsetRef.current);
      const newReminders: Reminder[] = data.reminders || [];
      setHasMore(data.has_more ?? false);
      if (reset) {
        setReminders(newReminders);
      } else {
        setReminders(prev => [...prev, ...newReminders]);
      }
      offsetRef.current += newReminders.length;
    } catch (e) {
      console.error("Erro ao carregar lembretes:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, filter]);

  useEffect(() => {
    loadReminders(true);
  }, [loadReminders]);

  useWSEvent("reminder_updated", () => {
    loadReminders(true);
  });

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => loadReminders(true), 60_000);
    return () => clearInterval(interval);
  }, [token, loadReminders]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) loadReminders(false);
  }, [loadReminders, loadingMore, hasMore]);

  const addReminder = async (reminder: any) => {
    if (!token) return;
    await createReminder(token, reminder);
    loadReminders(true);
  };

  const removeReminder = async (id: number) => {
    if (!token) return;
    setReminders(prev => prev.filter(r => r.id !== id));
    try {
      await cancelReminder(token, id);
    } catch (e) {
      loadReminders(true);
    }
  };

  return {
    reminders,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    filter,
    setFilter,
    loadReminders,
    addReminder,
    removeReminder
  };
}
