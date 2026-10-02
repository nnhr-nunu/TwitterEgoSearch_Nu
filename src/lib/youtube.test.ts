import { describe, expect, it } from "vitest";
import {
  type ChannelData,
  channelDescriptionLinks,
  classifyVideo,
  fetchChannelVideos,
  fetchVideoInfo,
  parseIsoDuration,
  refreshChannelVideos,
  YoutubeApiError,
} from "./youtube";

const CHANNEL_ID = "UCqYpbbypex0iOikcZRenxGA";
const SUFFIX = CHANNEL_ID.slice(2);

type Route = (params: URLSearchParams) => { status?: number; body: unknown };

function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const impl = async (url: string) => {
    const parsed = new URL(url);
    const path = parsed.pathname.split("/").pop() ?? "";
    calls.push(`${path}?${parsed.searchParams}`);
    const route = routes[path];
    const { status = 200, body } = route ? route(parsed.searchParams) : { status: 404, body: {} };
    return { ok: status < 400, status, json: async () => body };
  };
  return { impl, calls };
}

const notFound = { status: 404, body: { error: { message: "not found", errors: [{ reason: "playlistNotFound" }] } } };

function video(id: string, publishedAt: string, duration: string, live?: object) {
  return {
    id,
    snippet: { title: `title ${id}`, publishedAt },
    contentDetails: { duration },
    ...(live ? { liveStreamingDetails: live } : {}),
  };
}

const allVideos = [
  video("aaaaaaaaaaa", "2025-01-10T12:00:00Z", "PT4M"),
  video("bbbbbbbbbbb", "2026-02-10T12:00:00Z", "PT45S"),
  video("ccccccccccc", "2026-03-10T09:00:00Z", "PT2H", { actualStartTime: "2026-03-10T12:00:00Z" }),
  video("ddddddddddd", "2024-04-10T12:00:00Z", "PT3M30S", { actualStartTime: "2024-04-10T12:00:00Z" }),
];

function channelRoutes(playlists: Record<string, string[] | null>): Record<string, Route> {
  return {
    channels: () => ({
      body: {
        items: [
          {
            id: CHANNEL_ID,
            snippet: {
              title: "ぬぬはら",
              customUrl: "@nnhr_nunu",
              description: "感想は #ぬぬ絵 へ https://twitter.com/nnhr_nunu",
              thumbnails: { default: { url: "https://yt3.ggpht.com/icon" } },
            },
            contentDetails: { relatedPlaylists: { uploads: `UU${SUFFIX}` } },
          },
        ],
      },
    }),
    playlistItems: (params) => {
      const ids = playlists[params.get("playlistId") ?? ""];
      if (!ids) return notFound;
      return { body: { items: ids.map((videoId) => ({ contentDetails: { videoId } })) } };
    },
    videos: (params) => {
      const ids = (params.get("id") ?? "").split(",");
      return { body: { items: allVideos.filter((item) => ids.includes(item.id)) } };
    },
  };
}

describe("parseIsoDuration", () => {
  it.each([
    ["PT45S", 45],
    ["PT4M", 240],
    ["PT1H2M3S", 3723],
    ["P1DT1S", 86401],
    ["P0D", 0],
    ["bad", 0],
  ])("%s is %i seconds", (value, seconds) => {
    expect(parseIsoDuration(value)).toBe(seconds);
  });
});

describe("channelDescriptionLinks", () => {
  it("reads x accounts and hashtags from the description", () => {
    const description = [
      "Twitter: https://twitter.com/nnhr_nunu",
      "X：x.com/@Nunu_Sub / https://x.com/intent/follow?screen_name=nnhr_nunu",
      "https://www.dropbox.com/share/abc",
      "配信タグ #ぬぬ配信 ファンアート＃ぬぬ絵、#shorts #2026",
    ].join("\n");
    expect(channelDescriptionLinks(description)).toEqual({
      xHandles: ["nnhr_nunu", "Nunu_Sub"],
      hashtags: ["#ぬぬ配信", "#ぬぬ絵"],
    });
  });
});

describe("classifyVideo", () => {
  it("falls back to duration and live details without playlists", () => {
    expect(classifyVideo({ id: "a", seconds: 45, hasLive: false }, null, null)).toBe("short");
    expect(classifyVideo({ id: "a", seconds: 600, hasLive: false }, null, null)).toBe("video");
    expect(classifyVideo({ id: "a", seconds: 60, hasLive: true }, null, null)).toBe("live");
  });

  it("treats premieres as videos when the live playlist is known", () => {
    expect(classifyVideo({ id: "a", seconds: 200, hasLive: true }, new Set(), new Set())).toBe("video");
    expect(classifyVideo({ id: "a", seconds: 200, hasLive: false }, new Set(["a"]), new Set())).toBe("short");
  });
});

