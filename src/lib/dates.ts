import type { DateSpanId } from "./types";

export function formatLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return formatLocalIso(new Date());
}

export function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatLocalIso(date);
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseIsoDate(value: string): Date | null {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function shiftIso(iso: string, days: number): string {
  const date = parseIsoDate(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return formatLocalIso(date);
}

export function shiftBySpan(iso: string, span: DateSpanId, direction: 1 | -1): string {
  const date = parseIsoDate(iso) ?? new Date();
  if (span === "7") date.setDate(date.getDate() + 7 * direction);
  else if (span === "14") date.setDate(date.getDate() + 14 * direction);
  else if (span === "month") date.setMonth(date.getMonth() + direction);
  else date.setMonth(date.getMonth() + 3 * direction);
  return formatLocalIso(date);
}

export function windowAround(
  aroundDate: string,
  span: DateSpanId,
): { since: string; until: string } {
  const center = isIsoDate(aroundDate) ? aroundDate : todayIso();
  return {
    since: shiftBySpan(center, span, -1),
    // X の until: はその日を含まないので、終端の翌日にする
    until: shiftIso(shiftBySpan(center, span, 1), 1),
  };
}

export function exclusiveUntil(inclusiveEnd: string): string {
  const end = isIsoDate(inclusiveEnd) ? inclusiveEnd : todayIso();
  return shiftIso(end, 1);
}

export function laterIso(a: string, b: string): string {
  if (!a.trim()) return b.trim();
  if (!b.trim()) return a.trim();
  return a.trim() >= b.trim() ? a.trim() : b.trim();
}

export function earlierIso(a: string, b: string): string {
  if (!a.trim()) return b.trim();
  if (!b.trim()) return a.trim();
  return a.trim() <= b.trim() ? a.trim() : b.trim();
}

export type DateWindowFields = {
  dateFilter: boolean;
  aroundDate: string;
  dateSpan: DateSpanId;
  rangeFilter: boolean;
  rangeStart: string;
  rangeEnd: string;
};

export function rangeWindow(rangeStart: string, rangeEnd: string): { since: string; until: string } {
  const since = isIsoDate(rangeStart) ? rangeStart : "";
  const until = exclusiveUntil(isIsoDate(rangeEnd) ? rangeEnd : todayIso());
  return { since, until };
}

export function resolveQueryWindow(config: DateWindowFields): { since: string; until: string } {
  let since = "";
  let until = "";
  if (config.dateFilter) {
    const around = windowAround(config.aroundDate, config.dateSpan);
    since = around.since;
    until = around.until;
  }
  if (config.rangeFilter) {
    const range = rangeWindow(config.rangeStart, config.rangeEnd);
    since = laterIso(since, range.since);
    until = earlierIso(until, range.until);
  }
  return { since, until };
}
