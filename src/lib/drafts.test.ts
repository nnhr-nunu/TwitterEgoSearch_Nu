import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./defaults";
import { withDrafts } from "./drafts";
import { buildPostsQuery, canSearchPosts } from "./query";

describe("withDrafts", () => {
  it("returns the same config when nothing is typed", () => {
    const config = { ...createDefaultConfig(), keywords: ["ぬぬはら"] };
    expect(withDrafts(config, {})).toBe(config);
    expect(withDrafts(config, { keywords: "", handles: "" })).toBe(config);
    expect(withDrafts(config, { keywords: "  　、", handles: " " })).toBe(config);
  });

  it("makes a typed-only name searchable", () => {
    const config = createDefaultConfig();
    expect(canSearchPosts(config)).toBe(false);
    const next = withDrafts(config, { keywords: "ぬぬはら" });
    expect(canSearchPosts(next)).toBe(true);
    expect(buildPostsQuery(next)).toContain('"ぬぬはら"');
    // 確定した設定には触らない
    expect(config.keywords).toEqual([]);
  });

  it("adds typed names the same way as the 「＋」 button", () => {
    const config = { ...createDefaultConfig(), keywords: ["ABC"] };
    expect(withDrafts(config, { keywords: 'abc ぬぬはら、"Nunu Hara"' }).keywords).toEqual([
      "ABC",
      "ぬぬはら",
      "Nunu Hara",
    ]);
  });

  it("returns the same config when every typed name is already there", () => {
    const config = { ...createDefaultConfig(), keywords: ["ABC", "ぬぬはら"] };
    expect(withDrafts(config, { keywords: "abc ぬぬはら" })).toBe(config);
  });

  it("adds a readable account and makes it searchable", () => {
    const config = createDefaultConfig();
    const next = withDrafts(config, { handles: "@nnhr_nunu https://x.com/Other_1" });
    expect(next.handles).toEqual(["nnhr_nunu", "Other_1"]);
    expect(next.handle).toBe("nnhr_nunu");
    expect(canSearchPosts(next)).toBe(true);
    expect(buildPostsQuery(next)).toContain("from:nnhr_nunu");
  });

  it("skips accounts already added, ignoring case", () => {
    const config = { ...createDefaultConfig(), handles: ["nnhr_nunu"], handle: "nnhr_nunu" };
    expect(withDrafts(config, { handles: "@NNHR_NUNU" })).toBe(config);
    expect(withDrafts(config, { handles: "NNHR_NUNU other" }).handles).toEqual(["nnhr_nunu", "other"]);
  });

  it("ignores an account that cannot be read", () => {
    const config = createDefaultConfig();
    expect(withDrafts(config, { handles: "@" })).toBe(config);
    expect(withDrafts(config, { handles: "ぬぬはら" })).toBe(config);
    expect(canSearchPosts(withDrafts(config, { handles: "ぬぬはら" }))).toBe(false);
  });

  it("adds both names and accounts at once", () => {
    const next = withDrafts(createDefaultConfig(), { keywords: "ぬぬはら", handles: "nnhr_nunu" });
    expect(next.keywords).toEqual(["ぬぬはら"]);
    expect(next.handles).toEqual(["nnhr_nunu"]);
  });
});
