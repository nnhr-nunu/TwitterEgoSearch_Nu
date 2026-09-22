import { hydrateConfig } from "./defaults";
import type { SearchConfig } from "./types";

export const CONFIG_STORAGE_KEY = "egosearch-nu:config";
export const LOCALE_STORAGE_KEY = "egosearch-nu:locale";

export function loadLastConfig(): SearchConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SearchConfig>;
    if (!parsed || typeof parsed !== "object") return null;
    return hydrateConfig(parsed);
  } catch {
    return null;
  }
}

export function saveLastConfig(config: SearchConfig): void {
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}
