"use client";

import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Segmented } from "@/components/segmented";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MessageKey } from "@/lib/i18n";
import { buildSearchUrl } from "@/lib/query";
import {
  buildVideoBatches,
  filterVideos,
  type UrlSearchState,
  type VideoBatch,
  type VideoKindFilter,
  videoItemOf,
  videoQuery,
} from "@/lib/url-search";
import { type ChannelData, type ChannelVideo, VIDEO_KINDS, type VideoKind, videoDate, videoYear } from "@/lib/youtube";

type YoutubeChannelVideosProps = {
  t: (key: MessageKey) => string;
  // 読み込んだチャンネルの、保存済みの動画一覧
  data: ChannelData;
  state: UrlSearchState;
  patch: (next: Partial<UrlSearchState>) => void;
  // 曲名などと一緒に書かれていてほしい名前（チャンネル名の呼び名と、一緒に探す言葉）
  names: string[];
  // 本人の X アカウント
  owners: string[];
};

const KIND_LABELS: Record<VideoKind, MessageKey> = {
  video: "ytKindVideo",
  short: "ytKindShort",
  live: "ytKindLive",
};

// 一覧は長くなるので、少しずつ出す（画面の中で別にスクロールさせない）
const PAGE_SIZE = 20;

function chipClass(selected: boolean): string {
  return `shrink-0 rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors ${
    selected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:bg-muted"
  }`;
}

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function shortDate(video: ChannelVideo | undefined): string {
  return video ? videoDate(video).replaceAll("-", "/") : "";
}

