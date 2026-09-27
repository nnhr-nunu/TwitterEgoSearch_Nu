"use client";

import { ExternalLinkIcon, ListVideoIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import { buildSearchUrl } from "@/lib/query";
import { channelNameWords, titleKeyword } from "@/lib/title-keywords";
import { buildVideoBatches, filterVideos, type UrlSearchState, type VideoItem, videoQuery } from "@/lib/url-search";
import {
  type ChannelData,
  effectiveYoutubeKey,
  fetchChannelVideos,
  hasBuiltInYoutubeKey,
  loadYoutubeApiKey,
  refreshChannelVideos,
  saveYoutubeApiKey,
  VIDEO_KINDS,
  type VideoKind,
  videoDate,
  videoYear,
  YoutubeApiError,
} from "@/lib/youtube";

type YoutubeChannelVideosProps = {
  t: (key: MessageKey) => string;
  // 入力 URL から読んだハンドルかチャンネル ID
  channelRef: string;
  // 保存済みの一覧のうち、入力中のチャンネルと一致するもの
  data: ChannelData | null;
  onLoaded: (data: ChannelData) => void;
  state: UrlSearchState;
  patch: (next: Partial<UrlSearchState>) => void;
};

const KIND_LABELS: Record<VideoKind, MessageKey> = {
  video: "ytKindVideo",
  short: "ytKindShort",
  live: "ytKindLive",
};

const KEY_HELP_URL = "https://developers.google.com/youtube/v3/getting-started";

function chipClass(selected: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    selected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-foreground hover:bg-muted"
  }`;
}

function errorMessage(error: unknown): MessageKey {
  if (!(error instanceof YoutubeApiError)) return "ytErrorOther";
  if (["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(error.reason)) return "ytErrorQuota";
  if (error.reason === "channelNotFound") return "ytErrorNotFound";
  if (["keyInvalid", "badRequest", "forbidden", "accessNotConfigured", "ipRefererBlocked", "400", "403"].includes(error.reason)) {
    return "ytErrorKey";
  }
  return "ytErrorOther";
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function YoutubeChannelVideos({ t, channelRef, data, onLoaded, state, patch }: YoutubeChannelVideosProps) {
  const [apiKey, setApiKey] = useState(loadYoutubeApiKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [notice, setNotice] = useState("");
  const builtIn = hasBuiltInYoutubeKey();
  const key = effectiveYoutubeKey(apiKey);

  // 保存済みなら新着分だけ取る（数ユニット）。全部取り直すのは「すべて読み直す」のときだけ
  const load = async (mode: "refresh" | "full") => {
    setLoading(true);
    setError(null);
    setNotice("");
    try {
      if (mode === "refresh" && data) {
        const result = await refreshChannelVideos(data, key);
        onLoaded(result.data);
        setNotice(result.added ? t("ytRefreshed").replace("{count}", String(result.added)) : t("ytNoNew"));
      } else {
        onLoaded(await fetchChannelVideos(channelRef, key));
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const videos = data?.videos ?? [];
  const kindCounts = countBy(videos.map((video) => video.kind));
  const yearCounts = countBy(videos.map(videoYear).filter(Boolean));
  const years = [...yearCounts.keys()].sort((a, b) => b.localeCompare(a));
  const matched = filterVideos(videos, state);
  // 名前だけの区切り（「曲名 / 名前」の名前側）はタイトルの言葉にしない
  const nameWords = data ? [...state.words, ...channelNameWords(data.channel.title), data.channel.handle] : [];
  const items: VideoItem[] = matched.map((video) => ({ id: video.id, keyword: titleKeyword(video.title, nameWords) }));
  const batches = buildVideoBatches(items, state);
  const hrefOf = (query: string) => buildSearchUrl(query, "posts", state.sort);

  return (
    <div className="space-y-4" data-testid="yt-channel">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ListVideoIcon className="size-4" aria-hidden />
          {t("ytSection")}
        </p>
        <p className="text-xs text-muted-foreground">{t("ytSectionHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="yt-api-key" className="text-xs">
          {builtIn ? t("ytKeyOptional") : t("ytKey")}
        </Label>
        <Input
          id="yt-api-key"
          type="password"
          value={apiKey}
          autoComplete="off"
          spellCheck={false}
          className="h-9 font-mono text-sm"
          data-testid="yt-api-key"
          onChange={(event) => {
            setApiKey(event.target.value);
            saveYoutubeApiKey(event.target.value);
          }}
        />
        <p className="text-xs text-muted-foreground">
          {builtIn ? null : `${t("ytKeyNeeded")} `}
          <a href={KEY_HELP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {t("ytKeyHelp")}
          </a>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!key || loading}
          onClick={() => load("refresh")}
          data-testid="yt-load"
        >
          <RefreshCwIcon data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
          {loading ? t("ytLoading") : data ? t("ytRefresh") : t("ytLoad")}
        </Button>
        {data ? (
          <span className="text-xs text-muted-foreground" data-testid="yt-loaded">
            {data.channel.title} ・{" "}
            {t("ytLoaded")
              .replace("{count}", String(videos.length))
              .replace("{date}", new Date(data.fetchedAt).toLocaleString())}
          </span>
        ) : null}
      </div>
      {data ? (
        <p className="text-xs text-muted-foreground">
          {notice ? <span data-testid="yt-notice">{notice} </span> : null}
          {t("ytCacheNote")}{" "}
          <button
            type="button"
            className="underline underline-offset-2 disabled:opacity-50"
            disabled={!key || loading}
            onClick={() => load("full")}
            data-testid="yt-reload-all"
          >
            {t("ytReloadAll")}
          </button>
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" data-testid="yt-error">
          {t(error)}
        </p>
      ) : null}
      {data?.truncated ? (
        <p className="text-xs text-muted-foreground">{t("ytTruncated").replace("{count}", String(videos.length))}</p>
      ) : null}

      {data ? (
        <>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("ytKinds")}</p>
            <div className="flex flex-wrap gap-1.5" data-testid="yt-kinds">
              <button
                type="button"
                aria-pressed={state.videoKinds.length === 0}
                className={chipClass(state.videoKinds.length === 0)}
                onClick={() => patch({ videoKinds: [] })}
              >
                {t("ytAll")}
              </button>
              {VIDEO_KINDS.filter((kind) => kindCounts.has(kind)).map((kind) => (
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
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("ytYears")}</p>
            <div className="flex flex-wrap gap-1.5" data-testid="yt-years">
              <button
                type="button"
                aria-pressed={state.videoYears.length === 0}
                className={chipClass(state.videoYears.length === 0)}
                onClick={() => patch({ videoYears: [] })}
              >
                {t("ytAll")}
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={state.videoYears.includes(year)}
                  data-testid={`yt-year-${year}`}
                  className={chipClass(state.videoYears.includes(year))}
                  onClick={() => patch({ videoYears: toggle(state.videoYears, year) })}
                >
                  {year} {yearCounts.get(year)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="yt-title-filter" className="text-xs">
              {t("ytTitleFilter")}
            </Label>
            <Input
              id="yt-title-filter"
              value={state.videoTitle}
              placeholder={t("ytTitlePlaceholder")}
              className="h-9 text-base md:text-sm"
              data-testid="yt-title-filter"
              onChange={(event) => patch({ videoTitle: event.target.value })}
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
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

          <div className="space-y-2">
            <p className="text-sm font-medium" data-testid="yt-matched">
              {t("ytMatched").replace("{count}", String(matched.length))}
            </p>
            {batches.length ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {batches.map((batch) => (
                    <Button key={batch.from} asChild>
                      <a
                        href={hrefOf(batch.query)}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="yt-batch"
                      >
                        <SearchIcon data-icon="inline-start" />
                        {t("ytBatch").replace("{from}", String(batch.from)).replace("{to}", String(batch.to))}
                      </a>
                    </Button>
                  ))}
                </div>
                {batches.length > 1 ? <p className="text-xs text-muted-foreground">{t("ytBatchNote")}</p> : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("ytNone")}</p>
            )}
          </div>

          {matched.length ? (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border" data-testid="yt-list">
              {matched.map((video, index) => (
                <li key={video.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="line-clamp-2 text-sm leading-snug">{video.title}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap tabular-nums">{videoDate(video)}</span>
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {t(KIND_LABELS[video.kind])}
                      </Badge>
                    </p>
                    {state.videoTitleSearch && items[index].keyword ? (
                      <p className="truncate text-xs text-muted-foreground" data-testid="yt-keyword">
                        ＋「{items[index].keyword}」
                      </p>
                    ) : null}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={hrefOf(videoQuery(items[index], state))} target="_blank" rel="noopener noreferrer">
                      <SearchIcon data-icon="inline-start" />
                      {t("ytReactions")}
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" asChild>
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("ytOpenVideo")}
                      title={t("ytOpenVideo")}
                    >
                      <ExternalLinkIcon />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
