import { createDefaultConfig } from "./defaults";
import { uniqueHandles } from "./handle";
import { DEFAULT_HONORIFIC_IDS, normalizeHonorificIds } from "./honorifics";
import type { HonorificId, Locale, SearchConfig } from "./types";

const BOOL_TRUE = new Set(["1", "true", "yes", "on"]);

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

export function serializeSearchParams(
  config: SearchConfig,
  locale: Locale,
): URLSearchParams {
  const params = new URLSearchParams();
  if (config.handle.trim()) params.set("h", config.handle.trim());
  if (config.displayName.trim()) params.set("n", config.displayName.trim());
  for (const keyword of config.keywords) {
    const trimmed = keyword.trim();
    if (trimmed) params.append("k", trimmed);
  }
  for (const handle of uniqueHandles(config.mutedHandles ?? [])) {
    params.append("mute", handle);
  }
  params.set("q", config.wrapQuotes ? "1" : "0");
  params.set("hon", config.honorifics.length > 0 ? config.honorifics.join(",") : "0");
  params.set("x", config.excludeOwn ? "1" : "0");
  params.set("own", config.fromSelf ? "1" : "0");
  params.set("m", config.mediaOnly ? "1" : "0");
  params.set("live", config.latest ? "1" : "0");
  if (config.since) params.set("since", config.since);
  if (config.until) params.set("until", config.until);
  if (locale !== "ja") params.set("lang", locale);
  return params;
}

export function parseSearchParams(
  search: string | URLSearchParams,
): { config: SearchConfig; locale: Locale; found: boolean } {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const defaults = createDefaultConfig();
  const keywords = params.getAll("k").map((value) => value.trim()).filter(Boolean);
  const mutedHandles = uniqueHandles(params.getAll("mute"));
  const found =
    params.has("h") ||
    params.has("n") ||
    keywords.length > 0 ||
    mutedHandles.length > 0 ||
    params.has("since") ||
    params.has("until") ||
    params.get("share") === "1";

  const lang = params.get("lang");
  const locale: Locale = lang === "en" ? "en" : "ja";

  if (!found) {
    return { config: defaults, locale, found: false };
  }

  return {
    found: true,
    locale,
    config: {
      handle: params.get("h")?.trim() || defaults.handle,
      displayName: params.get("n")?.trim() || defaults.displayName,
      keywords: keywords.length > 0 ? keywords : defaults.keywords,
      mutedHandles,
      honorifics: parseHonorifics(params),
      wrapQuotes: readBool(params.get("q"), defaults.wrapQuotes),
      excludeOwn: readBool(params.get("x"), defaults.excludeOwn),
      fromSelf: readBool(params.get("own"), defaults.fromSelf),
      mediaOnly: params.has("m") ? readBool(params.get("m"), true) : false,
      latest: readBool(params.get("live"), defaults.latest),
      since: params.get("since")?.trim() || "",
      until: params.get("until")?.trim() || "",
    },
  };
}

export function buildSharePath(config: SearchConfig, locale: Locale): string {
  const params = serializeSearchParams(config, locale);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
