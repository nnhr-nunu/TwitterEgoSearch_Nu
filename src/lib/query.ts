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

// X の検索は空白区切りが AND
export function andGroup(keywords: string[], wrapQuotes: boolean): string {
  return keywords.map((keyword) => quoteTerm(keyword, wrapQuotes)).filter(Boolean).join(" ");
}

function keywordGroup(config: SearchConfig): string {
  const group = config.matchAll ? andGroup : orGroup;
  return group(searchTermsOf(config), config.wrapQuotes);
}

export function ownHandlesOf(config: SearchConfig): string[] {
  return uniqueHandles([...(config.handles ?? []), config.handle ?? ""]);
}

// 「アカウントで絞り込む」の @id。excludeOwn / fromSelf は旧 UI の名残で、クエリには使わない
export function excludedFromHandles(config: SearchConfig): string[] {
  const narrowed = new Set(ownHandlesOf(config).map((handle) => handle.toLowerCase()));
  return uniqueHandles(config.mutedHandles ?? []).filter(
    (handle) => !narrowed.has(handle.toLowerCase()),
  );
}

export function fromGroup(handles: string[]): string {
  const parts = handles.map((handle) => `from:${handle}`);
  if (parts.length <= 1) return parts[0] ?? "";
  return `(${parts.join(" OR ")})`;
}

export function buildPostsQuery(config: SearchConfig): string {
  const keywords = keywordGroup(config);
  const parts: string[] = [];

  if (keywords) parts.push(keywords);
  const from = fromGroup(ownHandlesOf(config));
  if (from) parts.push(from);
  for (const excluded of excludedFromHandles(config)) {
    parts.push(`-from:${excluded}`);
  }

  for (const extra of config.filterKeywords ?? []) {
    const quoted = quoteTerm(extra, config.wrapQuotes);
    if (quoted) parts.push(quoted);
  }

  for (const muted of config.mutedKeywords ?? []) {
    const quoted = quoteTerm(muted, config.wrapQuotes);
    if (quoted) parts.push(`-${quoted}`);
  }

  if (config.mediaOnly) parts.push("filter:media");
  if (config.since.trim()) parts.push(`since:${config.since.trim()}`);
  if (config.until.trim()) parts.push(`until:${config.until.trim()}`);
  // いいね数で絞り込むは非表示中なので min_faves: を付けない
  // if (config.minFaves > 0) parts.push(`min_faves:${config.minFaves}`);

  return parts.join(" ");
}

export function buildPeopleQuery(config: SearchConfig): string {
  return keywordGroup(config);
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
  return searchTermsOf(config).length > 0 || ownHandlesOf(config).length > 0;
}

export function canSearchPeople(config: SearchConfig): boolean {
  return searchTermsOf(config).length > 0;
}
