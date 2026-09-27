import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildUrlQueries,
  buildVideoBatches,
  createDefaultUrlSearch,
  filterVideos,
  linkTerm,
  parseTargetUrl,
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
    expect(parseTargetUrl(raw)).toEqual({ kind: "video", token: "dQw4w9WgXcQ" });
  });

  it("reads channel handles and ids", () => {
    expect(parseTargetUrl("https://www.youtube.com/@nunuhara/videos")).toEqual({
      kind: "channel",
      token: "nunuhara",
    });
    expect(parseTargetUrl("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv")).toEqual({
      kind: "channel",
      token: "UCabcdefghijklmnopqrstuv",
    });
  });

  it.each([
    ["https://www.nicovideo.jp/watch/sm9/?ref=top", "sm9"],
    ["https://sp.nicovideo.jp/watch/so123", "so123"],
    ["nico.ms/sm9", "sm9"],
    ["https://live.nicovideo.jp/watch/lv345678", "lv345678"],
  ])("reads the niconico id from %s", (raw, token) => {
    expect(parseTargetUrl(raw)).toEqual({ kind: "niconico", token });
  });

  it("keeps host and path for other pages", () => {
    expect(parseTargetUrl("https://www.nicovideo.jp/user/123/?ref=top")).toEqual({
      kind: "page",
      token: "nicovideo.jp/user/123",
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
  it("quotes pages and ids starting with a minus", () => {
    expect(linkTerm({ kind: "page", token: "example.com/a" })).toBe('url:"example.com/a"');
    expect(linkTerm({ kind: "video", token: "-bcdefghijk" })).toBe('url:"-bcdefghijk"');
    expect(linkTerm({ kind: "video", token: "abcdefghijk" })).toBe("url:abcdefghijk");
  });
});

describe("buildUrlQueries", () => {
  it("combines the link and words and appends exclusions and since", () => {
    const queries = buildUrlQueries({
      ...createDefaultUrlSearch(),
      url: "https://youtu.be/dQw4w9WgXcQ",
      words: ["#新作MV", "ぬぬ MV"],
      excluded: ["@nunuhara"],
      period: "week",
    });
    expect(queries.all).toBe(
      '(url:dQw4w9WgXcQ OR #新作MV OR "ぬぬ MV") -from:nunuhara since:2026-09-20',
    );
    expect(queries.link).toBe("url:dQw4w9WgXcQ -from:nunuhara since:2026-09-20");
    expect(queries.words).toBe('(#新作MV OR "ぬぬ MV") -from:nunuhara since:2026-09-20');
  });

  it("returns empty queries without a url or words", () => {
    const queries = buildUrlQueries({ ...createDefaultUrlSearch(), period: "week" });
    expect(queries).toEqual({ all: "", link: "", words: "", videoCount: 0 });
  });

  it("falls back to words when the url cannot be read", () => {
    const queries = buildUrlQueries({ ...createDefaultUrlSearch(), url: "abc", words: ["ぬぬ"] });
    expect(queries.all).toBe("ぬぬ");
    expect(queries.link).toBe("");
  });
});

describe("buildUrlQueries with channel tokens", () => {
  it("searches both the handle and the channel id", () => {
    const queries = buildUrlQueries(
      { ...createDefaultUrlSearch(), url: "https://www.youtube.com/@nnhr_nunu" },
      ["UCqYpbbypex0iOikcZRenxGA", "NNHR_NUNU", ""],
    );
    expect(queries.link).toBe("(url:nnhr_nunu OR url:UCqYpbbypex0iOikcZRenxGA)");
    expect(queries.all).toBe(queries.link);
  });

  it("adds the newest channel videos to the main search up to the length limit", () => {
    const state = { ...createDefaultUrlSearch(), url: "https://www.youtube.com/@nnhr_nunu", words: ["ぬぬはら"] };
    const ids = Array.from({ length: 40 }, (_, i) => `video${String(i).padStart(6, "0")}`);
    const queries = buildUrlQueries(state, [], ids, 200);
    expect(queries.videoCount).toBeGreaterThan(0);
    expect(queries.videoCount).toBeLessThan(40);
    expect(queries.all.length).toBeLessThanOrEqual(200);
    expect(queries.all).toMatch(/^\(url:nnhr_nunu OR url:video000000 OR .* OR ぬぬはら\)$/);
    expect(queries.link).not.toContain("ぬぬはら");
    expect(queries.link).toContain(`url:video${String(queries.videoCount - 1).padStart(6, "0")}`);
  });

  it("ignores video ids when the target is not a channel", () => {
    const queries = buildUrlQueries({ ...createDefaultUrlSearch(), words: ["曲名"] }, [], ["aaaaaaaaaaa"]);
    expect(queries.videoCount).toBe(0);
    expect(queries.all).toBe("曲名");
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
    const state = { ...createDefaultUrlSearch(), videoKinds: ["video" as const, "short" as const] };
    expect(filterVideos(videos, state).map((v) => v.id)).toEqual(["aaaaaaaaaaa", "ccccccccccc"]);
    expect(filterVideos(videos, { ...state, videoYears: ["2025"] }).map((v) => v.id)).toEqual(["ccccccccccc"]);
    expect(filterVideos(videos, { ...createDefaultUrlSearch(), videoTitle: "mv" }).map((v) => v.id)).toEqual([
      "aaaaaaaaaaa",
      "ccccccccccc",
    ]);
  });
});

describe("buildVideoBatches", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `video${String(i).padStart(6, "0")}`, keyword: "" }));
  const state = { ...createDefaultUrlSearch(), excluded: ["nnhr_nunu"], period: "year" as const };

  it("splits the ids so each query fits the length limit", () => {
    const batches = buildVideoBatches(items, state, 200);
    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      expect(batch.query.length).toBeLessThanOrEqual(200);
      expect(batch.query.endsWith(" -from:nnhr_nunu since:2025-09-27")).toBe(true);
    }
    expect(batches[0].from).toBe(1);
    expect(batches.at(-1)?.to).toBe(30);
    const joined = batches.map((batch) => batch.query).join(" ");
    for (const item of items) expect(joined).toContain(`url:${item.id}`);
  });

  it("uses a single term without parentheses", () => {
    expect(buildVideoBatches([{ id: "aaaaaaaaaaa", keyword: "" }], createDefaultUrlSearch())).toEqual([
      { query: "url:aaaaaaaaaaa", from: 1, to: 1 },
    ]);
  });

  it("returns nothing for no ids", () => {
    expect(buildVideoBatches([], state)).toEqual([]);
  });

  it("adds title words, scoped by the names when there are any", () => {
    const two = [
      { id: "aaaaaaaaaaa", keyword: "シャルル" },
      { id: "bbbbbbbbbbb", keyword: "夜に駆ける" },
    ];
    expect(buildVideoBatches(two, createDefaultUrlSearch())[0].query).toBe(
      '(url:aaaaaaaaaaa OR url:bbbbbbbbbbb OR "シャルル" OR "夜に駆ける")',
    );
    const named = { ...createDefaultUrlSearch(), words: ["ぬぬはら", "nnhr"] };
    expect(buildVideoBatches(two, named)[0].query).toBe(
      '(url:aaaaaaaaaaa OR url:bbbbbbbbbbb OR (("シャルル" OR "夜に駆ける") (ぬぬはら OR nnhr)))',
    );
    expect(buildVideoBatches(two, { ...named, videoTitleSearch: false })[0].query).toBe(
      "(url:aaaaaaaaaaa OR url:bbbbbbbbbbb)",
    );
  });
});

describe("videoQuery", () => {
  it("searches the link or the title words", () => {
    const state = { ...createDefaultUrlSearch(), words: ["ぬぬはら"] };
    expect(videoQuery({ id: "aaaaaaaaaaa", keyword: "シャルル" }, state)).toBe('(url:aaaaaaaaaaa OR ("シャルル" ぬぬはら))');
    expect(videoQuery({ id: "aaaaaaaaaaa", keyword: "" }, state)).toBe("url:aaaaaaaaaaa");
  });
});
