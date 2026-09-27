import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildChannelBatches,
  buildMainQuery,
  createDefaultUrlSearch,
  linkTerm,
  parseTargetUrl,
  loadUrlSearch,
  postWindow,
  URL_SEARCH_STORAGE_KEY,
  videosInScope,
  withChannelWords,
} from "./url-search";
import type { ChannelVideo } from "./youtube";

// 既定の期間は 1 週間。期間を問わないテストは「すべて」から始める
const defaults = () => ({ ...createDefaultUrlSearch(), period: "all" as const });

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
      ...defaults(),
      url: "https://youtu.be/dQw4w9WgXcQ",
      words: ["#新作MV", "ぬぬ MV"],
      excluded: ["@nunuhara"],
      period: "week",
    });
    expect(query).toBe('(url:dQw4w9WgXcQ OR #新作MV OR "ぬぬ MV") -from:nunuhara since:2026-09-20');
  });

  it("returns nothing without a readable url", () => {
    expect(buildMainQuery({ ...defaults(), period: "week" })).toBe("");
    expect(buildMainQuery({ ...defaults(), url: "abc", words: ["ぬぬ"] })).toBe("");
  });

  it("adds the title words of a single video only together with a name", () => {
    const state = { ...defaults(), url: "https://youtu.be/dQw4w9WgXcQ" };
    expect(buildMainQuery(state, { keyword: "シャルル", names: ["ぬぬはら"] })).toBe('(url:dQw4w9WgXcQ OR ("シャルル" ぬぬはら))');
    expect(buildMainQuery(state, { keyword: "シャルル" })).toBe("url:dQw4w9WgXcQ");
  });

  it("excludes the owner only while the switch is on", () => {
    const state = { ...defaults(), url: "https://youtu.be/dQw4w9WgXcQ", excluded: ["other"] };
    expect(buildMainQuery(state, { owners: ["nnhr_nunu"] })).toBe("url:dQw4w9WgXcQ -from:other -from:nnhr_nunu");
    expect(buildMainQuery({ ...state, excludeOwner: false }, { owners: ["nnhr_nunu"] })).toBe("url:dQw4w9WgXcQ -from:other");
  });

  it("searches the channel link and the channel id, not the bare handle", () => {
    const query = buildMainQuery(
      { ...defaults(), url: "https://www.youtube.com/@nnhr_nunu" },
      { links: ["UCqYpbbypex0iOikcZRenxGA", "youtube.com/@NNHR_NUNU", ""] },
    );
    expect(query).toBe('(url:"youtube.com/@nnhr_nunu" OR url:UCqYpbbypex0iOikcZRenxGA)');
  });

  it("uses since and until for a range", () => {
    const state = {
      ...defaults(),
      url: "https://youtu.be/dQw4w9WgXcQ",
      period: "range" as const,
      rangeStart: "2026-08-01",
      rangeEnd: "2026-08-10",
    };
    expect(buildMainQuery(state)).toBe("url:dQw4w9WgXcQ since:2026-08-01 until:2026-08-11");
  });
});

describe("postWindow", () => {
  const base = defaults();

  it("defaults to one week", () => {
    expect(createDefaultUrlSearch().period).toBe("week");
  });

  it("counts relative periods from today", () => {
    expect(postWindow(base)).toEqual({ since: "", until: "" });
    expect(postWindow({ ...base, period: "week" })).toEqual({ since: "2026-09-20", until: "" });
    expect(postWindow({ ...base, period: "year" })).toEqual({ since: "2025-09-27", until: "" });
  });

  it("reads a range with blank ends and swaps a reversed one", () => {
    const custom = { ...base, period: "range" as const };
    expect(postWindow(custom)).toEqual({ since: "", until: "" });
    expect(postWindow({ ...custom, rangeStart: "2026-08-01" })).toEqual({ since: "2026-08-01", until: "" });
    expect(postWindow({ ...custom, rangeEnd: "2026-08-10" })).toEqual({ since: "", until: "2026-08-11" });
    expect(postWindow({ ...custom, rangeStart: "2026-08-10", rangeEnd: "2026-08-01" })).toEqual({
      since: "2026-08-01",
      until: "2026-08-11",
    });
  });

  it("reads a window around a date, or around today when blank", () => {
    const around = { ...base, period: "around" as const };
    expect(postWindow({ ...around, aroundDate: "2026-08-15" })).toEqual({ since: "2026-08-08", until: "2026-08-23" });
    expect(postWindow({ ...around, dateSpan: "month" })).toEqual({ since: "2026-08-27", until: "2026-10-28" });
  });
});

const videos: ChannelVideo[] = [
  { id: "aaaaaaaaaaa", title: "新作MV", publishedAt: "2026-09-25T12:00:00", kind: "video" },
  { id: "bbbbbbbbbbb", title: "雑談配信", publishedAt: "2026-09-14T12:00:00", kind: "live" },
  { id: "ccccccccccc", title: "MV の裏側", publishedAt: "2026-09-12T12:00:00", kind: "short" },
  { id: "ddddddddddd", title: "去年の MV", publishedAt: "2025-03-01T12:00:00", kind: "video" },
];

