"use client";

import { PlusIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChipInput } from "@/components/chip-input";
import { SearchCluster } from "@/components/search-cluster";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useYoutubeVideoInfo } from "@/components/use-youtube-video-info";
import { YoutubeChannelVideos } from "@/components/youtube-channel-videos";
import { PERIOD_LABELS, YoutubePeriod } from "@/components/youtube-period";
import { type ScopeInfo, YoutubeScopeSummary } from "@/components/youtube-scope-summary";
import { YoutubeSearchButton } from "@/components/youtube-search-button";
import { type Notice, YoutubeTarget } from "@/components/youtube-target";
import { isLikelyHandle } from "@/lib/handle";
import type { MessageKey } from "@/lib/i18n";
import { buildSearchUrl } from "@/lib/query";
import { channelNameWords, titleKeyword } from "@/lib/title-keywords";
import {
  buildChannelBatches,
  buildMainQuery,
  channelLink,
  channelWordsOf,
  loadUrlSearch,
  moveChannelWords,
  parseTargetUrl,
  pendingChannelKey,
  saveUrlSearch,
  type SearchBatch,
  uniqueCaseless,
  type UrlSearchState,
  type UrlTarget,
  postWindow,
  videosInScope,
  widerPeriod,
  withChannelWords,
} from "@/lib/url-search";
import {
  type ChannelData,
  type ChannelVideo,
  fetchChannelVideos,
  refreshChannelVideos,
  VIDEO_KINDS,
  videoDate,
  YoutubeApiError,
  youtubeApiKey,
} from "@/lib/youtube";
import {
  channelMatches,
  findChannel,
  isExpiredChannel,
  isStaleChannel,
  loadChannelCache,
  saveChannelCache,
  upsertChannel,
} from "@/lib/youtube-cache";

