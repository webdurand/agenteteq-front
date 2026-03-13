import { useState, useEffect, useCallback } from "react";
import {
  fetchBrandProfiles,
  createBrandProfile,
  updateBrandProfile,
  deleteBrandProfile,
} from "../lib/api";

export interface BrandProfile {
  id: number;
  user_id: string;
  name: string;
  is_default: boolean;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  bg_color: string;
  text_primary_color: string;
  text_secondary_color: string;
  font_heading: string;
  font_body: string;
  logo_url: string;
  style_description: string;
  tone_of_voice: string;
  target_audience: string;
  created_at: string;
  updated_at: string;
}

export function useBranding(token: string | null) {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchBrandProfiles(token);
      setProfiles(data.profiles || []);
    } catch (e) {
      console.error("Erro ao carregar brand profiles:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: Partial<BrandProfile>) => {
      if (!token) return null;
      const res = await createBrandProfile(token, data);
      if (res.profile) {
        setProfiles((prev) => {
          // If new profile is default, unset others
          if (res.profile.is_default) {
            return [res.profile, ...prev.map((p) => ({ ...p, is_default: false }))];
          }
          return [res.profile, ...prev];
        });
      }
      return res.profile;
    },
    [token],
  );

  const update = useCallback(
    async (profileId: number, data: Partial<BrandProfile>) => {
      if (!token) return null;
      const res = await updateBrandProfile(token, profileId, data);
      if (res.profile) {
        setProfiles((prev) =>
          prev.map((p) => {
            if (p.id === profileId) return res.profile;
            // If updated profile became default, unset others
            if (res.profile.is_default && p.is_default) return { ...p, is_default: false };
            return p;
          }),
        );
      }
      return res.profile;
    },
    [token],
  );

  const remove = useCallback(
    async (profileId: number) => {
      if (!token) return;
      await deleteBrandProfile(token, profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    },
    [token],
  );

  return { profiles, loading, create, update, remove, reload: load };
}
