import { daysAgoIso, rangeWindow, untilOperand, windowAround } from "./dates";
import { uniqueHandles } from "./handle";
import { uniqueCaseless } from "./keywords";
import { orGroup, quoteTerm } from "./query";
import { type DateSpanId, isDateSpanId, type ResultSort } from "./types";
import { type ChannelVideo, type LoadErrorKind, VIDEO_KINDS, type VideoKind, videoDate } from "./youtube";

// YouTube タブ（旧 URL検索）の条件と、X の検索クエリの組み立て。
// X で実際に検索して分かったこと（2026-09-28, @nnhr_nunu）:
// - url:動画ID は動画のリンクを貼った投稿だけに当たる。いちばん確実
// - url:ハンドル は note・マシュマロ・本人の X 投稿の画像 URL（x.com/ハンドル/status/…）まで拾う。
//   url:"youtube.com/@ハンドル" にすると、チャンネルのリンクを貼った投稿に絞れる
// - タイトルから取った言葉を単独で探すと、「認知症の祖母」「七夕」のような言葉で無関係な投稿が大量に混ざる
// - X の検索は約 500 文字を超えるとエラーになる（26 本 492 文字は通り、28 本 530 文字で失敗）
// 日付の演算子（2026-09-30, @nnhr_nunu / @nhk_news）:
// - since:2026-09-29 は日本時間の 0 時から（UTC ではない）。until:2026-09-29 は日本時間の 9/29 23:59:59 まで＝その日を含む
//   （since: と until: を同じ日にすると、その 1 日分が出る。最新順・話題順とも同じ）
// - since_time:UNIX秒 と since:2026-09-25_19:47:25_JST は秒単位で効き、その秒の投稿を含む。since: の日付とも併用できる

export const URL_SEARCH_STORAGE_KEY = "egosearch-nu:url-search";

// 期間の絞り込み。1週間〜1年は相対の期間で、since: の日付は検索のたびに今日から数える。
// "around" はある日付の前後、"range" は区間（開始日〜終了日）。投稿も動画の公開日も同じ期間で絞る
export type UrlPeriod = "all" | "week" | "month" | "year" | "around" | "range";

export const URL_PERIODS: UrlPeriod[] = ["week", "month", "year", "around", "range", "all"];

const PERIOD_DAYS: Record<Exclude<UrlPeriod, "all" | "around" | "range">, number> = { week: 7, month: 30, year: 365 };

// チャンネルの検索で 1 回に入れる動画の本数。X の検索は約 500 文字までで、回ごとに本数がばらつかないようそろえる
export const VIDEOS_PER_SEARCH = 20;

// "channel" は動画ではなく、チャンネルそのもののリンクを貼った投稿を探す
export type VideoKindFilter = VideoKind | "all" | "channel";

export type UrlSearchState = {
  // 読み込んだ URL。入力途中の値は画面側で持つ
  url: string;
  // リンクと一緒に探す言葉（配信タグ・ファンアートタグ・呼び名など）。チャンネルが分かるときは channelWords を使う
  words: string[];
  // チャンネルごとに覚えておく言葉。キーはチャンネル ID（読み込めていなければハンドルなど）
  channelWords: Record<string, string[]>;
  // 反応として数えたくないアカウント
  excluded: string[];
  // チャンネルの説明欄にある本人の X アカウントの投稿を除く
  excludeOwner: boolean;
  period: UrlPeriod;
  // period が "range" / "around" のときの指定。空欄はその側を区切らない（対象の日付の空欄は今日）
  rangeStart: string;
  rangeEnd: string;
  aroundDate: string;
  dateSpan: DateSpanId;
  sort: ResultSort;
  // チャンネルの動画の絞り込み。"all" と "" は「すべて」、"channel" はチャンネルのリンクだけを探す
  videoKind: VideoKindFilter;
  videoTitle: string;
};

