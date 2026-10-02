"use client";

import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Segmented } from "@/components/segmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slashDate } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { UrlSearchState, VideoKindFilter } from "@/lib/url-search";
import { type ChannelVideo, MAX_UPLOADS, VIDEO_KINDS, type VideoKind, videoDate } from "@/lib/youtube";

type YoutubeChannelVideosProps = {
  t: (key: MessageKey) => string;
  state: UrlSearchState;
  patch: (next: Partial<UrlSearchState>) => void;
  // 期間とタイトルに当てはまる動画（種類は問わない）と、そのうち種類にも当てはまる、検索に入れる動画
  inPeriod: ChannelVideo[];
  matched: ChannelVideo[];
  // 読み込んだ動画の総数と、チャンネルにある種類
  total: number;
  channelKinds: VideoKind[];
  // 上限（MAX_UPLOADS）で古い動画を読み込まなかったとき true
  truncated: boolean;
  // その動画 1 本だけの反応を探す X の検索 URL（上部の対象は変えずに、新しいタブで開く）
  searchUrlOf: (video: ChannelVideo) => string;
  // 何を探すかの説明。絞り込みのすぐ下、一覧の上に出す
  summary: ReactNode;
};

const KIND_LABELS: Record<VideoKind, MessageKey> = {
  video: "ytKindVideo",
  short: "ytKindShort",
  live: "ytKindLive",
};

// 一覧は長くなるので、少しずつ出す（画面の中で別にスクロールさせない）
const FIRST_PAGE = 5;
const PAGE_SIZE = 20;

function countBy<T extends string>(values: T[]): Map<T, number> {
  return values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<T, number>());
}

function VideoList({
  t,
  videos,
  showKind,
  searchUrlOf,
}: {
  t: (key: MessageKey) => string;
  videos: ChannelVideo[];
  showKind: boolean;
  searchUrlOf: (video: ChannelVideo) => string;
}) {
  const [limit, setLimit] = useState(FIRST_PAGE);
  if (!videos.length) return <p className="py-2 text-center text-sm text-muted-foreground">{t("ytNone")}</p>;
  const rest = videos.length - limit;

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-border rounded-lg border border-border" data-testid="yt-list">
        {videos.slice(0, limit).map((video) => (
          <li key={video.id} className="flex items-center gap-3 px-2 py-2 sm:px-3">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t("ytOpenVideo")}: ${video.title}`}
              title={t("ytOpenVideo")}
              className="shrink-0"
            >
              {/* 静的エクスポートなので next/image の最適化は使えない */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                alt=""
                loading="lazy"
                className="aspect-video w-20 rounded bg-muted object-cover sm:w-24"
              />
            </a>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="line-clamp-2 text-sm leading-snug">{video.title}</p>
              {/* 選ぶボタンは日付の行に置き、タイトルを横いっぱいに見せる */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="whitespace-nowrap tabular-nums">{slashDate(videoDate(video))}</span>
                {showKind ? (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {t(KIND_LABELS[video.kind])}
                  </Badge>
                ) : null}
                {/* 普通のリンクにして、長押し・中クリックでも開けるようにする。開いたことのある動画は灰色になる */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="-my-1 ml-auto h-7 shrink-0 gap-0.5 px-2 text-xs text-primary visited:text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  asChild
                >
                  <a
                    href={searchUrlOf(video)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("ytFocusHint").replace("{title}", video.title)}
                    data-testid="yt-focus"
                  >
                    {t("ytFocus")}
                    <ChevronRightIcon className="size-3.5" aria-hidden />
                  </a>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {rest > 0 ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => setLimit(limit + PAGE_SIZE)}
          data-testid="yt-more"
        >
          {t("ytMore").replace("{count}", String(Math.min(PAGE_SIZE, rest)))}
          <span className="text-xs text-muted-foreground tabular-nums">/ {rest}</span>
        </Button>
      ) : null}
    </div>
  );
}

// チャンネル全体を探すときの「どの動画を探すか」。種類とタイトルで絞り、当てはまる動画を一覧で見せる
export function YoutubeChannelVideos({
  t,
  state,
  patch,
  inPeriod,
  matched,
  total,
  channelKinds,
  truncated,
  searchUrlOf,
  summary,
}: YoutubeChannelVideosProps) {
  const kindCounts = countBy(inPeriod.map((video) => video.kind));
  // 動画の種類は、チャンネルに 2 種類以上あるときだけ分けて出す。期間を変えても並びが動かないよう、0 本の種類も残す
  const found = VIDEO_KINDS.filter((kind) => channelKinds.includes(kind) || kind === state.videoKind);
  const kinds = found.length > 1 ? found : [];
  // 「チャンネル」はチャンネルそのもののリンクを探すので、動画の絞り込みと一覧は出さない
  const channelOnly = state.videoKind === "channel";
  const listKey = [state.url, state.period, state.rangeStart, state.rangeEnd, state.aroundDate, state.dateSpan, state.videoKind, state.videoTitle].join("|");

  return (
    <div className="space-y-3" data-testid="yt-channel">
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("ytKind")}</p>
        <Segmented<VideoKindFilter>
          options={[
            { id: "all", label: t("ytAll"), count: inPeriod.length },
            ...kinds.map((kind) => ({ id: kind, label: t(KIND_LABELS[kind]), count: kindCounts.get(kind) ?? 0 })),
            { id: "channel", label: t("ytKindChannel") },
          ]}
          value={state.videoKind}
          label={t("ytKind")}
          onChange={(videoKind) => patch({ videoKind })}
          testId="yt-kind"
          // 4〜5 個並ぶときは「チャンネル」の幅が足りなくなるので、文字数に合わせて幅を配る
          fit={kinds.length > 0}
        />
      </div>

      {channelOnly ? null : (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={state.videoTitle}
            placeholder={t("ytTitleFilter")}
            aria-label={t("ytTitleFilter")}
            className="h-10 pl-9 text-base md:text-sm"
            data-testid="yt-title-filter"
            onChange={(event) => patch({ videoTitle: event.target.value })}
          />
        </div>
      )}

      {summary}

      {channelOnly ? null : (
        <>
          <div className="space-y-0.5 pt-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{t("ytListTitle")}</p>
              <p className="text-xs tabular-nums text-muted-foreground" data-testid="yt-matched">
                {matched.length} / {total}
              </p>
            </div>
            {/* 上限より古い動画は対象に入らないので、黙って抜けないよう件数のすぐ下で伝える */}
            {truncated ? (
              <p className="text-xs text-muted-foreground" data-testid="yt-truncated">
                {t("ytTruncated").replace("{count}", String(MAX_UPLOADS))}
              </p>
            ) : null}
          </div>
          <VideoList key={listKey} t={t} videos={matched} showKind={kinds.length > 0} searchUrlOf={searchUrlOf} />
        </>
      )}
    </div>
  );
}
