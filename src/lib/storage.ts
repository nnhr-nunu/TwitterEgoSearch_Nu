import { cloneConfig, createDefaultConfig, hydrateConfig } from "./defaults";
import type { SearchConfig, SlotIndex } from "./types";
import { SLOT_COUNT } from "./types";

export const CONFIG_STORAGE_KEY = "egosearch-nu:config";
export const LOCALE_STORAGE_KEY = "egosearch-nu:locale";
export const SLOTS_STORAGE_KEY = "egosearch-nu:slots";
export const SLOT_INDEX_KEY = "egosearch-nu:slot-index";

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

function emptySlots(): SearchConfig[] {
  return Array.from({ length: SLOT_COUNT }, () => createDefaultConfig());
}

export function loadSlots(): SearchConfig[] {
  if (typeof window === "undefined") return emptySlots();
  try {
    const raw = window.localStorage.getItem(SLOTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const slots = emptySlots();
        for (let i = 0; i < SLOT_COUNT; i += 1) {
          slots[i] = hydrateConfig(parsed[i] as Partial<SearchConfig>);
        }
        return slots;
      }
    }
  } catch {
    // fall through to migrate
  }
  const legacy = loadLastConfig();
  const slots = emptySlots();
  if (legacy) slots[0] = cloneConfig(legacy);
  return slots;
}

export function saveSlots(slots: SearchConfig[]): void {
  window.localStorage.setItem(
    SLOTS_STORAGE_KEY,
    JSON.stringify(slots.slice(0, SLOT_COUNT).map((slot) => cloneConfig(slot))),
  );
}

export function loadActiveSlot(): SlotIndex {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(SLOT_INDEX_KEY);
  const value = Number(raw);
  if (value === 1 || value === 2) return value;
  return 0;
}

export function saveActiveSlot(index: SlotIndex): void {
  window.localStorage.setItem(SLOT_INDEX_KEY, String(index));
}
