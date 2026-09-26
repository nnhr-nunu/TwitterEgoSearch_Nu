export type HonorificId =
  | "san"
  | "chan"
  | "kun"
  | "kimi"
  | "sama"
  | "sensei"
  | "tan"
  | "shi";

export type OwnScope = "others" | "everyone" | "self";

// "oldest" は X に古い順のタブがないため UI から外している（保存値は latest に戻す）
export type ResultSort = "latest" | "oldest" | "likes";

export const MIN_FAVES_OPTIONS = [0, 10, 100, 1000] as const;
export type MinFaves = (typeof MIN_FAVES_OPTIONS)[number];

export type DateSpanId = "7" | "14" | "month" | "quarter";

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

export type SavedPreset = {
  id: string;
  name: string;
  config: SearchConfig;
};

export type Locale = "ja" | "en";

export const SLOT_COUNT = 3;
export type SlotIndex = 0 | 1 | 2;
