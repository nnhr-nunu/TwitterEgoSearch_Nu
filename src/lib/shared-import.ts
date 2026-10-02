import { isBlankConfig } from "./defaults";
import type { SearchConfig, SlotIndex } from "./types";

// 共有リンクの条件を保存する先。空いている設定の最初に入れ、空きが無ければいま開いている設定を置き換える。
// 保存する処理と着地カードの注記の両方がこれを使い、言うことと実際に置き換わる先をずらさない
export function sharedImportTarget(
  slots: SearchConfig[],
  activeSlot: SlotIndex,
): { target: SlotIndex; replaces: boolean } {
  const blank = slots.findIndex((item) => isBlankConfig(item));
  return blank >= 0 ? { target: blank as SlotIndex, replaces: false } : { target: activeSlot, replaces: true };
}