describe("fetchChannelVideos", () => {
  const ids = allVideos.map((item) => item.id);

  it("reads the channel, classifies with playlists and sorts newest first", async () => {
    const { impl, calls } = fakeFetch(
      channelRoutes({
        [`UU${SUFFIX}`]: ids,
        [`UUSH${SUFFIX}`]: ["bbbbbbbbbbb"],
        [`UULV${SUFFIX}`]: ["ccccccccccc"],
      }),
    );
    const data = await fetchChannelVideos("nnhr_nunu", "KEY", impl);
    expect(calls[0]).toContain("forHandle=%40nnhr_nunu");
    expect(calls.every((call) => call.includes("key=KEY"))).toBe(true);
    expect(data.channel).toEqual({
      id: CHANNEL_ID,
      title: "ぬぬはら",
      handle: "nnhr_nunu",
      thumbnail: "https://yt3.ggpht.com/icon",
      xHandles: ["nnhr_nunu"],
      hashtags: ["#ぬぬ絵"],
    });
    expect(data.truncated).toBe(false);
    expect(data.videos.map((v) => [v.id, v.kind])).toEqual([
      ["ccccccccccc", "live"],
      ["bbbbbbbbbbb", "short"],
      ["aaaaaaaaaaa", "video"],
      // 配信情報はあるが配信プレイリストにない → プレミア公開として動画に数える
      ["ddddddddddd", "video"],
    ]);
    // 配信は開始日時で並ぶ
    expect(data.videos[0].publishedAt).toBe("2026-03-10T12:00:00Z");
  });

  it("looks up channel ids directly and falls back when playlists are missing", async () => {
    const { impl, calls } = fakeFetch(channelRoutes({ [`UU${SUFFIX}`]: ids }));
    const data = await fetchChannelVideos(CHANNEL_ID, "KEY", impl);
    expect(calls[0]).toContain(`id=${CHANNEL_ID}`);
    expect(Object.fromEntries(data.videos.map((v) => [v.id, v.kind]))).toEqual({
      aaaaaaaaaaa: "video",
      bbbbbbbbbbb: "short",
      ccccccccccc: "live",
      ddddddddddd: "live",
    });
  });

  it("reports api errors with their reason", async () => {
    const { impl } = fakeFetch({
      channels: () => ({
        status: 403,
        body: { error: { message: "quota", errors: [{ reason: "quotaExceeded" }] } },
      }),
    });
    await expect(fetchChannelVideos("nnhr_nunu", "KEY", impl)).rejects.toMatchObject({
      name: "YoutubeApiError",
      reason: "quotaExceeded",
    });
  });

  it("reports a missing channel", async () => {
    const { impl } = fakeFetch({ channels: () => ({ body: { items: [] } }) });
    const error = await fetchChannelVideos("nobody", "KEY", impl).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(YoutubeApiError);
    expect((error as YoutubeApiError).reason).toBe("channelNotFound");
  });
});

describe("refreshChannelVideos", () => {
  const previous: ChannelData = {
    ref: "nnhr_nunu",
    channel: { id: CHANNEL_ID, title: "ぬぬはら", handle: "nnhr_nunu" },
    videos: [
      { id: "eeeeeeeeeee", title: "消えた動画", publishedAt: "2025-06-01T12:00:00Z", kind: "video" },
      { id: "aaaaaaaaaaa", title: "old title", publishedAt: "2025-01-10T12:00:00Z", kind: "video" },
      { id: "ddddddddddd", title: "title ddddddddddd", publishedAt: "2024-04-10T12:00:00Z", kind: "live" },
    ],
    fetchedAt: "2026-01-01T00:00:00Z",
    truncated: false,
  };

  it("adds only the new uploads and refreshes the channel name", async () => {
    const { impl, calls } = fakeFetch(
      channelRoutes({
        [`UU${SUFFIX}`]: ["ccccccccccc", "bbbbbbbbbbb", "eeeeeeeeeee", "aaaaaaaaaaa", "ddddddddddd"],
        [`UUSH${SUFFIX}`]: ["bbbbbbbbbbb", "aaaaaaaaaaa"],
        [`UULV${SUFFIX}`]: ["ccccccccccc", "ddddddddddd"],
      }),
    );
    const { data, added } = await refreshChannelVideos(previous, "KEY", impl);
    expect(calls.filter((call) => call.startsWith("channels"))).toEqual([expect.stringContaining(`id=${CHANNEL_ID}`)]);
    expect(data.channel.thumbnail).toBe("https://yt3.ggpht.com/icon");
    expect(calls.filter((call) => call.startsWith("videos"))).toHaveLength(1);
    expect(added).toBe(2);
    expect(data.videos.map((v) => [v.id, v.kind, v.title])).toEqual([
      ["ccccccccccc", "live", "title ccccccccccc"],
      ["bbbbbbbbbbb", "short", "title bbbbbbbbbbb"],
      // タイトルは取り直し、種類は保存済みのまま
      ["aaaaaaaaaaa", "video", "title aaaaaaaaaaa"],
      ["ddddddddddd", "live", "title ddddddddddd"],
    ]);
    expect(data.fetchedAt).not.toBe(previous.fetchedAt);
    // 古い動画は取り直していないので、保存の期限は前に一覧を取った日時から数えたまま
    expect(data.listedAt).toBe(previous.fetchedAt);
  });

  it("skips the short and live playlists when nothing is new", async () => {
    const { impl, calls } = fakeFetch(channelRoutes({ [`UU${SUFFIX}`]: ["eeeeeeeeeee", "aaaaaaaaaaa"] }));
    const { added } = await refreshChannelVideos(previous, "KEY", impl);
    expect(added).toBe(0);
    expect(calls).toHaveLength(3);
  });
});

