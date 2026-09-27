import { daysAgoIso } from "./dates";
import { uniqueHandles } from "./handle";
import { orGroup, quoteTerm } from "./query";
import type { ResultSort } from "./types";
import { type ChannelVideo, VIDEO_KINDS, type VideoKind, videoYear } from "./youtube";

export const URL_SEARCH_STORAGE_KEY = "egosearch-nu:url-search";

// 期間の絞り込み。保存するのは相対の期間で、since: の日付は検索のたびに今日から数える
export type UrlPeriod = "all" | "day" | "week" | "month" | "year";

export const URL_PERIODS: UrlPeriod[] = ["all", "day", "week", "month", "year"];

const PERIOD_DAYS: Record<Exclude<UrlPeriod, "all">, number> = { day: 1, week: 7, month: 30, year: 365 };

export function periodSince(period: UrlPeriod): string {
  return period === "all" ? "" : daysAgoIso(PERIOD_DAYS[period]);
}

export type UrlSearchState = {
  // 「検索」で確定した URL。入力途中の値は画面側で持つ
  url: string;
  // リンクを貼らずに感想を書く人を拾うための言葉（タイトル・略称・ハッシュタグ）
  words: string[];
  // 自分の告知ポストなど、反応として数えたくないアカウント
  excluded: string[];
  period: UrlPeriod;
  sort: ResultSort;
  // チャンネルの動画一覧の絞り込み。空は「すべて」
  videoKinds: VideoKind[];
  videoYears: string[];
  videoTitle: string;
  // 動画ごとの検索に、タイトルから取った言葉（曲名など）も足す
  videoTitleSearch: boolean;
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
    period: "all",
    sort: "latest",
    videoKinds: [],
    videoYears: [],
    videoTitle: "",
    videoTitleSearch: true,
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
  const since = periodSince(state.period);
  if (since) parts.push(`since:${since}`);
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
  // チャンネルのとき、メインの検索に入れた動画リンクの本数（新しい順）
  videoCount: number;
};

// チャンネルのときは videoIds（新しい順）のリンクも、X に入る長さまでメインの検索に足す。
// 動画の共有リンクにはチャンネル名が入らないので、これがないとチャンネルへの反応の大半を取りこぼす
export function buildUrlQueries(
  state: UrlSearchState,
  extraTokens: string[] = [],
  videoIds: string[] = [],
  maxLength = MAX_QUERY_LENGTH,
): UrlQueries {
  const target = parseTargetUrl(state.url);
  const links = linkTerms(target, extraTokens);
  const words = state.words.map((word) => quoteTerm(word, false)).filter(Boolean);
  const videoLinks: string[] = [];
  for (const id of links.length ? videoIds : []) {
    const next = [...videoLinks, tokenTerm(id)];
    if (withTail(group([...links, ...next, ...words]), state).length > maxLength) break;
    videoLinks.push(tokenTerm(id));
  }
  return {
    all: withTail(group([...links, ...videoLinks, ...words]), state),
    link: withTail(group([...links, ...videoLinks]), state),
    words: withTail(orGroup(state.words, false), state),
    videoCount: videoLinks.length,
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

export type VideoItem = {
  id: string;
  // タイトルから取った言葉。取れなければ空
  keyword: string;
};

// リンクを貼らずに曲名などで書いた感想も拾う。一緒に探す言葉（名前）があれば、
// ありふれた曲名で関係ない投稿が混ざらないよう「タイトルの言葉 かつ 名前」に絞る
function videoTerms(items: VideoItem[], state: UrlSearchState): string[] {
  const links = items.map((item) => tokenTerm(item.id));
  if (!state.videoTitleSearch) return links;
  const keywords = [...new Set(items.map((item) => item.keyword.trim()).filter(Boolean))];
  if (!keywords.length) return links;
  const names = orGroup(state.words, false);
  if (!names) return [...links, ...keywords.map((keyword) => quoteTerm(keyword, true))];
  return [...links, `(${orGroup(keywords, true)} ${names})`];
}

export function videoQuery(item: VideoItem, state: UrlSearchState): string {
  return withTail(group(videoTerms([item], state)), state);
}

export type VideoBatch = {
  query: string;
  // 何本目から何本目か（1 始まり）
  from: number;
  to: number;
};

// 動画ごとの url:（とタイトルの言葉）を OR でつなぎ、X に入る長さごとに分ける
export function buildVideoBatches(
  items: VideoItem[],
  state: UrlSearchState,
  maxLength = MAX_QUERY_LENGTH,
): VideoBatch[] {
  const batches: VideoBatch[] = [];
  let current: VideoItem[] = [];
  let from = 1;
  const queryOf = (list: VideoItem[]) => withTail(group(videoTerms(list, state)), state);
  items.forEach((item, index) => {
    if (current.length && queryOf([...current, item]).length > maxLength) {
      batches.push({ query: queryOf(current), from, to: index });
      current = [];
      from = index + 1;
    }
    current.push(item);
  });
  if (current.length) batches.push({ query: queryOf(current), from, to: items.length });
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
      period: URL_PERIODS.includes(parsed.period as UrlPeriod) ? (parsed.period as UrlPeriod) : "all",
      sort: parsed.sort === "likes" ? "likes" : "latest",
      videoKinds: strings(parsed.videoKinds).filter((kind): kind is VideoKind =>
        (VIDEO_KINDS as string[]).includes(kind),
      ),
      videoYears: strings(parsed.videoYears),
      videoTitle: typeof parsed.videoTitle === "string" ? parsed.videoTitle : "",
      videoTitleSearch: parsed.videoTitleSearch !== false,
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
