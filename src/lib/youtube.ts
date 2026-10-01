import { uniqueCaseless } from "./keywords";

// YouTube Data API v3（無料枠 1 日 10,000 ユニット）でチャンネルの動画一覧を取る。
// 使うのは channels / playlistItems / videos の list だけで、どれも 1 回 1 ユニット。
// search.list（100 ユニット）は使わない。
// 取った一覧はブラウザに保存し（youtube-cache.ts）、読み直しは新着分だけ取る（refreshChannelVideos）。

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
  // ここから下は後から足した項目。前に保存した一覧には無い
  thumbnail?: string;
  // 説明欄に載っている X アカウント。本人の投稿を検索から除くのに使う
  xHandles?: string[];
  // 説明欄に載っているハッシュタグ（配信タグ・ファンアートタグなど）
  hashtags?: string[];
};

export type ChannelData = {
  // 入力 URL から読んだ値（ハンドルやチャンネル ID）。キャッシュの照合に使う
  ref: string;
  channel: ChannelInfo;
  videos: ChannelVideo[];
  fetchedAt: string;
  // 一覧をまるごと取った日時。新着だけの取り直しでは進めない（保存できる期限はここから数える）。
  // 後から足した項目で、前に保存した一覧には無い（そのときは fetchedAt を使う）
  listedAt?: string;
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

// サイトに組み込んだキー（リファラー制限付き）。無いビルドでは動画一覧を読み込めない
export function youtubeApiKey(): string {
  // NEXT_PUBLIC_* はビルド時に文字列へ置き換わるので、プロパティを直接参照する
  return process.env.NEXT_PUBLIC_YOUTUBE_API_KEY?.trim() ?? "";
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

// dropbox.com のような別ドメインの一部を拾わないよう、直前が英数字でないものに限る
const X_PROFILE_RE = /(?<![A-Za-z0-9-])(?:twitter|x)\.com\/@?([A-Za-z0-9_]{1,15})(?![A-Za-z0-9_])/gi;
const X_RESERVED = new Set(["i", "intent", "home", "hashtag", "search", "share", "explore", "settings", "messages", "notifications", "login", "signup", "tos", "privacy"]);
const HASHTAG_RE = /[#＃]([^\s#＃.,、。!！?？:：;；()（）「」『』【】[\]<>＜＞"'“”/／|｜]+)/gu;
const GENERIC_HASHTAGS = new Set(["shorts", "short", "youtube", "vtuber", "live", "asmr"]);

// チャンネルの説明欄から、本人の X アカウントとハッシュタグを拾う
export function channelDescriptionLinks(description: string): { xHandles: string[]; hashtags: string[] } {
  const xHandles = [...description.matchAll(X_PROFILE_RE)]
    .map((match) => match[1])
    .filter((handle) => !X_RESERVED.has(handle.toLowerCase()));
  const hashtags = [...description.matchAll(HASHTAG_RE)]
    .map((match) => match[1])
    .filter((tag) => !/^\d+$/.test(tag) && !GENERIC_HASHTAGS.has(tag.toLowerCase()))
    .map((tag) => `#${tag}`);
  return { xHandles: uniqueCaseless(xHandles).slice(0, 3), hashtags: uniqueCaseless(hashtags).slice(0, 6) };
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
  const thumbnails = obj(snippet.thumbnails);
  return {
    id: str(item.id),
    title: str(snippet.title),
    handle: str(snippet.customUrl).replace(/^@/, ""),
    thumbnail: str(obj(thumbnails.default).url) || str(obj(thumbnails.medium).url),
    ...channelDescriptionLinks(str(snippet.description)),
    uploads: uploads || `UU${str(item.id).slice(2)}`,
  };
}

// stopAt にある動画まで来たら止める（新しい順なので、そこから先は取得済み）
async function fetchPlaylistIds(
  fetchImpl: FetchLike,
  playlistId: string,
  key: string,
  limit: number,
  stopAt?: Set<string>,
) {
  const ids: string[] = [];
  let pageToken = "";
  do {
    const params: Record<string, string> = { part: "contentDetails", playlistId, maxResults: "50" };
    if (pageToken) params.pageToken = pageToken;
    const list = await callApi(fetchImpl, "playlistItems", params, key);
    for (const item of list.items ?? []) {
      const id = str(obj(item.contentDetails).videoId);
      if (id && stopAt?.has(id)) return { ids: ids.slice(0, limit), truncated: false };
      if (id) ids.push(id);
    }
    pageToken = list.nextPageToken ?? "";
  } while (pageToken && ids.length < limit);
  return { ids: ids.slice(0, limit), truncated: Boolean(pageToken) || ids.length > limit };
}

// UUSH（ショート）と UULV（配信）は公式に文書化されていない自動プレイリスト。
// 取れなければ null を返し、長さと配信情報からの判定に任せる
async function tryPlaylistIdSet(
  fetchImpl: FetchLike,
  playlistId: string,
  key: string,
  stopAt?: Set<string>,
): Promise<Set<string> | null> {
  try {
    return new Set((await fetchPlaylistIds(fetchImpl, playlistId, key, MAX_UPLOADS, stopAt)).ids);
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

async function fetchDetails(fetchImpl: FetchLike, ids: string[], key: string): Promise<VideoDetail[]> {
  const details: VideoDetail[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const list = await callApi(
      fetchImpl,
      "videos",
      { part: "snippet,contentDetails,liveStreamingDetails", id: ids.slice(i, i + 50).join(","), maxResults: "50" },
      key,
    );
    details.push(...(list.items ?? []).map(toDetail).filter((detail) => detail.id));
  }
  return details;
}

function byNewest(a: ChannelVideo, b: ChannelVideo): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

export async function fetchChannelVideos(ref: string, key: string, fetchImpl: FetchLike = fetch): Promise<ChannelData> {
  const { uploads: uploadsId, ...channel } = await fetchChannel(fetchImpl, ref, key);
  const uploads = await fetchPlaylistIds(fetchImpl, uploadsId, key, MAX_UPLOADS);
  const suffix = channel.id.slice(2);
  const [shorts, lives] = await Promise.all([
    tryPlaylistIdSet(fetchImpl, `UUSH${suffix}`, key),
    tryPlaylistIdSet(fetchImpl, `UULV${suffix}`, key),
  ]);
  const details = await fetchDetails(fetchImpl, uploads.ids, key);
  const fetchedAt = new Date().toISOString();

  return {
    ref,
    channel,
    videos: details
      .map((detail) => ({
        id: detail.id,
        title: detail.title,
        publishedAt: detail.publishedAt,
        kind: classifyVideo(detail, shorts, lives),
      }))
      .sort(byNewest),
    fetchedAt,
    listedAt: fetchedAt,
    truncated: uploads.truncated,
  };
}

export type RefreshResult = { data: ChannelData; added: number };

// 保存済みの一覧に新着だけ足す。新着がなければ 3 ユニット
// （チャンネル名・アイコンの取り直し＋アップロード 1 ページ＋直近 50 本の取り直し）で済む
export async function refreshChannelVideos(
  previous: ChannelData,
  key: string,
  fetchImpl: FetchLike = fetch,
): Promise<RefreshResult> {
  const { uploads: uploadsId, ...channel } = await fetchChannel(fetchImpl, previous.channel.id, key);
  const suffix = previous.channel.id.slice(2);
  const known = new Set(previous.videos.map((video) => video.id));
  const uploads = await fetchPlaylistIds(fetchImpl, uploadsId, key, MAX_UPLOADS, known);
  const added = uploads.ids.filter((id) => !known.has(id));
  const [shorts, lives] = added.length
    ? await Promise.all([
        tryPlaylistIdSet(fetchImpl, `UUSH${suffix}`, key, known),
        tryPlaylistIdSet(fetchImpl, `UULV${suffix}`, key, known),
      ])
    : [null, null];

  // 新着と一緒に直近の動画も取り直し、タイトルの変更や配信日時の確定、削除を反映する（50 本で 1 ユニット）
  const size = Math.max(50, Math.ceil(added.length / 50) * 50);
  const recent = previous.videos.slice(0, size - added.length).map((video) => video.id);
  const details = new Map((await fetchDetails(fetchImpl, [...added, ...recent], key)).map((d) => [d.id, d]));
  const recentSet = new Set(recent);

  const videos: ChannelVideo[] = [];
  for (const id of added) {
    const detail = details.get(id);
    if (detail) {
      videos.push({ id, title: detail.title, publishedAt: detail.publishedAt, kind: classifyVideo(detail, shorts, lives) });
    }
  }
  for (const video of previous.videos) {
    const detail = details.get(video.id);
    if (detail) videos.push({ ...video, title: detail.title, publishedAt: detail.publishedAt });
    // 取り直した範囲で返ってこなかった動画は、削除か非公開になった
    else if (!recentSet.has(video.id)) videos.push(video);
  }

  const sorted = videos.sort(byNewest);
  return {
    data: {
      ...previous,
      channel,
      videos: sorted.slice(0, MAX_UPLOADS),
      fetchedAt: new Date().toISOString(),
      // 取り直したのは新着と直近の分だけなので、古い動画を取った日時のまま残す
      listedAt: previous.listedAt ?? previous.fetchedAt,
      truncated: previous.truncated || uploads.truncated || sorted.length > MAX_UPLOADS,
    },
    added: added.filter((id) => details.has(id)).length,
  };
}

export type VideoInfo = {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  // 後から足した項目。前に保存した情報には無い。配信は開始日時
  publishedAt?: string;
};

// 動画 1 本のタイトル・チャンネル名・公開日（1 ユニット。part を増やしても変わらない）。見つからなければ null
export async function fetchVideoInfo(id: string, key: string, fetchImpl: FetchLike = fetch): Promise<VideoInfo | null> {
  const list = await callApi(fetchImpl, "videos", { part: "snippet,liveStreamingDetails", id }, key);
  const item = list.items?.[0];
  if (!item) return null;
  const snippet = obj(item.snippet);
  return {
    id,
    title: str(snippet.title),
    channelId: str(snippet.channelId),
    channelTitle: str(snippet.channelTitle),
    publishedAt: toDetail(item).publishedAt,
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
