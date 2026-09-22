import { describe, expect, it } from "vitest";
import { parseHandleList, uniqueHandles } from "./handle";

describe("uniqueHandles", () => {
  it("normalizes, drops invalid values, and dedupes case-insensitively", () => {
    expect(
      uniqueHandles(["@Alice", "https://x.com/bob", "alice", "not valid!", ""]),
    ).toEqual(["Alice", "bob"]);
  });
});

describe("parseHandleList", () => {
  it("splits on spaces, commas, and Japanese commas", () => {
    expect(parseHandleList("@one, two、three")).toEqual(["one", "two", "three"]);
  });
});