describe("videosInScope", () => {
  const state = defaults();

  it("keeps everything when no filter is set", () => {
    expect(videosInScope(videos, state)).toHaveLength(4);
  });

  it("keeps only videos published in the period", () => {
    expect(videosInScope(videos, { ...state, period: "week" }).map((v) => v.id)).toEqual(["aaaaaaaaaaa"]);
    const range = { ...state, period: "range" as const, rangeStart: "2025-03-01", rangeEnd: "2025-03-31" };
    expect(videosInScope(videos, range).map((v) => v.id)).toEqual(["ddddddddddd"]);
    expect(videosInScope(videos, { ...range, rangeStart: "", rangeEnd: "2026-09-13" }).map((v) => v.id)).toEqual([
      "ccccccccccc",
      "ddddddddddd",
    ]);
  });

  it("keeps no video for the channel kind", () => {
    expect(videosInScope(videos, { ...state, videoKind: "channel" })).toEqual([]);
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
    ...defaults(),
    url: "https://www.youtube.com/@nnhr_nunu",
    words: ["#ぬぬ配信"],
    excluded: ["someone"],
    period: "year" as const,
  };
  const scope = { links: ["UCqYpbbypex0iOikcZRenxGA"], owners: ["nnhr_nunu"], videoIds: ids };

  it("searches 20 videos at a time and adds the words to the last search", () => {
    const batches = buildChannelBatches(state, scope);
    expect(batches.map((batch) => [batch.from, batch.to])).toEqual([
      [1, 20],
      [21, 30],
    ]);
    expect(batches[0].query).not.toContain("#ぬぬ配信");
    expect(batches[1].query.startsWith("(#ぬぬ配信 OR url:video000020")).toBe(true);
    for (const batch of batches) {
      expect(batch.query).not.toContain("youtube.com");
      expect(batch.query).not.toContain("UCqYpbbypex0iOikcZRenxGA");
      expect(batch.query.length).toBeLessThanOrEqual(480);
      expect(batch.query.endsWith(" -from:someone -from:nnhr_nunu since:2025-09-27")).toBe(true);
    }
    const joined = batches.map((batch) => batch.query).join(" ");
    for (const id of ids) expect(joined).toContain(`url:${id}`);
  });

  it("searches the words on their own when they do not fit", () => {
    const batches = buildChannelBatches({ ...state, words: ["#".padEnd(80, "ぬ")] }, { ...scope, videoIds: ids.slice(0, 20) });
    expect(batches.map((batch) => [batch.from, batch.to])).toEqual([
      [1, 20],
      [21, 20],
    ]);
    expect(batches[1].query.startsWith("#ぬ")).toBe(true);
  });

  it("uses fewer videos per search only when 20 do not fit", () => {
    const batches = buildChannelBatches(state, scope, 200);
    const sizes = batches.filter((batch) => batch.to >= batch.from).map((batch) => batch.to - batch.from + 1);
    expect(new Set(sizes.slice(0, -1)).size).toBe(1);
    expect(sizes[0]).toBeLessThan(20);
    for (const batch of batches) expect(batch.query.length).toBeLessThanOrEqual(200);
  });

  it("searches only the channel links and words for the channel kind", () => {
    expect(buildChannelBatches({ ...state, videoKind: "channel" }, scope)).toEqual([
      {
        query: '(url:"youtube.com/@nnhr_nunu" OR url:UCqYpbbypex0iOikcZRenxGA OR #ぬぬ配信) -from:someone -from:nnhr_nunu since:2025-09-27',
        from: 1,
        to: 0,
      },
    ]);
  });

  it("searches nothing when no video is in scope and no word is set", () => {
    expect(buildChannelBatches({ ...state, words: [] }, { ...scope, videoIds: [] })).toEqual([]);
  });

  it("returns nothing without a readable url", () => {
    expect(buildChannelBatches(defaults(), scope)).toEqual([]);
  });
});

describe("channel words", () => {
  it("replaces one channel's words and drops empty ones", () => {
    const map = { UCa: ["#a"], UCb: ["#b"] };
    expect(withChannelWords(map, "UCa", ["#a", "#a2"])).toEqual({ UCa: ["#a", "#a2"], UCb: ["#b"] });
    expect(withChannelWords(map, "UCa", [])).toEqual({ UCb: ["#b"] });
    expect(map).toEqual({ UCa: ["#a"], UCb: ["#b"] });
  });
});

describe("loadUrlSearch", () => {
  function stored(value: object) {
    const localStorage = { getItem: (key: string) => (key === URL_SEARCH_STORAGE_KEY ? JSON.stringify(value) : null) };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage } });
  }

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("moves the old periods to the new ones", () => {
    stored({ period: "day" });
    expect(loadUrlSearch().period).toBe("week");
    stored({ period: "custom", dateMode: "around" });
    expect(loadUrlSearch().period).toBe("around");
    stored({ period: "custom" });
    expect(loadUrlSearch().period).toBe("range");
  });

  it("keeps words per channel", () => {
    stored({ channelWords: { UCa: ["#a"], UCb: [], UCc: "x" } });
    expect(loadUrlSearch().channelWords).toEqual({ UCa: ["#a"] });
  });
});
