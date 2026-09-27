// YouTube Data API v3（無料枠 1 日 10,000 ユニット）でチャンネルの動画一覧を取る。
// 使うのは channels / playlistItems / videos の list だけで、どれも 1 回 1 ユニット。
// search.list（100 ユニット）は使わない。

export const YOUTUBE_API_KEY_STORAGE_KEY = "egosearch-nu:youtube-api-key";
export const YOUTUBE_CHANNEL_CACHE_KEY = "egosearch-nu:youtube-channel";

// 取りすぎて無料枠を食わないよう、1 チャンネルあたりの上限を決めておく（約 45 ユニット）
export const MAX_UPLOADS = 1000;

const API_BASE = "https://www.googleapis.com/youtube/v3";
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
// ショート判定の予備。プレイリストで判定できないときだけ使う
const SHORT_MAX_SECONDS = 180;

export type VideoKind = "video" | "short" | "live";

export const VIDEO_KINDS: VideoKind[] = ["video", "short", "live"];

export type ChannelVideo = {
  id: string;
  title: string;
  // 配信は開始日時、それ以外は公開日時（ISO 8601）
  publishedAt: string;
  kind: VideoKind;
};

export type ChannelInfo = {
  id: string;
  title: string;
  // "@" を除いたハンドル。ないチャンネルもある
  handle: string;
};

export type ChannelData = {
  // 入力 URL から読んだ値（ハンドルやチャンネル ID）。キャッシュの照合に使う
  ref: string;
  channel: ChannelInfo;
  videos: ChannelVideo[];
  fetchedAt: string;
  // 上限で打ち切ったとき true
  truncated: boolean;
};

export class YoutubeApiError extends Error {
  constructor(
    message: string,
    readonly reason: string,
  ) {
    super(message);
    this.name = "YoutubeApiError";
  }
}

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

type ApiItem = Record<string, unknown>;
type ApiList = { items?: ApiItem[]; nextPageToken?: string };

function builtInKey(): string {
  // NEXT_PUBLIC_* はビルド時に文字列へ置き換わるので、プロパティを直接参照する
  return process.env.NEXT_PUBLIC_YOUTUBE_API_KEY?.trim() ?? "";
}

export function hasBuiltInYoutubeKey(): boolean {
  return builtInKey().length > 0;
}

