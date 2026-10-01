import { beforeEach, describe, expect, it } from "vitest";
import type { ChannelData } from "./youtube";
import {
  findChannel,
  findVideoInChannels,
  isExpiredChannel,
  loadChannelCache,
  loadVideoInfo,
  MAX_CACHE_AGE_MS,
  saveChannelCache,
  saveVideoInfo,
  upsertChannel,
  YOUTUBE_CHANNELS_CACHE_KEY,
  YOUTUBE_VIDEO_INFO_CACHE_KEY,
} from "./youtube-cache";

// フィクスチャの fetchedAt（2026-01-01）から数日後
const NOW = Date.parse("2026-01-03T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function mockStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage } });
  return store;
}

function channel(id: string, handle: string, ref = handle): ChannelData {
  return {
    ref,
    channel: { id, title: `title ${handle}`, handle },
    videos: [{ id: `${handle}-video`, title: `video of ${handle}`, publishedAt: "2026-01-01T00:00:00Z", kind: "video" }],
    fetchedAt: "2026-01-01T00:00:00Z",
    truncated: false,
  };
}

describe("youtube cache", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = mockStorage();
  });

  it("finds a channel by the handle, the channel id or the original ref", () => {
    const list = [channel("UCaaaaaaaaaaaaaaaaaaaaaa", "Nunu", "legacy-user")];
    expect(findChannel(list, "nunu")).toBe(list[0]);
    expect(findChannel(list, "UCaaaaaaaaaaaaaaaaaaaaaa")).toBe(list[0]);
    expect(findChannel(list, "legacy-user")).toBe(list[0]);
    expect(findChannel(list, "other")).toBeNull();
  });

  it("keeps the five most recent channels and moves a reloaded one to the front", () => {
    let list: ChannelData[] = [];
    for (let i = 0; i < 6; i += 1) list = upsertChannel(list, channel(`UC${i}`, `ch${i}`));
    expect(list.map((item) => item.channel.handle)).toEqual(["ch5", "ch4", "ch3", "ch2", "ch1"]);
    list = upsertChannel(list, channel("UC2", "ch2"));
    expect(list.map((item) => item.channel.handle)).toEqual(["ch2", "ch5", "ch4", "ch3", "ch1"]);
  });

  it("migrates the single legacy channel and saves the list", () => {
    store.set("egosearch-nu:youtube-channel", JSON.stringify(channel("UC1", "old")));
    const list = loadChannelCache(NOW);
    expect(list.map((item) => item.channel.handle)).toEqual(["old"]);
    saveChannelCache(list, NOW);
    expect(store.has("egosearch-nu:youtube-channel")).toBe(false);
    expect(JSON.parse(store.get(YOUTUBE_CHANNELS_CACHE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("drops channels whose list was fetched more than 30 days ago (YouTube API policy)", () => {
    const listed = Date.parse("2026-01-01T00:00:00Z");
    // 新着だけ取り直した一覧は fetchedAt が新しくても、まるごと取った日時（listedAt）から数える
    const refreshed = { ...channel("UC2", "refreshed"), fetchedAt: "2026-01-30T00:00:00Z", listedAt: "2026-01-01T00:00:00Z" };
    store.set(YOUTUBE_CHANNELS_CACHE_KEY, JSON.stringify([channel("UC1", "kept"), refreshed]));
    expect(loadChannelCache(listed + 29 * DAY)).toHaveLength(2);
    expect(isExpiredChannel(refreshed, listed + MAX_CACHE_AGE_MS)).toBe(true);
    expect(loadChannelCache(listed + 31 * DAY)).toEqual([]);
    saveChannelCache([refreshed], listed + 31 * DAY);
    expect(JSON.parse(store.get(YOUTUBE_CHANNELS_CACHE_KEY) ?? "[]")).toEqual([]);
  });

  it("looks up video titles from saved channels and single-video info", () => {
    expect(findVideoInChannels([channel("UC1", "nunu")], "nunu-video")).toEqual({
      id: "nunu-video",
      title: "video of nunu",
      channelId: "UC1",
      channelTitle: "title nunu",
      publishedAt: "2026-01-01T00:00:00Z",
    });
    expect(loadVideoInfo("x", NOW)).toBeNull();
    saveVideoInfo({ id: "x", title: "t", channelId: "UC1", channelTitle: "c" }, NOW);
    expect(loadVideoInfo("x", NOW)?.title).toBe("t");
  });

  it("forgets single-video info after 30 days and info saved without a date", () => {
    saveVideoInfo({ id: "x", title: "t", channelId: "UC1", channelTitle: "c" }, NOW);
    expect(loadVideoInfo("x", NOW + 29 * DAY)?.title).toBe("t");
    expect(loadVideoInfo("x", NOW + 31 * DAY)).toBeNull();
    store.set(YOUTUBE_VIDEO_INFO_CACHE_KEY, JSON.stringify([{ id: "y", title: "t", channelId: "UC1", channelTitle: "c" }]));
    expect(loadVideoInfo("y", NOW)).toBeNull();
  });
});
