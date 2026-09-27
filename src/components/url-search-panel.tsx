"use client";

import { LinkIcon, SearchIcon, TypeIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ChipInput } from "@/components/chip-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YoutubeChannelVideos } from "@/components/youtube-channel-videos";
import { todayIso } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import { buildSearchUrl } from "@/lib/query";
import type { ResultSort } from "@/lib/types";
import {
  buildUrlQueries,
  loadUrlSearch,
  parseTargetUrl,
  saveUrlSearch,
  type UrlSearchState,
  type UrlTargetKind,
} from "@/lib/url-search";
import { type ChannelData, loadChannelCache, sameRef } from "@/lib/youtube";

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

function segmentClass(selected: boolean): string {
  return `rounded-lg px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors sm:px-3 sm:text-sm ${
    selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
  }`;
}

export function UrlSearchPanel({ t }: UrlSearchPanelProps) {
  // 親が ready になってから描画されるので、初期化時に localStorage を読んでよい
  const [state, setState] = useState<UrlSearchState>(loadUrlSearch);
  const [channelData, setChannelData] = useState<ChannelData | null>(loadChannelCache);

  useEffect(() => {
    saveUrlSearch(state);
  }, [state]);

  const patch = (next: Partial<UrlSearchState>) => setState((prev) => ({ ...prev, ...next }));
  const target = parseTargetUrl(state.url);
  const urlInvalid = state.url.trim().length > 0 && !target;
  const channel =
    target?.kind === "channel" && channelData && sameRef(channelData.ref, target.token) ? channelData : null;
  // 読み込み済みなら、ハンドルとチャンネル ID のどちらで貼られたリンクも探す
  const queries = buildUrlQueries(state, channel ? [channel.channel.id, channel.channel.handle] : []);
  const hrefOf = (query: string) => buildSearchUrl(query, "posts", state.sort);

  return (
    <>
      <section className="space-y-3 rounded-xl border border-border bg-card p-4" data-testid="url-search">
        <div className="space-y-2">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            disabled={!queries.all}
            asChild={Boolean(queries.all)}
          >
            {queries.all ? (
              <a href={hrefOf(queries.all)} target="_blank" rel="noopener noreferrer" data-testid="url-search-open">
                <SearchIcon data-icon="inline-start" />
                {t("urlSearchAll")}
              </a>
            ) : (
              <>
                <SearchIcon data-icon="inline-start" />
                {t("urlSearchAll")}
              </>
            )}
          </Button>
          {queries.all ? (
            <p className="break-all font-mono text-xs text-muted-foreground" data-testid="url-search-query">
              {queries.all}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("urlEmpty")}</p>
          )}
        </div>

        <div
          className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1"
          role="radiogroup"
          aria-label={t("urlSearchAll")}
          data-testid="url-search-sort"
        >
          {SORTS.map((option) => {
            const selected = state.sort === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`url-search-sort-${option.id}`}
                className={segmentClass(selected)}
                onClick={() => patch({ sort: option.id })}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>

        {/* リンクと言葉の両方があるときだけ、片方ずつの検索も出す */}
        {queries.link && queries.words ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <a href={hrefOf(queries.link)} target="_blank" rel="noopener noreferrer" data-testid="url-search-link">
                <LinkIcon data-icon="inline-start" />
                {t("urlSearchLink")}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={hrefOf(queries.words)} target="_blank" rel="noopener noreferrer" data-testid="url-search-words">
                <TypeIcon data-icon="inline-start" />
                {t("urlSearchWords")}
              </a>
            </Button>
          </div>
        ) : null}
      </section>
      <p className="px-1 text-center text-xs text-muted-foreground">{t("urlNote")}</p>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="url-search-input">{t("urlInput")}</Label>
              {target ? (
                <Badge variant="secondary" data-testid="url-search-kind">
                  {t(KIND_LABELS[target.kind])}
                </Badge>
              ) : null}
            </div>
            <Input
              id="url-search-input"
              type="url"
              inputMode="url"
              value={state.url}
              placeholder={t("urlPlaceholder")}
              className="h-10 text-base md:text-sm"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={urlInvalid || undefined}
              data-testid="url-search-input"
              onChange={(event) => patch({ url: event.target.value })}
            />
            {urlInvalid ? (
              <p className="text-sm text-destructive" data-testid="url-search-invalid">
                {t("urlInvalid")}
              </p>
            ) : null}
          </div>

          {target?.kind === "channel" ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
              <YoutubeChannelVideos
                t={t}
                channelRef={target.token}
                data={channel}
                onLoaded={setChannelData}
                state={state}
                patch={patch}
              />
            </div>
          ) : null}

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
            <p className="text-xs text-muted-foreground">{t("urlWordsHint")}</p>
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
            <Label htmlFor="url-search-since">{t("urlSince")}</Label>
            <Input
              id="url-search-since"
              type="date"
              value={state.since}
              max={todayIso()}
              className="h-10"
              data-testid="url-search-since"
              onChange={(event) => patch({ since: event.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