type UrlSearchPanelProps = {
  t: (key: MessageKey) => string;
  // 検索ボタンの下に出す「自動保存されます」の案内（設定1〜3 と同じものを親から渡す）
  note: ReactNode;
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

export function UrlSearchPanel({ t, note }: UrlSearchPanelProps) {
  // 親が ready になってから描画されるので、初期化時に localStorage を読んでよい
  const [state, setState] = useState<UrlSearchState>(loadUrlSearch);
  // 読み込んだチャンネルの動画一覧（新しく使った順に数件）。同じチャンネルは API を呼ばずに開ける
  const [channels, setChannels] = useState<ChannelData[]>(loadChannelCache);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // 一覧の読み込みは非同期なので、終わった時点の対象・期間を見られるよう最新の state も持っておく
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
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
  // ハッシュタグ・言葉はチャンネルごとに覚える。チャンネルが分からない対象（ページなど）は words に置く。
  // 動画のチャンネルが分かる前（情報の取得待ちや読み込めない日）に入れた言葉も words に入るので、分かったらチャンネルの言葉と合わせて見せる
  const wordsKey =
    ownerChannel?.channel.id ?? videoInfo?.channelId ?? (target?.kind === "channel" ? pendingChannelKey(target.token) : "");
  const words = wordsKey ? uniqueCaseless([...channelWordsOf(state.channelWords, wordsKey), ...state.words]) : state.words;
  // 書き換えたら、words に残っていた分もまとめてチャンネルの言葉にする
  const setWords = (next: string[]) =>
    setState((prev) =>
      wordsKey
        ? { ...prev, channelWords: withChannelWords(prev.channelWords, wordsKey, next), words: [] }
        : { ...prev, words: next },
    );
  // 対象を変える前に、words に残っているチャンネルの言葉をそのチャンネルへ移す（移さないと切り替えで消える）
  const carryWords = (): Partial<UrlSearchState> =>
    wordsKey && state.words.length ? { channelWords: withChannelWords(state.channelWords, wordsKey, words), words: [] } : {};
  const view = { ...state, words };
  const nameWords = channelNameWords(ownerChannel?.channel.title ?? videoInfo?.channelTitle ?? "");
  // 曲名などと一緒に書かれていてほしい名前
  const names = uniqueCaseless([...nameWords, ...words]);
  // 配信のタイトルは感想に書かれないので、タイトルの言葉は動画・ショートだけ
  const videoKind = target?.kind === "video" ? ownerChannel?.videos.find((item) => item.id === target.token)?.kind : undefined;
  const keyword = videoInfo && videoKind !== "live" ? titleKeyword(videoInfo.title, [...names, handle]) : "";

  // チャンネル全体のときは、期間・種類・タイトルに当てはまる動画のリンクを探す（種類が「チャンネル」か、当てはまる動画が無ければチャンネルのリンク）
  const inPeriod = channel ? videosInScope(channel.videos, { ...state, videoKind: "all" }) : [];
  const matched = channel ? videosInScope(channel.videos, state) : [];
  let batches: SearchBatch[] = [];
  if (channel) {
    const links = [channel.channel.id, channel.channel.handle ? channelLink(channel.channel.handle) : ""];
    batches = buildChannelBatches(view, { links, owners, videoIds: matched.map((video) => video.id) });
  } else {
    const query = buildMainQuery(view, { owners, keyword, names });
    if (query) batches = [{ query, from: 1, to: 0 }];
  }
  const hrefOf = (query: string) => buildSearchUrl(query, "posts", state.sort);

  let scope: ScopeInfo = { kind: "page" };
  if (target?.kind === "video") scope = { kind: "video", keyword, names };
  if (target?.kind === "channel") {
    scope =
      channel && state.videoKind !== "channel"
        ? { kind: "channel", count: matched.length, window: postWindow(state), videoKind: state.videoKind, batches }
        : { kind: "channelOnly" };
  }
  const summary = <YoutubeScopeSummary t={t} info={scope} words={words} />;

  const lowerWords = new Set(words.map((word) => word.toLowerCase()));
  const wordSuggestions = uniqueCaseless([...(ownerChannel?.channel.hashtags ?? []), ...nameWords]).filter(
    (word) => !lowerWords.has(word.toLowerCase()),
  );
  // 説明欄に X アカウントが無いときだけ、YouTube のハンドルを除外の候補にする（X と同じ名前のことが多い）
  const excludeSuggestions =
    !owners.length && handle && isLikelyHandle(handle) && !state.excluded.some((item) => item.toLowerCase() === handle.toLowerCase())
      ? [`@${handle}`]
      : [];

  const saveChannel = (data: ChannelData, ref: string) => {
    setChannels((prev) => {
      const next = upsertChannel(prev, data);
      saveChannelCache(next);
      return next;
    });
    // 読み込み中や読み込めなかったあいだに入れた言葉を、このチャンネルの言葉として引き継ぐ
    setState((prev) => {
      const moved = moveChannelWords(prev.channelWords, pendingChannelKey(ref), data.channel.id);
      return moved === prev.channelWords ? prev : { ...prev, channelWords: moved };
    });
  };

  // 開いたチャンネルの動画が期間に 1 本も無ければ、1 本以上ある期間まで広げる。広げたらそのお知らせを返す
  const widenPeriod = (videos: ChannelVideo[], current: UrlSearchState): string => {
    const period = widerPeriod(videos, current);
    if (!period) return "";
    patch({ period });
    return t("ytWidened").replace("{from}", t(PERIOD_LABELS[current.period])).replace("{to}", t(PERIOD_LABELS[period]));
  };

  // 読み込みを待つあいだに別の対象へ切り替えていたら、結果は保存するだけで、期間やお知らせには触らない
  const stillShowing = (ref: string, data: ChannelData | null) => {
    const current = parseTargetUrl(latest.current.url);
    if (current?.kind !== "channel") return false;
    return data ? channelMatches(data, current.token) : current.token.toLowerCase() === ref.toLowerCase();
  };

  // 保存済みなら新着分だけ取る（数ユニット）。初めてのチャンネルと、一覧を取ってから 30 日を過ぎたチャンネルは
  // 一覧を全部取り、期間を合わせる
  const loadChannel = async (ref: string, cached: ChannelData | null) => {
    setLoading(true);
    try {
      if (cached && !isExpiredChannel(cached)) {
        const result = await refreshChannelVideos(cached, apiKey);
        saveChannel(result.data, ref);
        if (!stillShowing(ref, result.data)) return;
        const text = result.added ? t("ytRefreshed").replace("{count}", String(result.added)) : t("ytNoNew");
        // 期間を広げたお知らせが先に出ていれば、続けて見せる
        setNotice((prev) => ({ tone: "info", text: prev?.tone === "info" ? `${prev.text} ${text}` : text }));
      } else {
        const data = await fetchChannelVideos(ref, apiKey);
        saveChannel(data, ref);
        if (!stillShowing(ref, data)) return;
        // 期間は読み込みを始めたときではなく、いまの期間から広げる（待つあいだに変えていることがある）
        const widened = widenPeriod(data.videos, latest.current);
        if (widened) setNotice({ tone: "info", text: widened });
      }
    } catch (caught) {
      if (stillShowing(ref, cached)) setNotice({ tone: "error", text: t(errorMessage(caught)) });
    } finally {
      setLoading(false);
    }
  };

  // 保存済みの対象がチャンネルなのに動画一覧を持っていないとき（引き継ぎ用リンクで取り込んだ直後の端末など）は、
  // 開いたときに読み込む。読み込まないと、チャンネル ID で覚えている言葉も出てこない
  const missingChannel = target?.kind === "channel" && !channel && apiKey ? target.token : null;
  const loadMissing = useRef(() => {});
  useEffect(() => {
    loadMissing.current = () => {
      if (missingChannel && !loading) void loadChannel(missingChannel, null);
    };
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() => loadMissing.current());
    return () => cancelAnimationFrame(frame);
  }, []);

  // 別の対象に変えたら、動画の絞り込みは持ち越さない（言葉はチャンネルごとに覚えているので、ページ用の words だけ消す）。
  // 同じチャンネルの中で動画 1 本とチャンネル全体を行き来するときは keep で残す
  const selectUrl = (url: string, keep = false): UrlTarget | null => {
    const next = parseTargetUrl(url);
    if (!next) return null;
    setNotice(null);
    const changed = !sameTarget(next, target);
    patch({ url: url.trim(), ...carryWords(), ...(changed && !keep ? { words: [], videoKind: "all", videoTitle: "" } : {}) });
    if (next.kind !== "channel") return next;
    const cached = findChannel(channels, next.token);
    // 保存済みのチャンネルに切り替えたときも、期間に動画が無ければ広げる
    const widened = cached && changed ? widenPeriod(cached.videos, state) : "";
    if (widened) setNotice({ tone: "info", text: widened });
    // キーの無いビルドでも、保存済みの一覧はそのまま使える
    if (!apiKey) {
      if (!cached) setNotice({ tone: "info", text: t("ytUnavailable") });
      return next;
    }
    if ((!cached || isStaleChannel(cached)) && !loading) void loadChannel(next.token, cached);
    return next;
  };

  // 一覧の動画 1 本の反応を、その動画を対象にしたときと同じ条件で探す X の検索 URL（上部の対象は変えない）
  const videoSearchUrl = (video: ChannelVideo) => {
    const videoKeyword = video.kind !== "live" ? titleKeyword(video.title, [...names, handle]) : "";
    const query = buildMainQuery(
      { ...view, url: `https://www.youtube.com/watch?v=${video.id}` },
      { owners, keyword: videoKeyword, names },
    );
    return hrefOf(query);
  };

  return (
    <>
      <SearchCluster
        url={hrefOf(batches[0]?.query ?? "")}
        postsOk={batches.length > 0}
        sort={state.sort}
        onSort={(sort) => patch({ sort })}
        t={t}
        testId="url-search"
        label={t("urlSearch")}
        emptyHint={t("urlEmpty")}
        action={
          <YoutubeSearchButton
            // 条件が変わったら、何回目まで開いたかを最初に戻す
            key={batches.map((batch) => batch.query).join("\n")}
            t={t}
            batches={batches}
            videos={matched}
            hrefOf={hrefOf}
          />
        }
      />
      {note}

      <Card>
        <CardContent data-testid="url-options">
          <YoutubeTarget
            t={t}
            target={target}
            channel={channel}
            video={videoInfo}
            loading={loading}
            notice={notice}
            recent={channels.filter((data) => data !== channel).slice(0, 4)}
            canLoad={Boolean(apiKey)}
            canOpenChannel={Boolean(apiKey) || ownerChannel !== null}
            onSubmit={(raw) => selectUrl(raw) !== null}
            onClear={() => {
              setNotice(null);
              patch({ ...carryWords(), url: "", words: [], videoKind: "all", videoTitle: "" });
            }}
            onRefresh={() => {
              if (!channel || loading) return;
              setNotice(null);
              void loadChannel(channel.ref, channel);
            }}
            onPickChannel={(data) => selectUrl(channelUrl(data))}
            onOpenChannel={(channelId) => {
              const known = channels.find((data) => data.channel.id === channelId);
              selectUrl(known ? channelUrl(known) : `https://www.youtube.com/channel/${channelId}`, true);
            }}
          />
        </CardContent>
      </Card>

      {target ? (
        <>
          <Card>
            <CardContent className="space-y-4" data-testid="url-range">
              <YoutubePeriod
                t={t}
                state={state}
                patch={patch}
                publishedDate={target.kind === "video" && videoInfo?.publishedAt ? videoDate({ publishedAt: videoInfo.publishedAt }) : undefined}
              />
              {channel ? (
                <YoutubeChannelVideos
                  t={t}
                  state={state}
                  patch={patch}
                  inPeriod={inPeriod}
                  matched={matched}
                  total={channel.videos.length}
                  channelKinds={VIDEO_KINDS.filter((kind) => channel.videos.some((video) => video.kind === kind))}
                  searchUrlOf={videoSearchUrl}
                  summary={summary}
                />
              ) : (
                summary
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6" data-testid="url-refine">
              <div className="space-y-2">
                <ChipInput
                  id="url-search-words"
                  label={t("urlWords")}
                  placeholder={t("urlWordsPlaceholder")}
                  values={words}
                  onChange={setWords}
                  addLabel={t("addKeyword")}
                  savedToast={t("savedToast")}
                  removeLabel={t("removeItem")}
                  testId="url-words"
                />
                <Suggestions
                  t={t}
                  items={wordSuggestions}
                  onAdd={(word) => setWords([...words, word])}
                  testId="url-suggestions"
                />
                <p className="text-xs text-muted-foreground">{t("urlWordsHint")}</p>
              </div>

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
                <ChipInput
                  id="url-search-exclude"
                  label={t("urlExclude")}
                  placeholder={t("mutePlaceholder")}
                  values={state.excluded}
                  onChange={(excluded) => patch({ excluded })}
                  addLabel={t("addMute")}
                  savedToast={t("savedToast")}
                  removeLabel={t("removeItem")}
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
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  );
}
