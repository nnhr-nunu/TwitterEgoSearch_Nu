import { describe, expect, it } from "vitest";
import { daysAgoIso, formatLocalIso } from "./dates";

describe("dates", () => {
  it("formats local calendar dates as YYYY-MM-DD", () => {
    expect(formatLocalIso(new Date(2026, 8, 21))).toBe("2026-09-21");
  });

  it("returns an ISO date for daysAgoIso", () => {
    expect(daysAgoIso(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysAgoIso(0)).toBe(formatLocalIso(new Date()));
  });
});
