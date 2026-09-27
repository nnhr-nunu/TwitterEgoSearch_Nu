"use client";

import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ChipInput } from "@/components/chip-input";
import { SearchCluster } from "@/components/search-cluster";
import { Segmented } from "@/components/segmented";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useYoutubeVideoInfo } from "@/components/use-youtube-video-info";
import { YoutubeChannelVideos } from "@/components/youtube-channel-videos";
import { type Notice, YoutubeTarget } from "@/components/youtube-target";
import { isLikelyHandle } from "@/lib/handle";
import type { MessageKey } from "@/lib/i18n";
import { buildSearchUrl } from "@/lib/query";
import { channelNameWords, titleKeyword } from "@/lib/title-keywords";
import {
  buildMainQuery,
  channelLink,
  loadUrlSearch,
  parseTargetUrl,
  saveUrlSearch,
  URL_PERIODS,
  type UrlPeriod,
  type UrlSearchState,
  type UrlTarget,
} from "@/lib/url-search";
import {
  type ChannelData,
  fetchChannelVideos,
  refreshChannelVideos,
  YoutubeApiError,
  youtubeApiKey,
} from "@/lib/youtube";
import { findChannel, isStaleChannel, loadChannelCache, saveChannelCache, upsertChannel } from "@/lib/youtube-cache";

type UrlSearchPanelProps = {
  t: (key: MessageKey) => string;
};

const PERIOD_LABELS: Record<UrlPeriod, MessageKey> = {
  all: "urlPeriodAll",
  day: "urlPeriodDay",
  week: "urlPeriodWeek",
  month: "urlPeriodMonth",
  year: "urlPeriodYear",
};

function errorMessage(error: unknown): MessageKey {
  if (!(error instanceof YoutubeApiError)) return "ytErrorOther";
  if (["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"].includes(error.reason)) return "ytErrorQuota";
  if (error.reason === "channelNotFound") return "ytErrorNotFound";
  return "ytErrorOther";
}

function sameTarget(a: UrlTarget | null, b: UrlTarget | null): boolean {
  return Boolean(a && b && a.kind === b.kind && a.token.toLowerCase() === b.token.toLowerCase());
}

function uniqueWords(words: string[]): string[] {
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = word.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function channelUrl(data: ChannelData): string {
  const { handle, id } = data.channel;
  return handle ? `https://www.youtube.com/@${handle}` : `https://www.youtube.com/channel/${id}`;
}

// 入力欄の下に出す候補。押すとその言葉・アカウントを足す
function Suggestions({ t, items, onAdd, testId }: { t: (key: MessageKey) => string; items: string[]; onAdd: (item: string) => void; testId: string }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
      <span className="text-xs text-muted-foreground">{t("urlSuggest")}</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted"
          onClick={() => onAdd(item)}
        >
          <PlusIcon className="size-3" aria-hidden />
          {item}
        </button>
      ))}
    </div>
  );
}