// 投稿を探す期間。since はその日を含み、until は終わりの日の翌日（その日を含まない）。
// X に渡すときは untilOperand で終わりの日に戻す
export type DateWindow = { since: string; until: string };

export function postWindow(state: Pick<UrlSearchState, "period" | "rangeStart" | "rangeEnd" | "aroundDate" | "dateSpan">): DateWindow {
  if (state.period === "all") return { since: "", until: "" };
  if (state.period === "around") return windowAround(state.aroundDate, state.dateSpan);
  if (state.period === "range") return rangeWindow(state.rangeStart, state.rangeEnd);
  return { since: daysAgoIso(PERIOD_DAYS[state.period]), until: "" };
}

export type UrlTargetKind = "video" | "channel" | "niconico" | "page";

export type UrlTarget = {
  kind: UrlTargetKind;
  // 対象を見分ける値（動画 ID・ハンドル・チャンネル ID など）。保存済みのチャンネルとの照合に使う
  token: string;
  // X の url: 演算子に渡す値。展開後の URL の一部に一致する
  link: string;
};

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com"]);
// ニコニコ動画（sm/so/nm）と生放送（lv）の ID。nico.ms の短縮 URL にも同じ ID が入る
const NICONICO_ID_RE = /^(?:sm|so|nm|lv)\d+$/;
const NICONICO_HOSTS = new Set(["nicovideo.jp", "sp.nicovideo.jp", "live.nicovideo.jp", "sp.live.nicovideo.jp", "nico.ms"]);

// X の検索窓に入る長さの目安。長すぎるクエリは X 側で失敗するので分けて開く
export const MAX_QUERY_LENGTH = 480;

export function createDefaultUrlSearch(): UrlSearchState {
  return {
    url: "",
    words: [],
    channelWords: {},
    excluded: [],
    excludeOwner: true,
    period: "week",
    rangeStart: "",
    rangeEnd: "",
    aroundDate: "",
    dateSpan: "7",
    sort: "latest",
    videoKind: "all",
    videoTitle: "",
  };
}

function toUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    // スキームなしの「abc」などを URL とみなさないよう、ドメインにドットを求める
    return url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

function video(id: string): UrlTarget {
  return { kind: "video", token: id, link: id };
}

// チャンネルのリンクとして X で探す値。ID はそのまま、ハンドルなどは youtube.com からの形にする
export function channelLink(ref: string): string {
  if (CHANNEL_ID_RE.test(ref)) return ref;
  return `youtube.com/@${ref.replace(/^@/, "")}`;
}

// 途中で切れた「%E3%81」のようなコピーは読めない URL として扱う（decodeURIComponent は例外を投げる）
function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function youtubeTarget(host: string, url: URL): UrlTarget | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") {
    const id = segments[0] ?? "";
    return VIDEO_ID_RE.test(id) ? video(id) : null;
  }
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const v = url.searchParams.get("v") ?? "";
  if (segments[0] === "watch" && VIDEO_ID_RE.test(v)) return video(v);
  if (["shorts", "live", "embed"].includes(segments[0] ?? "") && VIDEO_ID_RE.test(segments[1] ?? "")) {
    return video(segments[1]);
  }

  const first = segments[0] ?? "";
  if (first.startsWith("@") && first.length > 1) {
    const handle = decode(first.slice(1));
    return handle ? { kind: "channel", token: handle, link: channelLink(handle) } : null;
  }
  if (first === "channel" && segments[1]) {
    const id = decode(segments[1]);
    return id ? { kind: "channel", token: id, link: id } : null;
  }
  if (["c", "user"].includes(first) && segments[1]) {
    const name = decode(segments[1]);
    return name ? { kind: "channel", token: name, link: `youtube.com/${first}/${name}` } : null;
  }
  return null;
}

