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

export type SearchConfig = {
  handle: string;
  displayName: string;
  keywords: string[];
  mutedHandles: string[];
  honorifics: HonorificId[];
  wrapQuotes: boolean;
  excludeOwn: boolean;
  fromSelf: boolean;
  mediaOnly: boolean;
  latest: boolean;
  since: string;
  until: string;
};

export type SavedPreset = {
  id: string;
  name: string;
  config: SearchConfig;
};

export type Locale = "ja" | "en";