export function UrlSearchPanel({ t }: UrlSearchPanelProps) {
  // 親が ready になってから描画されるので、初期化時に localStorage を読んでよい
  const [state, setState] = useState<UrlSearchState>(loadUrlSearch);
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
  const channel = target?.kind === "channel" ? findChannel(channels, target.token) : null;
  const videoInfo = useYoutubeVideoInfo(target?.kind === "video" ? target.token : null, channels);
  // 動画のときも、その動画のチャンネルを読み込んであれば本人のアカウントなどを使う
  const ownerChannel =
    channel ?? (videoInfo ? (channels.find((data) => data.channel.id === videoInfo.channelId) ?? null) : null);
  const owners = ownerChannel?.channel.xHandles ?? [];
  const handle = ownerChannel?.channel.handle ?? "";
  const nameWords = channelNameWords(ownerChannel?.channel.title ?? videoInfo?.channelTitle ?? "");
  // 曲名などと一緒に書かれていてほしい名前
  const names = uniqueWords([...nameWords, ...state.words]);
  // 配信のタイトルは感想に書かれないので、タイトルの言葉は動画・ショートだけ
  const videoKind = target?.kind === "video" ? ownerChannel?.videos.find((item) => item.id === target.token)?.kind : undefined;
  const keyword = videoInfo && videoKind !== "live" ? titleKeyword(videoInfo.title, [...names, handle]) : "";
  const main = buildMainQuery(state, {
    links: channel ? [channel.channel.id, channel.channel.handle ? channelLink(channel.channel.handle) : ""] : [],
    videoIds: channel ? channel.videos.map((item) => item.id) : [],
    owners,
    keyword,
    names,
  });

  const lowerWords = new Set(state.words.map((word) => word.toLowerCase()));
  const wordSuggestions = uniqueWords([...(ownerChannel?.channel.hashtags ?? []), ...nameWords]).filter(
    (word) => !lowerWords.has(word.toLowerCase()),
  );
  // 説明欄に X アカウントが無いときだけ、YouTube のハンドルを除外の候補にする（X と同じ名前のことが多い）
  const excludeSuggestions =
    !owners.length && handle && isLikelyHandle(handle) && !state.excluded.some((item) => item.toLowerCase() === handle.toLowerCase())
      ? [`@${handle}`]
      : [];

  let scope = t("urlScopePage");
  if (target?.kind === "video") {
    scope = t("urlScopeVideo");
    if (keyword && names.length) {
      scope += ` ${t("urlScopeTitle").replace("{title}", keyword).replace("{names}", names.join("・"))}`;
    }
  }
  if (target?.kind === "channel") {
    scope = main.videoCount ? t("urlScopeChannel").replace("{count}", String(main.videoCount)) : t("urlScopeChannelOnly");
  }
  if (state.words.length) scope += ` ${t("urlScopeWords").replace("{words}", state.words.join("・"))}`;

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

  // 別の動画・チャンネルに変えたら、前の対象に合わせた言葉と動画の絞り込みは持ち越さない
  const selectUrl = (url: string, keepWords = false): UrlTarget | null => {
    const next = parseTargetUrl(url);
    if (!next) return null;
    setNotice(null);
    const changed = !sameTarget(next, target);
    patch({
      url: url.trim(),
      ...(changed ? { videoKind: "all", videoYear: "", videoTitle: "", ...(keepWords ? {} : { words: [] }) } : {}),
    });
    if (next.kind !== "channel") return next;
    const cached = findChannel(channels, next.token);
    // キーの無いビルドでも、保存済みの一覧はそのまま使える
    if (!apiKey) {
      if (!cached) setNotice({ tone: "info", text: t("ytUnavailable") });
      return next;
    }
    if ((!cached || isStaleChannel(cached)) && !loading) void loadChannel(next.token, cached);
    return next;
  };

  return (
    <>
      <SearchCluster
        url={buildSearchUrl(main.query, "posts", state.sort)}
        postsOk={Boolean(main.query)}
        sort={state.sort}
        onSort={(sort) => patch({ sort })}
        t={t}
        testId="url-search"
        label={t("urlSearch")}
        emptyHint={t("urlEmpty")}
      >
        <p className="text-xs text-muted-foreground" data-testid="url-scope">
          {scope}
        </p>
      </SearchCluster>
      <p className="px-1 text-center text-xs text-muted-foreground">{t("autoSaveNote")}</p>

      <Card>
        <CardContent className="space-y-6 pt-6" data-testid="url-options">
          <YoutubeTarget
            t={t}
            target={target}
            channel={channel}
            video={videoInfo}
            loading={loading}
            notice={notice}
            recent={channels.filter((data) => data !== channel).slice(0, 4)}
            canLoad={Boolean(apiKey)}
            onSubmit={(raw) => selectUrl(raw) !== null}
            onClear={() => {
              setNotice(null);
              patch({ url: "", words: [], videoKind: "all", videoYear: "", videoTitle: "" });
            }}
            onRefresh={() => {
              if (channel && !loading) void loadChannel(channel.ref, channel);
            }}
            onPickChannel={(data) => selectUrl(channelUrl(data))}
            onOpenChannel={(channelId) => {
              const known = channels.find((data) => data.channel.id === channelId);
              selectUrl(known ? channelUrl(known) : `https://www.youtube.com/channel/${channelId}`, true);
            }}
          />

          {target ? (
            <>
              {owners.length ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="url-owner" className="cursor-pointer text-sm font-medium">
                      {t("urlOwner")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("urlOwnerHint").replace("{handles}", owners.map((owner) => `@${owner}`).join("・"))}
                    </p>
                  </div>
                  <Switch
                    id="url-owner"
                    checked={state.excludeOwner}
                    onCheckedChange={(excludeOwner) => patch({ excludeOwner })}
                    aria-label={t("urlOwner")}
                    data-testid="url-owner"
                  />
                </div>
              ) : null}

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

              <div className="space-y-2">
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
                <Suggestions
                  t={t}
                  items={wordSuggestions}
                  onAdd={(word) => patch({ words: [...state.words, word] })}
                  testId="url-suggestions"
                />
                <p className="text-xs text-muted-foreground">{t("urlWordsHint")}</p>
              </div>

              <div className="space-y-2">
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
                <Suggestions
                  t={t}
                  items={excludeSuggestions}
                  onAdd={(item) => patch({ excluded: [...state.excluded, item.replace(/^@/, "")] })}
                  testId="url-exclude-suggestions"
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {channel ? (
        <YoutubeChannelVideos t={t} data={channel} state={state} patch={patch} names={names} owners={owners} />
      ) : null}
    </>
  );
}
