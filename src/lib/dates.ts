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

// X（旧 Twitter）の最初の投稿日。これより前は検索しても意味がない
export const MIN_SEARCH_DATE = "2006-03-21";

// 年は 4 桁に限る。<input type="date"> は 5〜6 桁の年（例: 202626-09-24）も値として返す
export function parseIsoDate(value: string): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  // 2026-02-31 のような存在しない日付は Date が繰り上げるので弾く
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

// 未来は来年末まで許す（日付をまたいだタブや時差の余裕）。それより先は打ち間違いとみなす
export function maxSearchDate(): string {
  return `${new Date().getFullYear() + 1}-12-31`;
}

// 実在する日付で、かつ X の検索に使える範囲（MIN_SEARCH_DATE〜来年末）か
export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null && value >= MIN_SEARCH_DATE && value <= maxSearchDate();
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
  let start = isIsoDate(rangeStart) ? rangeStart : "";
  let end = isIsoDate(rangeEnd) ? rangeEnd : "";
  // 開始日と終了日を逆に選んでも 0 件にならないよう入れ替える
  if (start && end && start > end) [start, end] = [end, start];
  return { since: start, until: end ? exclusiveUntil(end) : "" };
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

export type DateIssue =
  | "aroundInvalid"
  | "rangeStartInvalid"
  | "rangeEndInvalid"
  | "rangeReversed"
  | "noOverlap";

// 入力欄の下に出す注意。空欄は「指定なし」なので問題にしない（対象の日付の空欄は今日扱い）
export function dateIssues(config: DateWindowFields): DateIssue[] {
  const issues: DateIssue[] = [];
  const invalid = (value: string) => value.trim() !== "" && !isIsoDate(value);
  if (config.dateFilter && invalid(config.aroundDate)) issues.push("aroundInvalid");
  if (config.rangeFilter) {
    if (invalid(config.rangeStart)) issues.push("rangeStartInvalid");
    if (invalid(config.rangeEnd)) issues.push("rangeEndInvalid");
    if (isIsoDate(config.rangeStart) && isIsoDate(config.rangeEnd) && config.rangeStart > config.rangeEnd) {
      issues.push("rangeReversed");
    }
  }
  const { since, until } = resolveQueryWindow(config);
  if (since && until && since >= until) issues.push("noOverlap");
  return issues;
}
