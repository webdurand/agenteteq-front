import { useState, useEffect, useCallback } from "react";
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

export function useReminders(token: string | null) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReminderFilter>("active");

  const loadReminders = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchReminders(token, filter);
      setReminders(data.reminders || []);
    } catch (e) {
      console.error("Erro ao carregar lembretes:", e);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useWSEvent("reminder_updated", () => {
    loadReminders();
  });

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(loadReminders, 60_000);
    return () => clearInterval(interval);
  }, [token, loadReminders]);

  const addReminder = async (reminder: any) => {
    if (!token) return;
    await createReminder(token, reminder);
    loadReminders();
  };

  const removeReminder = async (id: number) => {
    if (!token) return;
    setReminders(prev => prev.filter(r => r.id !== id));
    try {
      await cancelReminder(token, id);
    } catch (e) {
      loadReminders();
    }
  };

  return {
    reminders,
    loading,
    filter,
    setFilter,
    loadReminders,
    addReminder,
    removeReminder
  };
}
