// YouTube のタイトルから、X で感想を書く人が使いそうな言葉（曲名・企画名など）を取り出す。
// 【歌ってみた】や #タグ、「/ 名前」の飾りを落とし、残った中心部分を 1 つだけ返す。
// 共有ボタンから投稿するとタイトル全文が本文に入るので、長めの言葉でも当たる。

const BRACKETS =
  /【[^】]*】|\[[^\]]*\]|［[^］]*］|\([^)]*\)|（[^）]*）|〔[^〕]*〕|<[^>]*>|＜[^＞]*＞|≪[^≫]*≫|《[^》]*》|〖[^〗]*〗/g;
const QUOTED = /[『「]([^』」]+)[』」]/g;
const HASHTAG = /[#＃][^\s#＃]+/g;
// 絵文字や「※」の注記も区切りとみなす（感想で絵文字まで同じに書く人は少ない）
const SEPARATORS =
  /\s+[-–—~〜]\s+|[/／|｜※]|\p{Extended_Pictographic}+|\s(?:feat\.?|ft\.|covered by|cover by|by)\s/iu;
// それだけでは何の動画か分からない言葉。前後にあるときだけ取り除く（途中を抜くと X の語句検索で当たらない）
const GENERIC = String.raw`歌ってみた|踊ってみた|弾いてみた|叩いてみた|演奏してみた|描いてみた|やってみた|切り抜き|生配信|歌枠|雑談配信|雑談|オリジナル曲|公式|\b(?:official\s+(?:music\s+)?video|music\s+video|official|cover(?:ed)?|mv|pv|shorts?|full|ver\.?|live|original\s+song|teaser|trailer|vtuber)\b`;
const GENERIC_HEAD = new RegExp(`^(?:${GENERIC})`, "i");
const GENERIC_TAIL = new RegExp(`(?:${GENERIC})$`, "i");
// 絵文字の異体字セレクタ（U+FE0F）などの結合文字も端から落とす
const EDGE_NOISE = /^[\s\p{P}\p{S}\p{M}\p{Cf}]+|[\s\p{P}\p{S}\p{M}\p{Cf}]+$/gu;
const MAX_LENGTH = 40;
const CUT_POINT = /[\s、。！!？?,]/;

function clean(text: string): string {
  let current = text.replace(/\s+/g, " ");
  for (;;) {
    const next = current.replace(EDGE_NOISE, "").replace(GENERIC_HEAD, "").replace(GENERIC_TAIL, "");
    if (next === current) return next.trim();
    current = next;
  }
}

function length(text: string): number {
  return [...text].length;
}

function meaningful(text: string, names: Set<string>): boolean {
  if (!text || names.has(text.toLowerCase())) return false;
  // 英数字だけなら 3 文字、日本語などは 2 文字から
  return /^[\x20-\x7e]+$/.test(text) ? text.length >= 3 : length(text) >= 2;
}

// 長すぎる言葉は、句読点や空白の手前で切る（語の途中で切ると X で当たらない）
function shorten(text: string): string {
  if (length(text) <= MAX_LENGTH) return text;
  const chars = [...text].slice(0, MAX_LENGTH);
  for (let i = chars.length - 1; i >= 2; i -= 1) {
    if (CUT_POINT.test(chars[i])) return chars.slice(0, i).join("").replace(EDGE_NOISE, "");
  }
  return "";
}

export function titleKeyword(title: string, names: string[] = []): string {
  const skip = new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean));
  const quoted = [...title.matchAll(QUOTED)].map((match) => clean(match[1]));
  const body = title.replace(BRACKETS, " ").replace(HASHTAG, " ").replace(QUOTED, " $1 ");
  const segments = body.split(SEPARATORS).map((part) => clean(part ?? ""));
  for (const candidate of [...quoted, ...segments]) {
    if (!meaningful(candidate, skip)) continue;
    const short = shorten(candidate);
    if (meaningful(short, skip)) return short;
  }
  return "";
}

const CHANNEL_SUFFIX = /\s*(?:\bch(?:annel)?\.?|チャンネル|ちゃんねる|公式|\bofficial)$/i;

// チャンネル名「ぬぬはら / nnhr Ch.」から、呼び名の候補（ぬぬはら・nnhr）を出す
export function channelNameWords(channelTitle: string): string[] {
  const words: string[] = [];
  const body = channelTitle.replace(BRACKETS, " ").replace(HASHTAG, " ");
  for (const part of body.split(SEPARATORS)) {
    const word = (part ?? "").replace(EDGE_NOISE, "").replace(CHANNEL_SUFFIX, "").replace(EDGE_NOISE, "").trim();
    if (word && length(word) >= 2 && !words.some((known) => known.toLowerCase() === word.toLowerCase())) {
      words.push(word);
    }
  }
  return words.slice(0, 3);
}
