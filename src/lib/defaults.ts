import { resolveQueryWindow, todayIso, isIsoDate } from "./dates";
import { uniqueHandles } from "./handle";
import { DEFAULT_HONORIFIC_IDS, normalizeHonorificIds } from "./honorifics";
import {
  MIN_FAVES_OPTIONS,
  type DateSpanId,
  type HonorificId,
  type MinFaves,
  type ResultSort,
  type SearchConfig,
} from "./types";

export const OWNER_HANDLE = "nnhr_nunu";
export const OWNER_DISPLAY_NAME = "ぬぬはら";
export const OWNER_PROFILE_URL = "https://twitter.com/nnhr_nunu";

export const OWNER_KEYWORDS = ["ぬぬはら", "ぬぬさん", "\uFF87\uFF87\u{1FAC0}"] as const;

const DATE_SPANS: DateSpanId[] = ["7", "14", "month", "quarter"];
// 古い順は X で実現できないので受け付けない（latest に戻す）
const SORTS: ResultSort[] = ["latest", /* "oldest", */ "likes"];

export function readMinFaves(value: unknown): MinFaves {
  const parsed = typeof value === "string" ? Number(value) : value;
  return MIN_FAVES_OPTIONS.find((option) => option === parsed) ?? 0;
}

function readHonorifics(parsed: Partial<SearchConfig> & { honorifics?: unknown }): HonorificId[] {
  const raw = parsed.honorifics;
  if (Array.isArray(raw)) {
    return normalizeHonorificIds(raw.filter((item) => typeof item === "string"));
  }
  if (raw === true) return [...DEFAULT_HONORIFIC_IDS];
  if (raw === false) return [];
  return [...DEFAULT_HONORIFIC_IDS];
}

function readHandles(parsed: Partial<SearchConfig>): string[] {
  if (Array.isArray(parsed.handles)) {
    return uniqueHandles(parsed.handles.filter((item): item is string => typeof item === "string"));
  }
  if (typeof parsed.handle === "string" && parsed.handle.trim()) {
    return uniqueHandles([parsed.handle]);
  }
  return [];
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readSort(parsed: Partial<SearchConfig>): ResultSort {
  if (parsed.sort && SORTS.includes(parsed.sort)) return parsed.sort;
  if (parsed.sort === "oldest") return "latest";
  if (parsed.latest === false) return "likes";
  return "latest";
}

function readSpan(value: unknown): DateSpanId {
  if (typeof value === "string" && DATE_SPANS.includes(value as DateSpanId)) {
    return value as DateSpanId;
  }
  return "7";
}

function withDateWindow(config: SearchConfig): SearchConfig {
  const aroundDate = isIsoDate(config.aroundDate) ? config.aroundDate : todayIso();
  const rangeEnd = isIsoDate(config.rangeEnd) ? config.rangeEnd : "";
  const rangeStart = isIsoDate(config.rangeStart) ? config.rangeStart : "";
  const { since, until } = resolveQueryWindow({
    ...config,
    aroundDate,
    rangeStart,
    rangeEnd,
  });
  return { ...config, aroundDate, rangeStart, rangeEnd, since, until };
}

export function createDefaultConfig(): SearchConfig {
  const handles: string[] = [];
  return withDateWindow({
    handle: "",
    handles,
    displayName: "",
    keywords: [],
    filterKeywords: [],
    mutedHandles: [],
    mutedKeywords: [],
    honorifics: [],
    wrapQuotes: true,
    excludeOwn: true,
    fromSelf: false,
    mediaOnly: false,
    matchAll: false,
    latest: true,
    sort: "latest",
    minFaves: 0,
    aroundDate: todayIso(),
    dateSpan: "7",
    dateFilter: false,
    rangeFilter: false,
    rangeStart: "",
    rangeEnd: todayIso(),
    since: "",
    until: "",
  });
}

export function createOwnerSampleConfig(): SearchConfig {
  return hydrateConfig({
    handle: OWNER_HANDLE,
    handles: [OWNER_HANDLE],
    displayName: OWNER_DISPLAY_NAME,
    keywords: [...OWNER_KEYWORDS],
    mutedHandles: [],
    honorifics: [],
    wrapQuotes: true,
    excludeOwn: true,
    fromSelf: false,
    mediaOnly: false,
    sort: "latest",
    latest: true,
  });
}

export function hydrateConfig(parsed: Partial<SearchConfig> | null | undefined): SearchConfig {
  const defaults = createDefaultConfig();
  if (!parsed || typeof parsed !== "object") return defaults;
  const handles = readHandles(parsed);
  const sort = readSort(parsed);
  const aroundDate =
    typeof parsed.aroundDate === "string" && isIsoDate(parsed.aroundDate)
      ? parsed.aroundDate
      : defaults.aroundDate;
  const dateSpan = readSpan(parsed.dateSpan);
  return withDateWindow({
    handle: handles[0] ?? "",
    handles,
    displayName: typeof parsed.displayName === "string" ? parsed.displayName : defaults.displayName,
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((item): item is string => typeof item === "string")
      : defaults.keywords,
    filterKeywords: readStringList(parsed.filterKeywords),
    mutedHandles: uniqueHandles(
      Array.isArray(parsed.mutedHandles)
        ? parsed.mutedHandles.filter((item): item is string => typeof item === "string")
        : defaults.mutedHandles,
    ),
    mutedKeywords: readStringList(parsed.mutedKeywords),
    honorifics: readHonorifics(parsed).slice(0, 0),
    wrapQuotes: true,
    excludeOwn: typeof parsed.excludeOwn === "boolean" ? parsed.excludeOwn : defaults.excludeOwn,
    fromSelf: typeof parsed.fromSelf === "boolean" ? parsed.fromSelf : defaults.fromSelf,
    mediaOnly: parsed.mediaOnly === true,
    matchAll: parsed.matchAll === true,
    latest: sort === "latest",
    sort,
    minFaves: readMinFaves(parsed.minFaves),
    aroundDate,
    dateSpan,
    dateFilter: parsed.dateFilter === true,
    rangeFilter: parsed.rangeFilter === true,
    rangeStart: typeof parsed.rangeStart === "string" && isIsoDate(parsed.rangeStart) ? parsed.rangeStart : "",
    rangeEnd:
      typeof parsed.rangeEnd === "string"
        ? isIsoDate(parsed.rangeEnd)
          ? parsed.rangeEnd
          : ""
        : todayIso(),
    since: "",
    until: "",
  });
}

export function cloneConfig(config: SearchConfig): SearchConfig {
  const hydrated = hydrateConfig(config);
  return {
    ...hydrated,
    handles: [...hydrated.handles],
    keywords: [...hydrated.keywords],
    filterKeywords: [...hydrated.filterKeywords],
    mutedHandles: [...hydrated.mutedHandles],
    mutedKeywords: [...hydrated.mutedKeywords],
    honorifics: [...hydrated.honorifics],
  };
}

export function isBlankConfig(config: SearchConfig): boolean {
  return (
    !config.handles.some((item) => item.trim()) &&
    !config.handle.trim() &&
    !config.keywords.some((keyword) => keyword.trim())
  );
}
