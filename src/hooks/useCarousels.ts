import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const PAGE_SIZE = 6;

export interface Slide {
  slide_number?: number | string;
  prompt: string;
  style: string;
  image_url?: string;
}

export interface Carousel {
  id: string;
  title: string;
  status: "generating" | "done" | "failed";
  slides: Slide[];
  reference_images: string[];
  created_at: string;
}

export function useCarousels(token: string) {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const fetchCarousels = useCallback(async (reset = true) => {
    if (!token) return;
    try {
      if (reset) {
        setLoading(true);
        offsetRef.current = 0;
      } else {
        setLoadingMore(true);
      }
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offsetRef.current),
      });
      const res = await fetch(`${API_URL}/carousel/?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erro ao buscar carrosséis");
      const data = await res.json();
      const newCarousels: Carousel[] = data.carousels || [];
      setHasMore(data.has_more ?? false);
      if (reset) {
        setCarousels(newCarousels);
      } else {
        setCarousels(prev => [...prev, ...newCarousels]);
      }
      offsetRef.current += newCarousels.length;
    } catch (err) {
      console.error("Erro ao buscar carrosséis:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCarousels(true);
  }, [fetchCarousels]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchCarousels(false);
  }, [fetchCarousels, loadingMore, hasMore]);

  return { carousels, loading, loadingMore, hasMore, loadMore, refresh: () => fetchCarousels(true) };
}
