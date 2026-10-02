"use client";

import { ArrowDownIcon, BookmarkPlusIcon, SearchIcon, Share2Icon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shiftIso } from "@/lib/dates";
import { uniqueHandles } from "@/lib/handle";
import type { MessageKey } from "@/lib/i18n";
import { buildLivePostsUrl } from "@/lib/live";
import { shareSubjectLabel, shareSubjects } from "@/lib/share-post";
import type { Locale, SearchConfig } from "@/lib/types";

type SharedBannerProps = {
  config: SearchConfig;
  locale: Locale;
  // 保存すると置き換わる設定の名前（「設定1「ぬぬはら」」など）。空きがあって置き換えないときは null
  replaces: string | null;
  onImport: () => void;
  onDismiss: () => void;
  t: (key: MessageKey) => string;
};

const HEADING_SUBJECTS = 2;
// 置き換えの注記。保存ボタンの aria-describedby からも指す
const REPLACE_NOTE_ID = "shared-replace-note";

/** シェア投稿から来た人の着地カード。まず結果を見せ、そのあと自分のエゴサへ誘う */
export function SharedBanner({ config, locale, replaces, onImport, onDismiss, t }: SharedBannerProps) {
  const subjects = shareSubjects(config);
  // 見出しに入りきらない（「ほか◯件」になる）ときだけ、名前を全部チップで並べる。入りきるなら見出しと同じものが並ぶだけになる
  const listSubjects = subjects.length > HEADING_SUBJECTS;
  const hasKeywords = config.keywords.some((keyword) => keyword.trim());
  const handles = hasKeywords ? uniqueHandles(config.handles) : [];
  const conditions: string[] = [];
  if (config.sort === "likes") conditions.push(t("sortLikes"));
  if (config.mediaOnly) conditions.push(t("media"));
  if (config.since || config.until) {
    const until = config.until ? shiftIso(config.until, -1) : "";
    conditions.push(`${config.since}〜${until}`);
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-card to-card p-5 shadow-sm"
      data-testid="shared-banner"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-2xl"
      />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-primary">
            <Share2Icon className="size-3.5" aria-hidden />
            {t("sharedEyebrow")}
          </p>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onDismiss} aria-label={t("close")}>
            <XIcon />
          </Button>
        </div>

        <h2 className="font-heading text-2xl leading-snug font-bold tracking-tight break-words">
          {t("sharedHeadingPrefix")}
          {shareSubjectLabel(config, locale, HEADING_SUBJECTS)}
          {t("sharedHeadingSuffix")}
        </h2>

        {listSubjects || handles.length > 0 || conditions.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {(listSubjects ? subjects : []).map((subject) => (
              <li key={subject}>
                <Badge variant="secondary" className="h-6 max-w-56 truncate text-xs">
                  {subject}
                </Badge>
              </li>
            ))}
            {handles.map((handle) => (
              <li key={`from-${handle}`}>
                <Badge variant="outline" className="h-6 text-xs">
                  @{handle}
                  {t("sharedFrom")}
                </Badge>
              </li>
            ))}
            {conditions.map((condition) => (
              <li key={condition}>
                <Badge variant="outline" className="h-6 text-xs text-muted-foreground">
                  {condition}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <Button size="lg" className="h-12 w-full text-base shadow-sm" asChild>
          <a
            href={buildLivePostsUrl(config, locale)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="shared-open"
          >
            <SearchIcon data-icon="inline-start" />
            {t("sharedOpen")}
          </a>
        </Button>

        {/* 設定1〜3 が埋まっているときは、どの設定が消えるかを押す前に伝える。
            区切りのない長い名前でもはみ出さないよう見出しと同じく折り返し、最後の行に 1 語だけ残さない。
            日本語は text-pretty が効かないので、文節で折り返して「戻せ／ます。」と語の途中で切らない（auto-phrase は Chromium だけ） */}
        {replaces ? (
          <p
            id={REPLACE_NOTE_ID}
            className="text-xs leading-relaxed text-pretty break-words [word-break:auto-phrase] text-muted-foreground"
            data-testid="shared-replace-note"
          >
            {t("sharedReplaceNote").replace("{slot}", () => replaces)}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {/* 読み上げでもボタンに注記をつなぎ、どの設定が置き換わるかを伝える */}
          <Button
            type="button"
            variant="outline"
            onClick={onImport}
            aria-describedby={replaces ? REPLACE_NOTE_ID : undefined}
            data-testid="shared-import"
          >
            <BookmarkPlusIcon data-icon="inline-start" />
            {t(replaces ? "sharedImportReplace" : "sharedImport")}
          </Button>
          <Button type="button" variant="ghost" onClick={onDismiss} data-testid="shared-start">
            <ArrowDownIcon data-icon="inline-start" />
            {t("sharedStart")}
          </Button>
        </div>
      </div>
    </section>
  );
}
