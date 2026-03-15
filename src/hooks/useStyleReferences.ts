import { useState, useEffect, useCallback } from "react";
import {
  fetchStyleReferences,
  createStyleReference,
  deleteStyleReference,
  uploadStyleReferenceImage,
} from "../lib/api";

export interface StyleReference {
  id: number;
  user_id: string;
  brand_profile_id: number | null;
  image_url: string;
  title: string;
  source_url: string;
  extracted_colors: Record<string, string>;
  style_description: string;
  tags: string;
  created_at: string;
}

export function useStyleReferences(token: string | null) {
  const [references, setReferences] = useState<StyleReference[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (brandProfileId?: number) => {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchStyleReferences(token, brandProfileId);
        setReferences(data.references || []);
      } catch (e) {
        console.error("Erro ao carregar style references:", e);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: {
      image_url: string;
      title?: string;
      source_url?: string;
      brand_profile_id?: number;
      extracted_colors?: Record<string, string>;
      style_description?: string;
      tags?: string;
    }) => {
      if (!token) return null;
      const res = await createStyleReference(token, data);
      if (res.reference) {
        setReferences((prev) => [res.reference, ...prev]);
      }
      return res.reference;
    },
    [token],
  );

  const remove = useCallback(
    async (refId: number) => {
      if (!token) return false;
      await deleteStyleReference(token, refId);
      setReferences((prev) => prev.filter((r) => r.id !== refId));
      return true;
    },
    [token],
  );

  const upload = useCallback(
    async (file: File) => {
      if (!token) return null;
      const res = await uploadStyleReferenceImage(token, file);
      return res.url as string;
    },
    [token],
  );

  return { references, loading, load, create, remove, upload };
}
