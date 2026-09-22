"use client";

import { BirdIcon, CopyIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilterPanel } from "@/components/filter-panel";
import { KeywordEditor } from "@/components/keyword-editor";
import { LiveResults } from "@/components/live-results";
import { MuteAccounts } from "@/components/mute-accounts";
import { PresetBar } from "@/components/preset-bar";
import { ProfileFields } from "@/components/profile-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  cloneConfig,
  createDefaultConfig,
  createOwnerSampleConfig,
} from "@/lib/defaults";
import { t as translate, type MessageKey } from "@/lib/i18n";
import { loadPresets, savePresets } from "@/lib/presets";
import { buildLivePostsUrl } from "@/lib/live";
import {
  buildPeopleQuery,
  buildPostsQuery,
  buildSearchUrl,
  canSearchPeople,
  canSearchPosts,
} from "@/lib/query";
import { parseSearchParams, serializeSearchParams } from "@/lib/share-url";
import { loadLastConfig, LOCALE_STORAGE_KEY, saveLastConfig } from "@/lib/storage";
import type { Locale, SavedPreset, SearchConfig } from "@/lib/types";

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

export function SearchApp() {
  const [ready, setReady] = useState(false);
  const [locale, setLocale] = useState<Locale>("ja");
  const [config, setConfig] = useState<SearchConfig>(createDefaultConfig);
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [autoOpenLive, setAutoOpenLive] = useState(false);

  const t = (key: MessageKey) => translate(locale, key);

  useEffect(() => {
    const parsed = parseSearchParams(window.location.search);
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const storedConfig = loadLastConfig();
    const nextConfig = parsed.found
      ? parsed.config
      : (storedConfig ?? createDefaultConfig());
    const nextLocale =
      parsed.found && parsed.locale === "en"
        ? "en"
        : storedLocale === "en"
          ? "en"
          : "ja";
    const frame = requestAnimationFrame(() => {
      setConfig(nextConfig);
      setLocale(nextLocale);
      setPresets(loadPresets());
      setAutoOpenLive(canSearchPosts(nextConfig));
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveLastConfig(config);
    const params = serializeSearchParams(config, locale);
    const hasShare =
      params.has("h") ||
      params.has("k") ||
      params.has("mute") ||
      params.has("since") ||
      params.has("until");
    const next =
      hasShare || locale !== "ja"
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    window.history.replaceState(null, "", next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [config, locale, ready]);

  const postsQuery = useMemo(() => buildPostsQuery(config), [config]);
  const peopleQuery = useMemo(() => buildPeopleQuery(config), [config]);
  const liveUrl = useMemo(() => buildLivePostsUrl(config), [config]);
  const peopleUrl = useMemo(
    () => buildSearchUrl(peopleQuery, "people", config.latest),
    [peopleQuery, config.latest],
  );
  const postsOk = canSearchPosts(config);
  const peopleOk = canSearchPeople(config);
  const showLive = postsOk;

  function patch(next: Partial<SearchConfig>) {
    setConfig((current) => ({ ...current, ...next }));
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

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-3 px-4 py-6 sm:px-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <BirdIcon className="size-7" aria-hidden />
              <p className="text-xs font-semibold tracking-[0.18em] uppercase">Twitter</p>
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
        {showLive ? (
          <LiveResults
            url={liveUrl}
            peopleUrl={peopleUrl}
            peopleOk={peopleOk}
            autoOpen={autoOpenLive}
            t={t}
          />
        ) : null}

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
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
              <Label htmlFor="media-only" className="cursor-pointer">
                {t("media")}
              </Label>
              <Switch
                id="media-only"
                checked={config.mediaOnly}
                onCheckedChange={(checked) => patch({ mediaOnly: checked })}
                aria-label={t("media")}
                data-testid="media-only"
              />
            </div>
            {showLive ? (
              <MuteAccounts
                handles={config.mutedHandles}
                onChange={(mutedHandles) => patch({ mutedHandles })}
                t={t}
              />
            ) : null}
            {!showLive ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full text-base"
                  disabled={!postsOk}
                  asChild={postsOk}
                >
                  {postsOk ? (
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer" data-testid="first-live-open">
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
                {!postsOk ? (
                  <p className="text-sm text-muted-foreground">{t("emptyKeywords")}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <details className="rounded-xl border border-border bg-card" data-testid="advanced">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            {t("advanced")}
            <span aria-hidden className="text-muted-foreground">
              ▾
            </span>
          </summary>
          <div className="space-y-6 border-t border-border px-4 py-4">
            {!showLive ? (
              <MuteAccounts
                handles={config.mutedHandles}
                onChange={(mutedHandles) => patch({ mutedHandles })}
                t={t}
              />
            ) : null}
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
            <PresetBar
              config={config}
              presets={presets}
              onApply={(next) => setConfig(cloneConfig(next))}
              onSave={(name) => {
                const next = [
                  {
                    id: crypto.randomUUID(),
                    name,
                    config: cloneConfig(config),
                  },
                  ...presets,
                ];
                setPresets(next);
                savePresets(next);
              }}
              onDelete={(id) => {
                const next = presets.filter((preset) => preset.id !== id);
                setPresets(next);
                savePresets(next);
              }}
              t={t}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setConfig(createOwnerSampleConfig())}
            >
              {t("loadSample")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setConfig(createDefaultConfig())}
            >
              {t("clearForm")}
            </Button>
          </div>
        </details>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 backdrop-blur md:hidden">
        <Button type="button" className="h-11 w-full" disabled={!postsOk} asChild={postsOk}>
          {postsOk ? (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer">
              <SearchIcon data-icon="inline-start" />
              {t("searchPosts")}
            </a>
          ) : (
            t("searchPosts")
          )}
        </Button>
      </div>
    </div>
  );
}
