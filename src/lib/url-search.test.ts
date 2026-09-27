import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildChannelBatches,
  buildMainQuery,
  createDefaultUrlSearch,
  linkTerm,
  parseTargetUrl,
  postWindow,
  videosInScope,
  videoWindow,
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
    const query = buildMainQuery({
      ...createDefaultUrlSearch(),
      url: "https://youtu.be/dQw4w9WgXcQ",
      words: ["#新作MV", "ぬぬ MV"],
      excluded: ["@nunuhara"],
      period: "week",
    });
    expect(query).toBe('(url:dQw4w9WgXcQ OR #新作MV OR "ぬぬ MV") -from:nunuhara since:2026-09-20');
  });

  it("returns nothing without a readable url", () => {
    expect(buildMainQuery({ ...createDefaultUrlSearch(), period: "week" })).toBe("");
    expect(buildMainQuery({ ...createDefaultUrlSearch(), url: "abc", words: ["ぬぬ"] })).toBe("");
  });

  it("adds the title words of a single video only together with a name", () => {
    const state = { ...createDefaultUrlSearch(), url: "https://youtu.be/dQw4w9WgXcQ" };
    expect(buildMainQuery(state, { keyword: "シャルル", names: ["ぬぬはら"] })).toBe('(url:dQw4w9WgXcQ OR ("シャルル" ぬぬはら))');
    expect(buildMainQuery(state, { keyword: "シャルル" })).toBe("url:dQw4w9WgXcQ");
  });

  it("excludes the owner only while the switch is on", () => {
    const state = { ...createDefaultUrlSearch(), url: "https://youtu.be/dQw4w9WgXcQ", excluded: ["other"] };
    expect(buildMainQuery(state, { owners: ["nnhr_nunu"] })).toBe("url:dQw4w9WgXcQ -from:other -from:nnhr_nunu");
    expect(buildMainQuery({ ...state, excludeOwner: false }, { owners: ["nnhr_nunu"] })).toBe("url:dQw4w9WgXcQ -from:other");
  });

  it("searches the channel link and the channel id, not the bare handle", () => {
    const query = buildMainQuery(
      { ...createDefaultUrlSearch(), url: "https://www.youtube.com/@nnhr_nunu" },
      { links: ["UCqYpbbypex0iOikcZRenxGA", "youtube.com/@NNHR_NUNU", ""] },
    );
    expect(query).toBe('(url:"youtube.com/@nnhr_nunu" OR url:UCqYpbbypex0iOikcZRenxGA)');
  });

  it("uses since and until for a custom range", () => {
    const state = {
      ...createDefaultUrlSearch(),
      url: "https://youtu.be/dQw4w9WgXcQ",
      period: "custom" as const,
      rangeStart: "2026-08-01",
      rangeEnd: "2026-08-10",
    };
    expect(buildMainQuery(state)).toBe("url:dQw4w9WgXcQ since:2026-08-01 until:2026-08-11");
  });
});

describe("postWindow", () => {
  const base = createDefaultUrlSearch();

  it("counts relative periods from today", () => {
    expect(postWindow(base)).toEqual({ since: "", until: "" });
    expect(postWindow({ ...base, period: "day" })).toEqual({ since: "2026-09-26", until: "" });
    expect(postWindow({ ...base, period: "year" })).toEqual({ since: "2025-09-27", until: "" });
  });

  it("reads a range with blank ends and swaps a reversed one", () => {
    const custom = { ...base, period: "custom" as const };
    expect(postWindow(custom)).toEqual({ since: "", until: "" });
    expect(postWindow({ ...custom, rangeStart: "2026-08-01" })).toEqual({ since: "2026-08-01", until: "" });
    expect(postWindow({ ...custom, rangeEnd: "2026-08-10" })).toEqual({ since: "", until: "2026-08-11" });
    expect(postWindow({ ...custom, rangeStart: "2026-08-10", rangeEnd: "2026-08-01" })).toEqual({
      since: "2026-08-01",
      until: "2026-08-11",
    });
  });

  it("reads a window around a date, or around today when blank", () => {
    const around = { ...base, period: "custom" as const, dateMode: "around" as const };
    expect(postWindow({ ...around, aroundDate: "2026-08-15" })).toEqual({ since: "2026-08-08", until: "2026-08-23" });
    expect(postWindow({ ...around, dateSpan: "month" })).toEqual({ since: "2026-08-27", until: "2026-10-28" });
  });

  it("starts the video window a week before the posts", () => {
    expect(videoWindow({ ...base, period: "week" })).toEqual({ since: "2026-09-13", until: "" });
    expect(videoWindow(base)).toEqual({ since: "", until: "" });
  });
});

