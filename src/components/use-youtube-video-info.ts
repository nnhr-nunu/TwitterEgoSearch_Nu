"use client";

import { useEffect, useState } from "react";
import {
  type ChannelData,
  effectiveYoutubeKey,
  fetchVideoInfo,
  loadYoutubeApiKey,
  type VideoInfo,
} from "@/lib/youtube";
import { findVideoInChannels, loadVideoInfo, saveVideoInfo } from "@/lib/youtube-cache";

// URL検索に貼った動画のタイトルとチャンネル名。保存済みのチャンネル一覧か、前に取った情報があれば API を呼ばない
export function useYoutubeVideoInfo(videoId: string | null, channels: ChannelData[]): VideoInfo | null {
  // 取れなかった動画も null で覚え、同じ動画で呼び直さない
  const [fetched, setFetched] = useState<Record<string, VideoInfo | null>>({});
  const known = videoId ? (findVideoInChannels(channels, videoId) ?? loadVideoInfo(videoId)) : null;
  const needsFetch = videoId !== null && !known && !(videoId in fetched);

  useEffect(() => {
    if (!videoId || !needsFetch) return;
    const key = effectiveYoutubeKey(loadYoutubeApiKey());
    if (!key) return;
    let cancelled = false;
    // 入力途中や貼り直しで何度も呼ばないよう、少し待ってから 1 回だけ取る（1 ユニット）
    const timer = window.setTimeout(() => {
      fetchVideoInfo(videoId, key)
        .then((info) => {
          if (info) saveVideoInfo(info);
          if (!cancelled) setFetched((prev) => ({ ...prev, [videoId]: info }));
        })
        .catch(() => {
          if (!cancelled) setFetched((prev) => ({ ...prev, [videoId]: null }));
        });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [videoId, needsFetch]);

  if (!videoId) return null;
  return known ?? fetched[videoId] ?? null;
}