function niconicoTarget(host: string, url: URL): UrlTarget | null {
  if (!NICONICO_HOSTS.has(host)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const id = host === "nico.ms" ? segments[0] : segments[0] === "watch" ? segments[1] : "";
  return id && NICONICO_ID_RE.test(id) ? { kind: "niconico", token: id, link: id } : null;
}

export function parseTargetUrl(raw: string): UrlTarget | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const youtube = youtubeTarget(host, url);
  if (youtube) return youtube;
  const niconico = niconicoTarget(host, url);
  if (niconico) return niconico;
  if (host === "youtu.be" || YOUTUBE_HOSTS.has(host)) {
    // トップページや検索結果など、特定の動画・チャンネルでない YouTube URL は受け付けない
    return null;
  }
  const path = url.pathname.replace(/\/+$/, "");
  const link = `${host}${path}`;
  return { kind: "page", token: link, link };
}

// ドメインやパスを含む値は引用符で囲む。先頭の - も除外演算子と読まれるので囲む
export function linkTerm(link: string): string {
  return `url:${quoteTerm(link, /[./@]/.test(link) || link.startsWith("-"))}`;
}

function group(terms: string[]): string {
  return terms.length > 1 ? `(${terms.join(" OR ")})` : (terms[0] ?? "");
}

// 検索から除くアカウント。本人のアカウントはスイッチが入っているときだけ足す
export function excludedHandles(state: UrlSearchState, owners: string[] = []): string[] {
  return uniqueHandles([...state.excluded, ...(state.excludeOwner ? owners : [])]);
}

function tailParts(state: UrlSearchState, owners: string[]): string[] {
  const parts = excludedHandles(state, owners).map((handle) => `-from:${handle}`);
  const { since, until } = postWindow(state);
  if (since) parts.push(`since:${since}`);
  if (until) parts.push(`until:${untilOperand(until)}`);
  return parts;
}

function compose(terms: string[], tail: string[]): string {
  return terms.length ? [group(terms), ...tail].join(" ") : "";
}

export type UrlScope = {
  // 対象の URL のほかに探すリンク（読み込んだチャンネルの ID・ハンドル）
  links?: string[];
  // 本人の X アカウント
  owners?: string[];
  // 動画 1 本のとき、タイトルから取った言葉と、それと一緒に書かれていてほしい名前
  keyword?: string;
  names?: string[];
};

// 曲名などは、名前も一緒に書かれた投稿だけに絞る（単独だと無関係な投稿が混ざる）
function titleTerm(keyword: string, names: string[]): string {
  const nameGroup = orGroup(uniqueCaseless(names), false);
  return keyword.trim() && nameGroup ? `(${quoteTerm(keyword, true)} ${nameGroup})` : "";
}

function wordTerms(state: UrlSearchState): string[] {
  return state.words.map((word) => quoteTerm(word, false)).filter(Boolean);
}

// 動画 1 本・ページ・動画一覧を読み込めていないチャンネルの検索。リンクと言葉のどちらかを含む投稿を探す
export function buildMainQuery(state: UrlSearchState, scope: UrlScope = {}): string {
  const target = parseTargetUrl(state.url);
  if (!target) return "";
  const links = uniqueCaseless([target.link, ...(scope.links ?? [])]).map(linkTerm);
  if (target.kind === "video") links.push(titleTerm(scope.keyword ?? "", scope.names ?? []));
  return compose([...links, ...wordTerms(state)].filter(Boolean), tailParts(state, scope.owners ?? []));
}

// チャンネルの動画のうち、期間・種類・タイトルに当てはまるもの（新しい順のまま）
export function videosInScope(videos: ChannelVideo[], state: UrlSearchState): ChannelVideo[] {
  const { since, until } = postWindow(state);
  const title = state.videoTitle.trim().toLowerCase();
  return videos.filter((item) => {
    const date = videoDate(item);
    return (
      (!since || date >= since) &&
      (!until || date < until) &&
      state.videoKind !== "channel" &&
      (state.videoKind === "all" || item.kind === state.videoKind) &&
      (!title || item.title.toLowerCase().includes(title))
    );
  });
}

