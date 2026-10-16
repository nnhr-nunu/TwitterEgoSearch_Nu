import { createDefaultConfig } from "./defaults";
import { buildPostsQuery, buildSearchUrl, QUERY_LENGTH_LIMIT } from "./query";
import type { SearchConfig } from "./types";
import { buildMainQuery, createDefaultUrlSearch } from "./url-search";

// X の検索の効き方は予告なく変わる（2025-07 にユーザー名が検索対象から外れた、など）。
// このツールが組み立てる検索を決まった数本だけ X で開き、期待どおりかを定期的に確かめるための一覧。
// URL はアプリと同じ組み立て処理から作るので、query.ts を変えたら `npm run x-check` で docs/x-check.md を作り直す。
// 日付は固定にして、いつ作っても同じ URL になるようにする（結果を見比べられるように）

export type XCheckCase = { id: string; what: string; expect: string; url: string };

const NAME = "ぬぬはら";
const HANDLE = "nnhr_nunu";

function posts(patch: Partial<SearchConfig>, sinceTime?: number): string {
  const config = { ...createDefaultConfig(), since: "", until: "", ...patch };
  return buildSearchUrl(buildPostsQuery(config, { sinceTime, locale: "ja" }), "posts", "latest");
}

function youtube(url: string): string {
  return buildSearchUrl(buildMainQuery({ ...createDefaultUrlSearch(), url, period: "all", excludeOwner: false }), "posts", "latest");
}

export function xCheckCases(): XCheckCase[] {
  return [
    { id: "1", what: "名前 1 つ（引用符で完全一致）", expect: "その名前を含む投稿が出る", url: posts({ keywords: [NAME] }) },
    {
      id: "2",
      what: "名前とハッシュタグの OR",
      expect: "どちらかを含む投稿が出る（1 より多い）",
      url: posts({ keywords: [NAME, `#${NAME}絵`] }),
    },
    {
      id: "3",
      what: "AND（すべてを含む）",
      expect: "両方を含む投稿だけ（2 より少ない）",
      url: posts({ keywords: [NAME, "催眠"], matchAll: true }),
    },
    {
      id: "4",
      what: "本人の投稿を除く（-from:）",
      expect: `@${HANDLE} の投稿が出ない`,
      url: posts({ keywords: [NAME], mutedHandles: [HANDLE] }),
    },
    {
      id: "5",
      what: "除外する言葉（-\"…\"）",
      expect: "「配信」を含む投稿が出ない",
      url: posts({ keywords: [NAME], mutedKeywords: ["配信"] }),
    },
    {
      id: "6",
      what: "期間（since: と until: を同じ日）",
      expect: "2026-10-01（日本時間）の投稿だけ",
      url: posts({ keywords: [NAME], since: "2026-10-01", until: "2026-10-01" }),
    },
    {
      id: "7",
      what: "前回より後だけ（since_time:）",
      expect: "2026-10-01 12:00（日本時間）より後の投稿だけ",
      url: posts({ keywords: [NAME] }, 1790823600),
    },
    { id: "8", what: "画像・動画つきだけ（filter:media）", expect: "画像か動画のある投稿だけ", url: posts({ keywords: [NAME], mediaOnly: true }) },
    {
      id: "9",
      what: "ネガティブワード入り（約 490 文字）",
      expect: "エラーにならず結果が出る。「嫌い」などを含む投稿が出ない",
      url: posts({ keywords: [NAME], excludeNegative: true }),
    },
    {
      id: "10",
      what: "カナの表記ゆれを足す",
      expect: "1 より多ければ、カナの候補を出す意味がある",
      url: posts({ keywords: [NAME, "ヌヌハラ", "ﾇﾇﾊﾗ"] }),
    },
    {
      id: "11",
      what: "YouTube チャンネルのリンク（url:\"youtube.com/@…\"）",
      expect: "チャンネルのリンクを貼った投稿が出る",
      url: youtube(`https://www.youtube.com/@${HANDLE}`),
    },
    {
      id: "12",
      what: "YouTube 動画のリンク（url:動画ID）",
      expect: "その動画のリンクを貼った投稿だけ",
      url: youtube("https://www.youtube.com/watch?v=2vESpdgZMvI"),
    },
  ];
}

export const X_CHECK_START = "<!-- x-check:start -->";
export const X_CHECK_END = "<!-- x-check:end -->";

// docs/x-check.md の、作り直す部分（結果の表はこの外に置き、作り直しても消えない）
export function xCheckTable(cases: XCheckCase[] = xCheckCases()): string {
  const rows = cases.map((c) => `| ${c.id} | ${c.what} | ${c.expect} | [開く](${c.url}) |`);
  return [X_CHECK_START, "| # | 確かめること | 期待 | X で開く |", "|---|---|---|---|", ...rows, X_CHECK_END].join("\n");
}

export function isValidCheckUrl(url: string): boolean {
  const query = new URL(url).searchParams.get("q") ?? "";
  return url.startsWith("https://x.com/search?q=") && query.length > 0 && query.length <= QUERY_LENGTH_LIMIT;
}
