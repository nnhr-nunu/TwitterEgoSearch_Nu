"use client";

import { GlobeIcon, ListVideoIcon, RefreshCwIcon, TvIcon, XIcon } from "lucide-react";
import { type ClipboardEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slashDate } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import { parseTargetUrl, type UrlTarget, type UrlTargetKind } from "@/lib/url-search";
import { type ChannelData, type LoadErrorKind, type VideoInfo, videoDate } from "@/lib/youtube";

export type Notice = { tone: "info" | "error"; text: string };

export const LOAD_ERROR_MESSAGES: Record<LoadErrorKind, MessageKey> = {
  quota: "ytErrorQuota",
  notFound: "ytErrorNotFound",
  other: "ytErrorOther",
};

type YoutubeTargetProps = {
  t: (key: MessageKey) => string;
  target: UrlTarget | null;
  // 読み込み済みのチャンネル（対象がチャンネルのとき）と、動画のタイトル（対象が動画のとき）
  channel: ChannelData | null;
  video: VideoInfo | null;
  loading: boolean;
  notice: Notice | null;
  // 一覧をまだ持っていないチャンネルの読み込みに失敗したわけ。カードの中に出す
  loadError: LoadErrorKind | null;
  // 対象以外の保存済みチャンネル。押すと API を呼ばずに切り替わる
  recent: ChannelData[];
  // この環境で YouTube の API を呼べるか
  canLoad: boolean;
  // 動画のとき、そのチャンネル全体に切り替えられるか（API を呼べるか、チャンネルを読み込み済み）
  canOpenChannel: boolean;
  // 読み取れない URL なら false を返す
  onSubmit: (raw: string) => boolean;
  onClear: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onPickChannel: (data: ChannelData) => void;
  onOpenChannel: (channelId: string) => void;
};

const KIND_LABELS: Record<UrlTargetKind, MessageKey> = {
  video: "urlKindVideo",
  channel: "urlKindChannel",
  niconico: "urlKindNiconico",
  page: "urlKindPage",
};

function formatFetchedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Avatar({ src, className }: { src?: string; className: string }) {
  if (!src) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ${className}`}>
        <TvIcon className="size-1/2" aria-hidden />
      </span>
    );
  }
  // 静的エクスポートなので next/image の最適化は使えない
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={`shrink-0 rounded-full bg-muted object-cover ${className}`} />;
}

// 読み込んだ動画・チャンネルを、ID ではなくタイトルやアイコンで見せる
function TargetCard({
  t,
  target,
  channel,
  video,
  loading,
  loadError,
  canLoad,
  canOpenChannel,
  onClear,
  onRefresh,
  onRetry,
  onOpenChannel,
}: Pick<
  YoutubeTargetProps,
  | "t"
  | "channel"
  | "video"
  | "loading"
  | "loadError"
  | "canLoad"
  | "canOpenChannel"
  | "onClear"
  | "onRefresh"
  | "onRetry"
  | "onOpenChannel"
> & { target: UrlTarget }) {
  const clearButton = useRef<HTMLButtonElement>(null);
  // やり直しボタンにフォーカスがあったか。やり直した結果が上限や「見つからない」でボタンが消えると、
  // フォーカスが行き場を失うので、カードの ✕ へ移す
  const retryFocused = useRef(false);
  const showRetry = target.kind === "channel" && !channel && loadError === "other" && canLoad;
  useEffect(() => {
    if (showRetry || !retryFocused.current) return;
    retryFocused.current = false;
    // 読み込めて「新着を確認」に替わったときは同じボタンにフォーカスが残っているので、動かさない
    if (document.activeElement === document.body || !document.activeElement) clearButton.current?.focus();
  }, [showRetry]);

  let title = target.token;
  let sub = t(KIND_LABELS[target.kind]);
  let media = (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <GlobeIcon className="size-5" aria-hidden />
    </span>
  );
  let action = null;

  if (target.kind === "video") {
    title = video?.title ?? t("urlKindVideo");
    const published = video?.publishedAt ? slashDate(videoDate({ publishedAt: video.publishedAt })) : "";
    sub = [video?.channelTitle ?? t("urlKindVideo"), published].filter(Boolean).join(" · ");
    media = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://i.ytimg.com/vi/${target.token}/mqdefault.jpg`}
        alt=""
        className="aspect-video w-24 shrink-0 rounded-md bg-muted object-cover sm:w-28"
      />
    );
    if (video?.channelId && canOpenChannel) {
      action = (
        <Button type="button" variant="ghost" size="sm" className="-ml-2 text-primary" onClick={() => onOpenChannel(video.channelId)}>
          <ListVideoIcon data-icon="inline-start" />
          {t("urlOpenChannel")}
        </Button>
      );
    }
  } else if (target.kind === "channel") {
    title = channel?.channel.title ?? (target.token.startsWith("UC") ? t("urlKindChannel") : `@${target.token}`);
    sub = loading
      ? t("ytLoading")
      : channel
        ? t("ytLoaded").replace("{count}", String(channel.videos.length)).replace("{date}", formatFetchedAt(channel.fetchedAt))
        : t("urlKindChannel");
    media = <Avatar src={channel?.channel.thumbnail} className="size-12" />;
    if (channel && canLoad) {
      action = (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-primary"
          disabled={loading}
          onClick={onRefresh}
          data-testid="yt-refresh"
        >
          <RefreshCwIcon data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
          {t("ytRefresh")}
        </Button>
      );
    } else if (showRetry) {
      // やり直しは通信の失敗などのときだけ。見つからなかったチャンネルは何度読んでも同じで、上限は明日まで待つしかない。
      // 押してもボタンが消えたり disabled になったりするとフォーカスが外れるので、読み込み中も同じ場所に残して押せない見た目にする
      action = (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          // 押せないあいだは文字とアイコンだけを薄くする（ボタンごと薄くするとフォーカスの枠も薄くなって見失う）
          className="-ml-2 text-primary aria-disabled:cursor-not-allowed aria-disabled:text-primary/50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-primary/50 aria-disabled:active:translate-y-0 dark:aria-disabled:hover:bg-transparent"
          aria-disabled={loading || undefined}
          onClick={onRetry}
          onFocus={() => {
            retryFocused.current = true;
          }}
          onBlur={() => {
            retryFocused.current = false;
          }}
          data-testid="yt-retry"
        >
          <RefreshCwIcon data-icon="inline-start" className={loading ? "animate-spin" : undefined} />
          {t("ytRetry")}
        </Button>
      );
    }
  }

  return (
    <div
      // 読み込めなかったあいだは白地に赤みのある枠にして、読み込めたカードと見分けられるようにする（白地なら赤い字も 4.5:1 に届く）
      className={`flex items-start gap-3 rounded-lg border p-3 ${loadError ? "border-destructive/40 bg-card" : "border-border bg-background"}`}
      data-testid="url-target"
    >
      {media}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug break-words" data-testid="url-target-title">
          {title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
        {/* やり直しの読み込み中は、わけを見えなくするだけで場所は残す（カードが縮んで、押したボタンが上へ逃げないように）。
            また失敗したら alert の要素を入れ直すので、もう一度読み上げられる */}
        {loadError ? (
          loading ? (
            <p key="pending" className="invisible text-sm" aria-hidden>
              {t(LOAD_ERROR_MESSAGES[loadError])}
            </p>
          ) : (
            <p key="alert" className="text-sm text-destructive" role="alert" data-testid="yt-load-error">
              {t(LOAD_ERROR_MESSAGES[loadError])}
            </p>
          )
        ) : null}
        {action}
      </div>
      <Button
        ref={clearButton}
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-mt-1 -mr-1 shrink-0 text-muted-foreground"
        aria-label={t("urlClear")}
        title={t("urlClear")}
        onClick={onClear}
        data-testid="url-clear"
      >
        <XIcon />
      </Button>
    </div>
  );
}

