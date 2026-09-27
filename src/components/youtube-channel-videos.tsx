"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import { buildSearchUrl } from "@/lib/query";
import { channelNameWords, titleKeyword } from "@/lib/title-keywords";
import { buildVideoBatches, filterVideos, type UrlSearchState, type VideoItem, videoQuery } from "@/lib/url-search";
import { type ChannelData, VIDEO_KINDS, type VideoKind, videoDate, videoYear } from "@/lib/youtube";

type YoutubeChannelVideosProps = {
  t: (key: MessageKey) => string;
  // 入力中のチャンネルの、保存済みの動画一覧
  data: ChannelData;
  state: UrlSearchState;
  patch: (next: Partial<UrlSearchState>) => void;
};

const KIND_LABELS: Record<VideoKind, MessageKey> = {
  video: "ytKindVideo",
  short: "ytKindShort",
  live: "ytKindLive",
};

function chipClass(selected: boolean): string {
  return `shrink-0 rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors ${
    selected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:bg-muted"
  }`;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function YoutubeChannelVideos({ t, data, state, patch }: YoutubeChannelVideosProps) {
  const videos = data.videos;
  const kindCounts = countBy(videos.map((video) => video.kind));
  const kinds = VIDEO_KINDS.filter((kind) => kindCounts.has(kind));
  const yearCounts = countBy(videos.map(videoYear).filter(Boolean));
  const years = [...yearCounts.keys()].sort((a, b) => b.localeCompare(a));
  const filtered = state.videoKinds.length > 0 || state.videoYears.length > 0 || state.videoTitle.trim().length > 0;
  const matched = filterVideos(videos, state);
  // 名前だけの区切り（「曲名 / 名前」の名前側）はタイトルの言葉にしない
  const nameWords = [...state.words, ...channelNameWords(data.channel.title), data.channel.handle];
  const items: VideoItem[] = matched.map((video) => ({ id: video.id, keyword: titleKeyword(video.title, nameWords) }));
  const batches = buildVideoBatches(items, state);
  const hrefOf = (query: string) => buildSearchUrl(query, "posts", state.sort);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6" data-testid="yt-channel">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{t("ytSection")}</p>
          <p className="text-xs tabular-nums text-muted-foreground" data-testid="yt-matched">
            {matched.length} / {videos.length}
          </p>
        </div>

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

        {/* 何も選ばなければすべて。種類と公開年はそれぞれ複数選べる */}
        <div className="space-y-2">
          {kinds.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" data-testid="yt-kinds">
              {kinds.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={state.videoKinds.includes(kind)}
                  data-testid={`yt-kind-${kind}`}
                  className={chipClass(state.videoKinds.includes(kind))}
                  onClick={() => patch({ videoKinds: toggle(state.videoKinds, kind) })}
                >
                  {t(KIND_LABELS[kind])} {kindCounts.get(kind)}
                </button>
              ))}
            </div>
          ) : null}
          {years.length > 1 ? (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" data-testid="yt-years">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={state.videoYears.includes(year)}
                  data-testid={`yt-year-${year}`}
                  className={chipClass(state.videoYears.includes(year))}
                  onClick={() => patch({ videoYears: toggle(state.videoYears, year) })}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}
          {filtered ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              data-testid="yt-clear"
              onClick={() => patch({ videoKinds: [], videoYears: [], videoTitle: "" })}
            >
              <XIcon data-icon="inline-start" />
              {t("ytClearFilters")}
            </Button>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5">
          <div className="space-y-0.5">
            <Label htmlFor="yt-title-search" className="cursor-pointer text-sm">
              {t("ytTitleSearch")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {state.videoTitleSearch && state.words.length
                ? t("ytTitleSearchScoped").replace("{names}", state.words.join("・"))
                : t("ytTitleSearchHint")}
            </p>
          </div>
          <Switch
            id="yt-title-search"
            checked={state.videoTitleSearch}
            onCheckedChange={(checked) => patch({ videoTitleSearch: checked })}
            aria-label={t("ytTitleSearch")}
            data-testid="yt-title-search"
          />
        </div>

        {batches.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("ytNone")}</p>
        ) : batches.length === 1 ? (
          <Button size="lg" className="h-11 w-full" asChild>
            <a href={hrefOf(batches[0].query)} target="_blank" rel="noopener noreferrer" data-testid="yt-batch">
              <SearchIcon data-icon="inline-start" />
              {t("ytSearchMatched").replace("{count}", String(matched.length))}
            </a>
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("ytBatchNote").replace("{count}", String(matched.length)).replace("{parts}", String(batches.length))}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {batches.map((batch) => (
                <Button key={batch.from} variant="outline" asChild>
                  <a href={hrefOf(batch.query)} target="_blank" rel="noopener noreferrer" data-testid="yt-batch">
                    <SearchIcon data-icon="inline-start" />
                    {t("ytBatch").replace("{from}", String(batch.from)).replace("{to}", String(batch.to))}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {matched.length ? (
          <ul
            className="max-h-[32rem] divide-y divide-border overflow-y-auto rounded-lg border border-border"
            data-testid="yt-list"
          >
            {matched.map((video, index) => (
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
                    <span className="whitespace-nowrap tabular-nums">{videoDate(video)}</span>
                    {kinds.length > 1 ? (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {t(KIND_LABELS[video.kind])}
                      </Badge>
                    ) : null}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <a
                    href={hrefOf(videoQuery(items[index], state))}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="yt-reactions"
                  >
                    {t("ytReactions")}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
