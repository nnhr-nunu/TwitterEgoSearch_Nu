import { beforeEach, describe, expect, it } from "vitest";
import type { ChannelData } from "./youtube";
import {
  findChannel,
  findVideoInChannels,
  loadChannelCache,
  loadVideoInfo,
  saveChannelCache,
  saveVideoInfo,
  upsertChannel,
  YOUTUBE_CHANNELS_CACHE_KEY,
} from "./youtube-cache";

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
    const list = loadChannelCache();
    expect(list.map((item) => item.channel.handle)).toEqual(["old"]);
    saveChannelCache(list);
    expect(store.has("egosearch-nu:youtube-channel")).toBe(false);
    expect(JSON.parse(store.get(YOUTUBE_CHANNELS_CACHE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("looks up video titles from saved channels and single-video info", () => {
    expect(findVideoInChannels([channel("UC1", "nunu")], "nunu-video")).toEqual({
      id: "nunu-video",
      title: "video of nunu",
      channelId: "UC1",
      channelTitle: "title nunu",
      publishedAt: "2026-01-01T00:00:00Z",
    });
    expect(loadVideoInfo("x")).toBeNull();
    saveVideoInfo({ id: "x", title: "t", channelId: "UC1", channelTitle: "c" });
    expect(loadVideoInfo("x")?.title).toBe("t");
  });
});
