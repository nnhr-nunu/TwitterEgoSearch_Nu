"use client";

import { GlobeIcon, ListVideoIcon, RefreshCwIcon, TvIcon, XIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slashDate } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { UrlTarget, UrlTargetKind } from "@/lib/url-search";
import { type ChannelData, type VideoInfo, videoDate } from "@/lib/youtube";

export type Notice = { tone: "info" | "error"; text: string };

type YoutubeTargetProps = {
  t: (key: MessageKey) => string;
  target: UrlTarget | null;
  // 読み込み済みのチャンネル（対象がチャンネルのとき）と、動画のタイトル（対象が動画のとき）
  channel: ChannelData | null;
  video: VideoInfo | null;
  loading: boolean;
  notice: Notice | null;
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
  canLoad,
  canOpenChannel,
  onClear,
  onRefresh,
  onOpenChannel,
}: Pick<
  YoutubeTargetProps,
  "t" | "channel" | "video" | "loading" | "canLoad" | "canOpenChannel" | "onClear" | "onRefresh" | "onOpenChannel"
> & { target: UrlTarget }) {
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
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3" data-testid="url-target">
      {media}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug break-words" data-testid="url-target-title">
          {title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
        {action}
      </div>
      <Button
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

      {target ? <TargetCard {...props} target={target} /> : <p className="text-sm text-muted-foreground">{t("urlIntro")}</p>}
      {notice ? (
        <p
          className={`text-xs ${notice.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}
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