const videos: ChannelVideo[] = [
  { id: "aaaaaaaaaaa", title: "新作MV", publishedAt: "2026-09-25T12:00:00", kind: "video" },
  { id: "bbbbbbbbbbb", title: "雑談配信", publishedAt: "2026-09-14T12:00:00", kind: "live" },
  { id: "ccccccccccc", title: "MV の裏側", publishedAt: "2026-09-12T12:00:00", kind: "short" },
  { id: "ddddddddddd", title: "去年の MV", publishedAt: "2025-03-01T12:00:00", kind: "video" },
];

describe("videosInScope", () => {
  const state = createDefaultUrlSearch();

  it("keeps everything when no filter is set", () => {
    expect(videosInScope(videos, state)).toHaveLength(4);
  });

  it("keeps videos published in the period and the week before it", () => {
    expect(videosInScope(videos, { ...state, period: "week" }).map((v) => v.id)).toEqual(["aaaaaaaaaaa", "bbbbbbbbbbb"]);
    const range = { ...state, period: "custom" as const, rangeStart: "2025-03-05", rangeEnd: "2025-03-31" };
    expect(videosInScope(videos, range).map((v) => v.id)).toEqual(["ddddddddddd"]);
    expect(videosInScope(videos, { ...range, rangeStart: "", rangeEnd: "2026-09-13" }).map((v) => v.id)).toEqual([
      "ccccccccccc",
      "ddddddddddd",
    ]);
  });

  it("filters by kind and title together with the period", () => {
    expect(videosInScope(videos, { ...state, videoKind: "short" }).map((v) => v.id)).toEqual(["ccccccccccc"]);
    expect(videosInScope(videos, { ...state, videoTitle: "mv" }).map((v) => v.id)).toEqual([
      "aaaaaaaaaaa",
      "ccccccccccc",
      "ddddddddddd",
    ]);
    expect(videosInScope(videos, { ...state, videoTitle: "mv", period: "month" }).map((v) => v.id)).toEqual([
      "aaaaaaaaaaa",
      "ccccccccccc",
    ]);
  });
});

describe("buildChannelBatches", () => {
  const ids = Array.from({ length: 30 }, (_, i) => `video${String(i).padStart(6, "0")}`);
  const state = {
    ...createDefaultUrlSearch(),
    url: "https://www.youtube.com/@nnhr_nunu",
    words: ["#ぬぬ配信"],
    excluded: ["someone"],
    period: "year" as const,
  };
  const scope = { links: ["UCqYpbbypex0iOikcZRenxGA"], owners: ["nnhr_nunu"], videoIds: ids };

  it("puts the channel links and words only in the first search", () => {
    const batches = buildChannelBatches(state, scope, 200);
    expect(batches.length).toBeGreaterThan(1);
    expect(
      batches[0].query.startsWith('(url:"youtube.com/@nnhr_nunu" OR url:UCqYpbbypex0iOikcZRenxGA OR #ぬぬ配信 OR url:video000000'),
    ).toBe(true);
    for (const batch of batches.slice(1)) {
      expect(batch.query).not.toContain("youtube.com");
      expect(batch.query).not.toContain("#ぬぬ配信");
    }
  });

  it("splits the videos so each search fits the length limit", () => {
    const batches = buildChannelBatches(state, scope, 200);
    for (const batch of batches) {
      expect(batch.query.length).toBeLessThanOrEqual(200);
      expect(batch.query.endsWith(" -from:someone -from:nnhr_nunu since:2025-09-27")).toBe(true);
    }
    expect(batches[0].from).toBe(1);
    expect(batches.at(-1)?.to).toBe(30);
    batches.slice(1).forEach((batch, index) => expect(batch.from).toBe(batches[index].to + 1));
    const joined = batches.map((batch) => batch.query).join(" ");
    for (const id of ids) expect(joined).toContain(`url:${id}`);
  });

  it("fits the channel and about 24 video links in one search", () => {
    const real = Array.from({ length: 60 }, (_, i) => `NUCX55gmk${String(i).padStart(2, "0")}`);
    const batches = buildChannelBatches(
      { ...createDefaultUrlSearch(), url: "https://www.youtube.com/@nnhr_nunu" },
      { links: ["UCqYpbbypex0iOikcZRenxGA"], videoIds: real },
    );
    expect(batches[0].to).toBeGreaterThanOrEqual(22);
    expect(batches[1].to - batches[1].from + 1).toBeGreaterThanOrEqual(25);
    for (const batch of batches) expect(batch.query.length).toBeLessThanOrEqual(480);
  });

  it("searches the channel link alone when no video is in scope", () => {
    expect(buildChannelBatches({ ...state, words: [] }, { ...scope, videoIds: [] })).toEqual([
      {
        query: '(url:"youtube.com/@nnhr_nunu" OR url:UCqYpbbypex0iOikcZRenxGA) -from:someone -from:nnhr_nunu since:2025-09-27',
        from: 1,
        to: 0,
      },
    ]);
  });

  it("returns nothing without a readable url", () => {
    expect(buildChannelBatches(createDefaultUrlSearch(), scope)).toEqual([]);
  });
});
