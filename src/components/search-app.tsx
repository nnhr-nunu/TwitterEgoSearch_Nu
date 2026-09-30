"use client";

import { BirdIcon, CopyIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AdRailLayout, AdSlot } from "@/components/ad-slot";
import { DeveloperInfo } from "@/components/developer-info";
import { FilterPanel } from "@/components/filter-panel";
import { KeywordEditor } from "@/components/keyword-editor";
import { MuteAccounts } from "@/components/mute-accounts";
import { MuteKeywords } from "@/components/mute-keywords";
import { ProfileFields } from "@/components/profile-fields";
import { SearchCluster } from "@/components/search-cluster";
import { ShareDialog } from "@/components/share-dialog";
import { SharedBanner } from "@/components/shared-banner";
import { SlotTabs, type TabValue } from "@/components/slot-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UrlSearchPanel } from "@/components/url-search-panel";
import { cloneConfig, createDefaultConfig, isBlankConfig } from "@/lib/defaults";
import { resolveQueryWindow } from "@/lib/dates";
import { uniqueHandles } from "@/lib/handle";
import { t as translate, type MessageKey } from "@/lib/i18n";
import { buildLivePostsUrl } from "@/lib/live";
import { buildPostsQuery, canSearchPosts, isQueryTooLong } from "@/lib/query";
import { parseSearchParams } from "@/lib/share-url";
import {
  loadActiveSlot,
  loadLocale,
  loadSlots,
  loadUrlView,
  saveActiveSlot,
  saveLastConfig,
  saveLocale,
  saveSlots,
  saveUrlView,
} from "@/lib/storage";
import type { Locale, ResultSort, SearchConfig, SlotIndex } from "@/lib/types";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function applyConfigPatch(current: SearchConfig, next: Partial<SearchConfig>): SearchConfig {
  const merged: SearchConfig = { ...current, ...next };
  if (next.handles) {
    merged.handles = uniqueHandles(next.handles);
    merged.handle = merged.handles[0] ?? "";
  } else if (next.handle !== undefined) {
    merged.handles = uniqueHandles([next.handle, ...merged.handles]);
    merged.handle = merged.handles[0] ?? "";
  }
  if (next.sort) {
    merged.latest = next.sort === "latest";
  } else if (next.latest !== undefined) {
    merged.sort = next.latest ? "latest" : "likes";
  }
  merged.wrapQuotes = true;
  const window = resolveQueryWindow(merged);
  merged.since = window.since;
  merged.until = window.until;
  return merged;
}

