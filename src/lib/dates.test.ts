import { describe, expect, it } from "vitest";
import { daysAgoIso, exclusiveUntil, formatLocalIso, resolveQueryWindow, windowAround } from "./dates";

describe("dates", () => {
  it("formats local calendar dates as YYYY-MM-DD", () => {
    expect(formatLocalIso(new Date(2026, 8, 21))).toBe("2026-09-21");
  });

  it("returns an ISO date for daysAgoIso", () => {
    expect(daysAgoIso(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysAgoIso(0)).toBe(formatLocalIso(new Date()));
  });

  it("builds a since/until window around the target date", () => {
    expect(windowAround("2026-09-22", "7")).toEqual({
      since: "2026-09-15",
      until: "2026-09-30",
    });
    expect(windowAround("2026-09-22", "14")).toEqual({
      since: "2026-09-08",
      until: "2026-10-07",
    });
    expect(windowAround("2026-09-22", "month")).toEqual({
      since: "2026-08-22",
      until: "2026-10-23",
    });
    expect(windowAround("2026-09-22", "quarter")).toEqual({
      since: "2026-06-22",
      until: "2026-12-23",
    });
  });

  it("maps a range end to an exclusive until:", () => {
    expect(exclusiveUntil("2026-09-23")).toBe("2026-09-24");
  });

  it("intersects around-date and range windows", () => {
    expect(
      resolveQueryWindow({
        dateFilter: true,
        aroundDate: "2026-09-22",
        dateSpan: "7",
        rangeFilter: true,
        rangeStart: "2026-09-20",
        rangeEnd: "2026-09-25",
      }),
    ).toEqual({
      since: "2026-09-20",
      until: "2026-09-26",
    });
  });

  it("uses an open start and today as the range end", () => {
    expect(
      resolveQueryWindow({
        dateFilter: false,
        aroundDate: "2026-09-22",
        dateSpan: "7",
        rangeFilter: true,
        rangeStart: "",
        rangeEnd: "2026-09-23",
      }),
    ).toEqual({
      since: "",
      until: "2026-09-24",
    });
  });

  it("omits until when the range end is cleared", () => {
    expect(
      resolveQueryWindow({
        dateFilter: false,
        aroundDate: "2026-09-22",
        dateSpan: "7",
        rangeFilter: true,
        rangeStart: "2026-09-01",
        rangeEnd: "",
      }),
    ).toEqual({
      since: "2026-09-01",
      until: "",
    });
  });
});
