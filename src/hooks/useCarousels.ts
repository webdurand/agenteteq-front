import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  const fetchCarousels = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/carousel/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erro ao buscar carrosséis");
      const data = await res.json();
      setCarousels(data);
    } catch (err) {
      console.error("Erro ao buscar carrosséis:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCarousels();
  }, [fetchCarousels]);

  return { carousels, loading, refresh: fetchCarousels };
}
