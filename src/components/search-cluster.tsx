"use client";

import { SearchIcon, Share2Icon } from "lucide-react";
import type { ReactNode } from "react";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { readMinFaves } from "@/lib/defaults";
import type { MessageKey } from "@/lib/i18n";
import { MIN_FAVES_OPTIONS, type MinFaves, type ResultSort } from "@/lib/types";

// 画面上部の「検索」ボタンと並び順。設定1〜3 と YouTube タブで共通
type SearchClusterProps = {
  url: string;
  postsOk: boolean;
  sort: ResultSort;
  minFaves?: MinFaves;
  mediaOnly?: boolean;
  onSort: (sort: ResultSort) => void;
  onMinFaves?: (minFaves: MinFaves) => void;
  onMedia?: (mediaOnly: boolean) => void;
  // シェアできない画面では渡さない
  onShare?: () => void;
  // 検索ボタンで X を開いたとき（開いた時刻を覚えるのに使う）
  onOpen?: () => void;
  t: (key: MessageKey) => string;
  testId: string;
  // ボタンの文言と、押せないときの説明。省略すると設定1〜3 の文言
  label?: string;
  emptyHint?: string;
  // ボタンの下に出す補足（何を探すか）
  children?: ReactNode;
  // 検索ボタンの代わりに置くもの（YouTube タブの、何回かに分けて開くボタン）
  action?: ReactNode;
};

const SORTS: { id: ResultSort; label: MessageKey }[] = [
  { id: "latest", label: "sortLatest" },
  // 古い順は X の検索 URL で指定できないので非表示
  // { id: "oldest", label: "sortOldest" },
  { id: "likes", label: "sortLikes" },
];

export function SearchCluster({
  url,
  postsOk,
  sort,
  minFaves = 0,
  mediaOnly = false,
  onSort,
  onMinFaves,
  onMedia,
  onShare,
  onOpen,
  t,
  testId,
  label,
  emptyHint,
  children,
  action,
}: SearchClusterProps) {
  const buttonLabel = label ?? t("searchPosts");
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4" data-testid={testId}>
      <div className="space-y-2">
        {postsOk && action ? action : (
        <Button
          size="lg"
          className="h-12 w-full text-base aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-primary aria-disabled:active:translate-y-0"
          asChild
        >
          {/* 押せないあいだも同じ <a> のままにする。入力欄に打っただけの言葉は欄を離れたときに追加されるので、
              <button disabled> と入れ替えなければ、その 1 回目のクリックでそのまま検索が開く */}
          <a
            href={postsOk ? url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            role={postsOk ? undefined : "link"}
            aria-disabled={postsOk ? undefined : true}
            data-testid={`${testId}-open`}
            onClick={postsOk ? onOpen : undefined}
            // 中クリックで別タブに開いたときも「検索を開いた」に数える
            onAuxClick={postsOk ? (event) => event.button === 1 && onOpen?.() : undefined}
          >
            <SearchIcon data-icon="inline-start" />
            {buttonLabel}
          </a>
        </Button>
        )}
        {!postsOk ? <p className="text-sm text-muted-foreground">{emptyHint ?? t("emptyKeywords")}</p> : null}
        {postsOk ? children : null}
      </div>

      <Segmented
        options={SORTS.map((option) => ({ id: option.id, label: t(option.label) }))}
        value={sort}
        label={buttonLabel}
        onChange={onSort}
        testId={`${testId}-sort`}
      />
      {postsOk && onShare ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full text-primary hover:bg-primary/10 hover:text-primary"
          onClick={onShare}
          data-testid={`${testId}-share`}
        >
          <Share2Icon data-icon="inline-start" />
          {t("share")}
        </Button>
      ) : null}
      {/* いいね数で絞り込む非表示中は、下限と組み合わせる注記も出さない */}
      {false && sort === "likes" ? (
        <p className="text-xs text-muted-foreground">{t("sortLikesHint")}</p>
      ) : null}

      {/* いいね数で絞り込むは非表示。復元するときは false を外す。min_faves: も付けない。 */}
      {false && (
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("minFaves")}</p>
        <Segmented
          options={MIN_FAVES_OPTIONS.map((option) => ({
            id: String(option),
            label: option === 0 ? t("minFavesAny") : `${option.toLocaleString()}+`,
          }))}
          value={String(minFaves)}
          label={t("minFaves")}
          onChange={(value) => onMinFaves?.(readMinFaves(value))}
          testId={`${testId}-faves`}
        />
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
          onCheckedChange={(checked) => onMedia?.(checked)}
          aria-label={t("media")}
          data-testid={`${testId}-media`}
        />
      </div>
      )}
    </section>
  );
}
