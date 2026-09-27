"use client";

import { FilmIcon, GlobeIcon, PlusIcon, RefreshCwIcon, SearchIcon, TvIcon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { ChipInput } from "@/components/chip-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useYoutubeVideoInfo } from "@/components/use-youtube-video-info";
import { YoutubeChannelVideos } from "@/components/youtube-channel-videos";
import type { MessageKey } from "@/lib/i18n";
import { buildSearchUrl } from "@/lib/query";
import { channelNameWords, titleKeyword } from "@/lib/title-keywords";
import type { ResultSort } from "@/lib/types";
import {
  buildUrlQueries,
  loadUrlSearch,
  parseTargetUrl,
  saveUrlSearch,
  URL_PERIODS,
  type UrlPeriod,
  type UrlSearchState,
  type UrlTarget,
  type UrlTargetKind,
} from "@/lib/url-search";
import {
  type ChannelData,
  fetchChannelVideos,
  refreshChannelVideos,
  type VideoInfo,
  YoutubeApiError,
  youtubeApiKey,
} from "@/lib/youtube";
import { findChannel, loadChannelCache, saveChannelCache, upsertChannel } from "@/lib/youtube-cache";

type UrlSearchPanelProps = {
  t: (key: MessageKey) => string;
};

const KIND_LABELS: Record<UrlTargetKind, MessageKey> = {
  video: "urlKindVideo",
  channel: "urlKindChannel",
  niconico: "urlKindNiconico",
  page: "urlKindPage",
};

const SORTS: { id: ResultSort; label: MessageKey }[] = [
  { id: "latest", label: "sortLatest" },
  { id: "likes", label: "sortLikes" },
];

const PERIOD_LABELS: Record<UrlPeriod, MessageKey> = {
  all: "urlPeriodAll",
  day: "urlPeriodDay",
  week: "urlPeriodWeek",
  month: "urlPeriodMonth",
  year: "urlPeriodYear",
};

type Notice = { tone: "info" | "error"; text: string };

// 一緒に探す言葉の候補。チャンネル名の呼び名と、動画ならタイトルの中心部分
function suggestWords(channel: ChannelData | null, video: VideoInfo | null, words: string[]): string[] {
  const names = channelNameWords(channel?.channel.title ?? video?.channelTitle ?? "");
  const candidates = video ? [titleKeyword(video.title, names), ...names] : names;
  const taken = new Set(words.map((word) => word.toLowerCase()));
  return [...new Set(candidates.filter((word) => word && !taken.has(word.toLowerCase())))];
}

function segmentClass(selected: boolean): string {
  return `rounded-lg px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors sm:px-3 sm:text-sm ${
    selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
  }`;
}

function errorMessage(error: unknown): MessageKey {
  if (!(error instanceof YoutubeApiError)) return "ytErrorOther";
  if (["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(error.reason)) return "ytErrorQuota";
  if (error.reason === "channelNotFound") return "ytErrorNotFound";
  return "ytErrorOther";
}

function sameTarget(a: UrlTarget | null, b: UrlTarget | null): boolean {
  return Boolean(a && b && a.kind === b.kind && a.token.toLowerCase() === b.token.toLowerCase());
}

function Segmented<T extends string>({
  options,
  value,
  label,
  onChange,
  testId,
}: {
  options: { id: T; label: string }[];
  value: T;
  label: string;
  onChange: (value: T) => void;
  testId: string;
}) {
  return (
    <div
      className="grid gap-1 rounded-xl border border-border bg-background p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          data-testid={`${testId}-${option.id}`}
          className={segmentClass(value === option.id)}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// 検索した URL が何なのかを、ID ではなくタイトルや名前で見せる
function TargetSummary({
  t,
  target,
  video,
  channel,
  loading,
}: {
  t: (key: MessageKey) => string;
  target: UrlTarget;
  video: VideoInfo | null;
  channel: ChannelData | null;
  loading: boolean;
}) {
  let title = target.token;
  let sub = t(KIND_LABELS[target.kind]);
  if (target.kind === "video") {
    title = video?.title ?? t("urlKindVideo");
    sub = video?.channelTitle ?? "";
  } else if (target.kind === "channel") {
    title = channel?.channel.title ?? (target.token.startsWith("UC") ? t("urlKindChannel") : `@${target.token}`);
    sub = loading
      ? t("ytLoading")
      : channel
        ? t("ytLoaded")
            .replace("{count}", String(channel.videos.length))
            .replace(
              "{date}",
              new Date(channel.fetchedAt).toLocaleString(undefined, {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            )
        : t("urlKindChannel");
  }
  const Icon = target.kind === "channel" ? TvIcon : target.kind === "page" ? GlobeIcon : FilmIcon;

  return (
    <div className="flex items-center gap-3" data-testid="url-target">
      {target.kind === "video" ? (
        // 静的エクスポートなので next/image の最適化は使えない
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://i.ytimg.com/vi/${target.token}/mqdefault.jpg`}
          alt=""
          className="aspect-video w-24 shrink-0 rounded-md bg-muted object-cover sm:w-28"
        />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug break-all" data-testid="url-target-title">
          {title}
        </p>
        {sub ? <p className="truncate text-xs text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
}

export function UrlSearchPanel({ t }: UrlSearchPanelProps) {
  // 親が ready になってから描画されるので、初期化時に localStorage を読んでよい
  const [state, setState] = useState<UrlSearchState>(loadUrlSearch);
  // 入力欄の値。「検索」を押すまで検索対象は変えない
  const [draft, setDraft] = useState(state.url);
  const [invalid, setInvalid] = useState(false);
  // 読み込んだチャンネルの動画一覧（新しく使った順に数件）。同じチャンネルは API を呼ばずに開ける
  const [channels, setChannels] = useState<ChannelData[]>(loadChannelCache);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    saveUrlSearch(state);
  }, [state]);

  const patch = (next: Partial<UrlSearchState>) => setState((prev) => ({ ...prev, ...next }));
  const apiKey = youtubeApiKey();
  const target = parseTargetUrl(state.url);
  const draftTarget = parseTargetUrl(draft);
  const channel = target?.kind === "channel" ? findChannel(channels, target.token) : null;
  const draftCached = draftTarget?.kind === "channel" && apiKey ? findChannel(channels, draftTarget.token) : null;
  const videoInfo = useYoutubeVideoInfo(target?.kind === "video" ? target.token : null, channels);
  // 読み込み済みなら、ハンドルとチャンネル ID のどちらで貼られたリンクも、新しい動画のリンクも探す
  const queries = buildUrlQueries(
    state,
    channel ? [channel.channel.id, channel.channel.handle] : [],
    channel ? channel.videos.map((video) => video.id) : [],
  );
  const suggestions = target ? suggestWords(channel, videoInfo, state.words) : [];
  const hrefOf = (query: string) => buildSearchUrl(query, "posts", state.sort);

  const saveChannel = (data: ChannelData) => {
    setChannels((prev) => {
      const next = upsertChannel(prev, data);
      saveChannelCache(next);
      return next;
    });
  };

  // 保存済みなら新着分だけ取る（数ユニット）。初めてのチャンネルは一覧を全部取る
  const loadChannel = async (ref: string, cached: ChannelData | null) => {
    setLoading(true);
    try {
      if (cached) {
        const result = await refreshChannelVideos(cached, apiKey);
        saveChannel(result.data);
        setNotice({
          tone: "info",
          text: result.added ? t("ytRefreshed").replace("{count}", String(result.added)) : t("ytNoNew"),
        });
      } else {
        saveChannel(await fetchChannelVideos(ref, apiKey));
      }
    } catch (caught) {
      setNotice({ tone: "error", text: t(errorMessage(caught)) });
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draftTarget) {
      setInvalid(draft.trim().length > 0);
      return;
    }
    setNotice(null);
    // 別の動画・チャンネルに変えたら、前の対象に合わせた言葉と動画の絞り込みは持ち越さない
    const changed = !sameTarget(draftTarget, target);
    patch({
      url: draft.trim(),
      ...(changed ? { words: [], videoKinds: [], videoYears: [], videoTitle: "" } : {}),
    });
    if (draftTarget.kind !== "channel") return;
    const cached = findChannel(channels, draftTarget.token);
    // キーの無いビルドでも、保存済みの一覧はそのまま使える
    if (!apiKey) {
      if (!cached) setNotice({ tone: "info", text: t("ytUnavailable") });
      return;
    }
    if (!loading) void loadChannel(draftTarget.token, cached);
  };

  return (
    <>
      <section className="space-y-3 rounded-xl border border-border bg-card p-4" data-testid="url-search">
        {/* 「youtube.com/@…」のようにスキームなしで貼られても読めるよう、ブラウザの URL チェックは使わない */}
        <form className="flex gap-2" noValidate onSubmit={submit}>
          <Input
            id="url-search-input"
            type="url"
            inputMode="url"
            value={draft}
            placeholder={t("urlPlaceholder")}
            aria-label={t("urlInput")}
            className="h-12 min-w-0 flex-1 text-base"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            data-testid="url-search-input"
            onChange={(event) => {
              setDraft(event.target.value);
              setInvalid(false);
            }}
          />
          <Button type="submit" size="lg" className="h-12 shrink-0 px-4 text-base" disabled={loading} data-testid="url-search-submit">
            {draftCached ? (
              <RefreshCwIcon data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
            ) : (
              <SearchIcon data-icon="inline-start" />
            )}
            {draftCached ? t("urlRefresh") : t("urlSubmit")}
          </Button>
        </form>
        {invalid ? (
          <p className="text-sm text-destructive" data-testid="url-search-invalid">
            {t("urlInvalid")}
          </p>
        ) : null}

        {target ? (
          <>
            <TargetSummary t={t} target={target} video={videoInfo} channel={channel} loading={loading} />
            {notice ? (
              <p
                className={`text-xs ${notice.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}
                role={notice.tone === "error" ? "alert" : undefined}
                data-testid="url-search-notice"
              >
                {notice.text}
              </p>
            ) : null}
            <Button size="lg" className="h-12 w-full text-base" asChild>
              <a href={hrefOf(queries.all)} target="_blank" rel="noopener noreferrer" data-testid="url-search-open">
                <SearchIcon data-icon="inline-start" />
                {t("urlOpenX")}
              </a>
            </Button>
            <Segmented
              options={SORTS.map((option) => ({ id: option.id, label: t(option.label) }))}
              value={state.sort}
              label={t("urlOpenX")}
              onChange={(sort) => patch({ sort })}
              testId="url-search-sort"
            />
            {channel && queries.videoCount < channel.videos.length ? (
              <p className="text-xs text-muted-foreground" data-testid="url-search-videos-note">
                {t("urlChannelScope").replace("{count}", String(queries.videoCount))}
              </p>
            ) : null}
          </>
        ) : invalid ? null : (
          <p className="text-sm text-muted-foreground">{t("urlIntro")}</p>
        )}
      </section>
      <p className="px-1 text-center text-xs text-muted-foreground">{t("autoSaveNote")}</p>

      {target ? (
        <Card>
          <CardContent className="space-y-6 pt-6" data-testid="url-options">
            <div className="space-y-1.5">
              <ChipInput
                id="url-search-words"
                label={t("urlWords")}
                placeholder={t("urlWordsPlaceholder")}
                values={state.words}
                onChange={(words) => patch({ words })}
                addLabel={t("addKeyword")}
                savedToast={t("savedToast")}
                testId="url-words"
              />
              {suggestions.length ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-1" data-testid="url-suggestions">
                  <span className="text-xs text-muted-foreground">{t("urlSuggest")}</span>
                  {suggestions.map((word) => (
                    <button
                      key={word}
                      type="button"
                      className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted"
                      onClick={() => patch({ words: [...state.words, word] })}
                    >
                      <PlusIcon className="size-3" aria-hidden />
                      {word}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <ChipInput
              id="url-search-exclude"
              label={t("urlExclude")}
              placeholder={t("mutePlaceholder")}
              values={state.excluded}
              onChange={(excluded) => patch({ excluded })}
              addLabel={t("addMute")}
              savedToast={t("savedToast")}
              mode="handle"
              invalidMessage={t("muteInvalid")}
              testId="url-exclude"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("urlPeriod")}</p>
              <Segmented
                options={URL_PERIODS.map((period) => ({ id: period, label: t(PERIOD_LABELS[period]) }))}
                value={state.period}
                label={t("urlPeriod")}
                onChange={(period) => patch({ period })}
                testId="url-period"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {channel ? <YoutubeChannelVideos t={t} data={channel} state={state} patch={patch} /> : null}
    </>
  );
}
