import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./defaults";
import { mergeChipValues, type SearchDrafts, withDrafts } from "./drafts";
import { splitSearchNames } from "./keywords";
import { buildPostsQuery, canSearchPosts } from "./query";

// 打っていない欄は空のまま
const drafts = (over: Partial<SearchDrafts>): SearchDrafts => ({ keywords: "", handles: "", ...over });

describe("withDrafts", () => {
  it("returns the same config when nothing is typed", () => {
    const config = { ...createDefaultConfig(), keywords: ["ぬぬはら"] };
    expect(withDrafts(config, drafts({}))).toBe(config);
    expect(withDrafts(config, drafts({ keywords: "  　、", handles: " " }))).toBe(config);
  });

  it("makes a typed-only name searchable", () => {
    const config = createDefaultConfig();
    expect(canSearchPosts(config)).toBe(false);
    const next = withDrafts(config, drafts({ keywords: "ぬぬはら" }));
    expect(canSearchPosts(next)).toBe(true);
    expect(buildPostsQuery(next)).toContain('"ぬぬはら"');
    // 確定した設定には触らない
    expect(config.keywords).toEqual([]);
  });

  it("adds typed names the same way as the 「＋」 button", () => {
    const config = { ...createDefaultConfig(), keywords: ["ABC"] };
    expect(withDrafts(config, drafts({ keywords: 'abc ぬぬはら、"Nunu Hara"' })).keywords).toEqual([
      "ABC",
      "ぬぬはら",
      "Nunu Hara",
    ]);
  });

  it("returns the same config when every typed name is already there", () => {
    const config = { ...createDefaultConfig(), keywords: ["ABC", "ぬぬはら"] };
    expect(withDrafts(config, drafts({ keywords: "abc ぬぬはら" }))).toBe(config);
  });

  it("adds a readable account and makes it searchable", () => {
    const config = createDefaultConfig();
    const next = withDrafts(config, drafts({ handles: "@nnhr_nunu https://x.com/Other_1" }));
    expect(next.handles).toEqual(["nnhr_nunu", "Other_1"]);
    expect(next.handle).toBe("nnhr_nunu");
    expect(canSearchPosts(next)).toBe(true);
    expect(buildPostsQuery(next)).toContain("from:nnhr_nunu");
  });

  it("skips accounts already added, ignoring case", () => {
    const config = { ...createDefaultConfig(), handles: ["nnhr_nunu"], handle: "nnhr_nunu" };
    expect(withDrafts(config, drafts({ handles: "@NNHR_NUNU" }))).toBe(config);
    expect(withDrafts(config, drafts({ handles: "NNHR_NUNU other" })).handles).toEqual(["nnhr_nunu", "other"]);
  });

  it("ignores an account that cannot be read", () => {
    const config = createDefaultConfig();
    expect(withDrafts(config, drafts({ handles: "@" }))).toBe(config);
    expect(withDrafts(config, drafts({ handles: "ぬぬはら" }))).toBe(config);
    expect(canSearchPosts(withDrafts(config, drafts({ handles: "ぬぬはら" })))).toBe(false);
  });

  it("adds both names and accounts at once", () => {
    const next = withDrafts(createDefaultConfig(), drafts({ keywords: "ぬぬはら", handles: "nnhr_nunu" }));
    expect(next.keywords).toEqual(["ぬぬはら"]);
    expect(next.handles).toEqual(["nnhr_nunu"]);
  });
});

describe("mergeChipValues", () => {
  it("returns null when nothing can be read", () => {
    expect(mergeChipValues(["a"], "  ", "text")).toBeNull();
    expect(mergeChipValues(["a"], "、 ,", "text", splitSearchNames)).toBeNull();
    expect(mergeChipValues([], "ぬぬはら", "handle")).toBeNull();
    expect(mergeChipValues([], "@", "handle")).toBeNull();
  });

  it("returns the same list when everything is already there", () => {
    const names = ["ABC", "ぬぬはら"];
    expect(mergeChipValues(names, "abc ぬぬはら", "text", splitSearchNames)).toBe(names);
    const handles = ["nnhr_nunu", "NNHR_NUNU"];
    // 前から重なっていた一覧でも、増えなければそのまま返す
    expect(mergeChipValues(handles, "@nnhr_nunu", "handle")).toBe(handles);
  });

  it("adds new words without the ones already there", () => {
    expect(mergeChipValues(["ABC"], 'abc ぬぬはら、"Nunu Hara"', "text", splitSearchNames)).toEqual([
      "ABC",
      "ぬぬはら",
      "Nunu Hara",
    ]);
    // 区切り方を渡さない欄は、打った文字をまるごと 1 つにする
    expect(mergeChipValues([], " 嫌い 苦手 ", "text")).toEqual(["嫌い 苦手"]);
  });

  it("adds readable accounts and drops duplicates", () => {
    expect(mergeChipValues(["nnhr_nunu"], "NNHR_NUNU https://x.com/Other_1", "handle")).toEqual(["nnhr_nunu", "Other_1"]);
  });
});
