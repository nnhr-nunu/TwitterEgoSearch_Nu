"use client";

import { RotateCcwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";
import type { SearchBatch } from "@/lib/url-search";
import { type ChannelVideo, videoDate } from "@/lib/youtube";

type YoutubeSearchButtonProps = {
  t: (key: MessageKey) => string;
  batches: SearchBatch[];
  // 検索に入れた動画（新しい順）。回ごとの公開日の範囲を出すのに使う
  videos: ChannelVideo[];
  hrefOf: (query: string) => string;
  // 1 回目にチャンネルのリンクも入っているか
  withChannel: boolean;
};

function shortDate(video: ChannelVideo | undefined): string {
  return video ? videoDate(video).replaceAll("-", "/") : "";
}

// 一覧は新しい順なので、古い日付〜新しい日付の順に見せる
export function batchRange(batch: SearchBatch, videos: ChannelVideo[]): string {
  if (batch.to < batch.from) return "";
  const newest = shortDate(videos[batch.from - 1]);
  const oldest = shortDate(videos[batch.to - 1]);
  return newest === oldest ? newest : `${oldest}〜${newest}`;
}

// 画面上部の検索ボタン。X に入る長さを超えるときは、押すたびに次の回を開く
export function YoutubeSearchButton({ t, batches, videos, hrefOf, withChannel }: YoutubeSearchButtonProps) {
  const [step, setStep] = useState(0);
  const label = t("urlSearch");

  if (batches.length <= 1) {
    return (
      <Button size="lg" className="h-12 w-full text-base" asChild>
        <a href={hrefOf(batches[0]?.query ?? "")} target="_blank" rel="noopener noreferrer" data-testid="url-search-open">
          <SearchIcon data-icon="inline-start" />
          {label}
        </a>
      </Button>
    );
  }

  const parts = String(batches.length);
  const current = batches[step];
  const detail = (batch: SearchBatch, index: number) =>
    t(withChannel && index === 0 ? "ytStepChannel" : "ytStepRange")
      .replace("{range}", batchRange(batch, videos))
      .replace("{count}", String(batch.to - batch.from + 1));

  return (
    <div className="space-y-2" data-testid="url-search-steps">
      {current ? (
        <Button size="lg" className="h-auto min-h-12 w-full flex-col gap-0 py-2 text-base" asChild>
          <a
            href={hrefOf(current.query)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="url-search-open"
            onClick={() => setStep(step + 1)}
          >
            <span className="flex items-center gap-1.5">
              <SearchIcon className="size-4" aria-hidden />
              {label}
              <span className="text-sm font-normal tabular-nums opacity-85">
                {t("ytStep").replace("{step}", String(step + 1)).replace("{parts}", parts)}
              </span>
            </span>
            <span className="text-xs font-normal tabular-nums opacity-85">{detail(current, step)}</span>
          </a>
        </Button>
      ) : (
        <div className="flex min-h-12 items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-sm" role="status">
            {t("ytBulkDone").replace("{parts}", parts)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setStep(0)} data-testid="url-search-restart">
            <RotateCcwIcon data-icon="inline-start" />
            {t("ytBulkRestart")}
          </Button>
        </div>
      )}
      {/* 開いた回は濃く塗る。押すとその回から開き直せる */}
      <div className="flex gap-1" role="group" aria-label={label}>
        {batches.map((batch, index) => (
          <button
            key={index}
            type="button"
            className="group flex h-5 flex-1 items-center"
            aria-label={t("ytBulkPart").replace("{step}", String(index + 1)).replace("{range}", detail(batch, index))}
            aria-current={index === step ? "step" : undefined}
            title={detail(batch, index)}
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
