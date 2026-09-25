import { uniqueHandles } from "./handle";
import type { Locale, SearchConfig } from "./types";

export const SITE_NAME = "エゴサ支援ツール(ぬ)";
export const SITE_URL = "https://self-search.oshilog.life";

// X の投稿上限。URL は長さに関係なく 23 文字として数える（t.co 短縮）
export const POST_LIMIT = 280;
const URL_WEIGHT = 23;

export type ShareTemplateId = "thanks" | "report" | "simple";
export const SHARE_TEMPLATES: ShareTemplateId[] = ["thanks", "report", "simple"];

export type ShareOptions = {
  /** 除外アカウント・除外キーワードも載せるか。人名が晒されるので既定はオフ */
  includeMutes: boolean;
};

/**
 * シェア用の短いクエリ。parseSearchParams が既定値で埋める項目は省き、
 * share=1 を付けて「受け取った側の保存を上書きしない閲覧モード」で開かせる。
 */
export function buildShareParams(
  config: SearchConfig,
  locale: Locale,
  options: ShareOptions,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const keyword of config.keywords) {
    const trimmed = keyword.trim();
    if (trimmed) params.append("k", trimmed);
  }
  const handles = uniqueHandles(config.handles.length > 0 ? config.handles : [config.handle]);
  for (const handle of handles) params.append("h", handle);
  for (const keyword of config.filterKeywords ?? []) {
    const trimmed = keyword.trim();
    if (trimmed) params.append("fk", trimmed);
  }
  if (options.includeMutes) {
    for (const handle of uniqueHandles(config.mutedHandles ?? [])) params.append("mute", handle);
    for (const keyword of config.mutedKeywords ?? []) {
      const trimmed = keyword.trim();
      if (trimmed) params.append("mk", trimmed);
    }
  }
  if (config.mediaOnly) params.set("m", "1");
  if (config.sort === "likes") params.set("sort", "likes");
  if (config.dateFilter) {
    params.set("df", "1");
    params.set("around", config.aroundDate);
    params.set("span", config.dateSpan);
  }
  if (config.rangeFilter) {
    params.set("rf", "1");
    if (config.rangeStart) params.set("rs", config.rangeStart);
    if (config.rangeEnd) params.set("re", config.rangeEnd);
  }
  if (locale !== "ja") params.set("lang", locale);
  params.set("share", "1");
  return params;
}

export function buildShareUrl(
  origin: string,
  config: SearchConfig,
  locale: Locale,
  options: ShareOptions,
): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/?${buildShareParams(config, locale, options).toString()}`;
}

/** 投稿文や着地カードで見せる「誰の／何の検索か」。検索名称が無ければ @id を使う */
export function shareSubjects(config: SearchConfig): string[] {
  const keywords = config.keywords.map((item) => item.trim()).filter(Boolean);
  if (keywords.length > 0) return keywords;
  return uniqueHandles(config.handles.length > 0 ? config.handles : [config.handle]).map(
    (handle) => `@${handle}`,
  );
}

export function shareSubjectLabel(config: SearchConfig, max = 2): string {
  const subjects = shareSubjects(config);
  const shown = subjects.slice(0, max).join("・");
  const rest = subjects.length - max;
  return rest > 0 ? `${shown} ほか${rest}件` : shown;
}

const TEMPLATES: Record<Locale, Record<ShareTemplateId, (subject: string) => string>> = {
  ja: {
    thanks: (s) => `「${s}」への感想・反応を、ワンタップでまとめて見られるリンクを作りました🔍\nいつもありがとうございます！`,
    report: (s) => `「${s}」でエゴサした結果はこちら🔍\nタップするとXの検索結果がそのまま開きます👇`,
    simple: (s) => `「${s}」の検索結果🔍`,
  },
  en: {
    thanks: (s) => `One tap to see every reaction to "${s}" 🔍\nThank you all so much!`,
    report: (s) => `Here's what X is saying about "${s}" 🔍\nTap to open the live search 👇`,
    simple: (s) => `Search results for "${s}" 🔍`,
  },
};

const SIGNATURE: Record<Locale, string> = {
  ja: `#エゴサ支援ツール`,
  en: `#SelfSearchHelper`,
};

export function buildSharePostText(
  config: SearchConfig,
  locale: Locale,
  template: ShareTemplateId,
): string {
  const subject = shareSubjectLabel(config);
  return `${TEMPLATES[locale][template](subject)}\n\n${SIGNATURE[locale]}`;
}

// X の文字数カウント（twitter-text の重み付け）。ラテン・一般記号は 1、日本語や絵文字は 2
function charWeight(codePoint: number): number {
  if (codePoint <= 0x10ff) return 1;
  if (codePoint >= 0x2000 && codePoint <= 0x200d) return 1;
  if (codePoint >= 0x2010 && codePoint <= 0x201f) return 1;
  if (codePoint >= 0x2032 && codePoint <= 0x2037) return 1;
  return 2;
}

/** 本文＋添付 URL の重み付き文字数（intent は本文の後ろに空白 1 つで URL を足す） */
export function weightedPostLength(text: string, withUrl: boolean): number {
  let total = 0;
  for (const char of text.normalize("NFC")) total += charWeight(char.codePointAt(0) ?? 0);
  if (withUrl) total += (text ? 1 : 0) + URL_WEIGHT;
  return total;
}
