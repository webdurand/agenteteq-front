import { useState, useEffect, useCallback } from "react";
import { fetchContentPlans, createContentPlan, updateContentPlan, deleteContentPlan } from "../lib/api";
import { useWSEvent } from "./useWebSocket";

export interface ContentPlan {
  id: number;
  title: string;
  description: string;
  content_type: string;
  platforms: string[];
  scheduled_at: string | null;
  status: "idea" | "planned" | "producing" | "ready" | "published";
  created_at: string;
  updated_at: string | null;
}

export function useContentPlans(token: string | null) {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchContentPlans(token);
      setPlans(data.plans || []);
    } catch (e) {
      console.error("Erro ao carregar content plans:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useWSEvent("content_plan_updated", () => {
    loadPlans();
  });

  const addPlan = async (plan: {
    title: string;
    content_type?: string;
    platforms?: string[];
    scheduled_at?: string;
    description?: string;
  }) => {
    if (!token) return;
    await createContentPlan(token, plan);
    loadPlans();
  };

  const editPlan = async (id: number, data: Partial<ContentPlan>) => {
    if (!token) return;
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    try {
      await updateContentPlan(token, id, data);
    } catch {
      loadPlans();
    }
  };

  const removePlan = async (id: number) => {
    if (!token) return;
    setPlans((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteContentPlan(token, id);
    } catch {
      loadPlans();
    }
  };

  return { plans, loading, loadPlans, addPlan, editPlan, removePlan };
}
