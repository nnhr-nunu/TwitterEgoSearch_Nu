import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMainQuery,
  buildVideoBatches,
  createDefaultUrlSearch,
  filterVideos,
  linkTerm,
  parseTargetUrl,
  videoItemOf,
  videoQuery,
} from "./url-search";
import type { ChannelVideo } from "./youtube";

// 期間は今日から数えるので、日付を固定する（2026-09-27 の 7 日前 = 2026-09-20）
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 27, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("parseTargetUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/live/dQw4w9WgXcQ",
  ])("reads the video id from %s", (raw) => {
    expect(parseTargetUrl(raw)).toEqual({ kind: "video", token: "dQw4w9WgXcQ", link: "dQw4w9WgXcQ" });
  });

  it("reads channel handles, ids and legacy names", () => {
    expect(parseTargetUrl("https://www.youtube.com/@nunuhara/videos")).toEqual({
      kind: "channel",
      token: "nunuhara",
      link: "youtube.com/@nunuhara",
    });
    expect(parseTargetUrl("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv")).toEqual({
      kind: "channel",
      token: "UCabcdefghijklmnopqrstuv",
      link: "UCabcdefghijklmnopqrstuv",
    });
    expect(parseTargetUrl("https://www.youtube.com/user/nunu")).toEqual({
      kind: "channel",
      token: "nunu",
      link: "youtube.com/user/nunu",
    });
  });

  it.each([
    ["https://www.nicovideo.jp/watch/sm9/?ref=top", "sm9"],
    ["https://sp.nicovideo.jp/watch/so123", "so123"],
    ["nico.ms/sm9", "sm9"],
    ["https://live.nicovideo.jp/watch/lv345678", "lv345678"],
  ])("reads the niconico id from %s", (raw, token) => {
    expect(parseTargetUrl(raw)).toEqual({ kind: "niconico", token, link: token });
  });

  it("keeps host and path for other pages", () => {
    expect(parseTargetUrl("https://www.nicovideo.jp/user/123/?ref=top")).toMatchObject({
      kind: "page",
      link: "nicovideo.jp/user/123",
    });
  });

  it("rejects text that is not a usable url", () => {
    expect(parseTargetUrl("")).toBeNull();
    expect(parseTargetUrl("ぬぬはら")).toBeNull();
    expect(parseTargetUrl("https://www.youtube.com/")).toBeNull();
    expect(parseTargetUrl("https://youtu.be/short")).toBeNull();
  });
});

describe("linkTerm", () => {
  it("quotes paths and ids starting with a minus", () => {
    expect(linkTerm("example.com/a")).toBe('url:"example.com/a"');
    expect(linkTerm("youtube.com/@nnhr_nunu")).toBe('url:"youtube.com/@nnhr_nunu"');
    expect(linkTerm("-bcdefghijk")).toBe('url:"-bcdefghijk"');
    expect(linkTerm("abcdefghijk")).toBe("url:abcdefghijk");
  });
});

describe("buildMainQuery", () => {
  it("combines the link and words and appends exclusions and since", () => {
    const { query } = buildMainQuery({
      ...createDefaultUrlSearch(),
      url: "https://youtu.be/dQw4w9WgXcQ",
      words: ["#新作MV", "ぬぬ MV"],
      excluded: ["@nunuhara"],
      period: "week",
    });
    expect(query).toBe('(url:dQw4w9WgXcQ OR #新作MV OR "ぬぬ MV") -from:nunuhara since:2026-09-20');
  });

  it("returns nothing without a readable url", () => {
    expect(buildMainQuery({ ...createDefaultUrlSearch(), period: "week" })).toEqual({ query: "", videoCount: 0 });
    expect(buildMainQuery({ ...createDefaultUrlSearch(), url: "abc", words: ["ぬぬ"] }).query).toBe("");
  });

  it("adds the title words of a single video only together with a name", () => {
    const state = { ...createDefaultUrlSearch(), url: "https://youtu.be/dQw4w9WgXcQ" };
    expect(buildMainQuery(state, { keyword: "シャルル", names: ["ぬぬはら"] }).query).toBe(
      '(url:dQw4w9WgXcQ OR ("シャルル" ぬぬはら))',
    );
    expect(buildMainQuery(state, { keyword: "シャルル" }).query).toBe("url:dQw4w9WgXcQ");
  });

  it("excludes the owner only while the switch is on", () => {
    const state = { ...createDefaultUrlSearch(), url: "https://youtu.be/dQw4w9WgXcQ", excluded: ["other"] };
    expect(buildMainQuery(state, { owners: ["nnhr_nunu"] }).query).toBe(
      "url:dQw4w9WgXcQ -from:other -from:nnhr_nunu",
    );
    expect(buildMainQuery({ ...state, excludeOwner: false }, { owners: ["nnhr_nunu"] }).query).toBe(
      "url:dQw4w9WgXcQ -from:other",
    );
  });
});

