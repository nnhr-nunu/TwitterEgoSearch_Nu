import { describe, expect, it } from "vitest";
import { buildUrlQueries, createDefaultUrlSearch, linkTerm, parseTargetUrl } from "./url-search";

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

  it("keeps host and path for other pages", () => {
    expect(parseTargetUrl("https://www.nicovideo.jp/watch/sm9/?ref=top")).toEqual({
      kind: "page",
      token: "nicovideo.jp/watch/sm9",
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
      since: "2026-09-20",
    });
    expect(queries.all).toBe(
      '(url:dQw4w9WgXcQ OR #新作MV OR "ぬぬ MV") -from:nunuhara since:2026-09-20',
    );
    expect(queries.link).toBe("url:dQw4w9WgXcQ -from:nunuhara since:2026-09-20");
    expect(queries.words).toBe('(#新作MV OR "ぬぬ MV") -from:nunuhara since:2026-09-20');
  });

  it("returns empty queries without a url or words", () => {
    const queries = buildUrlQueries({ ...createDefaultUrlSearch(), since: "2026-09-20" });
    expect(queries).toEqual({ all: "", link: "", words: "" });
  });

  it("falls back to words when the url cannot be read", () => {
    const queries = buildUrlQueries({ ...createDefaultUrlSearch(), url: "abc", words: ["ぬぬ"] });
    expect(queries.all).toBe("ぬぬ");
    expect(queries.link).toBe("");
  });
});
