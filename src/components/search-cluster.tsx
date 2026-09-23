"use client";

import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import { MIN_FAVES_OPTIONS, type MinFaves, type ResultSort } from "@/lib/types";

type SearchClusterProps = {
  url: string;
  postsOk: boolean;
  sort: ResultSort;
  minFaves: MinFaves;
  mediaOnly: boolean;
  onSort: (sort: ResultSort) => void;
  onMinFaves: (minFaves: MinFaves) => void;
  onMedia: (mediaOnly: boolean) => void;
  t: (key: MessageKey) => string;
  testId: string;
};

const SORTS: { id: ResultSort; label: MessageKey }[] = [
  { id: "latest", label: "sortLatest" },
  // 古い順は X の検索 URL で指定できないので非表示
  // { id: "oldest", label: "sortOldest" },
  { id: "likes", label: "sortLikes" },
];

function segmentClass(selected: boolean): string {
  return `rounded-lg px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors sm:px-3 sm:text-sm ${
    selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
  }`;
}

export function SearchCluster({
  url,
  postsOk,
  sort,
  minFaves,
  mediaOnly,
  onSort,
  onMinFaves,
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
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1"
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
              className={segmentClass(selected)}
              onClick={() => onSort(option.id)}
            >
              {t(option.label)}
            </button>
          );
        })}
      </div>
      {/* いいね数で絞り込む非表示中は、下限と組み合わせる注記も出さない */}
      {false && sort === "likes" ? (
        <p className="text-xs text-muted-foreground">{t("sortLikesHint")}</p>
      ) : null}

      {/* いいね数で絞り込むは非表示。復元するときは false を外す。min_faves: も付けない。 */}
      {false && (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("minFaves")}</p>
        <div
          className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-background p-1"
          role="radiogroup"
          aria-label={t("minFaves")}
          data-testid={`${testId}-faves`}
        >
          {MIN_FAVES_OPTIONS.map((option) => {
            const selected = minFaves === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`${testId}-faves-${option}`}
                className={segmentClass(selected)}
                onClick={() => onMinFaves(option)}
              >
                {option === 0 ? t("minFavesAny") : `${option.toLocaleString()}+`}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* メディア絞り込みは区間フィルタ直下へ移した。ここには出さない。 */}
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
