import { describe, expect, it } from "vitest";
import { splitSearchNames } from "./keywords";

describe("splitSearchNames", () => {
  it("splits on half-width spaces, full-width spaces, and commas", () => {
    expect(splitSearchNames("ぬぬはらさん #003_FA")).toEqual(["ぬぬはらさん", "#003_FA"]);
    expect(splitSearchNames("ぬぬはらさん　#003_FA　ﾍﾍ🫀")).toEqual([
      "ぬぬはらさん",
      "#003_FA",
      "ﾍﾍ🫀",
    ]);
    expect(splitSearchNames("alpha,beta，gamma、delta")).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
  });

  it("trims empties and mixed separators", () => {
    expect(splitSearchNames("  a,  ,　b、  ")).toEqual(["a", "b"]);
    expect(splitSearchNames("   ")).toEqual([]);
    expect(splitSearchNames("")).toEqual([]);
  });

  it("normalizes Unicode and drops duplicates in one add", () => {
    expect(splitSearchNames("カフェ\u0301 カフェ\u0301")).toEqual(["カフェ́"]);
    expect(splitSearchNames("同じ 同じ")).toEqual(["同じ"]);
  });
});