describe("buildMainQuery for channels", () => {
  it("searches the channel link and the channel id, not the bare handle", () => {
    const { query } = buildMainQuery(
      { ...createDefaultUrlSearch(), url: "https://www.youtube.com/@nnhr_nunu" },
      { links: ["UCqYpbbypex0iOikcZRenxGA", "youtube.com/@NNHR_NUNU", ""] },
    );
    expect(query).toBe('(url:"youtube.com/@nnhr_nunu" OR url:UCqYpbbypex0iOikcZRenxGA)');
  });

  it("adds the newest channel videos up to the length limit", () => {
    const state = { ...createDefaultUrlSearch(), url: "https://www.youtube.com/@nnhr_nunu", words: ["ぬぬはら"] };
    const ids = Array.from({ length: 40 }, (_, i) => `video${String(i).padStart(6, "0")}`);
    const { query, videoCount } = buildMainQuery(state, { videoIds: ids }, 200);
    expect(videoCount).toBeGreaterThan(0);
    expect(videoCount).toBeLessThan(40);
    expect(query.length).toBeLessThanOrEqual(200);
    expect(query.startsWith('(url:"youtube.com/@nnhr_nunu" OR url:video000000 OR ')).toBe(true);
    expect(query.endsWith(" OR ぬぬはら)")).toBe(true);
    expect(query).toContain(`url:video${String(videoCount - 1).padStart(6, "0")}`);
  });

  it("ignores video ids when the target is not a channel", () => {
    const state = { ...createDefaultUrlSearch(), url: "https://youtu.be/dQw4w9WgXcQ" };
    expect(buildMainQuery(state, { videoIds: ["aaaaaaaaaaa"] })).toEqual({ query: "url:dQw4w9WgXcQ", videoCount: 0 });
  });
});

const videos: ChannelVideo[] = [
  { id: "aaaaaaaaaaa", title: "新作MV", publishedAt: "2026-05-01T12:00:00Z", kind: "video" },
  { id: "bbbbbbbbbbb", title: "雑談配信", publishedAt: "2025-08-01T12:00:00Z", kind: "live" },
  { id: "ccccccccccc", title: "MV の裏側", publishedAt: "2025-03-01T12:00:00Z", kind: "short" },
];

describe("filterVideos", () => {
  it("keeps everything when no filter is set", () => {
    expect(filterVideos(videos, createDefaultUrlSearch())).toHaveLength(3);
  });

  it("filters by kind, year and title together", () => {
    const state = createDefaultUrlSearch();
    expect(filterVideos(videos, { ...state, videoKind: "short" }).map((v) => v.id)).toEqual(["ccccccccccc"]);
    expect(filterVideos(videos, { ...state, videoYear: "2025" }).map((v) => v.id)).toEqual([
      "bbbbbbbbbbb",
      "ccccccccccc",
    ]);
    expect(filterVideos(videos, { ...state, videoTitle: "mv" }).map((v) => v.id)).toEqual([
      "aaaaaaaaaaa",
      "ccccccccccc",
    ]);
    expect(filterVideos(videos, { ...state, videoKind: "video", videoYear: "2025" })).toEqual([]);
  });
});

describe("buildVideoBatches", () => {
  const ids = Array.from({ length: 30 }, (_, i) => `video${String(i).padStart(6, "0")}`);
  const state = { ...createDefaultUrlSearch(), excluded: ["nnhr_nunu"], period: "year" as const };

  it("splits the ids so each query fits the length limit", () => {
    const batches = buildVideoBatches(ids, state, [], 200);
    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      expect(batch.query.length).toBeLessThanOrEqual(200);
      expect(batch.query.endsWith(" -from:nnhr_nunu since:2025-09-27")).toBe(true);
    }
    expect(batches[0].from).toBe(1);
    expect(batches.at(-1)?.to).toBe(30);
    const joined = batches.map((batch) => batch.query).join(" ");
    for (const id of ids) expect(joined).toContain(`url:${id}`);
  });

  it("fits 25 video links in one search", () => {
    const real = Array.from({ length: 30 }, (_, i) => `NUCX55gmk${String(i).padStart(2, "0")}`);
    expect(buildVideoBatches(real, createDefaultUrlSearch())[0].to).toBe(25);
  });

  it("uses a single term without parentheses", () => {
    expect(buildVideoBatches(["aaaaaaaaaaa"], createDefaultUrlSearch())).toEqual([
      { query: "url:aaaaaaaaaaa", from: 1, to: 1 },
    ]);
  });

  it("returns nothing for no ids", () => {
    expect(buildVideoBatches([], state)).toEqual([]);
  });
});

describe("videoQuery", () => {
  it("adds the title words only together with a name", () => {
    const state = createDefaultUrlSearch();
    const item = { id: "aaaaaaaaaaa", keyword: "シャルル" };
    expect(videoQuery(item, state, ["ぬぬはら", "nnhr"])).toBe('(url:aaaaaaaaaaa OR ("シャルル" (ぬぬはら OR nnhr)))');
    expect(videoQuery(item, state)).toBe("url:aaaaaaaaaaa");
    expect(videoQuery({ id: "aaaaaaaaaaa", keyword: "" }, state, ["ぬぬはら"])).toBe("url:aaaaaaaaaaa");
  });

  it("does not take title words from streams", () => {
    expect(videoItemOf(videos[0], []).keyword).toBe("新作");
    expect(videoItemOf(videos[1], []).keyword).toBe("");
  });
});
