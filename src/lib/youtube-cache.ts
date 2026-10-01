// 一度取った YouTube の情報をブラウザに残し、同じチャンネル・動画で API を呼び直さないようにする。
// 容量を増やしすぎないよう、チャンネルは新しく使った順に 5 件、動画 1 本の情報は 100 件まで。
// YouTube API の規約（Developer Policies III.E.4）で、取った情報は 30 日までしか持てないので、それより古いものは捨てる。

import type { ChannelData, VideoInfo } from "./youtube";

export const YOUTUBE_CHANNELS_CACHE_KEY = "egosearch-nu:youtube-channels";
// 以前は直近の 1 チャンネルだけをここに保存していた
const LEGACY_CHANNEL_CACHE_KEY = "egosearch-nu:youtube-channel";
export const YOUTUBE_VIDEO_INFO_CACHE_KEY = "egosearch-nu:youtube-video-info";

const MAX_CHANNELS = 5;
const MAX_VIDEO_INFOS = 100;
export const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// 日時が読めないものも古いとみなす
function isFresh(savedAt: unknown, now: number): boolean {
  const time = typeof savedAt === "string" ? Date.parse(savedAt) : Number.NaN;
  return !Number.isNaN(time) && now - time < MAX_CACHE_AGE_MS;
}

// 一覧をまるごと取ってから 30 日を過ぎたら、新着だけの取り直しではなく全部取り直す
export function isExpiredChannel(data: ChannelData, now = Date.now()): boolean {
  return !isFresh(data.listedAt ?? data.fetchedAt, now);
}

function sameRef(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// 入力がハンドルでもチャンネル ID でも、読み込んだときの書き方でも同じチャンネルとみなす
export function channelMatches(data: ChannelData, ref: string): boolean {
  return sameRef(data.ref, ref) || data.channel.id === ref || (data.channel.handle !== "" && sameRef(data.channel.handle, ref));
}

export function findChannel(channels: ChannelData[], ref: string): ChannelData | null {
  return channels.find((data) => channelMatches(data, ref)) ?? null;
}

function isChannelData(value: unknown): value is ChannelData {
  const data = value as ChannelData;
  return typeof data?.ref === "string" && Array.isArray(data.videos) && typeof data.channel?.id === "string";
}

function readJson(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export function loadChannelCache(now = Date.now()): ChannelData[] {
  try {
    const list = readJson(YOUTUBE_CHANNELS_CACHE_KEY);
    const legacy = Array.isArray(list) ? null : readJson(LEGACY_CHANNEL_CACHE_KEY);
    const saved = Array.isArray(list) ? list : [legacy];
    return saved.filter((data): data is ChannelData => isChannelData(data) && !isExpiredChannel(data, now));
  } catch {
    return [];
  }
}

// 読み込んだチャンネルを先頭に置き、古いものから押し出す
export function upsertChannel(channels: ChannelData[], data: ChannelData): ChannelData[] {
  return [data, ...channels.filter((item) => item.channel.id !== data.channel.id)].slice(0, MAX_CHANNELS);
}

// チャンネルを選び直したとき、これより古い一覧なら新着を確認する（数ユニット）
const STALE_MS = 60 * 60 * 1000;

export function isStaleChannel(data: ChannelData, now = Date.now()): boolean {
  const fetched = Date.parse(data.fetchedAt);
  return Number.isNaN(fetched) || now - fetched > STALE_MS;
}

export function saveChannelCache(channels: ChannelData[], now = Date.now()): void {
  try {
    const fresh = channels.filter((data) => !isExpiredChannel(data, now));
    window.localStorage.setItem(YOUTUBE_CHANNELS_CACHE_KEY, JSON.stringify(fresh));
    window.localStorage.removeItem(LEGACY_CHANNEL_CACHE_KEY);
  } catch {
    // 保存できなくても、その場では使える
  }
}

// 保存済みのチャンネル一覧にある動画なら、API を呼ばずにタイトルが分かる
export function findVideoInChannels(channels: ChannelData[], id: string): VideoInfo | null {
  for (const data of channels) {
    const video = data.videos.find((item) => item.id === id);
    if (video) {
      return {
        id,
        title: video.title,
        channelId: data.channel.id,
        channelTitle: data.channel.title,
        publishedAt: video.publishedAt,
      };
    }
  }
  return null;
}

// 保存した日時を添えて持つ。日時の無い、前に保存した情報は古いとみなす
type SavedVideoInfo = VideoInfo & { savedAt: string };

function loadVideoInfos(now: number): SavedVideoInfo[] {
  try {
    const list = readJson(YOUTUBE_VIDEO_INFO_CACHE_KEY);
    return Array.isArray(list)
      ? list.filter((item: SavedVideoInfo) => typeof item?.id === "string" && isFresh(item.savedAt, now))
      : [];
  } catch {
    return [];
  }
}

export function loadVideoInfo(id: string, now = Date.now()): VideoInfo | null {
  return loadVideoInfos(now).find((item) => item.id === id) ?? null;
}

export function saveVideoInfo(info: VideoInfo, now = Date.now()): void {
  try {
    const saved: SavedVideoInfo = { ...info, savedAt: new Date(now).toISOString() };
    const next = [saved, ...loadVideoInfos(now).filter((item) => item.id !== info.id)].slice(0, MAX_VIDEO_INFOS);
    window.localStorage.setItem(YOUTUBE_VIDEO_INFO_CACHE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても、その場では使える
  }
}