describe("upload limit", () => {
  // 新しい順に並んだ n 本のアップロード。番号が小さいほど新しい
  const uploadIds = (n: number) => Array.from({ length: n }, (_, i) => `v${String(i).padStart(10, "0")}`);
  const publishedOf = (id: string) =>
    id.startsWith("new") ? "2026-02-01T00:00:00Z" : new Date(Date.UTC(2026, 0, 1) - Number(id.slice(1)) * 3_600_000).toISOString();

  // アップロード一覧を API と同じく 50 本ずつのページで返す
  function pagedRoutes(uploads: string[]): Record<string, Route> {
    return {
      ...channelRoutes({}),
      playlistItems: (params) => {
        if (params.get("playlistId") !== `UU${SUFFIX}`) return notFound;
        const start = Number(params.get("pageToken") || 0);
        const items = uploads.slice(start, start + 50).map((videoId) => ({ contentDetails: { videoId } }));
        return { body: { items, nextPageToken: start + 50 < uploads.length ? String(start + 50) : undefined } };
      },
      videos: (params) => ({
        body: { items: (params.get("id") ?? "").split(",").map((id) => video(id, publishedOf(id), "PT10M")) },
      }),
    };
  }

  it("is not truncated when the channel has exactly the limit", async () => {
    const { impl } = fakeFetch(pagedRoutes(uploadIds(1000)));
    const data = await fetchChannelVideos(CHANNEL_ID, "KEY", impl);
    expect(data.videos).toHaveLength(1000);
    expect(data.truncated).toBe(false);
  });

  it("keeps the newest videos and marks the list truncated past the limit", async () => {
    const { impl } = fakeFetch(pagedRoutes(uploadIds(1001)));
    const data = await fetchChannelVideos(CHANNEL_ID, "KEY", impl);
    expect(data.videos).toHaveLength(1000);
    expect(data.videos.at(-1)?.id).toBe("v0000000999");
    expect(data.truncated).toBe(true);
  });

  it("marks the list truncated when new uploads push old ones out", async () => {
    const full = await fetchChannelVideos(CHANNEL_ID, "KEY", fakeFetch(pagedRoutes(uploadIds(1000).slice(1))).impl);
    expect(full.truncated).toBe(false);
    // 前は 999 本。新着 2 本で上限を超え、いちばん古い 1 本が抜ける
    const { data, added } = await refreshChannelVideos(full, "KEY", fakeFetch(pagedRoutes(["new00000001", ...uploadIds(1000)])).impl);
    expect(added).toBe(2);
    expect(data.videos).toHaveLength(1000);
    expect(data.videos.some((v) => v.id === "v0000000999")).toBe(false);
    expect(data.truncated).toBe(true);
  });

  it("stays truncated when nothing is new", async () => {
    const full = await fetchChannelVideos(CHANNEL_ID, "KEY", fakeFetch(pagedRoutes(uploadIds(1001))).impl);
    const { data } = await refreshChannelVideos(full, "KEY", fakeFetch(pagedRoutes(uploadIds(1001))).impl);
    expect(data.truncated).toBe(true);
  });
});

describe("fetchVideoInfo", () => {
  it("reads the title and channel of one video", async () => {
    const { impl, calls } = fakeFetch({
      videos: () => ({
        body: {
          items: [
            {
              id: "aaaaaaaaaaa",
              snippet: { title: "シャルル", channelId: CHANNEL_ID, channelTitle: "ぬぬはら", publishedAt: "2026-09-01T10:00:00Z" },
            },
          ],
        },
      }),
    });
    expect(await fetchVideoInfo("aaaaaaaaaaa", "KEY", impl)).toEqual({
      id: "aaaaaaaaaaa",
      title: "シャルル",
      channelId: CHANNEL_ID,
      channelTitle: "ぬぬはら",
      publishedAt: "2026-09-01T10:00:00Z",
    });
    expect(calls[0]).toContain("part=snippet%2CliveStreamingDetails&id=aaaaaaaaaaa");
  });

  it("returns null for an unknown video", async () => {
    const { impl } = fakeFetch({ videos: () => ({ body: { items: [] } }) });
    expect(await fetchVideoInfo("zzzzzzzzzzz", "KEY", impl)).toBeNull();
  });
});
