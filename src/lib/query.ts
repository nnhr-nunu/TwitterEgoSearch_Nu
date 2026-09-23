import { uniqueHandles } from "./handle";
import { expandSearchTerms } from "./honorifics";
import type { ResultSort, SearchConfig } from "./types";

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

export function ownHandlesOf(config: SearchConfig): string[] {
  return uniqueHandles([...(config.handles ?? []), config.handle ?? ""]);
}

export function excludedFromHandles(config: SearchConfig): string[] {
  if (config.fromSelf) return [];
  const own = ownHandlesOf(config);
  return uniqueHandles([
    ...(config.excludeOwn ? own : []),
    ...(config.mutedHandles ?? []),
  ]);
}

export function buildPostsQuery(config: SearchConfig): string {
  const own = ownHandlesOf(config);
  const handle = own[0] ?? "";
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

  for (const extra of config.filterKeywords ?? []) {
    const quoted = quoteTerm(extra, config.wrapQuotes);
    if (quoted) parts.push(quoted);
  }

  for (const muted of config.mutedKeywords ?? []) {
    const quoted = quoteTerm(muted, config.wrapQuotes);
    if (quoted) parts.push(`-${quoted}`);
  }

  // 画像・動画つきだけ は非表示中なので filter:media を付けない
  // if (config.mediaOnly) parts.push("filter:media");
  if (config.since.trim()) parts.push(`since:${config.since.trim()}`);
  if (config.until.trim()) parts.push(`until:${config.until.trim()}`);

  return parts.join(" ");
}

export function buildPeopleQuery(config: SearchConfig): string {
  return orGroup(searchTermsOf(config), config.wrapQuotes);
}

export type SearchKind = "posts" | "people";

export function sortParamOf(sort: ResultSort | boolean | undefined): "live" | "top" | null {
  if (sort === true || sort === "latest") return "live";
  if (sort === "likes" || sort === false) return "top";
  return null;
}

export function buildSearchUrl(
  query: string,
  kind: SearchKind,
  sort: ResultSort | boolean = "latest",
): string {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("src", "typed_query");
  if (kind === "people") {
    params.set("f", "user");
  } else {
    const tab = sortParamOf(sort);
    if (tab) params.set("f", tab);
  }
  return `https://x.com/search?${params.toString()}`;
}

export function canSearchPosts(config: SearchConfig): boolean {
  return searchTermsOf(config).length > 0 || (config.fromSelf && ownHandlesOf(config).length > 0);
}

export function canSearchPeople(config: SearchConfig): boolean {
  return searchTermsOf(config).length > 0;
}
