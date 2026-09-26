import { createDefaultConfig, hydrateConfig, readMinFaves } from "./defaults";
import { uniqueHandles } from "./handle";
import { DEFAULT_HONORIFIC_IDS, normalizeHonorificIds } from "./honorifics";
import type { DateSpanId, HonorificId, Locale, ResultSort, SearchConfig } from "./types";

const BOOL_TRUE = new Set(["1", "true", "yes", "on"]);
const SORTS: ResultSort[] = ["latest", /* "oldest", */ "likes"];
const SPANS: DateSpanId[] = ["7", "14", "month", "quarter"];

function readBool(value: string | null, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  if (BOOL_TRUE.has(value.toLowerCase())) return true;
  return false;
}

function parseHonorifics(params: URLSearchParams): HonorificId[] {
  if (!params.has("hon")) return [];
  const raw = [...params.getAll("hon")].join(",");
  if (raw === "1" || raw.toLowerCase() === "true") return [...DEFAULT_HONORIFIC_IDS];
  if (raw === "0" || raw.toLowerCase() === "false" || raw === "") return [];
  return normalizeHonorificIds(raw.split(/[+,]/).map((part) => part.trim()));
}

function parseSort(params: URLSearchParams): ResultSort {
  const raw = params.get("sort");
  if (raw && SORTS.includes(raw as ResultSort)) return raw as ResultSort;
  if (raw === "oldest") return "latest";
  if (params.has("live") && !readBool(params.get("live"), true)) return "likes";
  return "latest";
}

function parseSpan(value: string | null): DateSpanId | undefined {
  if (value && SPANS.includes(value as DateSpanId)) return value as DateSpanId;
  return undefined;
}

export function serializeSearchParams(
  config: SearchConfig,
  locale: Locale,
): URLSearchParams {
  const params = new URLSearchParams();
  const handles = uniqueHandles(config.handles.length > 0 ? config.handles : [config.handle]);
  for (const handle of handles) params.append("h", handle);
  if (config.displayName.trim()) params.set("n", config.displayName.trim());
  for (const keyword of config.keywords) {
    const trimmed = keyword.trim();
    if (trimmed) params.append("k", trimmed);
  }
  for (const keyword of config.filterKeywords ?? []) {
    const trimmed = keyword.trim();
    if (trimmed) params.append("fk", trimmed);
  }
  for (const handle of uniqueHandles(config.mutedHandles ?? [])) {
    params.append("mute", handle);
  }
  for (const keyword of config.mutedKeywords ?? []) {
    const trimmed = keyword.trim();
    if (trimmed) params.append("mk", trimmed);
  }
  params.set("q", config.wrapQuotes ? "1" : "0");
  params.set("hon", config.honorifics.length > 0 ? config.honorifics.join(",") : "0");
  params.set("x", config.excludeOwn ? "1" : "0");
  params.set("own", config.fromSelf ? "1" : "0");
  params.set("m", config.mediaOnly ? "1" : "0");
  if (config.matchAll) params.set("and", "1");
  params.set("df", config.dateFilter ? "1" : "0");
  params.set("rf", config.rangeFilter ? "1" : "0");
  params.set("sort", config.sort);
  params.set("live", config.sort === "latest" ? "1" : "0");
  if (config.minFaves > 0) params.set("fav", String(config.minFaves));
  if (config.aroundDate) params.set("around", config.aroundDate);
  params.set("span", config.dateSpan);
  if (config.rangeStart) params.set("rs", config.rangeStart);
  if (config.rangeEnd) params.set("re", config.rangeEnd);
  if (config.since) params.set("since", config.since);
  if (config.until) params.set("until", config.until);
  if (locale !== "ja") params.set("lang", locale);
  return params;
}

export function parseSearchParams(
  search: string | URLSearchParams,
): { config: SearchConfig; locale: Locale; found: boolean; shared: boolean } {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const defaults = createDefaultConfig();
  const keywords = params.getAll("k").map((value) => value.trim()).filter(Boolean);
  const mutedHandles = uniqueHandles(params.getAll("mute"));
  const handles = uniqueHandles(params.getAll("h"));
  const found =
    params.has("h") ||
    params.has("n") ||
    keywords.length > 0 ||
    params.has("fk") ||
    mutedHandles.length > 0 ||
    params.has("mk") ||
    params.has("since") ||
    params.has("until") ||
    params.has("around") ||
    params.get("share") === "1";

  const lang = params.get("lang");
  const locale: Locale = lang === "en" ? "en" : "ja";

  if (!found) {
    return { config: defaults, locale, found: false, shared: false };
  }

  const sort = parseSort(params);
  return {
    found: true,
    // シェア投稿から来たリンク。受け取った側の保存済み設定は上書きしない
    shared: params.get("share") === "1",
    locale,
    config: hydrateConfig({
      handle: handles[0] ?? "",
      handles,
      displayName: params.get("n")?.trim() || defaults.displayName,
      keywords: keywords.length > 0 ? keywords : defaults.keywords,
      filterKeywords: params.getAll("fk"),
      mutedHandles,
      mutedKeywords: params.getAll("mk"),
      honorifics: parseHonorifics(params),
      wrapQuotes: readBool(params.get("q"), defaults.wrapQuotes),
      excludeOwn: readBool(params.get("x"), defaults.excludeOwn),
      fromSelf: readBool(params.get("own"), defaults.fromSelf),
      mediaOnly: params.has("m") ? readBool(params.get("m"), true) : false,
      matchAll: readBool(params.get("and"), false),
      latest: sort === "latest",
      sort,
      minFaves: readMinFaves(params.get("fav")),
      aroundDate: params.get("around")?.trim() || defaults.aroundDate,
      dateSpan: parseSpan(params.get("span")) ?? defaults.dateSpan,
      dateFilter:
        readBool(params.get("df"), false),
      rangeFilter: readBool(params.get("rf"), false),
      rangeStart: params.get("rs")?.trim() || "",
      rangeEnd: params.get("re")?.trim() || "",
      since: params.get("since")?.trim() || "",
      until: params.get("until")?.trim() || "",
    }),
  };
}

export function buildSharePath(config: SearchConfig, locale: Locale): string {
  const params = serializeSearchParams(config, locale);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