// チャンネルを開いたとき、1週間〜1年の期間に動画が 1 本も無ければ、1 本以上ある期間まで広げる。
// 日付・区間は自分で選んだものなので変えない。広げる必要が無ければ null
export function widerPeriod(videos: ChannelVideo[], state: UrlSearchState): UrlPeriod | null {
  const steps: UrlPeriod[] = ["week", "month", "year", "all"];
  const start = steps.indexOf(state.period);
  if (start < 0 || !videos.length) return null;
  const found = steps.slice(start).find((period) => videosInScope(videos, { ...state, period, videoKind: "all", videoTitle: "" }).length);
  return found && found !== state.period ? found : null;
}

export type SearchBatch = {
  query: string;
  // この回に入れた動画が何本目から何本目か（1 始まり）。動画が無い回は to = from - 1
  from: number;
  to: number;
};

// チャンネルの検索。種類が "channel" ならチャンネルのリンクを、それ以外は動画のリンクを OR でつなぐ。
// 動画は 1 回に perSearch 本ずつ入れ、言葉はいちばん空きのある最後の回にだけ入れる（同じ投稿が毎回出ないように）。
// 入りきらなければ言葉だけの回を最後に足す。20 本すら入らないほど除外が長いときは本数を減らしてそろえる
export function buildChannelBatches(
  state: UrlSearchState,
  scope: UrlScope & { videoIds: string[] },
  maxLength = MAX_QUERY_LENGTH,
  perSearch = VIDEOS_PER_SEARCH,
): SearchBatch[] {
  const target = parseTargetUrl(state.url);
  if (!target) return [];
  const tail = tailParts(state, scope.owners ?? []);
  // 期間内に動画が無くても、チャンネルのリンクを貼った投稿はあるかもしれないので、そちらを探す
  if (state.videoKind === "channel" || !scope.videoIds.length) {
    const links = uniqueCaseless([target.link, ...(scope.links ?? [])]).map(linkTerm);
    return [{ query: compose([...links, ...wordTerms(state)], tail), from: 1, to: 0 }];
  }
  const head = wordTerms(state);
  const terms = scope.videoIds.map(linkTerm);
  let per = perSearch;
  while (per > 1 && compose(terms.slice(0, per), tail).length > maxLength) per -= 1;

  const batches: SearchBatch[] = [];
  for (let start = 0; start < terms.length; start += per) {
    const chunk = terms.slice(start, start + per);
    batches.push({ query: compose(chunk, tail), from: start + 1, to: start + chunk.length });
  }
  if (!head.length) return batches;
  const last = batches.at(-1);
  const merged = last ? compose([...head, ...terms.slice(last.from - 1)], tail) : "";
  if (last && merged.length <= maxLength) return [...batches.slice(0, -1), { ...last, query: merged }];
  return [...batches, { query: compose(head, tail), from: terms.length + 1, to: terms.length }];
}

// チャンネルごとの言葉を書き換える。空にしたチャンネルは消す
export function withChannelWords(map: Record<string, string[]>, key: string, words: string[]): Record<string, string[]> {
  const rest = { ...map };
  delete rest[key];
  return words.length ? { ...rest, [key]: words } : rest;
}

// 一覧を読み込む前のチャンネルの言葉を覚えておくキー。チャンネル ID は大文字小文字を区別するのでそのまま、ハンドルは小文字にそろえる
export function pendingChannelKey(token: string): string {
  return CHANNEL_ID_RE.test(token) ? token : token.toLowerCase();
}

// チャンネルの言葉を読む。キーはハンドルのこともあるので、「@constructor」などで Object の持ち物を拾わないようにする
export function channelWordsOf(map: Record<string, string[]>, key: string): string[] {
  return Object.hasOwn(map, key) ? map[key] : [];
}

