import { uniqueHandles } from "./handle";
import { orGroup, quoteTerm } from "./query";
import type { ResultSort } from "./types";

export const URL_SEARCH_STORAGE_KEY = "egosearch-nu:url-search";

export type UrlSearchState = {
  url: string;
  // リンクを貼らずに感想を書く人を拾うための言葉（タイトル・略称・ハッシュタグ）
  words: string[];
  // 自分の告知ポストなど、反応として数えたくないアカウント
  excluded: string[];
  since: string;
  sort: ResultSort;
};

export type UrlTargetKind = "video" | "channel" | "page";

export type UrlTarget = {
  kind: UrlTargetKind;
  // X の url: 演算子に渡す値。展開後の URL の一部に一致する
  token: string;
};

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com"]);

export function createDefaultUrlSearch(): UrlSearchState {
  return { url: "", words: [], excluded: [], since: "", sort: "latest" };
}

function toUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    // スキームなしの「abc」などを URL とみなさないよう、ドメインにドットを求める
    return url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

function youtubeTarget(host: string, url: URL): UrlTarget | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") {
    const id = segments[0] ?? "";
    return VIDEO_ID_RE.test(id) ? { kind: "video", token: id } : null;
  }
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const v = url.searchParams.get("v") ?? "";
  if (segments[0] === "watch" && VIDEO_ID_RE.test(v)) return { kind: "video", token: v };
  if (["shorts", "live", "embed"].includes(segments[0] ?? "") && VIDEO_ID_RE.test(segments[1] ?? "")) {
    return { kind: "video", token: segments[1] };
  }

  const first = segments[0] ?? "";
  if (first.startsWith("@") && first.length > 1) {
    return { kind: "channel", token: decodeURIComponent(first.slice(1)) };
  }
  if (["channel", "c", "user"].includes(first) && segments[1]) {
    return { kind: "channel", token: decodeURIComponent(segments[1]) };
  }
  return null;
}

export function parseTargetUrl(raw: string): UrlTarget | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const youtube = youtubeTarget(host, url);
  if (youtube) return youtube;
  if (host === "youtu.be" || YOUTUBE_HOSTS.has(host)) {
    // トップページや検索結果など、特定の動画・チャンネルでない YouTube URL は受け付けない
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "");
  return { kind: "page", token: `${host}${path}` };
}

export function linkTerm(target: UrlTarget): string {
  // 先頭の - は除外演算子と読まれるので引用符で囲む
  return `url:${quoteTerm(target.token, target.kind === "page" || target.token.startsWith("-"))}`;
}

function tailParts(state: UrlSearchState): string[] {
  const parts = uniqueHandles(state.excluded).map((handle) => `-from:${handle}`);
  if (state.since.trim()) parts.push(`since:${state.since.trim()}`);
  return parts;
}

function withTail(head: string, state: UrlSearchState): string {
  if (!head) return "";
  return [head, ...tailParts(state)].join(" ");
}

export type UrlQueries = {
  // リンクと言葉のどちらかを含む投稿。メインの検索
  all: string;
  link: string;
  words: string;
};

export function buildUrlQueries(state: UrlSearchState): UrlQueries {
  const target = parseTargetUrl(state.url);
  const link = target ? linkTerm(target) : "";
  const wordGroup = orGroup(state.words, false);
  const terms = [link, ...state.words.map((word) => quoteTerm(word, false))].filter(Boolean);
  const all = terms.length > 1 ? `(${terms.join(" OR ")})` : (terms[0] ?? "");
  return {
    all: withTail(all, state),
    link: withTail(link, state),
    words: withTail(wordGroup, state),
  };
}

export function loadUrlSearch(): UrlSearchState {
  const fallback = createDefaultUrlSearch();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(URL_SEARCH_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UrlSearchState>;
    const strings = (value: unknown) =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return {
      url: typeof parsed.url === "string" ? parsed.url : "",
      words: strings(parsed.words),
      excluded: strings(parsed.excluded),
      since: typeof parsed.since === "string" ? parsed.since : "",
      sort: parsed.sort === "likes" ? "likes" : "latest",
    };
  } catch {
    return fallback;
  }
}

export function saveUrlSearch(state: UrlSearchState): void {
  try {
    window.localStorage.setItem(URL_SEARCH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても検索は使える
  }
}
