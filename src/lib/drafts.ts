import { parseHandleList, uniqueHandles } from "./handle";
import { appendCaseless, splitSearchNames } from "./keywords";
import type { SearchConfig } from "./types";

// 入力欄に打っただけで、まだ Enter や「＋」で追加していない文字。検索できるかどうかに効く欄だけ持つ
export type SearchDrafts = {
  keywords: string;
  handles: string;
};

// 入力欄の文字をチップの一覧に足した結果。「＋」や Enter で足すときと、打っただけで検索ボタンに見せる式の両方がこれを使う。
// 読めるものが無い（空白だけ・読めないアカウントだけ）ときは null、もう入っているものだけなら values をそのまま返す
export function mergeChipValues(
  values: string[],
  raw: string,
  mode: "text" | "handle",
  tokenize?: (raw: string) => string[],
): string[] | null {
  if (mode === "handle") {
    const added = parseHandleList(raw);
    if (!added.length) return null;
    const current = uniqueHandles(values);
    const merged = uniqueHandles([...current, ...added]);
    return merged.length > current.length ? merged : values;
  }
  const tokens = tokenize ? tokenize(raw) : [raw.trim()].filter(Boolean);
  if (!tokens.length) return null;
  // X の検索は大文字小文字を区別しないので、「ABC」のあとの「abc」は同じ言葉として足さない
  const merged = appendCaseless(values, tokens);
  return merged.length > values.length ? merged : values;
}

// 「このアカウントの投稿だけ」の一覧を変えるときの設定の差分。先頭のアカウントを handle にもそろえる
export function ownHandlesPatch(handles: string[]): Pick<SearchConfig, "handles" | "handle"> {
  return { handles, handle: handles[0] ?? "" };
}

// 打ちかけの文字を、追加したときと同じ規則で足した設定を返す。検索ボタンは押すと欄を離れて追加されるので、
// 押す前から押せる見た目にし、押したときと同じ式にしておくのに使う。読めないアカウントは足さない。
// 足すものが無ければ同じ設定をそのまま返す（足したかどうかを、呼び出し側が同じかどうかで見分けられるように）
export function withDrafts(config: SearchConfig, drafts: SearchDrafts): SearchConfig {
  // 名前の欄（keyword-editor）は splitSearchNames で区切る
  const keywords = mergeChipValues(config.keywords, drafts.keywords, "text", splitSearchNames) ?? config.keywords;
  const handles = mergeChipValues(config.handles, drafts.handles, "handle") ?? config.handles;
  if (keywords === config.keywords && handles === config.handles) return config;
  return {
    ...config,
    keywords,
    ...(handles === config.handles ? {} : ownHandlesPatch(handles)),
  };
}
