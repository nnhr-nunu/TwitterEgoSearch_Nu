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

export type ResultSort = "latest" | "oldest" | "likes";

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
  latest: boolean;
  sort: ResultSort;
  aroundDate: string;
  dateSpan: DateSpanId;
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
