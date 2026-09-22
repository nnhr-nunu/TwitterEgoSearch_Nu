import { normalizeHandle, uniqueHandles } from "./handle";
import { expandSearchTerms } from "./honorifics";
import type { SearchConfig } from "./types";

export function searchTermsOf(config: SearchConfig): string[] {
  return expandSearchTerms(config.keywords, config.honorifics);
}

export function quoteTerm(term: string, wrapQuotes: boolean): string {
  const trimmed = term.trim();
  if (!trimmed) return "";
  const needsQuotes = wrapQuotes || /[\s"]/.test(trimmed);
  if (!needsQuotes) return trimmed;
  return `"${trimmed.replace(/"/g, "")}"`;
}

export function orGroup(keywords: string[], wrapQuotes: boolean): string {
  const parts = keywords.map((keyword) => quoteTerm(keyword, wrapQuotes)).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `(${parts.join(" OR ")})`;
}

export function excludedFromHandles(config: SearchConfig): string[] {
  if (config.fromSelf) return [];
  const own = normalizeHandle(config.handle);
  return uniqueHandles([
    ...(config.excludeOwn && own ? [own] : []),
    ...(config.mutedHandles ?? []),
  ]);
}

export function buildPostsQuery(config: SearchConfig): string {
  const handle = normalizeHandle(config.handle);
  const keywords = orGroup(searchTermsOf(config), config.wrapQuotes);
  const parts: string[] = [];

  if (config.fromSelf && handle) {
    parts.push(`from:${handle}`);
    if (keywords) parts.push(keywords);
  } else {
    if (keywords) parts.push(keywords);
    for (const excluded of excludedFromHandles(config)) {
      parts.push(`-from:${excluded}`);
    }
  }

  if (config.mediaOnly) parts.push("filter:media");
  if (config.since.trim()) parts.push(`since:${config.since.trim()}`);
  if (config.until.trim()) parts.push(`until:${config.until.trim()}`);

  return parts.join(" ");
}

export function buildPeopleQuery(config: SearchConfig): string {
  return orGroup(searchTermsOf(config), config.wrapQuotes);
}

export type SearchKind = "posts" | "people";

export function buildSearchUrl(
  query: string,
  kind: SearchKind,
  latest: boolean,
): string {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("src", "typed_query");
  if (kind === "people") {
    params.set("f", "user");
  } else if (latest) {
    params.set("f", "live");
  }
  return `https://x.com/search?${params.toString()}`;
}

export function canSearchPosts(config: SearchConfig): boolean {
  return searchTermsOf(config).length > 0 || (config.fromSelf && Boolean(normalizeHandle(config.handle)));
}

export function canSearchPeople(config: SearchConfig): boolean {
  return searchTermsOf(config).length > 0;
}
