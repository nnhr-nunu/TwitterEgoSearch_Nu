import { cloneConfig, createDefaultConfig, hydrateConfig } from "./defaults";
import type { Locale, SearchConfig, SlotIndex } from "./types";
import { SLOT_COUNT } from "./types";

export const CONFIG_STORAGE_KEY = "egosearch-nu:config";
export const LOCALE_STORAGE_KEY = "egosearch-nu:locale";
export const SLOTS_STORAGE_KEY = "egosearch-nu:slots";
export const SLOT_INDEX_KEY = "egosearch-nu:slot-index";

// サイトデータをブロックしたブラウザでは localStorage に触れるだけで例外になる。
// 保存できなくても検索は使えるので、読めなければ null、書けなければ何もしない
export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 容量オーバーや保存の禁止。その場の画面はそのまま使える
  }
}

export function loadLastConfig(): SearchConfig | null {
  try {
    const raw = readStorage(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SearchConfig>;
    if (!parsed || typeof parsed !== "object") return null;
    return hydrateConfig(parsed);
  } catch {
    return null;
  }
}

export function saveLastConfig(config: SearchConfig): void {
  writeStorage(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function emptySlots(): SearchConfig[] {
  return Array.from({ length: SLOT_COUNT }, () => createDefaultConfig());
}

export function loadSlots(): SearchConfig[] {
  try {
    const raw = readStorage(SLOTS_STORAGE_KEY);
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
  writeStorage(SLOTS_STORAGE_KEY, JSON.stringify(slots.slice(0, SLOT_COUNT).map((slot) => cloneConfig(slot))));
}

export function loadActiveSlot(): SlotIndex {
  const value = Number(readStorage(SLOT_INDEX_KEY));
  if (value === 1 || value === 2) return value;
  return 0;
}

export function saveActiveSlot(index: SlotIndex): void {
  writeStorage(SLOT_INDEX_KEY, String(index));
}

export function loadLocale(): Locale {
  return readStorage(LOCALE_STORAGE_KEY) === "en" ? "en" : "ja";
}

export function saveLocale(locale: Locale): void {
  writeStorage(LOCALE_STORAGE_KEY, locale);
}

// 設定1〜3 と YouTube タブのどちらを開いていたか
export const URL_VIEW_KEY = "egosearch-nu:url-view";

export function loadUrlView(): boolean {
  return readStorage(URL_VIEW_KEY) === "1";
}

export function saveUrlView(open: boolean): void {
  writeStorage(URL_VIEW_KEY, open ? "1" : "0");
}

// 「表記ゆれ候補」のうち、隠したもの。この端末だけで覚える（設定の中身ではないので、シェアや引き継ぎに混ぜない）
export const DISMISSED_VARIANTS_KEY = "egosearch-nu:dismissed-variants";
const DISMISSED_VARIANTS_LIMIT = 200;

export function loadDismissedVariants(): string[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(DISMISSED_VARIANTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function saveDismissedVariants(items: string[]): void {
  writeStorage(DISMISSED_VARIANTS_KEY, JSON.stringify(items.slice(-DISMISSED_VARIANTS_LIMIT)));
}
