import { describe, expect, it } from "vitest";
import {
  DEFAULT_HONORIFIC_IDS,
  expandSearchTerms,
  HONORIFIC_CATALOG,
  isDerivedHonorific,
  toggleHonorific,
} from "./honorifics";

describe("catalog", () => {
  it("lists ego-search honorifics and defaults to さん・ちゃん・様", () => {
    expect(HONORIFIC_CATALOG.map((item) => item.suffix)).toEqual([
      "さん",
      "ちゃん",
      "くん",
      "君",
      "様",
      "先生",
      "たん",
      "氏",
    ]);
    expect(DEFAULT_HONORIFIC_IDS).toEqual(["san", "chan", "sama"]);
  });
});

describe("expandSearchTerms", () => {
  it("returns the bases unchanged when no honorific is on", () => {
    expect(expandSearchTerms(["ぬぬはら", "ﾇﾇ🫀"], [])).toEqual(["ぬぬはら", "ﾇﾇ🫀"]);
  });

  it("adds only the honorifics that are on", () => {
    expect(expandSearchTerms(["たろう"], ["san", "chan", "sama"])).toEqual([
      "たろう",
      "たろうさん",
      "たろうちゃん",
      "たろう様",
    ]);
    expect(expandSearchTerms(["たろう"], ["kun", "sensei"])).toEqual([
      "たろう",
      "たろうくん",
      "たろう先生",
    ]);
  });

  it("does not add another suffix to a word that already has one", () => {
    expect(expandSearchTerms(["ぬぬさん"], ["san", "chan", "sama"])).toEqual(["ぬぬさん"]);
  });

  it("applies a suffix to an emoji nickname only when that honorific is on", () => {
    expect(expandSearchTerms(["ﾇﾇ🫀"], [])).toEqual(["ﾇﾇ🫀"]);
    expect(expandSearchTerms(["ﾇﾇ🫀"], ["san"])).toEqual(["ﾇﾇ🫀", "ﾇﾇ🫀さん"]);
    expect(expandSearchTerms(["ﾇﾇ🫀"], ["san", "chan", "sama"])).toEqual([
      "ﾇﾇ🫀",
      "ﾇﾇ🫀さん",
      "ﾇﾇ🫀ちゃん",
      "ﾇﾇ🫀様",
    ]);
  });
});

describe("isDerivedHonorific", () => {
  it("marks auto-added suffixes, not the base the user typed", () => {
    expect(isDerivedHonorific("たろうさん", ["たろう"], ["san"])).toBe(true);
    expect(isDerivedHonorific("たろう", ["たろう"], ["san"])).toBe(false);
    expect(isDerivedHonorific("ぬぬさん", ["ぬぬさん"], ["san"])).toBe(false);
    expect(isDerivedHonorific("たろうくん", ["たろう"], ["san"])).toBe(false);
  });
});

describe("toggleHonorific", () => {
  it("turns one suffix on and off without disturbing the rest", () => {
    expect(toggleHonorific(["san", "chan"], "sama")).toEqual(["san", "chan", "sama"]);
    expect(toggleHonorific(["san", "chan", "sama"], "chan")).toEqual(["san", "sama"]);
  });
});
