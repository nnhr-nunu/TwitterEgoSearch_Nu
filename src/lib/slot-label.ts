import { shareSubjects } from "./share-post";
import type { SearchConfig } from "./types";

// タブに出す設定の名前。自分で付けた名前 → 先頭の検索名称 → 先頭のアカウント → 「設定1」の順で決める。
// 開かなくても中身の見当がつくようにする
export function slotLabelOf(config: SearchConfig, fallback: string): string {
  return config.displayName.trim() || shareSubjects(config)[0] || fallback;
}
