"use client";

import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import type { ResultSort } from "@/lib/types";

type SearchClusterProps = {
  url: string;
  postsOk: boolean;
  sort: ResultSort;
  mediaOnly: boolean;
  onSort: (sort: ResultSort) => void;
  onMedia: (mediaOnly: boolean) => void;
  t: (key: MessageKey) => string;
  testId: string;
};

const SORTS: { id: ResultSort; label: MessageKey }[] = [
  { id: "latest", label: "sortLatest" },
  { id: "oldest", label: "sortOldest" },
  { id: "likes", label: "sortLikes" },
];

export function SearchCluster({
  url,
  postsOk,
  sort,
  mediaOnly,
  onSort,
  onMedia,
  t,
  testId,
}: SearchClusterProps) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4" data-testid={testId}>
      <div className="space-y-2">
        <Button type="button" size="lg" className="h-12 w-full text-base" disabled={!postsOk} asChild={postsOk}>
          {postsOk ? (
            <a href={url} target="_blank" rel="noopener noreferrer" data-testid={`${testId}-open`}>
              <SearchIcon data-icon="inline-start" />
              {t("searchPosts")}
            </a>
          ) : (
            <>
              <SearchIcon data-icon="inline-start" />
              {t("searchPosts")}
            </>
          )}
        </Button>
        {!postsOk ? <p className="text-sm text-muted-foreground">{t("emptyKeywords")}</p> : null}
      </div>

      <div
        className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1"
        role="radiogroup"
        aria-label={t("searchPosts")}
        data-testid={`${testId}-sort`}
      >
        {SORTS.map((option) => {
          const selected = sort === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`${testId}-sort-${option.id}`}
              className={`rounded-lg px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors sm:px-3 sm:text-sm ${
                selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
              onClick={() => onSort(option.id)}
            >
              {t(option.label)}
            </button>
          );
        })}
      </div>

      {/* 画像・動画つきだけは非表示。復元するときは false を外す。 */}
      {false && (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
        <Label htmlFor={`${testId}-media`} className="cursor-pointer">
          {t("media")}
        </Label>
        <Switch
          id={`${testId}-media`}
          checked={mediaOnly}
          onCheckedChange={onMedia}
          aria-label={t("media")}
          data-testid={`${testId}-media`}
        />
      </div>
      )}
    </section>
  );
}
