import { expandSearchTerms } from "./honorifics";
import type { SearchConfig } from "./types";

// 「ネガティブワード」をオンにしたとき除外する言葉。X の検索は約 500 文字までなので、
// 評価極性辞書のような大きな辞書は入らない。悪口でよく使われる言葉を手で選んで短く保つ。
// 「くそ」「死ね」「下手」は「くそかわいい」「尊くて死ねる」「下手したら」のように
// ほめ言葉や普通の言い回しにも入るので入れない。
// X がひらがなとカタカナを同じに扱うかは確かめていないので、よく使う言葉は両方入れる
// 検索が長いときは前から入る分だけ使う（query.ts）ので、大事な言葉ほど前に置く
export const NEGATIVE_WORDS = [
  "嫌い",
  "うざい",
  "ウザい",
  "きもい",
  "キモい",
  "気持ち悪い",
  "つまらない",
  "つまらん",
  "下手くそ",
  "ブス",
  "消えろ",
  "ムカつく",
  "オワコン",
  "害悪",
  "パクリ",
  "不快",
  "hate",
  "cringe",
  "sucks",
  "ugly",
  "annoying",
] as const;

// 実際に除外する言葉。名前や絞り込みの言葉に入っている言葉を除外すると結果が 0 件になるので外し、
// 自分で除外した言葉とは重ねない
export function negativeWordsFor(config: SearchConfig): string[] {
  if (!config.excludeNegative) return [];
  const wanted = [...expandSearchTerms(config.keywords, config.honorifics), ...(config.filterKeywords ?? [])]
    .map((term) => term.toLowerCase());
  const muted = new Set((config.mutedKeywords ?? []).map((word) => word.trim().toLowerCase()));
  return NEGATIVE_WORDS.filter((word) => {
    const lower = word.toLowerCase();
    return !muted.has(lower) && !wanted.some((term) => term.includes(lower));
  });
}