export function YoutubeTarget(props: YoutubeTargetProps) {
  const { t, target, loading, notice, recent, onSubmit, onPickChannel } = props;
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    if (onSubmit(draft)) {
      setDraft("");
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  // 空欄（か全選択した欄）に読める URL を貼ったら、「読み込む」を押さなくてもそのまま読み込む。
  // 入力途中の文字に足したときや読めない文字のときは、いつもどおり貼るだけ
  const pasteAndLoad = (event: ClipboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const replacesAll = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const pasted = event.clipboardData.getData("text");
    if (!replacesAll || loading || !parseTargetUrl(pasted)) return;
    event.preventDefault();
    if (onSubmit(pasted)) {
      setDraft("");
      setInvalid(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="url-search-input">{t("urlInput")}</Label>
      {/* 「youtube.com/@…」のようにスキームなしで貼られても読めるよう、ブラウザの URL チェックは使わない */}
      <form className="flex gap-2" noValidate onSubmit={submit}>
        <Input
          id="url-search-input"
          type="url"
          inputMode="url"
          value={draft}
          placeholder={t("urlPlaceholder")}
          className="h-10 text-base md:text-sm"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          data-testid="url-search-input"
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          onPaste={pasteAndLoad}
        />
        <Button type="submit" variant="secondary" className="h-10 shrink-0" disabled={loading} data-testid="url-search-submit">
          {t("urlLoad")}
        </Button>
      </form>
      {invalid ? (
        <p className="text-sm text-destructive" data-testid="url-search-invalid">
          {t("urlInvalid")}
        </p>
      ) : null}

      {/* 何を探せるかの案内は、空のあいだ検索ボタンの下に出している（urlIntro）ので、ここでは繰り返さない */}
      {target ? <TargetCard {...props} target={target} /> : null}
      {notice ? (
        <p
          className={notice.tone === "error" ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
          role={notice.tone === "error" ? "alert" : "status"}
          data-testid="url-search-notice"
        >
          {notice.text}
        </p>
      ) : null}

      {recent.length ? (
        <div className="space-y-1.5" data-testid="url-recent">
          <p className="text-xs text-muted-foreground">{t("urlRecent")}</p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((data) => (
              <button
                key={data.channel.id}
                type="button"
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-3 pl-1 text-xs transition-colors hover:bg-muted"
                onClick={() => onPickChannel(data)}
              >
                <Avatar src={data.channel.thumbnail} className="size-5" />
                <span className="truncate">{data.channel.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
