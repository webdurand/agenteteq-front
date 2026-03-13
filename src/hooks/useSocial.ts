import { useState, useEffect, useCallback } from "react";
import { fetchTrackedAccounts, trackAccount, untrackAccount, refreshAccount } from "../lib/api";

export interface TrackedAccount {
  id: number;
  user_id: string;
  platform: string;
  username: string;
  display_name: string;
  profile_url: string;
  profile_pic_url: string;
  bio: string;
  followers_count: number;
  posts_count: number;
  status: string;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export function useSocial(token: string | null) {
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchTrackedAccounts(token);
      setAccounts(data.accounts || []);
    } catch (e) {
      console.error("Erro ao carregar contas monitoradas:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const addAccount = useCallback(async (platform: string, username: string) => {
    if (!token) return;
    try {
      const data = await trackAccount(token, { platform, username });
      if (data.account) {
        setAccounts((prev) => [data.account, ...prev.filter((a) => a.id !== data.account.id)]);
      }
      return data.account;
    } catch (e: any) {
      throw e;
    }
  }, [token]);

  const removeAccount = useCallback(async (accountId: number) => {
    if (!token) return;
    try {
      await untrackAccount(token, accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (e) {
      console.error("Erro ao remover conta:", e);
    }
  }, [token]);

  const refresh = useCallback(async (accountId: number) => {
    if (!token) return;
    try {
      await refreshAccount(token, accountId);
    } catch (e) {
      console.error("Erro ao atualizar conta:", e);
    }
  }, [token]);

  return {
    accounts,
    loading,
    addAccount,
    removeAccount,
    refresh,
    reload: loadAccounts,
  };
}
