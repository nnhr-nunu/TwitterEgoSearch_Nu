import { uniqueHandles } from "./handle";
import { orGroup, quoteTerm } from "./query";
import type { ResultSort } from "./types";
import { type ChannelVideo, VIDEO_KINDS, type VideoKind, videoYear } from "./youtube";

export const URL_SEARCH_STORAGE_KEY = "egosearch-nu:url-search";

export type UrlSearchState = {
  url: string;
  // リンクを貼らずに感想を書く人を拾うための言葉（タイトル・略称・ハッシュタグ）
  words: string[];
  // 自分の告知ポストなど、反応として数えたくないアカウント
  excluded: string[];
  since: string;
  sort: ResultSort;
  // チャンネルの動画一覧の絞り込み。空は「すべて」
  videoKinds: VideoKind[];
  videoYears: string[];
  videoTitle: string;
};

export type UrlTargetKind = "video" | "channel" | "niconico" | "page";

export type UrlTarget = {
  kind: UrlTargetKind;
  // X の url: 演算子に渡す値。展開後の URL の一部に一致する
  token: string;
};

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com"]);
// ニコニコ動画（sm/so/nm）と生放送（lv）の ID。nico.ms の短縮 URL にも同じ ID が入る
const NICONICO_ID_RE = /^(?:sm|so|nm|lv)\d+$/;
const NICONICO_HOSTS = new Set(["nicovideo.jp", "sp.nicovideo.jp", "live.nicovideo.jp", "sp.live.nicovideo.jp", "nico.ms"]);

// X の検索窓に入る長さの目安。長すぎるクエリは X 側で失敗するので分けて開く
export const MAX_QUERY_LENGTH = 480;

export function createDefaultUrlSearch(): UrlSearchState {
  return {
    url: "",
    words: [],
    excluded: [],
    since: "",
    sort: "latest",
    videoKinds: [],
    videoYears: [],
    videoTitle: "",
  };
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

function niconicoTarget(host: string, url: URL): UrlTarget | null {
  if (!NICONICO_HOSTS.has(host)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const id = host === "nico.ms" ? segments[0] : segments[0] === "watch" ? segments[1] : "";
  return id && NICONICO_ID_RE.test(id) ? { kind: "niconico", token: id } : null;
}

export function parseTargetUrl(raw: string): UrlTarget | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const youtube = youtubeTarget(host, url);
  if (youtube) return youtube;
  const niconico = niconicoTarget(host, url);
  if (niconico) return niconico;
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

function tokenTerm(token: string): string {
  return `url:${quoteTerm(token, token.startsWith("-"))}`;
}

// チャンネルはハンドルと UC から始まる ID のどちらのリンクでも貼られるので、両方を探す
function linkTerms(target: UrlTarget | null, extraTokens: string[]): string[] {
  if (!target) return [];
  const seen = new Set([target.token.toLowerCase()]);
  const terms = [linkTerm(target)];
  for (const token of extraTokens) {
    if (!token || seen.has(token.toLowerCase())) continue;
    seen.add(token.toLowerCase());
    terms.push(tokenTerm(token));
  }
  return terms;
}

function group(terms: string[]): string {
  return terms.length > 1 ? `(${terms.join(" OR ")})` : (terms[0] ?? "");
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

export function buildUrlQueries(state: UrlSearchState, extraTokens: string[] = []): UrlQueries {
  const target = parseTargetUrl(state.url);
  const links = linkTerms(target, extraTokens);
  const link = group(links);
  const wordGroup = orGroup(state.words, false);
  const all = group([...links, ...state.words.map((word) => quoteTerm(word, false))]);
  return {
    all: withTail(all, state),
    link: withTail(link, state),
    words: withTail(wordGroup, state),
  };
}

export function filterVideos(videos: ChannelVideo[], state: UrlSearchState): ChannelVideo[] {
  const title = state.videoTitle.trim().toLowerCase();
  return videos.filter(
    (video) =>
      (state.videoKinds.length === 0 || state.videoKinds.includes(video.kind)) &&
      (state.videoYears.length === 0 || state.videoYears.includes(videoYear(video))) &&
      (!title || video.title.toLowerCase().includes(title)),
  );
}

export function videoQuery(videoId: string, state: UrlSearchState): string {
  return withTail(tokenTerm(videoId), state);
}

export type VideoBatch = {
  query: string;
  // 何本目から何本目か（1 始まり）
  from: number;
  to: number;
};

// 動画ごとの url: を OR でつなぎ、X に入る長さごとに分ける
export function buildVideoBatches(
  videoIds: string[],
  state: UrlSearchState,
  maxLength = MAX_QUERY_LENGTH,
): VideoBatch[] {
  const tail = tailParts(state).join(" ");
  const budget = maxLength - (tail ? tail.length + 1 : 0) - 2;
  const batches: VideoBatch[] = [];
  let terms: string[] = [];
  let from = 1;
  const flush = (end: number) => {
    if (!terms.length) return;
    batches.push({ query: withTail(group(terms), state), from, to: end });
    terms = [];
    from = end + 1;
  };
  videoIds.forEach((id, index) => {
    const term = tokenTerm(id);
    const length = [...terms, term].join(" OR ").length;
    if (terms.length && length > budget) flush(index);
    terms.push(term);
  });
  flush(videoIds.length);
  return batches;
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
      videoKinds: strings(parsed.videoKinds).filter((kind): kind is VideoKind =>
        (VIDEO_KINDS as string[]).includes(kind),
      ),
      videoYears: strings(parsed.videoYears),
      videoTitle: typeof parsed.videoTitle === "string" ? parsed.videoTitle : "",
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