// まとめて探す。X に入る長さを超えるときは、1 つのボタンで 1 回ずつ順に開く
function BulkSearch({
  t,
  videos,
  batches,
  hrefOf,
}: {
  t: (key: MessageKey) => string;
  videos: ChannelVideo[];
  batches: VideoBatch[];
  hrefOf: (query: string) => string;
}) {
  const [step, setStep] = useState(0);
  const title = t("ytBulk").replace("{count}", String(videos.length));

  if (batches.length === 1) {
    return (
      <Button size="lg" className="h-11 w-full" asChild>
        <a href={hrefOf(batches[0].query)} target="_blank" rel="noopener noreferrer" data-testid="yt-bulk-next">
          <SearchIcon data-icon="inline-start" />
          {title}
        </a>
      </Button>
    );
  }

  const parts = String(batches.length);
  // 一覧は新しい順なので、古い日付〜新しい日付の順に見せる
  const rangeOf = (batch: VideoBatch) => `${shortDate(videos[batch.to - 1])}〜${shortDate(videos[batch.from - 1])}`;
  const current = batches[step];

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3" data-testid="yt-bulk">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">
          {t("ytBulkNote")
            .replace("{per}", String(batches[0].to - batches[0].from + 1))
            .replace("{parts}", parts)}
        </p>
      </div>
      {current ? (
        <Button size="lg" className="h-auto min-h-11 w-full flex-col gap-0 py-2" asChild>
          <a
            href={hrefOf(current.query)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="yt-bulk-next"
            onClick={() => setStep(step + 1)}
          >
            <span className="flex items-center gap-1.5">
              <SearchIcon className="size-4" aria-hidden />
              {t("ytBulkStep").replace("{step}", String(step + 1)).replace("{parts}", parts)}
            </span>
            <span className="text-xs font-normal tabular-nums opacity-85">{rangeOf(current)}</span>
          </a>
        </Button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm" role="status">
            {t("ytBulkDone").replace("{parts}", parts)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setStep(0)} data-testid="yt-bulk-restart">
            <RotateCcwIcon data-icon="inline-start" />
            {t("ytBulkRestart")}
          </Button>
        </div>
      )}
      {/* 開いた回は濃く塗る。押すとその回から開き直せる */}
      <div className="flex gap-1" role="group" aria-label={title}>
        {batches.map((batch, index) => (
          <button
            key={batch.from}
            type="button"
            className="group flex h-6 flex-1 items-center"
            aria-label={t("ytBulkPart").replace("{step}", String(index + 1)).replace("{range}", rangeOf(batch))}
            aria-current={index === step ? "step" : undefined}
            title={rangeOf(batch)}
            onClick={() => setStep(index)}
          >
            <span
              className={`h-1.5 w-full rounded-full transition-colors group-hover:bg-primary/60 ${
                index < step ? "bg-primary" : index === step ? "bg-primary/35" : "bg-border"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function VideoList({
  t,
  videos,
  showKind,
  hrefOfVideo,
}: {
  t: (key: MessageKey) => string;
  videos: ChannelVideo[];
  showKind: boolean;
  hrefOfVideo: (video: ChannelVideo) => string;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  if (!videos.length) return <p className="py-4 text-center text-sm text-muted-foreground">{t("ytNone")}</p>;
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
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="whitespace-nowrap tabular-nums">{shortDate(video)}</span>
                {showKind ? (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {t(KIND_LABELS[video.kind])}
                  </Badge>
                ) : null}
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <a href={hrefOfVideo(video)} target="_blank" rel="noopener noreferrer" data-testid="yt-reactions">
                <SearchIcon data-icon="inline-start" />
                {t("ytReactions")}
              </a>
            </Button>
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

export function YoutubeChannelVideos({ t, data, state, patch, names, owners }: YoutubeChannelVideosProps) {
  const videos = data.videos;
  const kindCounts = countBy(videos.map((video) => video.kind));
  const kinds = VIDEO_KINDS.filter((kind) => kindCounts.has(kind));
  // 前に選んだ種類・年がこのチャンネルに無ければ「すべて」として扱う
  const videoKind: VideoKindFilter = state.videoKind !== "all" && kinds.includes(state.videoKind) ? state.videoKind : "all";
  // 公開年の件数は、選んでいる種類の中で数える
  const ofKind = videoKind === "all" ? videos : videos.filter((video) => video.kind === videoKind);
  const yearCounts = countBy(ofKind.map(videoYear).filter(Boolean));
  const years = [...yearCounts.keys()].sort((a, b) => b.localeCompare(a));
  const year = years.includes(state.videoYear) ? state.videoYear : "";
  const matched = filterVideos(videos, { ...state, videoKind, videoYear: year });
  const batches = buildVideoBatches(
    matched.map((video) => video.id),
    state,
    owners,
  );
  const hrefOf = (query: string) => buildSearchUrl(query, "posts", state.sort);
  // 名前だけの区切り（「曲名 / 名前」の名前側）はタイトルの言葉にしない
  const nameWords = [...names, data.channel.handle];
  const hrefOfVideo = (video: ChannelVideo) => hrefOf(videoQuery(videoItemOf(video, nameWords), state, names, owners));
  // 絞り込みを変えたら、まとめて検索の進み具合と表示件数を最初に戻す
  const filterKey = [data.channel.id, videos.length, videoKind, year, state.videoTitle, batches.length, batches[0]?.query].join("|");

  return (
    <Card>
      <CardContent className="space-y-4 pt-6" data-testid="yt-channel">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{t("ytSection")}</p>
          <p className="text-xs tabular-nums text-muted-foreground" data-testid="yt-matched">
            {matched.length} / {videos.length}
          </p>
        </div>

        {kinds.length > 1 ? (
          <Segmented<VideoKindFilter>
            options={[
              { id: "all", label: t("ytAll"), count: videos.length },
              ...kinds.map((kind) => ({ id: kind, label: t(KIND_LABELS[kind]), count: kindCounts.get(kind) })),
            ]}
            value={videoKind}
            label={t("ytKind")}
            onChange={(next) => patch({ videoKind: next })}
            testId="yt-kind"
          />
        ) : null}

        {years.length > 1 ? (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]" role="radiogroup" aria-label={t("ytYear")} data-testid="yt-years">
            {["", ...years].map((option) => (
              <button
                key={option || "all"}
                type="button"
                role="radio"
                aria-checked={year === option}
                data-testid={`yt-year-${option || "all"}`}
                className={chipClass(year === option)}
                onClick={() => patch({ videoYear: option })}
              >
                {option || t("ytAll")}
                {option ? <span className="ml-1 opacity-70">{yearCounts.get(option)}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

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

        {batches.length ? <BulkSearch key={`bulk|${filterKey}`} t={t} videos={matched} batches={batches} hrefOf={hrefOf} /> : null}

        <VideoList key={`list|${filterKey}`} t={t} videos={matched} showKind={kinds.length > 1} hrefOfVideo={hrefOfVideo} />
      </CardContent>
    </Card>
  );
}
