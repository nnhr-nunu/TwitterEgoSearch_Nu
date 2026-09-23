import { describe, expect, it } from "vitest";
import {
  dateIssues,
  daysAgoIso,
  exclusiveUntil,
  formatLocalIso,
  isIsoDate,
  resolveQueryWindow,
  windowAround,
} from "./dates";

const base = {
  dateFilter: false,
  aroundDate: "2026-09-22",
  dateSpan: "7" as const,
  rangeFilter: true,
  rangeStart: "",
  rangeEnd: "",
};

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

  it("rejects dates the date input can emit but X cannot search", () => {
    expect(isIsoDate("2026-09-24")).toBe(true);
    // 年を打ちすぎたとき（5〜6 桁の年）
    expect(isIsoDate("202626-09-24")).toBe(false);
    expect(isIsoDate("20266-09-24")).toBe(false);
    // 年を 1 桁ずつ打っている途中の値
    expect(isIsoDate("0002-09-24")).toBe(false);
    expect(isIsoDate("0202-09-24")).toBe(false);
    // X 開始前・存在しない日付・遠い未来
    expect(isIsoDate("2006-03-20")).toBe(false);
    expect(isIsoDate("2006-03-21")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("9999-12-31")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("ignores invalid range bounds instead of searching from today", () => {
    expect(resolveQueryWindow({ ...base, rangeStart: "2026-02-31", rangeEnd: "2026-02-31" })).toEqual({
      since: "",
      until: "",
    });
    expect(resolveQueryWindow({ ...base, rangeStart: "0002-01-01", rangeEnd: "202626-01-01" })).toEqual({
      since: "",
      until: "",
    });
  });

  it("swaps a reversed range", () => {
    const config = { ...base, rangeStart: "2026-09-20", rangeEnd: "2026-09-10" };
    expect(resolveQueryWindow(config)).toEqual({ since: "2026-09-10", until: "2026-09-21" });
    expect(dateIssues(config)).toEqual(["rangeReversed"]);
  });

  it("reports invalid inputs and non-overlapping windows", () => {
    expect(dateIssues({ ...base, rangeStart: "202626-09-01" })).toEqual(["rangeStartInvalid"]);
    expect(dateIssues({ ...base, rangeEnd: "2026-02-31" })).toEqual(["rangeEndInvalid"]);
    expect(dateIssues({ ...base, rangeFilter: false, dateFilter: true, aroundDate: "0002-09-22" })).toEqual([
      "aroundInvalid",
    ]);
    // 空欄は「指定なし」なので注意しない
    expect(dateIssues({ ...base, dateFilter: true, aroundDate: "" })).toEqual([]);
    expect(
      dateIssues({ ...base, dateFilter: true, rangeStart: "2025-01-01", rangeEnd: "2025-01-31" }),
    ).toEqual(["noOverlap"]);
  });
});