// 読み込みが終わる前（や失敗して読めないあいだ）はハンドルなどのキーで覚えているので、読み込めたらチャンネル ID のキーへ移す。
// 移すものが無ければ同じ map を返す
export function moveChannelWords(map: Record<string, string[]>, from: string, to: string): Record<string, string[]> {
  const moving = channelWordsOf(map, from);
  if (!moving.length || from === to) return map;
  return withChannelWords(withChannelWords(map, from, []), to, uniqueCaseless([...channelWordsOf(map, to), ...moving]));
}

// どのチャンネル（入力 URL から読んだ値）の読み込みが、どんなわけで失敗したか
export type ChannelLoadError = { ref: string; kind: LoadErrorKind };

// 一覧をまだ持っていないチャンネルの読み込みに失敗したら、そのカードの中で知らせる。
// 一覧を持っているチャンネル（新着の確認の失敗）や、別の対象を見ているときは null
export function cardLoadError(error: ChannelLoadError | null, target: UrlTarget | null, loaded: boolean): LoadErrorKind | null {
  if (!error || loaded || target?.kind !== "channel") return null;
  return target.token.toLowerCase() === error.ref.toLowerCase() ? error.kind : null;
}

// 見つからなかったチャンネルは、リンクを貼った投稿も無いので検索を止める。止めるのは @ハンドルか UC… の ID の URL だけで、
// 古い /c/・/user/ の URL は API で引けなくても URL 自体は正しいことがあるので、今までどおりリンクを探す
export function stopsSearch(error: LoadErrorKind | null, target: UrlTarget | null): boolean {
  if (error !== "notFound" || target?.kind !== "channel") return false;
  return target.link.startsWith("youtube.com/@") || CHANNEL_ID_RE.test(target.link);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

// 言葉が空のチャンネルは残さない
function wordMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, words]) => [key, strings(words)] as const)
      .filter(([, words]) => words.length > 0),
  );
}

function period(value: unknown, dateMode: unknown): UrlPeriod {
  // 以前は「1日」と、区間・日付の前後をまとめた「日付を指定」があった
  if (value === "day") return "week";
  if (value === "custom") return dateMode === "around" ? "around" : "range";
  return URL_PERIODS.includes(value as UrlPeriod) ? (value as UrlPeriod) : "all";
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}


// 保存した値や、引き継ぎ用リンクで受け取った値を読む。形の合わない項目は既定値にする
export function parseUrlSearch(value: unknown): UrlSearchState {
  if (!value || typeof value !== "object") return createDefaultUrlSearch();
  const parsed = value as Partial<UrlSearchState> & { videoKinds?: unknown; dateMode?: unknown };
  // 以前は種類を複数選べた。1 つだけ選んでいたときはそれを引き継ぐ（公開年の絞り込みは期間に置き換えた）
  const oldKinds = strings(parsed.videoKinds);
  const kind: string = text(parsed.videoKind) || (oldKinds.length === 1 ? oldKinds[0] : "all");
  return {
    url: text(parsed.url),
    words: strings(parsed.words),
    channelWords: wordMap(parsed.channelWords),
    excluded: strings(parsed.excluded),
    excludeOwner: parsed.excludeOwner !== false,
    period: period(parsed.period, parsed.dateMode),
    rangeStart: text(parsed.rangeStart),
    rangeEnd: text(parsed.rangeEnd),
    aroundDate: text(parsed.aroundDate),
    dateSpan: isDateSpanId(parsed.dateSpan) ? parsed.dateSpan : "7",
    sort: parsed.sort === "likes" ? "likes" : "latest",
    videoKind: kind === "channel" || (VIDEO_KINDS as string[]).includes(kind) ? (kind as VideoKindFilter) : "all",
    videoTitle: text(parsed.videoTitle),
  };
}

export function loadUrlSearch(): UrlSearchState {
  const fallback = createDefaultUrlSearch();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(URL_SEARCH_STORAGE_KEY);
    return raw ? parseUrlSearch(JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

export function saveUrlSearch(state: UrlSearchState): void {
  try {
    window.localStorage.setItem(URL_SEARCH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても検索は使える
  }
}
