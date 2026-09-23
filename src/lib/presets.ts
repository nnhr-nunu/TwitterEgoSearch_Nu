import { cloneConfig, createDefaultConfig, hydrateConfig } from "./defaults";
import { uniqueHandles } from "./handle";
import type { SavedPreset, SearchConfig } from "./types";

export const PRESET_STORAGE_KEY = "egosearch-nu:presets";

export type FilterPresetId = "builtin-latest" | "builtin-media" | "builtin-own";

export function applyFilterPreset(
  id: FilterPresetId,
  current: SearchConfig,
): SearchConfig {
  const base = cloneConfig(current);
  if (id === "builtin-media") {
    return {
      ...base,
      latest: true,
      sort: "latest",
      mediaOnly: true,
      fromSelf: false,
      excludeOwn: true,
    };
  }
  if (id === "builtin-own") {
    return {
      ...base,
      fromSelf: true,
      excludeOwn: false,
      mediaOnly: false,
    };
  }
  return {
    ...base,
    latest: true,
    sort: "latest",
    mediaOnly: false,
    fromSelf: false,
    excludeOwn: true,
  };
}

export function builtinPresets(current: SearchConfig = createDefaultConfig()): SavedPreset[] {
  return [
    {
      id: "builtin-latest",
      name: "latest",
      config: applyFilterPreset("builtin-latest", current),
    },
    {
      id: "builtin-media",
      name: "media",
      config: applyFilterPreset("builtin-media", current),
    },
    {
      id: "builtin-own",
      name: "own",
      config: applyFilterPreset("builtin-own", current),
    },
  ];
}

export function loadPresets(): SavedPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPreset).map((preset) => ({
      ...preset,
      config: hydrateConfig(preset.config),
    }));
  } catch {
    return [];
  }
}

export function savePresets(presets: SavedPreset[]): void {
  window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

function isPreset(value: SavedPreset): value is SavedPreset {
  return Boolean(
    value && typeof value.id === "string" && typeof value.name === "string" && value.config,
  );
}

export function configsMatch(a: SearchConfig, b: SearchConfig): boolean {
  return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b));
}

function normalizeForCompare(config: SearchConfig): SearchConfig {
  const hydrated = hydrateConfig(config);
  return {
    ...hydrated,
    handle: hydrated.handle.trim(),
    handles: [...hydrated.handles],
    displayName: hydrated.displayName.trim(),
    keywords: hydrated.keywords.map((keyword) => keyword.trim()).filter(Boolean),
    filterKeywords: [...hydrated.filterKeywords],
    mutedHandles: uniqueHandles(hydrated.mutedHandles),
    mutedKeywords: [...hydrated.mutedKeywords],
    honorifics: [...hydrated.honorifics],
    sort: hydrated.sort,
    aroundDate: hydrated.aroundDate,
    dateSpan: hydrated.dateSpan,
    rangeFilter: hydrated.rangeFilter,
    rangeStart: hydrated.rangeStart,
    rangeEnd: hydrated.rangeEnd,
    since: hydrated.since.trim(),
    until: hydrated.until.trim(),
  };
}
