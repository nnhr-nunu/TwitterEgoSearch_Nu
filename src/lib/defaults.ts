import { uniqueHandles } from "./handle";
import { DEFAULT_HONORIFIC_IDS, normalizeHonorificIds } from "./honorifics";
import type { HonorificId, SearchConfig } from "./types";

export const OWNER_HANDLE = "nnhr_nunu";
export const OWNER_DISPLAY_NAME = "ぬぬはら";
export const OWNER_PROFILE_URL = "https://twitter.com/nnhr_nunu";

export const OWNER_KEYWORDS = ["ぬぬはら", "ぬぬさん", "ﾇﾇ\u{1FAC0}"] as const;

function readHonorifics(parsed: Partial<SearchConfig> & { honorifics?: unknown }): HonorificId[] {
  const raw = parsed.honorifics;
  if (Array.isArray(raw)) {
    return normalizeHonorificIds(raw.filter((item) => typeof item === "string"));
  }
  if (raw === true) return [...DEFAULT_HONORIFIC_IDS];
  if (raw === false) return [];
  return [...DEFAULT_HONORIFIC_IDS];
}

export function createDefaultConfig(): SearchConfig {
  return {
    handle: "",
    displayName: "",
    keywords: [],
    mutedHandles: [],
    honorifics: [...DEFAULT_HONORIFIC_IDS],
    wrapQuotes: true,
    excludeOwn: true,
    fromSelf: false,
    mediaOnly: true,
    latest: true,
    since: "",
    until: "",
  };
}

export function createOwnerSampleConfig(): SearchConfig {
  return {
    handle: OWNER_HANDLE,
    displayName: OWNER_DISPLAY_NAME,
    keywords: [...OWNER_KEYWORDS],
    mutedHandles: [],
    honorifics: [...DEFAULT_HONORIFIC_IDS],
    wrapQuotes: true,
    excludeOwn: true,
    fromSelf: false,
    mediaOnly: true,
    latest: true,
    since: "",
    until: "",
  };
}

export function hydrateConfig(parsed: Partial<SearchConfig> | null | undefined): SearchConfig {
  const defaults = createDefaultConfig();
  if (!parsed || typeof parsed !== "object") return defaults;
  return {
    handle: typeof parsed.handle === "string" ? parsed.handle : defaults.handle,
    displayName: typeof parsed.displayName === "string" ? parsed.displayName : defaults.displayName,
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((item): item is string => typeof item === "string")
      : defaults.keywords,
    mutedHandles: uniqueHandles(
      Array.isArray(parsed.mutedHandles)
        ? parsed.mutedHandles.filter((item): item is string => typeof item === "string")
        : defaults.mutedHandles,
    ),
    honorifics: readHonorifics(parsed),
    wrapQuotes: typeof parsed.wrapQuotes === "boolean" ? parsed.wrapQuotes : defaults.wrapQuotes,
    excludeOwn: typeof parsed.excludeOwn === "boolean" ? parsed.excludeOwn : defaults.excludeOwn,
    fromSelf: typeof parsed.fromSelf === "boolean" ? parsed.fromSelf : defaults.fromSelf,
    mediaOnly: typeof parsed.mediaOnly === "boolean" ? parsed.mediaOnly : false,
    latest: typeof parsed.latest === "boolean" ? parsed.latest : defaults.latest,
    since: typeof parsed.since === "string" ? parsed.since : defaults.since,
    until: typeof parsed.until === "string" ? parsed.until : defaults.until,
  };
}

export function cloneConfig(config: SearchConfig): SearchConfig {
  const hydrated = hydrateConfig(config);
  return {
    ...hydrated,
    keywords: [...hydrated.keywords],
    mutedHandles: [...hydrated.mutedHandles],
    honorifics: [...hydrated.honorifics],
  };
}

export function isBlankConfig(config: SearchConfig): boolean {
  return (
    !config.handle.trim() &&
    !config.keywords.some((keyword) => keyword.trim()) &&
    !config.fromSelf
  );
}
