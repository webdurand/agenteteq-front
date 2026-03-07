import { useState, useCallback, useEffect, useRef } from "react";
import { fetchWithAuth } from "../lib/api";
import type { Message } from "./useVoiceChat";

export function useHistory(token: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const loadInitial = useCallback(async () => {
    if (!token) return;
    setIsInitialLoading(true);
    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/chat/history?limit=20", { token });
      const newMessages = res.messages.map((m: any) => ({
        id: m.id.toString(),
        role: m.role,
        text: m.text,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(newMessages);
      setHasMore(res.has_more);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!token || !hasMore || isLoading || messagesRef.current.length === 0) return;
    setIsLoading(true);
    try {
      const firstId = messagesRef.current[0].id;
      const res = await fetchWithAuth(`/api/chat/history?limit=20&before_id=${firstId}`, { token });
      const newMessages = res.messages.map((m: any) => ({
        id: m.id.toString(),
        role: m.role,
        text: m.text,
        timestamp: new Date(m.timestamp),
      }));
      setMessages((prev) => [...newMessages, ...prev]);
      setHasMore(res.has_more);
    } catch (err) {
      console.error("Erro ao carregar mais histórico:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, hasMore, isLoading]);

  return {
    messages,
    setMessages,
    isLoading,
    isInitialLoading,
    hasMore,
    loadMore,
  };
}
