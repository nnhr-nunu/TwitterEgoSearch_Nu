import { expandSearchTerms } from "./honorifics";
import type { Locale, SearchConfig } from "./types";

// 「ネガティブワード」をオンにしたとき除外する言葉。前ほど優先し、検索が長いときは前から入る分だけ使う（query.ts）。
// 評価極性辞書のような大きな辞書は X の検索（約 500 文字まで）に入らないので、悪口でよく使われる言葉を手で選ぶ。
// ほめ言葉やファンの投稿にも入る言葉は入れない。例: 「くそ」「死ね」「下手くそ」「くだらない」「腹立つ」は
// 「くそかわいい」「尊くて死ねる」「下手くそですが描きました」「くだらなくて最高」「顔が良すぎて腹立つ」に、
// 「カス」「クズ」は「カスタム」「クズ男（作品の役）」に、"ugly" は "ugly crying" に入る。
// X がひらがなとカタカナを同じに扱うかは確かめていないので、よく使う言葉は両方入れる
export const NEGATIVE_WORDS: Record<Locale, readonly string[]> = {
  ja: [
    "嫌い",
    "うざい",
    "ウザい",
    "きもい",
    "キモい",
    "気持ち悪い",
    "つまらない",
    "つまらん",
    "ブス",
    "消えろ",
    "オワコン",
    "害悪",
    "パクリ",
    "不快",
    "ムカつく",
    "むかつく",
    "つまんない",
    "おもんない",
    "面白くない",
    "きしょい",
    "キショい",
    "気色悪い",
    "ブサイク",
    "不愉快",
    "痛々しい",
    "見苦しい",
    "イタい",
    "引退しろ",
    "辞めろ",
    "幻滅",
    "失望",
    "劣化",
    "盗作",
    "トレパク",
    "無能",
    "才能ない",
    "性格悪い",
    "図々しい",
    "非常識",
    "飽きた",
    "がっかり",
    "ババア",
    "デブ",
    "ゴミ",
    "底辺",
  ],
  en: [
    "hate",
    "cringe",
    "sucks",
    "annoying",
    "worst",
    "boring",
    "overrated",
    "cringy",
    "disgusting",
    "stupid",
    "idiot",
    "dumb",
    "pathetic",
    "garbage",
    "terrible",
    "awful",
    "lame",
    "unfunny",
    "fraud",
    "plagiarism",
    "loser",
    "kys",
    "unsubscribed",
    "ugly",
  ],
};

const JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const LATIN = /[a-z]/i;

function interleave(first: readonly string[], second: readonly string[]): string[] {
  const out: string[] = [];
  for (let index = 0; index < Math.max(first.length, second.length); index++) {
    if (index < first.length) out.push(first[index]);
    if (index < second.length) out.push(second[index]);
  }
  return out;
}

// 探す言葉の書き方から、投稿が何語で書かれていそうかを見て、その言語の言葉を先にする。
// 両方あれば交互に、手がかりが無ければ（@id だけ・英数字だけのハッシュタグだけなど）画面の言語を先にする
function wordsInOrder(terms: string[], locale: Locale): string[] {
  const ja = terms.some((term) => JAPANESE.test(term));
  // 「#003_FA」のような英数字だけのハッシュタグは、何語の投稿かの手がかりにならない
  const en = terms.some((term) => !term.startsWith("#") && !JAPANESE.test(term) && LATIN.test(term));
  const first: Locale = ja === en ? locale : ja ? "ja" : "en";
  const second: Locale = first === "ja" ? "en" : "ja";
  if (ja && en) return interleave(NEGATIVE_WORDS[first], NEGATIVE_WORDS[second]);
  return [...NEGATIVE_WORDS[first], ...NEGATIVE_WORDS[second]];
}

// 除外に使う言葉を優先順に返す。名前や絞り込みの言葉に入っている言葉を除外すると結果が 0 件になるので外し、
// 自分で除外した言葉とは重ねない
export function negativeWordsFor(config: SearchConfig, locale: Locale = "ja"): string[] {
  if (!config.excludeNegative) return [];
  const terms = [...expandSearchTerms(config.keywords, config.honorifics), ...(config.filterKeywords ?? [])]
    .map((term) => term.trim())
    .filter(Boolean);
  const wanted = terms.map((term) => term.toLowerCase());
  const muted = new Set((config.mutedKeywords ?? []).map((word) => word.trim().toLowerCase()));
  return wordsInOrder(terms, locale).filter((word) => {
    const lower = word.toLowerCase();
    return !muted.has(lower) && !wanted.some((term) => term.includes(lower));
  });
}