export function SearchApp() {
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<Locale>("ja");
  const [slot, setSlot] = useState<SlotIndex>(0);
  const [urlView, setUrlView] = useState(false);
  const [slots, setSlots] = useState<SearchConfig[]>(() => [
    createDefaultConfig(),
    createDefaultConfig(),
    createDefaultConfig(),
  ]);
  // 開いている設定。設定1〜3 の中身は slots だけに持ち、ここでは読むだけ
  const config = slots[slot];
  // シェア投稿から開かれたときの条件。保存済みの設定とは別に持つ
  const [shared, setShared] = useState<SearchConfig | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareKey, setShareKey] = useState(0);

  const t = (key: MessageKey) => translate(locale, key);

  useEffect(() => {
    const parsed = parseSearchParams(window.location.search);
    const storedSlots = loadSlots();
    const storedSlot = loadActiveSlot();
    // 旧形式の共有 URL は設定1へ取り込む。シェア投稿（share=1）は閲覧だけにとどめる
    const legacy = parsed.found && !parsed.shared;
    if (legacy) {
      storedSlots[0] = cloneConfig(parsed.config);
      // 取り込んだら URL から条件を消す。残すと、設定1を直しても再読み込みのたびに URL の内容へ戻る
      window.history.replaceState(null, "", window.location.pathname);
    }
    const nextSlot = legacy ? 0 : storedSlot;
    const nextLocale: Locale = parsed.found && parsed.locale === "en" ? "en" : loadLocale();
    const frame = requestAnimationFrame(() => {
      setSlots(storedSlots);
      setSlot(nextSlot);
      // 旧形式の共有 URL を取り込んだときは設定1を見せる
      setUrlView(legacy ? false : loadUrlView());
      setLocale(nextLocale);
      // 途中で切れたリンク（share=1 だけが残ったもの）では、探す言葉のない着地カードを出さない
      if (parsed.shared && canSearchPosts(parsed.config)) setShared(cloneConfig(parsed.config));
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // 変わったものをまとめて保存する（読み込みが終わるまでは既定値なので保存しない）
  useEffect(() => {
    if (!ready) return;
    saveSlots(slots);
    saveLastConfig(slots[slot]);
    saveActiveSlot(slot);
    saveUrlView(urlView);
    saveLocale(locale);
    document.documentElement.lang = locale;
  }, [locale, ready, slot, slots, urlView]);

  const postsQuery = useMemo(() => buildPostsQuery(config), [config]);
  const liveUrl = useMemo(() => buildLivePostsUrl(config), [config]);
  const postsOk = canSearchPosts(config);

  function patch(next: Partial<SearchConfig>) {
    setSlots((current) => current.map((item, index) => (index === slot ? applyConfigPatch(item, next) : item)));
  }

  function selectTab(value: TabValue) {
    setUrlView(value === "url");
    if (value !== "url") setSlot(value);
  }

  function clearSharedUrl() {
    setShared(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  // 空いている設定に入れる。空きが無ければいま開いている設定を置き換える
  function importShared() {
    if (!shared) return;
    const blank = slots.findIndex((item) => isBlankConfig(item));
    const target = (blank >= 0 ? blank : slot) as SlotIndex;
    const replaced = blank >= 0 ? null : slots[target];
    setSlots(slots.map((item, i) => (i === target ? cloneConfig(shared) : item)));
    setSlot(target);
    setUrlView(false);
    clearSharedUrl();
    const slotLabel = t(`slot${target + 1}` as MessageKey);
    if (!replaced) {
      toast.success(t("sharedImported").replace("{slot}", slotLabel));
      return;
    }
    // 置き換えた設定は、消えたことに気づいてすぐなら戻せるようにする
    toast.success(t("sharedReplaced").replace("{slot}", slotLabel), {
      duration: 12000,
      action: {
        label: t("undo"),
        onClick: () => setSlots((current) => current.map((item, i) => (i === target ? replaced : item))),
      },
    });
  }

  function startOwnSearch() {
    clearSharedUrl();
    requestAnimationFrame(() => document.getElementById("keyword-input")?.focus());
  }

  function openShare() {
    setShareKey((key) => key + 1);
    setShareOpen(true);
  }

  async function copy(value: string) {
    const ok = await copyText(value);
    toast[ok ? "success" : "error"](ok ? t("copied") : t("copyFailed"));
    return ok;
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6">
        <p className="text-muted-foreground">{t("loading")}</p>
      </main>
    );
  }

  const cluster = (testId: string) => (
    <SearchCluster
      url={liveUrl}
      postsOk={postsOk}
      sort={config.sort}
      minFaves={config.minFaves}
      mediaOnly={config.mediaOnly}
      onSort={(sort: ResultSort) => patch({ sort })}
      onMinFaves={(minFaves) => patch({ minFaves })}
      onMedia={(mediaOnly) => patch({ mediaOnly })}
      onShare={openShare}
      t={t}
      testId={testId}
    >
      {isQueryTooLong(postsQuery) ? (
        <p className="text-sm text-destructive" role="alert" data-testid={`${testId}-too-long`}>
          {t("queryTooLong").replace("{count}", String(postsQuery.length))}
        </p>
      ) : null}
    </SearchCluster>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        {/* ボタンはロゴの行に置き、タイトルに横幅をまるごと使わせる（スマホで「ツー／ル」と折り返さないように） */}
        <div className="mx-auto max-w-2xl space-y-2 px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary">
              <BirdIcon className="size-7" aria-hidden />
              <p className="text-xs font-semibold tracking-[0.18em] uppercase">{t("brand")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/guide/" data-testid="guide-link">
                  {t("guide")}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
              >
                {t("language")}
              </Button>
            </div>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
        </div>
      </header>

      <AdRailLayout label={t("sponsored")}>
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
        {shared ? (
          <SharedBanner config={shared} locale={locale} onImport={importShared} onDismiss={startOwnSearch} t={t} />
        ) : null}
        <SlotTabs value={urlView ? "url" : slot} onChange={selectTab} t={t} />
        {urlView ? <UrlSearchPanel t={t} /> : null}
        {urlView ? null : (
        <>
        {cluster("search-top")}
        <p className="px-1 text-center text-xs text-muted-foreground" data-testid="auto-save-note">
          {t("autoSaveNote")}
        </p>

        <Card>
          <CardContent className="space-y-6">
            <KeywordEditor
              keywords={config.keywords}
              honorifics={config.honorifics}
              onChange={(keywords) => patch({ keywords })}
              onHonorificsChange={(honorifics) => patch({ honorifics })}
              t={t}
            />
            <ProfileFields config={config} onChange={patch} t={t} />
            <MuteAccounts
              handles={config.mutedHandles}
              onChange={(mutedHandles) => patch({ mutedHandles })}
              t={t}
            />
            <MuteKeywords
              keywords={config.mutedKeywords}
              onChange={(mutedKeywords) => patch({ mutedKeywords })}
              t={t}
            />
          </CardContent>
        </Card>
        </>
        )}

        {/* 詳細設定は非表示。クエリコピーと入力を消すは当面出さない。 */}
        {false && (
        <details className="rounded-xl border border-border bg-card" data-testid="advanced" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            {t("advanced")}
            <span aria-hidden className="text-muted-foreground">
              ▾
            </span>
          </summary>
          <div className="space-y-6 border-t border-border px-4 py-4">
            <FilterPanel config={config} onChange={patch} t={t} />
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("generated")}</p>
              <pre
                className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                data-testid="raw-query"
              >
                {postsOk ? postsQuery : t("emptyKeywords")}
              </pre>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!postsOk}
                onClick={() => void copy(postsQuery)}
              >
                <CopyIcon data-icon="inline-start" />
                {t("copyQuery")}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setSlots(slots.map((item, index) => (index === slot ? createDefaultConfig() : item)))}
            >
              {t("clearForm")}
            </Button>
          </div>
        </details>
        )}

        {/* 下部の「投稿を検索」は上部と重複するため非表示。復元するときは false を外す。 */}
        {false && cluster("search-bottom")}

        {/* 誤クリックを避けるため、検索ボタンから離れた入力カードの下にだけ置く。 */}
        <AdSlot label={t("sponsored")} />
      </main>
      </AdRailLayout>

      <ShareDialog
        key={shareKey}
        open={shareOpen}
        onOpenChange={setShareOpen}
        config={config}
        locale={locale}
        onCopy={copy}
        t={t}
      />

      <DeveloperInfo title={t("developer")} privacyLabel={t("privacy")} guideLabel={t("guide")} />
    </div>
  );
}
