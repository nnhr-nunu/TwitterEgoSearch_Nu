import { createDefaultConfig, hydrateConfig, isBlankConfig } from "./defaults";
import { SLOT_COUNT, type SearchConfig } from "./types";
import { parseUrlSearch, type UrlSearchState } from "./url-search";

// 設定1〜3 と YouTube タブの内容を、別の端末へ引き継ぐためのリンク。
// 中身は URL の # より後ろに入れる（# より後ろはサーバーへ送られないので、除外設定などが通信に乗らない）
export const TRANSFER_HASH_PREFIX = "#import=";

// 壊れたリンクや、わざと巨大にしたリンクは読まない
const MAX_HASH_LENGTH = 20000;

export type TransferData = {
  slots: SearchConfig[];
  // YouTube タブに何も入れていなければ null（受け取った側の YouTube タブは変えない）
  youtube: UrlSearchState | null;
};

// 受け取った側で作り直せる項目（since / until など）と、既定値のままの項目は載せない
function compactSlot(config: SearchConfig): Partial<SearchConfig> {
  const defaults = createDefaultConfig();
  const out: Partial<SearchConfig> = {};
  if (config.keywords.length) out.keywords = config.keywords;
  if (config.handles.length) out.handles = config.handles;
  if (config.filterKeywords.length) out.filterKeywords = config.filterKeywords;
  if (config.mutedHandles.length) out.mutedHandles = config.mutedHandles;
  if (config.mutedKeywords.length) out.mutedKeywords = config.mutedKeywords;
  if (config.displayName.trim()) out.displayName = config.displayName.trim();
  if (config.mediaOnly) out.mediaOnly = true;
  if (config.matchAll) out.matchAll = true;
  if (config.sort !== defaults.sort) out.sort = config.sort;
  if (config.minFaves !== defaults.minFaves) out.minFaves = config.minFaves;
  if (config.dateFilter) {
    out.dateFilter = true;
    out.aroundDate = config.aroundDate;
    out.dateSpan = config.dateSpan;
  }
  if (config.rangeFilter) {
    out.rangeFilter = true;
    out.rangeStart = config.rangeStart;
    out.rangeEnd = config.rangeEnd;
  }
  return out;
}

function hasYoutubeContent(state: UrlSearchState): boolean {
  return Boolean(state.url.trim() || state.words.length || state.excluded.length || Object.keys(state.channelWords).length);
}

export function hasTransferContent(slots: SearchConfig[], youtube: UrlSearchState | null): boolean {
  return slots.some((slot) => !isBlankConfig(slot)) || (youtube !== null && hasYoutubeContent(youtube));
}

// 日本語を含む JSON を、URL にそのまま置ける文字だけにする（base64url）
function encode(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(value: string): string {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function buildTransferHash(slots: SearchConfig[], youtube: UrlSearchState | null): string {
  const payload = {
    v: 1,
    slots: slots.slice(0, SLOT_COUNT).map(compactSlot),
    ...(youtube && hasYoutubeContent(youtube) ? { youtube } : {}),
  };
  return `${TRANSFER_HASH_PREFIX}${encode(JSON.stringify(payload))}`;
}

export function buildTransferUrl(origin: string, slots: SearchConfig[], youtube: UrlSearchState | null): string {
  return `${origin.replace(/\/+$/, "")}/${buildTransferHash(slots, youtube)}`;
}

// 引き継ぎ用リンクでなければ null。読めた項目だけを使い、形の合わない値は既定値にする
export function parseTransferHash(hash: string): TransferData | null {
  if (!hash.startsWith(TRANSFER_HASH_PREFIX) || hash.length > MAX_HASH_LENGTH) return null;
  try {
    const payload = JSON.parse(decode(hash.slice(TRANSFER_HASH_PREFIX.length))) as { slots?: unknown; youtube?: unknown };
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.slots)) return null;
    const raw = payload.slots;
    const slots = Array.from({ length: SLOT_COUNT }, (_, index) => hydrateConfig(raw[index] as Partial<SearchConfig>));
    const youtube = payload.youtube ? parseUrlSearch(payload.youtube) : null;
    const data = { slots, youtube: youtube && hasYoutubeContent(youtube) ? youtube : null };
    return hasTransferContent(data.slots, data.youtube) ? data : null;
  } catch {
    return null;
  }
}
