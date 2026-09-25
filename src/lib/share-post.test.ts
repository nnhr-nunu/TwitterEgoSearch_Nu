import { describe, expect, it } from "vitest";
import { hydrateConfig } from "./defaults";
import { buildLivePostsUrl } from "./live";
import { buildPostsQuery } from "./query";
import {
  buildShareParams,
  buildShareBody,
  composeSharePost,
  buildShareUrl,
  shareSubjectLabel,
  weightedPostLength,
} from "./share-post";
import { parseSearchParams } from "./share-url";

const rich = hydrateConfig({
  keywords: ["ぬぬはら", "ぬぬさん"],
  handles: ["nnhr_nunu"],
  filterKeywords: ["イラスト"],
  mutedHandles: ["spam_bot"],
  mutedKeywords: ["#pr"],
  mediaOnly: true,
  sort: "likes",
  dateFilter: true,
  aroundDate: "2026-05-01",
  dateSpan: "month",
  rangeFilter: true,
  rangeStart: "2026-04-10",
  rangeEnd: "2026-04-20",
});

describe("share post", () => {
  it("reproduces the same X search on the receiving side", () => {
    const params = buildShareParams(rich, "ja", { includeMutes: true });
    const parsed = parseSearchParams(params);
    expect(parsed.found).toBe(true);
    expect(parsed.shared).toBe(true);
    expect(buildPostsQuery(parsed.config)).toBe(buildPostsQuery(rich));
    expect(buildLivePostsUrl(parsed.config)).toBe(buildLivePostsUrl(rich));
  });

  it("leaves mutes out unless asked", () => {
    const params = buildShareParams(rich, "ja", { includeMutes: false });
    expect(params.has("mute")).toBe(false);
    expect(params.has("mk")).toBe(false);
    const query = buildPostsQuery(parseSearchParams(params).config);
    expect(query).not.toContain("spam_bot");
    expect(query).not.toContain("#pr");
  });

  it("keeps the link short by omitting defaults", () => {
    const plain = hydrateConfig({ keywords: ["ぬぬはら"] });
    const url = buildShareUrl("https://self-search.oshilog.life/", plain, "ja", { includeMutes: false });
    expect(url).toBe("https://self-search.oshilog.life/?k=%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89&share=1");
    const parsed = parseSearchParams(new URL(url).search);
    expect(buildPostsQuery(parsed.config)).toBe(buildPostsQuery(plain));
    expect(parsed.locale).toBe("ja");
  });

  it("carries the locale", () => {
    const params = buildShareParams(rich, "en", { includeMutes: false });
    expect(parseSearchParams(params).locale).toBe("en");
  });

  it("labels by keywords, then by handles", () => {
    expect(shareSubjectLabel(rich)).toBe("ぬぬはら・ぬぬさん");
    expect(shareSubjectLabel(hydrateConfig({ keywords: ["a", "b", "c", "d"] }))).toBe("a・b ほか2件");
    expect(shareSubjectLabel(hydrateConfig({ keywords: [], handles: ["nnhr_nunu"] }))).toBe("@nnhr_nunu");
  });

  it("writes a post that fits in one X post", () => {
    const body = buildShareBody(rich, "ja", "thanks");
    expect(body).toContain("「ぬぬはら・ぬぬさん」");
    const text = composeSharePost(body);
    expect(text.endsWith("\n\n#エゴサ支援ツールぬ")).toBe(true);
    expect(weightedPostLength(text, true)).toBeLessThanOrEqual(280);
  });

  it("starts free input blank but always keeps the hashtag", () => {
    expect(buildShareBody(rich, "ja", "free")).toBe("");
    expect(composeSharePost("")).toBe("#エゴサ支援ツールぬ");
    expect(composeSharePost("  いつもありがとう！ \n")).toBe("いつもありがとう！\n\n#エゴサ支援ツールぬ");
  });

  it("weighs Japanese as 2 and URLs as 23", () => {
    expect(weightedPostLength("abc", false)).toBe(3);
    expect(weightedPostLength("あいう", false)).toBe(6);
    expect(weightedPostLength("🔍", false)).toBe(2);
    expect(weightedPostLength("abc", true)).toBe(3 + 1 + 23);
    expect(weightedPostLength("", true)).toBe(23);
  });
});
