import { useCallback, useEffect, useState } from "react";

interface TourPrefs {
  completed: boolean;
  hiddenByUser: boolean;
}

const DEFAULT_PREFS: TourPrefs = {
  completed: false,
  hiddenByUser: false,
};

function getStorageKey(userKey: string) {
  return `teq_product_onboarding_prefs_${userKey}`;
}

function readPrefs(userKey: string): TourPrefs {
  try {
    const raw = localStorage.getItem(getStorageKey(userKey));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      completed: Boolean(parsed.completed),
      hiddenByUser: Boolean(parsed.hiddenByUser),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(userKey: string, prefs: TourPrefs) {
  localStorage.setItem(getStorageKey(userKey), JSON.stringify(prefs));
}

export function useProductTourPreferences(userKey: string) {
  const [prefs, setPrefs] = useState<TourPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(readPrefs(userKey));
  }, [userKey]);

  const markCompleted = useCallback((hideNextTimes: boolean) => {
    const next = {
      completed: true,
      hiddenByUser: hideNextTimes,
    };
    writePrefs(userKey, next);
    setPrefs(next);
  }, [userKey]);

  const resetTour = useCallback(() => {
    const next = {
      completed: false,
      hiddenByUser: false,
    };
    writePrefs(userKey, next);
    setPrefs(next);
  }, [userKey]);

  return {
    ...prefs,
    markCompleted,
    resetTour,
  };
}
