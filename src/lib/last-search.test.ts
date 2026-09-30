import { beforeEach, describe, expect, it } from "vitest";
import {
  baselineOf,
  emptySearchStates,
  formatMarkTime,
  LAST_SEARCH_KEY,
  loadSearchStates,
  recordSearch,
  saveSearchStates,
  SESSION_GAP_MS,
  sinceTimeOf,
} from "./last-search";

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const t0 = new Date(2026, 8, 29, 19, 0, 0).getTime();

describe("baselineOf / recordSearch", () => {
  it("has no baseline before the first search, or right after it", () => {
    expect(baselineOf(null, t0)).toBeNull();
    const first = recordSearch(null, t0);
    expect(first).toEqual({ last: t0, prev: null });
    expect(baselineOf(first, t0 + 5 * MINUTE)).toBeNull();
  });

  it("uses the last search once 30 minutes have passed", () => {
    const first = recordSearch(null, t0);
    expect(baselineOf(first, t0 + SESSION_GAP_MS)).toBe(t0);
    expect(baselineOf(first, t0 + DAY)).toBe(t0);
  });

  it("keeps the same baseline when the search is reopened within 30 minutes", () => {
    const day1 = recordSearch(null, t0);
    const day2 = recordSearch(day1, t0 + DAY);
    expect(day2).toEqual({ last: t0 + DAY, prev: t0 });
    // 翌日に開いた直後の押し直しは、同じ「前回」（1 日目）から探す
    expect(baselineOf(day2, t0 + DAY + MINUTE)).toBe(t0);
    const again = recordSearch(day2, t0 + DAY + 10 * MINUTE);
    expect(again).toEqual({ last: t0 + DAY + 10 * MINUTE, prev: t0 });
    // 3 日目は、2 日目に最後に開いた時刻から
    expect(baselineOf(again, t0 + 2 * DAY)).toBe(t0 + DAY + 10 * MINUTE);
  });
});

describe("sinceTimeOf", () => {
  it("gives X a unix time in seconds only when the switch is on and a baseline exists", () => {
    const mark = { last: t0 + 999, prev: null };
    expect(sinceTimeOf({ mark, newOnly: true }, t0 + DAY)).toBe(Math.floor(t0 / 1000));
    expect(sinceTimeOf({ mark, newOnly: false }, t0 + DAY)).toBeUndefined();
    expect(sinceTimeOf({ mark, newOnly: true }, t0 + MINUTE)).toBeUndefined();
    expect(sinceTimeOf({ mark: null, newOnly: true }, t0)).toBeUndefined();
  });
});

describe("formatMarkTime", () => {
  it("writes month/day and time, adding the year only when it differs", () => {
    expect(formatMarkTime(t0, t0 + DAY)).toBe("9/29 19:00");
    expect(formatMarkTime(new Date(2025, 11, 31, 8, 5).getTime(), t0)).toBe("2025/12/31 8:05");
  });
});

describe("search state storage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage } });
  });

  it("round-trips the three slots", () => {
    const states = emptySearchStates();
    states[1] = { mark: { last: t0 + DAY, prev: t0 }, newOnly: true };
    saveSearchStates(states);
    expect(loadSearchStates()).toEqual(states);
  });

  it("falls back to empty states for broken data", () => {
    expect(loadSearchStates()).toEqual(emptySearchStates());
    window.localStorage.setItem(LAST_SEARCH_KEY, "{broken");
    expect(loadSearchStates()).toEqual(emptySearchStates());
    window.localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify([{ mark: { last: "x" }, newOnly: true }, 5]));
    expect(loadSearchStates()).toEqual([
      { mark: null, newOnly: true },
      { mark: null, newOnly: false },
      { mark: null, newOnly: false },
    ]);
  });
});
