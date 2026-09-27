// 一度取った YouTube の情報をブラウザに残し、同じチャンネル・動画で API を呼び直さないようにする。
// 容量を増やしすぎないよう、チャンネルは新しく使った順に 5 件、動画 1 本の情報は 100 件まで。

import type { ChannelData, VideoInfo } from "./youtube";

export const YOUTUBE_CHANNELS_CACHE_KEY = "egosearch-nu:youtube-channels";
// 以前は直近の 1 チャンネルだけをここに保存していた
const LEGACY_CHANNEL_CACHE_KEY = "egosearch-nu:youtube-channel";
export const YOUTUBE_VIDEO_INFO_CACHE_KEY = "egosearch-nu:youtube-video-info";

const MAX_CHANNELS = 5;
const MAX_VIDEO_INFOS = 100;

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

export function loadChannelCache(): ChannelData[] {
  try {
    const list = readJson(YOUTUBE_CHANNELS_CACHE_KEY);
    if (Array.isArray(list)) return list.filter(isChannelData);
    const legacy = readJson(LEGACY_CHANNEL_CACHE_KEY);
    return isChannelData(legacy) ? [legacy] : [];
  } catch {
    return [];
  }
}

// 読み込んだチャンネルを先頭に置き、古いものから押し出す
export function upsertChannel(channels: ChannelData[], data: ChannelData): ChannelData[] {
  return [data, ...channels.filter((item) => item.channel.id !== data.channel.id)].slice(0, MAX_CHANNELS);
}

export function saveChannelCache(channels: ChannelData[]): void {
  try {
    window.localStorage.setItem(YOUTUBE_CHANNELS_CACHE_KEY, JSON.stringify(channels));
    window.localStorage.removeItem(LEGACY_CHANNEL_CACHE_KEY);
  } catch {
    // 保存できなくても、その場では使える
  }
}

// 保存済みのチャンネル一覧にある動画なら、API を呼ばずにタイトルが分かる
export function findVideoInChannels(channels: ChannelData[], id: string): VideoInfo | null {
  for (const data of channels) {
    const video = data.videos.find((item) => item.id === id);
    if (video) return { id, title: video.title, channelId: data.channel.id, channelTitle: data.channel.title };
  }
  return null;
}

function loadVideoInfos(): VideoInfo[] {
  try {
    const list = readJson(YOUTUBE_VIDEO_INFO_CACHE_KEY);
    return Array.isArray(list) ? list.filter((item: VideoInfo) => typeof item?.id === "string") : [];
  } catch {
    return [];
  }
}

export function loadVideoInfo(id: string): VideoInfo | null {
  return loadVideoInfos().find((item) => item.id === id) ?? null;
}

export function saveVideoInfo(info: VideoInfo): void {
  try {
    const next = [info, ...loadVideoInfos().filter((item) => item.id !== info.id)].slice(0, MAX_VIDEO_INFOS);
    window.localStorage.setItem(YOUTUBE_VIDEO_INFO_CACHE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても、その場では使える
  }
}
