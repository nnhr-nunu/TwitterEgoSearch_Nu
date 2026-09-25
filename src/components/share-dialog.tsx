"use client";

import { BirdIcon, CopyIcon, SearchIcon, Share2Icon, UserIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import {
  buildSharePostText,
  buildShareUrl,
  POST_LIMIT,
  SHARE_TEMPLATES,
  SITE_NAME,
  weightedPostLength,
  type ShareTemplateId,
} from "@/lib/share-post";
import { tweetIntentUrl } from "@/lib/tweet-intent";
import type { Locale, SearchConfig } from "@/lib/types";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SearchConfig;
  locale: Locale;
  onCopy: (value: string) => Promise<boolean>;
  t: (key: MessageKey) => string;
};

const TEMPLATE_LABELS: Record<ShareTemplateId, MessageKey> = {
  thanks: "templateThanks",
  report: "templateReport",
  simple: "templateSimple",
};

// 投稿画面で見える形に近づける（スキームを外し、日本語は読める形に戻す）
function displayUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//, "");
  try {
    return decodeURIComponent(bare);
  } catch {
    return bare;
  }
}

function siteOrigin(): string {
  if (typeof window === "undefined") return "";
  const base = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  return `${window.location.origin}${base}`;
}

/** X に貼ったときのリンクカード。app/og.png/route.tsx と同じ見た目の縮小版 */
function LinkCardPreview({ tagline }: { tagline: string }) {
  const host = typeof window === "undefined" ? "" : window.location.host;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <div className="flex aspect-[1.91/1] flex-col justify-between bg-gradient-to-br from-[#1da1f2] via-[#1a8cd8] to-[#0c6fae] p-4 pb-8 text-white">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-white/95 text-[#1da1f2]">
            <BirdIcon className="size-4" aria-hidden />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.18em] opacity-90">TWITTER (X)</span>
        </div>
        <div className="space-y-1">
          <p className="text-xl leading-tight font-bold tracking-tight sm:text-2xl">{SITE_NAME}</p>
          <p className="text-xs opacity-90">{tagline}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] text-[#536471]">
          <SearchIcon className="size-3 text-[#1da1f2]" aria-hidden />
          <span className="truncate">&quot;名前&quot; OR &quot;愛称&quot; OR &quot;#タグ&quot;</span>
        </div>
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
        {host}
      </span>
    </div>
  );
}

/** 開くたびに最新の条件で文面を作り直すため、呼び出し側で key を変えて作り直す */
export function ShareDialog({ open, onOpenChange, config, locale, onCopy, t }: ShareDialogProps) {
  const [template, setTemplate] = useState<ShareTemplateId>("thanks");
  const [text, setText] = useState(() => buildSharePostText(config, locale, "thanks"));
  const [includeMutes, setIncludeMutes] = useState(false);

  const hasMutes = config.mutedHandles.length > 0 || config.mutedKeywords.length > 0;
  const url = useMemo(
    () => buildShareUrl(siteOrigin(), config, locale, { includeMutes: hasMutes && includeMutes }),
    [config, locale, hasMutes, includeMutes],
  );
  const remaining = POST_LIMIT - weightedPostLength(text, true);
  const over = remaining < 0;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  function pickTemplate(next: ShareTemplateId) {
    setTemplate(next);
    setText(buildSharePostText(config, locale, next));
  }

  async function nativeShare() {
    try {
      await navigator.share({ text, url });
    } catch {
      // キャンセルは無視する
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-1 overflow-y-auto sm:max-w-md [&>*]:min-w-0" data-testid="share-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2Icon className="size-4 text-primary" aria-hidden />
            {t("shareTitle")}
          </DialogTitle>
          <DialogDescription>{t("shareLead")}</DialogDescription>
        </DialogHeader>

        <div
          className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1"
          role="radiogroup"
          aria-label={t("shareTemplate")}
        >
          {SHARE_TEMPLATES.map((id) => {
            const selected = template === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`share-template-${id}`}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
                onClick={() => pickTemplate(id)}
              >
                {t(TEMPLATE_LABELS[id])}
              </button>
            );
          })}
        </div>

        {/* 投稿の見た目をそのまま編集できるプレビュー */}
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <UserIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-bold">{t("shareYou")}</p>
              <textarea
                aria-label={t("shareTemplate")}
                data-testid="share-text"
                className="field-sizing-content min-h-20 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <p className="truncate text-sm text-primary" data-testid="share-url">
                {displayUrl(url)}
              </p>
              <LinkCardPreview tagline={t("shareCardTagline")} />
            </div>
          </div>
          <p
            className={`mt-2 text-right text-xs tabular-nums ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}
            data-testid="share-remaining"
          >
            {over ? `${t("shareOver")} ${remaining}` : `${t("shareRemaining")} ${remaining}`}
          </p>
        </div>

        {hasMutes ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="share-include-mutes" className="cursor-pointer">
                {t("shareIncludeMutes")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("shareIncludeMutesHelp")}</p>
            </div>
            <Switch
              id="share-include-mutes"
              checked={includeMutes}
              onCheckedChange={setIncludeMutes}
              data-testid="share-include-mutes"
            />
          </div>
        ) : null}

        <DialogFooter>
          {canNativeShare ? (
            <Button type="button" variant="ghost" onClick={() => void nativeShare()}>
              <Share2Icon data-icon="inline-start" />
              {t("shareMore")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void onCopy(url)}>
            <CopyIcon data-icon="inline-start" />
            {t("shareCopyLink")}
          </Button>
          <Button type="button" disabled={over} asChild={!over} data-testid="share-post">
            {over ? (
              <span>{t("sharePostToX")}</span>
            ) : (
              <a href={tweetIntentUrl({ text, url })} target="_blank" rel="noopener noreferrer">
                {t("sharePostToX")}
              </a>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
