"use client";

import { shiftIso, todayIso } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { DateWindow, SearchBatch, VideoKindFilter } from "@/lib/url-search";

// 何を探すかを、期間や種類の切り替えのすぐ下で文章にして見せる
export type ScopeInfo =
  | {
      kind: "channel";
      // 検索に入れる動画の本数と、その公開日の範囲
      count: number;
      window: DateWindow;
      videoKind: VideoNoun;
      batches: SearchBatch[];
    }
  | { kind: "channelOnly" }
  | { kind: "video"; keyword: string; names: string[] }
  | { kind: "page" };

// 種類が「チャンネル」のときは動画を数えないので、名前は要らない
type VideoNoun = Exclude<VideoKindFilter, "channel">;

const NOUNS: Record<VideoNoun, MessageKey> = {
  all: "ytNounAll",
  video: "ytNounVideo",
  short: "ytNounShort",
  live: "ytNounLive",
};

function slash(iso: string): string {
  return iso.replaceAll("-", "/");
}

function videosPhrase(t: (key: MessageKey) => string, info: Extract<ScopeInfo, { kind: "channel" }>): string {
  const { since, until } = info.window;
  // until: はその日を含まないので、見せるときは前日にする。今日より先なら「以降」とだけ言う
  const end = until ? shiftIso(until, -1) : "";
  const last = end && end < todayIso() ? slash(end) : "";
  const key: MessageKey = since && last ? "urlSumRange" : since ? "urlSumSince" : last ? "urlSumUntil" : "urlSumAll";
  return t(key)
    .replace("{since}", slash(since))
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
    main = info.count ? t("urlSumChannel").replace("{videos}", videosPhrase(t, info)) : t("urlSumNoVideos").replace("{kind}", noun);
  }
  if (words.length) main = append(main, t("urlSumWords").replace("{words}", words.join("・")));
  if (info.kind === "channel" && info.batches.length > 1) {
    const per = Math.max(...info.batches.map((batch) => batch.to - batch.from + 1));
    notes.push(t("urlSumSteps").replace("{per}", String(per)).replace("{parts}", String(info.batches.length)));
  }
  return { main, notes };
}

export function YoutubeScopeSummary({ t, info, words }: { t: (key: MessageKey) => string; info: ScopeInfo; words: string[] }) {
  const { main, notes } = scopeLines(t, info, words);
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5" data-testid="url-scope" aria-live="polite">
      <p className="text-sm leading-relaxed">{main}</p>
      {notes.map((note) => (
        <p key={note} className="text-xs leading-relaxed text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
  );
}
