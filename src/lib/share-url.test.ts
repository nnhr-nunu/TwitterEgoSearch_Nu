import { describe, expect, it } from "vitest";
import { createDefaultConfig, hydrateConfig } from "./defaults";
import { buildPostsQuery } from "./query";
import { parseSearchParams, serializeSearchParams } from "./share-url";
import { parseStatusUrl, tweetIntentUrl } from "./tweet-intent";

describe("share url", () => {
  it("round-trips a custom config", () => {
    const config = hydrateConfig({
      ...createDefaultConfig(),
      handle: "example_user",
      handles: ["example_user"],
      displayName: "Example",
      keywords: ["alpha", "beta"],
      filterKeywords: ["art"],
      wrapQuotes: false,
      excludeOwn: false,
      fromSelf: true,
      mediaOnly: true,
      latest: false,
      sort: "likes",
      minFaves: 100,
      mutedHandles: ["spam_bot", "noise_acc"],
      mutedKeywords: ["ad"],
    });
    const params = serializeSearchParams(config, "en");
    const parsed = parseSearchParams(params);
    expect(parsed.found).toBe(true);
    expect(parsed.locale).toBe("en");
    expect(parsed.config).toEqual(config);
  });

  it("falls back to an empty generic config when empty", () => {
    const parsed = parseSearchParams("");
    expect(parsed.found).toBe(false);
    expect(parsed.config.handle).toBe("");
    expect(parsed.config.handles).toEqual([]);
    expect(parsed.config.keywords).toEqual([]);
    expect(parsed.config.mediaOnly).toBe(false);
    expect(parsed.config.sort).toBe("latest");
    expect(parsed.config.honorifics).toEqual([]);
    expect(parsed.config.dateFilter).toBe(false);
    expect(parsed.config.since).toBe("");
  });

  it("does not treat filter-only params as a shared search", () => {
    const parsed = parseSearchParams("q=1&x=1&live=1");
    expect(parsed.found).toBe(false);
  });

  it("keeps quoting on and omits dates unless dateFilter is on", () => {
    const off = hydrateConfig({
      keywords: ["ぬぬはらさん"],
      wrapQuotes: false,
      mediaOnly: true,
      honorifics: ["san"],
    });
    expect(off.wrapQuotes).toBe(true);
    expect(off.mediaOnly).toBe(false);
    expect(off.honorifics).toEqual([]);
    expect(off.dateFilter).toBe(false);
    expect(off.since).toBe("");
    expect(buildPostsQuery(off)).toContain('"ぬぬはらさん"');
    expect(buildPostsQuery(off)).not.toContain("since:");
    expect(buildPostsQuery(off)).not.toContain("filter:media");
    expect(buildPostsQuery(off)).not.toContain("ぬぬはらさんさん");

    const on = hydrateConfig({
      keywords: ["ぬぬはらさん"],
      dateFilter: true,
      aroundDate: "2026-09-22",
      dateSpan: "7",
    });
    expect(on.since).toBe("2026-09-15");
    expect(on.until).toBe("2026-09-30");
    expect(buildPostsQuery(on)).toContain("since:2026-09-15");
    expect(buildPostsQuery(on)).toContain("until:2026-09-30");
  });

  it("round-trips muted accounts as repeated mute params", () => {
    const config = hydrateConfig({
      ...createDefaultConfig(),
      keywords: ["alpha"],
      mutedHandles: ["spam_bot", "noise_acc"],
    });
    const params = serializeSearchParams(config, "ja");
    expect(params.getAll("mute")).toEqual(["spam_bot", "noise_acc"]);
    const parsed = parseSearchParams(params);
    expect(parsed.found).toBe(true);
    expect(parsed.config.mutedHandles).toEqual(["spam_bot", "noise_acc"]);
  });
});

describe("tweet intent", () => {
  it("normalizes a status URL", () => {
    expect(parseStatusUrl("https://twitter.com/nnhr_nunu/status/12345?s=20")).toBe(
      "https://x.com/nnhr_nunu/status/12345",
    );
  });

  it("rejects non-status URLs", () => {
    expect(parseStatusUrl("https://x.com/nnhr_nunu")).toBeNull();
  });

  it("builds an intent URL", () => {
    expect(tweetIntentUrl({ text: "hello", url: "https://example.com" })).toBe(
      "https://x.com/intent/tweet?text=hello&url=https%3A%2F%2Fexample.com",
    );
  });
});
