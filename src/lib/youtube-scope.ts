import { shiftIso, slashDate, todayIso } from "./dates";
import type { MessageKey } from "./i18n";
import type { DateWindow, SearchBatch, VideoKindFilter } from "./url-search";
import { type ChannelVideo, MAX_UPLOADS, videoDate } from "./youtube";

// 何を探すかを、期間や種類の切り替えのすぐ下で文章にして見せる
export type ScopeInfo =
  | {
      kind: "channel";
      // 検索に入れる動画の本数と、その公開日の範囲
      count: number;
      window: DateWindow;
      videoKind: VideoNoun;
      batches: SearchBatch[];
      // 上限（MAX_UPLOADS）で古い動画を読み込まなかったチャンネルで、期間が読み込んだ動画より古いほうへはみ出すとき true。
      // はみ出した分の動画は数に入っていない
      missesOlder: boolean;
    }
  | { kind: "channelOnly" }
  | { kind: "video"; keyword: string; names: string[] }
  | { kind: "page" };

// 期間が、読み込んだいちばん古い動画の日かそれより前から始まるか（始まりの無い期間も含む）。その日にも読み込まなかった
// 動画があるかもしれないので、同じ日も含める。打ち切っていないチャンネルは全部読んでいるので false
export function missesOlderVideos(
  truncated: boolean,
  videos: Pick<ChannelVideo, "publishedAt">[],
  window: Pick<DateWindow, "since">,
): boolean {
  if (!truncated || !window.since) return truncated;
  // 一覧を並べ替えずに、いちばん古い公開日だけを探す（API の publishedAt は同じ形の ISO なので文字列で比べられる）
  let oldest = "";
  for (const video of videos) if (video.publishedAt && (!oldest || video.publishedAt < oldest)) oldest = video.publishedAt;
  const date = oldest ? videoDate({ publishedAt: oldest }) : "";
  return !date || window.since <= date;
}

// 種類が「チャンネル」のときは動画を数えないので、名前は要らない
type VideoNoun = Exclude<VideoKindFilter, "channel">;

const NOUNS: Record<VideoNoun, MessageKey> = {
  all: "ytNounAll",
  video: "ytNounVideo",
  short: "ytNounShort",
  live: "ytNounLive",
};

function videosPhrase(t: (key: MessageKey) => string, info: Extract<ScopeInfo, { kind: "channel" }>): string {
  const { since, until } = info.window;
  // until は終わりの日の翌日で持っているので、見せるときは前日にする。今日より先なら「以降」とだけ言う
  const end = until ? shiftIso(until, -1) : "";
  const last = end && end < todayIso() ? slashDate(end) : "";
  // 古い動画を読み込んでいないので「すべて」とは言わない。タイトルで絞ったときもあるので「新しい」とも言わない
  const all: MessageKey = info.missesOlder ? "urlSumAllTruncated" : "urlSumAll";
  const key: MessageKey = since && last ? "urlSumRange" : since ? "urlSumSince" : last ? "urlSumUntil" : all;
  return t(key)
    .replace("{since}", slashDate(since))
    .replace("{until}", last)
    .replace("{kind}", t(NOUNS[info.videoKind]))
    .replace("{count}", String(info.count));
}

// 日本語は「。」で続け、英語は空白で区切る
function append(text: string, sentence: string): string {
  return text.endsWith("。") ? text + sentence : `${text} ${sentence}`;
}

export function scopeLines(t: (key: MessageKey) => string, info: ScopeInfo, words: string[]): { main: string; notes: string[] } {
  const notes: string[] = [];
  let main = t("urlSumPage");
  if (info.kind === "channelOnly") main = t("urlSumChannelOnly");
  if (info.kind === "video") {
    main = t("urlSumVideo");
    if (info.keyword && info.names.length) {
      main = append(main, t("urlSumTitle").replace("{title}", info.keyword).replace("{names}", info.names.join("・")));
    }
  }
  if (info.kind === "channel") {
    const noun = t(NOUNS[info.videoKind]);
    // 読み込んでいない古い動画にかかる期間で 0 本のときは、そこにあるかもしれないので「ない」と言い切らない
    const none = info.missesOlder ? t("urlSumNoVideosTruncated").replace("{max}", String(MAX_UPLOADS)) : t("urlSumNoVideos");
    main = info.count ? t("urlSumChannel").replace("{videos}", videosPhrase(t, info)) : none.replace("{kind}", noun);
  }
  if (words.length) main = append(main, t("urlSumWords").replace("{words}", words.join("・")));
  if (info.kind === "channel" && info.batches.length > 1) {
    const per = Math.max(...info.batches.map((batch) => batch.to - batch.from + 1));
    notes.push(t("urlSumSteps").replace("{per}", String(per)).replace("{parts}", String(info.batches.length)));
  }
  return { main, notes };
}
