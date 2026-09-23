"use client";

import { BirdIcon, CopyIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilterPanel } from "@/components/filter-panel";
import { KeywordEditor } from "@/components/keyword-editor";
import { MuteAccounts } from "@/components/mute-accounts";
import { MuteKeywords } from "@/components/mute-keywords";
import { ProfileFields } from "@/components/profile-fields";
import { SearchCluster } from "@/components/search-cluster";
import { SlotTabs } from "@/components/slot-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cloneConfig, createDefaultConfig } from "@/lib/defaults";
import { windowAround } from "@/lib/dates";
import { uniqueHandles } from "@/lib/handle";
import { t as translate, type MessageKey } from "@/lib/i18n";
import { buildLivePostsUrl } from "@/lib/live";
import { buildPostsQuery, canSearchPosts } from "@/lib/query";
import { parseSearchParams } from "@/lib/share-url";
import {
  loadActiveSlot,
  loadSlots,
  LOCALE_STORAGE_KEY,
  saveActiveSlot,
  saveLastConfig,
  saveSlots,
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
  if (next.dateFilter === false) {
    merged.dateFilter = false;
    merged.since = "";
    merged.until = "";
  } else if (next.dateFilter === true || next.aroundDate !== undefined || next.dateSpan !== undefined) {
    if (next.dateFilter === true) merged.dateFilter = true;
    if (merged.dateFilter) {
      const window = windowAround(merged.aroundDate, merged.dateSpan);
      merged.since = window.since;
      merged.until = window.until;
    } else {
      merged.since = "";
      merged.until = "";
    }
  }
  return merged;
}

export function SearchApp() {
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<Locale>("ja");
  const [slot, setSlot] = useState<SlotIndex>(0);
  const [slots, setSlots] = useState<SearchConfig[]>(() => [
    createDefaultConfig(),
    createDefaultConfig(),
    createDefaultConfig(),
  ]);
  const [config, setConfig] = useState<SearchConfig>(createDefaultConfig);

  const t = (key: MessageKey) => translate(locale, key);

  useEffect(() => {
    const parsed = parseSearchParams(window.location.search);
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const storedSlots = loadSlots();
    const storedSlot = loadActiveSlot();
    if (parsed.found) {
      storedSlots[0] = cloneConfig(parsed.config);
      saveSlots(storedSlots);
      saveActiveSlot(0);
    }
    const nextSlot = parsed.found ? 0 : storedSlot;
    const nextConfig = cloneConfig(storedSlots[nextSlot] ?? createDefaultConfig());
    const nextLocale =
      parsed.found && parsed.locale === "en"
        ? "en"
        : storedLocale === "en"
          ? "en"
          : "ja";
    const frame = requestAnimationFrame(() => {
      setSlots(storedSlots.map((item) => cloneConfig(item)));
      setSlot(nextSlot);
      setConfig(nextConfig);
      setLocale(nextLocale);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveLastConfig(config);
    saveActiveSlot(slot);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [config, locale, ready, slot]);

  const postsQuery = useMemo(() => buildPostsQuery(config), [config]);
  const liveUrl = useMemo(() => buildLivePostsUrl(config), [config]);
  const postsOk = canSearchPosts(config);

  function persistSlots(nextSlots: SearchConfig[]) {
    setSlots(nextSlots);
    saveSlots(nextSlots);
  }

  function patch(next: Partial<SearchConfig>) {
    setConfig((current) => {
      const merged = applyConfigPatch(current, next);
      setSlots((currentSlots) => {
        const nextSlots = currentSlots.map((item, index) =>
          index === slot ? cloneConfig(merged) : item,
        );
        saveSlots(nextSlots);
        return nextSlots;
      });
      return merged;
    });
  }

  function selectSlot(index: SlotIndex) {
    if (index === slot) return;
    const nextSlots = slots.map((item, i) => (i === slot ? cloneConfig(config) : item));
    persistSlots(nextSlots);
    setSlot(index);
    setConfig(cloneConfig(nextSlots[index] ?? createDefaultConfig()));
    saveActiveSlot(index);
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
      t={t}
      testId={testId}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-3 px-4 py-6 sm:px-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <BirdIcon className="size-7" aria-hidden />
              <p className="text-xs font-semibold tracking-[0.18em] uppercase">{t("brand")}</p>
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("title")}
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
          >
            {t("language")}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
        <SlotTabs value={slot} onChange={selectSlot} t={t} />
        {cluster("search-top")}

        <Card>
          <CardContent className="space-y-6 pt-6">
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
              onClick={() => {
                const blank = createDefaultConfig();
                setConfig(blank);
                persistSlots(slots.map((item, index) => (index === slot ? cloneConfig(blank) : item)));
              }}
            >
              {t("clearForm")}
            </Button>
          </div>
        </details>
        )}

        {cluster("search-bottom")}
      </main>

      <footer className="mx-auto max-w-2xl px-4 pb-10 sm:px-6">
        <p className="text-sm leading-relaxed text-muted-foreground" data-testid="footer-note">
          {t("footerNote")}
        </p>
      </footer>
    </div>
  );
}
