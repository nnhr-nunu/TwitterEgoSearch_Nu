import { readStorage, writeStorage } from "./storage";
import { SLOT_COUNT } from "./types";

// 設定ごとに「検索を開いた時刻」を覚えて、前回より後の投稿だけを探せるようにする。
// X には since_time:UNIX秒 で渡す（秒単位で効くことは url-search.ts の冒頭を参照）
export const LAST_SEARCH_KEY = "egosearch-nu:last-search";

// 続けて押し直したとき（X のタブを閉じてしまった、並び順を変えた）は、同じ「前回」から探し直したい。
// 30 分以内の押し直しでは「前回」を進めない
export const SESSION_GAP_MS = 30 * 60 * 1000;

export type SearchMark = {
  // いちばん最近、検索を開いた時刻（ミリ秒）
  last: number;
  // そのひとつ前のまとまり（30 分以上あく前）で最後に開いた時刻。まだ無ければ null
  prev: number | null;
};

export type SlotSearchState = {
  mark: SearchMark | null;
  // 「前回の検索より後の投稿だけ」のスイッチ
  newOnly: boolean;
};

// いま検索を開くときに「前回」として使う時刻。前回から 30 分以上たっていれば last、まだなら prev
export function baselineOf(mark: SearchMark | null, now: number): number | null {
  if (!mark) return null;
  return now - mark.last >= SESSION_GAP_MS ? mark.last : mark.prev;
}

export function recordSearch(mark: SearchMark | null, now: number): SearchMark {
  if (!mark) return { last: now, prev: null };
  return { last: now, prev: baselineOf(mark, now) };
}

// X の since_time: に渡す値（秒）
export function sinceTimeOf(state: SlotSearchState, now: number): number | undefined {
  const baseline = baselineOf(state.mark, now);
  return state.newOnly && baseline !== null ? Math.floor(baseline / 1000) : undefined;
}

// 画面に出す書き方（9/30 18:05）。年が違うときだけ年を付ける
export function formatMarkTime(time: number, now: number): string {
  const date = new Date(time);
  const day = `${date.getMonth() + 1}/${date.getDate()}`;
  const clock = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  const year = date.getFullYear() === new Date(now).getFullYear() ? "" : `${date.getFullYear()}/`;
  return `${year}${day} ${clock}`;
}

export function emptySearchStates(): SlotSearchState[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ mark: null, newOnly: false }));
}

function readTime(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function readState(value: unknown): SlotSearchState {
  if (!value || typeof value !== "object") return { mark: null, newOnly: false };
  const raw = value as { mark?: { last?: unknown; prev?: unknown } | null; newOnly?: unknown };
  const last = readTime(raw.mark?.last);
  return {
    mark: last === null ? null : { last, prev: readTime(raw.mark?.prev) },
    newOnly: raw.newOnly === true,
  };
}

export function loadSearchStates(): SlotSearchState[] {
  try {
    const parsed = JSON.parse(readStorage(LAST_SEARCH_KEY) ?? "null") as unknown;
    if (!Array.isArray(parsed)) return emptySearchStates();
    return emptySearchStates().map((_, index) => readState(parsed[index]));
  } catch {
    return emptySearchStates();
  }
}

export function saveSearchStates(states: SlotSearchState[]): void {
  writeStorage(LAST_SEARCH_KEY, JSON.stringify(states.slice(0, SLOT_COUNT)));
}
