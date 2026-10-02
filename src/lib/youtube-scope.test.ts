import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type MessageKey, t } from "./i18n";
import { MAX_UPLOADS } from "./youtube";
import { missesOlderVideos, type ScopeInfo, scopeLines } from "./youtube-scope";

const ja = (key: MessageKey) => t("ja", key);
const en = (key: MessageKey) => t("en", key);

type ChannelScope = Extract<ScopeInfo, { kind: "channel" }>;

// 期間を問わない、打ち切っていないチャンネルから始める
const channel = (over: Partial<ChannelScope> = {}): ChannelScope => ({
  kind: "channel",
  count: 120,
  window: { since: "", until: "" },
  videoKind: "all",
  batches: [{ query: "q", from: 1, to: 120 }],
  missesOlder: false,
  ...over,
});

// 終わりの日が今日より前かで文が変わるので、日付を固定する
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 27, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("scopeLines", () => {
  it("keeps the sentences for a channel that was not truncated", () => {
    expect(scopeLines(ja, channel(), []).main).toBe("すべての動画 120 本のリンクを貼った投稿を探します。");
    expect(scopeLines(en, channel(), []).main).toBe("Finds posts sharing all 120 videos.");
    expect(scopeLines(ja, channel({ window: { since: "2026-09-20", until: "" } }), []).main).toBe(
      "2026/09/20 以降に公開された動画 120 本のリンクを貼った投稿を探します。",
    );
    expect(scopeLines(ja, channel({ window: { since: "2026-09-01", until: "2026-09-11" } }), []).main).toBe(
      "2026/09/01〜2026/09/10 に公開された動画 120 本のリンクを貼った投稿を探します。",
    );
    expect(scopeLines(ja, channel({ window: { since: "", until: "2026-09-11" } }), []).main).toBe(
      "2026/09/10 までに公開された動画 120 本のリンクを貼った投稿を探します。",
    );
    expect(scopeLines(ja, channel({ count: 0 }), []).main).toBe(
      "この期間に公開された動画はないので、チャンネルのリンクを貼った投稿を探します。",
    );
    expect(scopeLines(en, channel({ count: 0, videoKind: "short" }), []).main).toBe(
      "No Shorts were released in this period, so this finds posts sharing the channel link.",
    );
  });

  it("does not say all of them when older videos were not loaded", () => {
    const info = channel({ count: MAX_UPLOADS, missesOlder: true });
    expect(scopeLines(ja, info, []).main).toBe(`動画 ${MAX_UPLOADS} 本のリンクを貼った投稿を探します。`);
    expect(scopeLines(en, info, []).main).toBe(`Finds posts sharing ${MAX_UPLOADS} videos.`);
    // タイトルで絞った本数でも「新しい 12 本」とは読めない
    expect(scopeLines(ja, channel({ count: 12, missesOlder: true }), []).main).toBe(
      "動画 12 本のリンクを貼った投稿を探します。",
    );
    expect(scopeLines(ja, channel({ count: 80, videoKind: "short", missesOlder: true }), []).main).toBe(
      "ショート 80 本のリンクを貼った投稿を探します。",
    );
    // 終わりの日が今日より先なら、始まりの無い期間と同じに言う
    expect(scopeLines(ja, channel({ window: { since: "", until: "2026-10-05" }, missesOlder: true }), []).main).toBe(
      "動画 120 本のリンクを貼った投稿を探します。",
    );
  });

  it("keeps the dated sentences when the channel was truncated", () => {
    expect(scopeLines(ja, channel({ window: { since: "2026-09-20", until: "" }, missesOlder: true }), []).main).toBe(
      "2026/09/20 以降に公開された動画 120 本のリンクを貼った投稿を探します。",
    );
  });

  it("says no loaded video is in the period instead of no video when the channel was truncated", () => {
    const info = channel({ count: 0, window: { since: "2010-01-01", until: "2010-02-01" }, missesOlder: true });
    expect(scopeLines(ja, info, []).main).toBe(
      `読み込んだ新しい ${MAX_UPLOADS} 本の中に、この期間の動画はないので、チャンネルのリンクを貼った投稿を探します。`,
    );
    expect(scopeLines(en, info, []).main).toBe(
      `The newest ${MAX_UPLOADS} loaded videos include no videos from this period, so this finds posts sharing the channel link.`,
    );
    expect(scopeLines(ja, { ...info, videoKind: "live" }, []).main).toBe(
      `読み込んだ新しい ${MAX_UPLOADS} 本の中に、この期間の配信はないので、チャンネルのリンクを貼った投稿を探します。`,
    );
  });

  it("adds the words and the steps after the channel sentence", () => {
    const info = channel({
      count: MAX_UPLOADS,
      missesOlder: true,
      batches: [
        { query: "a", from: 1, to: 500 },
        { query: "b", from: 501, to: 1000 },
      ],
    });
    expect(scopeLines(ja, info, ["#推し"])).toEqual({
      main: `動画 ${MAX_UPLOADS} 本のリンクを貼った投稿を探します。「#推し」を含む投稿も探します。`,
      notes: ["1 度に 500 本分しか検索できないので、この条件では 2 回に分けて検索します。"],
    });
  });
});

describe("missesOlderVideos", () => {
  // 新しい順に、2026-09-20 から 2024-01-10 まで
  const videos = [
    { publishedAt: "2026-09-20T12:00:00Z" },
    { publishedAt: "2025-05-01T12:00:00Z" },
    { publishedAt: "2024-01-10T12:00:00Z" },
  ];

  it("is false for a channel that was loaded completely", () => {
    expect(missesOlderVideos(false, videos, { since: "" })).toBe(false);
    expect(missesOlderVideos(false, videos, { since: "2010-01-01" })).toBe(false);
  });

  it("is true when the period has no start or starts before the oldest loaded video", () => {
    expect(missesOlderVideos(true, videos, { since: "" })).toBe(true);
    expect(missesOlderVideos(true, videos, { since: "2023-12-31" })).toBe(true);
    expect(missesOlderVideos(true, [], { since: "2026-09-01" })).toBe(true);
  });

  it("is false when the period starts on or after the oldest loaded video", () => {
    expect(missesOlderVideos(true, videos, { since: "2024-01-10" })).toBe(false);
    expect(missesOlderVideos(true, videos, { since: "2026-09-21" })).toBe(false);
  });
});
