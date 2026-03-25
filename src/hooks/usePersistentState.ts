import { useEffect, useState } from "react";

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    const saved = window.localStorage.getItem(key);
    if (!saved) return defaultValue;
    try {
      return JSON.parse(saved) as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to persist state", key, err);
    }
  }, [key, state]);

  return [state, setState] as const;
}
