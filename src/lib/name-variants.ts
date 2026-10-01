import { HONORIFIC_CATALOG } from "./honorifics";
import { uniqueCaseless } from "./keywords";

// 名前の表記ゆれ（ひらがな・カタカナ・半角カナ・空白あり／なし）の候補を、ブラウザの中だけで作る。
// 押すまでは検索に入れない（候補として見せるだけ）

const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KANA_OFFSET = KATAKANA_START - HIRAGANA_START;

function shiftRange(text: string, start: number, end: number, offset: number): string {
  return Array.from(text, (char) => {
    const code = char.codePointAt(0) ?? 0;
    return code >= start && code <= end ? String.fromCodePoint(code + offset) : char;
  }).join("");
}

export function toKatakana(text: string): string {
  return shiftRange(text, HIRAGANA_START, HIRAGANA_END, KANA_OFFSET);
}

export function toHiragana(text: string): string {
  return shiftRange(text, KATAKANA_START, KATAKANA_END, -KANA_OFFSET);
}

// 全角カタカナ → 半角カナ。半角カナを NFKC で全角に戻した対応を逆に引く（濁点・半濁点は ﾞ ﾟ に分ける）
let halfWidthMap: Map<string, string> | null = null;

function halfWidthOf(char: string): string | undefined {
  if (!halfWidthMap) {
    halfWidthMap = new Map();
    for (let code = 0xff61; code <= 0xff9f; code += 1) {
      const half = String.fromCharCode(code);
      halfWidthMap.set(half.normalize("NFKC"), half);
    }
  }
  return halfWidthMap.get(char);
}

export function toHalfWidthKana(text: string): string {
  return Array.from(text, (char) => {
    const direct = halfWidthOf(char);
    if (direct) return direct;
    const [base, mark, ...rest] = Array.from(char.normalize("NFD"));
    const halfBase = base ? halfWidthOf(base) : undefined;
    const halfMark = mark ? halfWidthOf(mark) : undefined;
    return halfBase && halfMark && rest.length === 0 ? halfBase + halfMark : char;
  }).join("");
}

// 末尾の敬称は表記を変えずに残す（「ぬぬはらさん」→「ヌヌハラさん」。「ヌヌハラサン」にはしない）
function splitHonorific(name: string): { base: string; suffix: string } {
  for (const { suffix } of HONORIFIC_CATALOG) {
    if (name.length > suffix.length && name.endsWith(suffix)) {
      return { base: name.slice(0, -suffix.length), suffix };
    }
  }
  return { base: name, suffix: "" };
}

/** 1 つの名前の、ほかの書き方の候補。ハッシュタグは別のタグになるので作らない */
export function nameVariants(keyword: string): string[] {
  const name = keyword.normalize("NFC").trim();
  if (!name || name.startsWith("#")) return [];
  const { base, suffix } = splitHonorific(name);
  // 半角カナ・全角英数字は NFKC で全角カナ・半角英数字にそろえてから作る
  const full = base.normalize("NFKC");
  const forms = [full, toKatakana(full), toHiragana(full), toHalfWidthKana(toKatakana(full))];
  if (/\s/.test(full)) forms.push(full.replace(/\s+/g, ""));
  const lower = name.toLowerCase();
  return uniqueCaseless(forms.map((form) => form + suffix)).filter((form) => form.toLowerCase() !== lower);
}

/** 入れてある名前ぜんぶの候補。入れてあるもの・隠したものは出さない */
export function variantSuggestions(keywords: string[], dismissed: string[] = [], limit = 6): string[] {
  const skip = new Set([...keywords, ...dismissed].map((item) => item.trim().toLowerCase()));
  const candidates = keywords.flatMap((keyword) => nameVariants(keyword));
  return uniqueCaseless(candidates)
    .filter((item) => !skip.has(item.toLowerCase()))
    .slice(0, limit);
}
