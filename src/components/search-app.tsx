"use client";

import { BanIcon, BirdIcon, CopyIcon, FunnelIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AdRailLayout, AdSlot } from "@/components/ad-slot";
import { DeveloperInfo } from "@/components/developer-info";
import { FilterPanel } from "@/components/filter-panel";
import { FLOATING_SEARCH_SPACE, FloatingSearch } from "@/components/floating-search";
import { FormSection } from "@/components/form-section";
import { KeywordEditor } from "@/components/keyword-editor";
import { MuteAccounts } from "@/components/mute-accounts";
import { MuteKeywords } from "@/components/mute-keywords";
import { ToggleRow } from "@/components/toggle-row";
import { NewOnlyToggle } from "@/components/new-only-toggle";
import { ProfileFields } from "@/components/profile-fields";
import { SearchCluster } from "@/components/search-cluster";
import { ShareDialog } from "@/components/share-dialog";
import { SharedBanner } from "@/components/shared-banner";
import { SlotTabs, type TabValue } from "@/components/slot-tabs";
import { TransferBanner } from "@/components/transfer-banner";
import { AutoSaveNote, TransferDialog } from "@/components/transfer-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlSearchPanel } from "@/components/url-search-panel";
import { cloneConfig, createDefaultConfig, isBlankConfig } from "@/lib/defaults";
import { resolveQueryWindow } from "@/lib/dates";
import { type SearchDrafts, searchWithDrafts } from "@/lib/drafts";
import { uniqueHandles } from "@/lib/handle";
import { t as translate, type MessageKey } from "@/lib/i18n";
import {
  baselineOf,
  emptySearchStates,
  loadSearchStates,
  recordSearch,
  saveSearchStates,
  sinceTimeOf,
  type SlotSearchState,
} from "@/lib/last-search";
import { buildPostsQuery, buildSearchUrl, canSearchPosts, isQueryTooLong } from "@/lib/query";
import { parseSearchParams } from "@/lib/share-url";
import { sharedImportTarget } from "@/lib/shared-import";
import { slotLabelOf, slotTitleOf } from "@/lib/slot-label";
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
import { parseTransferHash, type TransferData } from "@/lib/transfer";
import type { Locale, ResultSort, SearchConfig, SlotIndex } from "@/lib/types";
import { loadUrlSearch, saveUrlSearch } from "@/lib/url-search";

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
  // 設定ごとの「検索を開いた時刻」と「前回より後の投稿だけ」のスイッチ。設定の中身とは別に持つ（シェアや引き継ぎに混ぜない）
  const [searchStates, setSearchStates] = useState<SlotSearchState[]>(emptySearchStates);
  // 「前回」がどれかは時刻で決まるので、いまの時刻も state に持つ（1 分ごとと、タブに戻ったときに進める）
  const [now, setNow] = useState(0);
  // 引き継ぎ用リンクで開かれたときの中身。取り込むかどうかを選ぶまでは保存済みの設定に触らない
  const [transfer, setTransfer] = useState<TransferData | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  // YouTube タブは自分で保存値を読むので、取り込んだら作り直して読み直させる
  const [urlPanelKey, setUrlPanelKey] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareKey, setShareKey] = useState(0);
  // 名前とアカウントの欄に打っただけで、まだ追加していない文字。検索ボタンは押すと欄を離れて追加されるので、
  // 打った時点で押せる見た目にし、その言葉を含む式にしておく。保存・シェアには使わない
  const [drafts, setDrafts] = useState<SearchDrafts>({});

  const t = (key: MessageKey) => translate(locale, key);
  // 読み込みが終わったら名前の欄にカーソルを置くか（開いた設定が空で、マウスで使う画面のとき）
  const focusNameOnReady = useRef(false);

  useEffect(() => {
    const parsed = parseSearchParams(window.location.search);
    const incoming = parseTransferHash(window.location.hash);
    const storedSlots = loadSlots();
    const storedSlot = loadActiveSlot();
    // 旧形式の共有 URL は設定1へ取り込む。シェア投稿（share=1）は閲覧だけにとどめる
    const legacy = parsed.found && !parsed.shared;
    if (legacy) {
      storedSlots[0] = cloneConfig(parsed.config);
    }
    const nextSlot = legacy ? 0 : storedSlot;
    const nextLocale: Locale = parsed.found && parsed.locale === "en" ? "en" : loadLocale();
    const frame = requestAnimationFrame(() => {
      setSlots(storedSlots);
      setSlot(nextSlot);
      // 取り込んだら URL から条件を消す。残すと、設定1を直しても再読み込みのたびに URL の内容へ戻る。
      // 画面に反映するここで消す（effect の先頭で消すと、開発時に effect が 2 回走ったとき 2 回目は条件を読めない）
      if (legacy) window.history.replaceState(null, "", window.location.pathname);
      setSearchStates(loadSearchStates());
      setNow(Date.now());
      if (incoming) {
        setTransfer(incoming);
        // 引き継ぎ用リンクの中身（除外設定など）は、読んだらすぐアドレスバーから消す
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      // 旧形式の共有 URL を取り込んだときは設定1を見せる
      setUrlView(legacy ? false : loadUrlView());
      setLocale(nextLocale);
      // 途中で切れたリンク（share=1 だけが残ったもの）では、探す言葉のない着地カードを出さない
      const sharedLanding = parsed.shared && canSearchPosts(parsed.config);
      if (sharedLanding) setShared(cloneConfig(parsed.config));
      // スマホでは開いた途端にキーボードが出て画面が隠れるので、マウスで使う画面だけにする
      focusNameOnReady.current =
        !legacy &&
        !sharedLanding &&
        !incoming &&
        !loadUrlView() &&
        isBlankConfig(storedSlots[nextSlot]) &&
        window.matchMedia("(pointer: fine)").matches;
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready || !focusNameOnReady.current) return;
    focusNameOnReady.current = false;
    document.getElementById("keyword-input")?.focus({ preventScroll: true });
  }, [ready]);

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

  useEffect(() => {
    if (ready) saveSearchStates(searchStates);
  }, [ready, searchStates]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const searchState = searchStates[slot];
  const baseline = baselineOf(searchState.mark, now);
  const sinceTime = sinceTimeOf(searchState, now);
  // 検索ボタンに渡す式と押せるかどうかだけ、打ちかけの文字を足した設定から作る
  const search = useMemo(() => searchWithDrafts(config, drafts, sinceTime), [config, drafts, sinceTime]);
  const postsQuery = useMemo(
    () => buildPostsQuery(search.config, { sinceTime: search.sinceTime, locale }),
    [search.config, search.sinceTime, locale],
  );
  const liveUrl = buildSearchUrl(postsQuery, "posts", config.sort);
  const postsOk = canSearchPosts(search.config);
  // 確定した設定だけで探せるか。シェアは確定した設定を渡すので、打っただけのあいだは出さない
  const savedOk = canSearchPosts(config);
  // 打った言葉で名前やアカウントが増えているか（押すと「前回より後だけ」が切れる）
  const draftAdds = search.config !== config;

  const slotName = (index: number) => t(`slot${index + 1}` as MessageKey);

  function changeDraft(field: keyof SearchDrafts, value: string) {
    setDrafts((current) => ((current[field] ?? "") === value ? current : { ...current, [field]: value }));
  }

  function patchSearchState(index: number, next: Partial<SlotSearchState>) {
    setSearchStates((current) => current.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function patch(next: Partial<SearchConfig>) {
    setSlots((current) => current.map((item, index) => (index === slot ? applyConfigPatch(item, next) : item)));
    // 探す名前やアカウントを変えたら、その言葉の前回より前の投稿もまだ見ていないので、「前回より後だけ」は切る
    if (next.keywords || next.handles) patchSearchState(slot, { newOnly: false });
  }

  // 検索を開いた時刻を覚える。次に来たとき、ここから後の投稿だけを探せる
  function recordOpen() {
    const time = Date.now();
    setSearchStates((current) =>
      current.map((item, i) => (i === slot ? { ...item, mark: recordSearch(item.mark, time) } : item)),
    );
    setNow(time);
  }

  function selectTab(value: TabValue) {
    setUrlView(value === "url");
    if (value !== "url") setSlot(value);
  }

  function clearSharedUrl() {
    setShared(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  // 共有リンクの条件を保存する先。着地カードの注記もこれを見るので、予告と実際の置き換え先がずれない
  const sharedTarget = sharedImportTarget(slots, slot);

  // 空いている設定に入れる。空きが無ければいま開いている設定を置き換える
  function importShared() {
    if (!shared) return;
    const { target, replaces } = sharedTarget;
    const replaced = replaces ? slots[target] : null;
    const replacedState = searchStates[target];
    setSlots(slots.map((item, i) => (i === target ? cloneConfig(shared) : item)));
    // 別の条件に入れ替わるので、前の条件で検索を開いた時刻は持ち越さない
    patchSearchState(target, { mark: null, newOnly: false });
    setSlot(target);
    setUrlView(false);
    clearSharedUrl();
    const slotLabel = slotName(target);
    if (!replaced) {
      toast.success(t("sharedImported").replace("{slot}", slotLabel));
      return;
    }
    // 置き換えた設定は、消えたことに気づいてすぐなら戻せるようにする
    toast.success(t("sharedReplaced").replace("{slot}", slotLabel), {
      duration: 12000,
      action: {
        label: t("undo"),
        onClick: () => {
          setSlots((current) => current.map((item, i) => (i === target ? replaced : item)));
          patchSearchState(target, replacedState);
        },
      },
    });
  }


  // 引き継ぎ用リンクの中身で、設定1〜3（と YouTube タブ）を置き換える。間違えて取り込んでも戻せるようにする
  function importTransfer() {
    if (!transfer) return;
    const before = { slots, searchStates, youtube: loadUrlSearch() };
    const youtube = transfer.youtube;
    const applyYoutube = (state: typeof before.youtube) => {
      saveUrlSearch(state);
      setUrlPanelKey((key) => key + 1);
    };
    setSlots(transfer.slots.map((item) => cloneConfig(item)));
    // 検索を開いた時刻はこの端末のものなので、入れ替えた設定には持ち越さない
    setSearchStates(emptySearchStates());
    setSlot(0);
    setUrlView(false);
    if (youtube) applyYoutube(youtube);
    setTransfer(null);
    toast.success(t("transferDone"), {
      duration: 12000,
      action: {
        label: t("undo"),
        onClick: () => {
          setSlots(before.slots);
          setSearchStates(before.searchStates);
          if (youtube) applyYoutube(before.youtube);
        },
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

  const saveNote = <AutoSaveNote onTransfer={() => setTransferOpen(true)} t={t} />;

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
      onShare={savedOk ? openShare : undefined}
      onOpen={recordOpen}
      t={t}
      testId={testId}
      // 確定した設定では探せないあいだだけ渡す（打っただけで押せるようになったら、案内を差し替える）
      draftHint={savedOk ? undefined : t("draftSearchHint")}
    >
      {isQueryTooLong(postsQuery) ? (
        <p className="text-sm text-destructive" role="alert" data-testid={`${testId}-too-long`}>
          {t("queryTooLong").replace("{count}", String(postsQuery.length))}
        </p>
      ) : null}
      {/* 打っただけで押せるようになったあいだは出さない（1 文字目で枠が伸びて欄がずれる）。打った言葉で
          名前が増えているあいだは、押すと切れて式にも since が入らないので、オフとして見せる */}
      {baseline !== null && savedOk ? (
        <NewOnlyToggle
          baseline={baseline}
          now={now}
          checked={searchState.newOnly && !draftAdds}
          onChange={(newOnly) => patchSearchState(slot, { newOnly })}
          t={t}
        />
      ) : null}
    </SearchCluster>
  );

  // 画面の下に検索ボタンを出すときは、いちばん下のリンクがその裏に隠れないよう余白を取る
  const floating = !urlView && postsOk;

  return (
    <div className={`min-h-screen bg-background ${floating ? FLOATING_SEARCH_SPACE : ""}`}>
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
          {/* 初めて来た人に、何ができるサービスかを一言で伝える。狭い画面では文の切れ目で折り返す */}
          <p className="text-sm text-muted-foreground" data-testid="tagline">
            <span className="inline-block">{t("tagline")}</span>{" "}
            <span className="inline-block">{t("taglineNote")}</span>
          </p>
        </div>
      </header>

      <AdRailLayout label={t("sponsored")}>
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
        {transfer ? (
          <TransferBanner
            data={transfer}
            locale={locale}
            replaces={slots.some((item) => !isBlankConfig(item))}
            onImport={importTransfer}
            onDismiss={() => setTransfer(null)}
            t={t}
          />
        ) : null}
        {shared ? (
          <SharedBanner
            config={shared}
            locale={locale}
            replaces={
              sharedTarget.replaces
                ? slotTitleOf(slots[sharedTarget.target], slotName(sharedTarget.target), t("sharedReplaceSlot"))
                : null
            }
            onImport={importShared}
            onDismiss={startOwnSearch}
            t={t}
          />
        ) : null}
        <SlotTabs
          value={urlView ? "url" : slot}
          onChange={selectTab}
          labels={slots.map((item, index) => slotLabelOf(item, slotName(index)))}
          t={t}
        />
        {urlView ? <UrlSearchPanel key={urlPanelKey} t={t} note={saveNote} /> : null}
        {urlView ? null : (
        <>
        {cluster("search-top")}
        {saveNote}
        {floating ? (
          <FloatingSearch url={liveUrl} label={t("searchPosts")} watchTestId="search-top-open" onOpen={recordOpen} />
        ) : null}

        <Card>
          <CardContent className="space-y-6">
            <KeywordEditor
              keywords={config.keywords}
              honorifics={config.honorifics}
              matchAll={config.matchAll === true}
              onChange={(keywords) => patch({ keywords })}
              onHonorificsChange={(honorifics) => patch({ honorifics })}
              onMatchAllChange={(matchAll) => patch({ matchAll })}
              onDraftChange={(draft) => changeDraft("keywords", draft)}
              t={t}
            />
            <FormSection icon={FunnelIcon} title={t("narrowSection")} testId="narrow-section">
              <ProfileFields
                config={config}
                onChange={patch}
                onHandleDraftChange={(draft) => changeDraft("handles", draft)}
                t={t}
              />
            </FormSection>
            <FormSection icon={BanIcon} title={t("excludeSection")} testId="exclude-section">
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
              <ToggleRow
                id="exclude-negative"
                label={t("excludeNegative")}
                help={t("excludeNegativeHelp")}
                checked={config.excludeNegative === true}
                onCheckedChange={(excludeNegative) => patch({ excludeNegative })}
                testId="exclude-negative"
              />
            </FormSection>
            {/* タブに出す名前。空なら先頭の名前が出るので、入力例にそれを見せる */}
            <div className="space-y-3 border-t border-border pt-5">
              <Label htmlFor="slot-name">{t("slotNameLabel")}</Label>
              <Input
                id="slot-name"
                value={config.displayName}
                placeholder={slotLabelOf({ ...config, displayName: "" }, slotName(slot))}
                maxLength={20}
                className="h-10 text-base md:text-sm"
                autoComplete="off"
                data-testid="slot-name"
                onChange={(event) => patch({ displayName: event.target.value })}
              />
            </div>
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

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} slots={slots} onCopy={copy} t={t} />

      <DeveloperInfo
        title={t("developer")}
        privacyLabel={t("privacy")}
        guideLabel={t("guide")}
        unofficialNote={t("unofficial")}
      />
    </div>
  );
}
