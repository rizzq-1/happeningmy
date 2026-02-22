"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "happeningmy-saved-events";

function getSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useSavedEvents() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setSavedIds(getSavedIds());
  }, []);

  const isSaved = useCallback(
    (eventId: string) => savedIds.includes(eventId),
    [savedIds]
  );

  const toggleSave = useCallback((eventId: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      persistIds(next);
      return next;
    });
  }, []);

  return { savedIds, isSaved, toggleSave };
}
