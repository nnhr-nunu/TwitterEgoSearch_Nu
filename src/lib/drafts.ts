import { parseHandleList, uniqueHandles } from "./handle";
import { appendCaseless, splitSearchNames } from "./keywords";
import type { SearchConfig } from "./types";

// 入力欄に打っただけで、まだ Enter や「＋」で追加していない文字。検索できるかどうかに効く欄だけ持つ
export type SearchDrafts = {
  keywords?: string;
  handles?: string;
};

// 打ちかけの文字を、追加したときと同じ規則で足した設定を返す。検索ボタンは押すと欄を離れて追加されるので、
// 押す前から押せる見た目にし、押したときと同じ式にしておくのに使う。読めないアカウントは足さない。
// 足すものが無ければ同じ設定をそのまま返す（useMemo で式を作り直さないように）
export function withDrafts(config: SearchConfig, drafts: SearchDrafts): SearchConfig {
  const keywords = appendCaseless(config.keywords, splitSearchNames(drafts.keywords ?? ""));
  const current = uniqueHandles(config.handles);
  const handles = uniqueHandles([...current, ...parseHandleList(drafts.handles ?? "")]);
  const addsKeywords = keywords.length > config.keywords.length;
  const addsHandles = handles.length > current.length;
  if (!addsKeywords && !addsHandles) return config;
  return {
    ...config,
    ...(addsKeywords ? { keywords } : {}),
    // 「このアカウントの投稿だけ」の欄で追加したときと同じく、先頭のアカウントを handle にもそろえる
    ...(addsHandles ? { handles, handle: handles[0] ?? "" } : {}),
  };
}

// 検索ボタンに渡す設定と「前回の検索より後」の時刻。打ちかけの文字を足したときは時刻を付けない。
// 押すと欄を離れて追加され、名前やアカウントを変えたときと同じく「前回より後だけ」が切れるので、
// マウスを乗せたときに見える URL や中クリックで開く URL も、押したあとに開く式とそろえる
export function searchWithDrafts(
  config: SearchConfig,
  drafts: SearchDrafts,
  sinceTime: number | undefined,
): { config: SearchConfig; sinceTime: number | undefined } {
  const next = withDrafts(config, drafts);
  return { config: next, sinceTime: next === config ? sinceTime : undefined };
}
