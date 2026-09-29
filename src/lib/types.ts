export type HonorificId =
  | "san"
  | "chan"
  | "kun"
  | "kimi"
  | "sama"
  | "sensei"
  | "tan"
  | "shi";

// "oldest" は X に古い順のタブがないため UI から外している（保存値は latest に戻す）
export type ResultSort = "latest" | "oldest" | "likes";

// 保存値・共有 URL から受け付ける並び順（古い順は X で実現できないので含めない）
export const RESULT_SORTS: ResultSort[] = ["latest", "likes"];

export const MIN_FAVES_OPTIONS = [0, 10, 100, 1000] as const;
export type MinFaves = (typeof MIN_FAVES_OPTIONS)[number];

export type DateSpanId = "7" | "14" | "month" | "quarter";

export const DATE_SPAN_IDS: DateSpanId[] = ["7", "14", "month", "quarter"];

export function isDateSpanId(value: unknown): value is DateSpanId {
  return DATE_SPAN_IDS.includes(value as DateSpanId);
}

export type SearchConfig = {
  handle: string;
  handles: string[];
  displayName: string;
  keywords: string[];
  filterKeywords: string[];
  mutedHandles: string[];
  mutedKeywords: string[];
  honorifics: HonorificId[];
  wrapQuotes: boolean;
  excludeOwn: boolean;
  fromSelf: boolean;
  mediaOnly: boolean;
  // オンなら検索名を OR ではなく AND でつなぐ（すべて含む投稿だけ）
  matchAll?: boolean;
  latest: boolean;
  sort: ResultSort;
  minFaves: MinFaves;
  aroundDate: string;
  dateSpan: DateSpanId;
  dateFilter: boolean;
  rangeFilter: boolean;
  rangeStart: string;
  rangeEnd: string;
  since: string;
  until: string;
};

export type Locale = "ja" | "en";

export const SLOT_COUNT = 3;
export type SlotIndex = 0 | 1 | 2;
