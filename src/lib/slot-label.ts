import { shareSubjects } from "./share-post";
import type { SearchConfig } from "./types";

// タブに出す設定の名前。自分で付けた名前 → 先頭の検索名称 → 先頭のアカウント → 「設定1」の順で決める。
// 開かなくても中身の見当がつくようにする
export function slotLabelOf(config: SearchConfig, fallback: string): string {
  return config.displayName.trim() || shareSubjects(config)[0] || fallback;
}

// 文の中で設定を指す名前。タブが「設定1」のままならそれだけ、名前が出ていれば「設定1「ぬぬはら」」のように並べる。
// template は言語ごとの並べ方（{slot} と {name} を入れる）
export function slotTitleOf(config: SearchConfig, slotName: string, template: string): string {
  const label = slotLabelOf(config, slotName);
  // 名前に「$」が入っていても置き換えの記号として読まれないよう、関数で渡す
  return label === slotName ? slotName : template.replace("{slot}", slotName).replace("{name}", () => label);
}
