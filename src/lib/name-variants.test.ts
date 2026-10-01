import { describe, expect, it } from "vitest";
import { nameVariants, variantSuggestions } from "./name-variants";

describe("nameVariants", () => {
  it("suggests katakana and half-width kana for a hiragana name, keeping the honorific", () => {
    expect(nameVariants("ぬぬはらさん")).toEqual(["ヌヌハラさん", "ﾇﾇﾊﾗさん"]);
  });

  it("suggests hiragana and half-width kana for a katakana name", () => {
    expect(nameVariants("ヌヌハラ")).toEqual(["ぬぬはら", "ﾇﾇﾊﾗ"]);
  });

  it("turns half-width kana back into full-width katakana and hiragana", () => {
    expect(nameVariants("ﾇﾇﾊﾗ")).toEqual(["ヌヌハラ", "ぬぬはら"]);
  });

  it("splits voiced and semi-voiced kana into half-width marks", () => {
    expect(nameVariants("ガンバ")).toContain("ｶﾞﾝﾊﾞ");
    expect(nameVariants("ぽこぴー")).toEqual(["ポコピー", "ﾎﾟｺﾋﾟｰ"]);
  });

  it("offers the name without spaces", () => {
    expect(nameVariants("Nunu Hara")).toEqual(["NunuHara"]);
    expect(nameVariants("ぬぬ はら")).toContain("ぬぬはら");
  });

  it("leaves hashtags, kanji-only names and plain latin names alone", () => {
    expect(nameVariants("#003_FA")).toEqual([]);
    expect(nameVariants("布原")).toEqual([]);
    expect(nameVariants("nunuhara")).toEqual([]);
  });

  it("keeps kanji and latin letters as they are inside a mixed name", () => {
    expect(nameVariants("ぬぬ原P")).toEqual(["ヌヌ原P", "ﾇﾇ原P"]);
  });
});

describe("variantSuggestions", () => {
  it("skips spellings that are already in the list, ignoring case", () => {
    expect(variantSuggestions(["ぬぬはらさん", "ヌヌハラさん"])).toEqual(["ﾇﾇﾊﾗさん"]);
    expect(variantSuggestions(["Nunu Hara", "nunuhara"])).toEqual([]);
  });

  it("skips dismissed spellings and caps the number of suggestions", () => {
    expect(variantSuggestions(["ぬぬはらさん"], ["ﾇﾇﾊﾗさん"])).toEqual(["ヌヌハラさん"]);
    expect(variantSuggestions(["あい", "かき", "さし", "たち"], [], 5)).toHaveLength(5);
  });
});