export function loadYoutubeApiKey(): string {
  try {
    return window.localStorage.getItem(YOUTUBE_API_KEY_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveYoutubeApiKey(key: string): void {
  try {
    if (key.trim()) window.localStorage.setItem(YOUTUBE_API_KEY_STORAGE_KEY, key.trim());
    else window.localStorage.removeItem(YOUTUBE_API_KEY_STORAGE_KEY);
  } catch {
    // 保存できなくても、その場の読み込みには使える
  }
}

// 自分のキーを優先し、なければサイトに組み込んだキーを使う
export function effectiveYoutubeKey(userKey: string): string {
  return userKey.trim() || builtInKey();
}

export function parseIsoDuration(value: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!match) return 0;
  const [, d, h, m, s] = match.map((part) => Number(part ?? 0));
  return ((d * 24 + h) * 60 + m) * 60 + s;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function obj(value: unknown): ApiItem {
  return value && typeof value === "object" ? (value as ApiItem) : {};
}

async function callApi(fetchImpl: FetchLike, path: string, params: Record<string, string>, key: string) {
  const query = new URLSearchParams({ ...params, key });
  const response = await fetchImpl(`${API_BASE}/${path}?${query}`);
  const body = obj(await response.json().catch(() => ({})));
  if (!response.ok) {
    const error = obj(body.error);
    const first = obj(Array.isArray(error.errors) ? error.errors[0] : undefined);
    throw new YoutubeApiError(str(error.message) || `HTTP ${response.status}`, str(first.reason) || String(response.status));
  }
  return body as ApiList;
}

async function fetchChannel(fetchImpl: FetchLike, ref: string, key: string): Promise<ChannelInfo & { uploads: string }> {
  const lookup: Record<string, string> = CHANNEL_ID_RE.test(ref) ? { id: ref } : { forHandle: `@${ref}` };
  let list = await callApi(fetchImpl, "channels", { part: "snippet,contentDetails", ...lookup }, key);
  // /user/名前 の古い URL はハンドルとして見つからないことがある
  if (!list.items?.length && !lookup.id) {
    list = await callApi(fetchImpl, "channels", { part: "snippet,contentDetails", forUsername: ref }, key);
  }
  const item = list.items?.[0];
  if (!item) throw new YoutubeApiError("channel not found", "channelNotFound");
  const snippet = obj(item.snippet);
  const uploads = str(obj(obj(item.contentDetails).relatedPlaylists).uploads);
  return {
    id: str(item.id),
    title: str(snippet.title),
    handle: str(snippet.customUrl).replace(/^@/, ""),
    uploads: uploads || `UU${str(item.id).slice(2)}`,
  };
}

async function fetchPlaylistIds(fetchImpl: FetchLike, playlistId: string, key: string, limit: number) {
  const ids: string[] = [];
  let pageToken = "";
  do {
    const params: Record<string, string> = { part: "contentDetails", playlistId, maxResults: "50" };
    if (pageToken) params.pageToken = pageToken;
    const list = await callApi(fetchImpl, "playlistItems", params, key);
    for (const item of list.items ?? []) {
      const id = str(obj(item.contentDetails).videoId);
      if (id) ids.push(id);
    }
    pageToken = list.nextPageToken ?? "";
  } while (pageToken && ids.length < limit);
  return { ids: ids.slice(0, limit), truncated: Boolean(pageToken) || ids.length > limit };
}

// UUSH（ショート）と UULV（配信）は公式に文書化されていない自動プレイリスト。
// 取れなければ null を返し、長さと配信情報からの判定に任せる
async function tryPlaylistIdSet(fetchImpl: FetchLike, playlistId: string, key: string): Promise<Set<string> | null> {
  try {
    return new Set((await fetchPlaylistIds(fetchImpl, playlistId, key, MAX_UPLOADS)).ids);
  } catch {
    return null;
  }
}

type VideoDetail = { id: string; title: string; publishedAt: string; seconds: number; hasLive: boolean };

function toDetail(item: ApiItem): VideoDetail {
  const snippet = obj(item.snippet);
  const live = item.liveStreamingDetails ? obj(item.liveStreamingDetails) : null;
  return {
    id: str(item.id),
    title: str(snippet.title),
    publishedAt: str(live?.actualStartTime) || str(live?.scheduledStartTime) || str(snippet.publishedAt),
    seconds: parseIsoDuration(str(obj(item.contentDetails).duration)),
    hasLive: live !== null,
  };
}

export function classifyVideo(
  detail: Pick<VideoDetail, "id" | "seconds" | "hasLive">,
  shorts: Set<string> | null,
  lives: Set<string> | null,
): VideoKind {
  // 配信プレイリストが取れたときは、プレミア公開（配信情報はあるが配信ではない）を動画に数える
  if (lives ? lives.has(detail.id) : detail.hasLive) return "live";
  if (shorts) return shorts.has(detail.id) ? "short" : "video";
  return !detail.hasLive && detail.seconds > 0 && detail.seconds <= SHORT_MAX_SECONDS ? "short" : "video";
}

export async function fetchChannelVideos(ref: string, key: string, fetchImpl: FetchLike = fetch): Promise<ChannelData> {
  const channel = await fetchChannel(fetchImpl, ref, key);
  const uploads = await fetchPlaylistIds(fetchImpl, channel.uploads, key, MAX_UPLOADS);
  const suffix = channel.id.slice(2);
  const [shorts, lives] = await Promise.all([
    tryPlaylistIdSet(fetchImpl, `UUSH${suffix}`, key),
    tryPlaylistIdSet(fetchImpl, `UULV${suffix}`, key),
  ]);

  const details: VideoDetail[] = [];
  for (let i = 0; i < uploads.ids.length; i += 50) {
    const list = await callApi(
      fetchImpl,
      "videos",
      { part: "snippet,contentDetails,liveStreamingDetails", id: uploads.ids.slice(i, i + 50).join(","), maxResults: "50" },
      key,
    );
    details.push(...(list.items ?? []).map(toDetail));
  }

  const videos = details
    .filter((detail) => detail.id)
    .map((detail) => ({
      id: detail.id,
      title: detail.title,
      publishedAt: detail.publishedAt,
      kind: classifyVideo(detail, shorts, lives),
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return {
    ref,
    channel: { id: channel.id, title: channel.title, handle: channel.handle },
    videos,
    fetchedAt: new Date().toISOString(),
    truncated: uploads.truncated,
  };
}

// 年の区切りは閲覧しているブラウザの時刻に合わせる
export function videoYear(video: Pick<ChannelVideo, "publishedAt">): string {
  const date = new Date(video.publishedAt);
  return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
}

export function videoDate(video: Pick<ChannelVideo, "publishedAt">): string {
  const date = new Date(video.publishedAt);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function sameRef(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function loadChannelCache(): ChannelData | null {
  try {
    const raw = window.localStorage.getItem(YOUTUBE_CHANNEL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChannelData;
    if (typeof parsed?.ref !== "string" || !Array.isArray(parsed.videos) || !parsed.channel?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

// 直近の 1 チャンネルだけ覚える（容量を増やさないため）
export function saveChannelCache(data: ChannelData): void {
  try {
    window.localStorage.setItem(YOUTUBE_CHANNEL_CACHE_KEY, JSON.stringify(data));
  } catch {
    // 保存できなくても、その場では使える
  }
}
