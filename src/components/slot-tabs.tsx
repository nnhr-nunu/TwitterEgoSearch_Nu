"use client";

import { flushSync } from "react-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MessageKey } from "@/lib/i18n";
import type { SlotIndex } from "@/lib/types";
import { SLOT_COUNT } from "@/lib/types";

// 設定1〜3 と、その隣の YouTube（URL から反応を探す）
export type TabValue = SlotIndex | "url";

type SlotTabsProps = {
  value: TabValue;
  onChange: (value: TabValue) => void;
  // タブに出す設定の名前（付けた名前か、先頭の検索名称。空の設定は「設定1」など）
  labels: string[];
  t: (key: MessageKey) => string;
};

const SLOT_LABELS: MessageKey[] = ["slot1", "slot2", "slot3"];

// 打ちかけの名前やアカウントは欄を離れたときに今の設定へ足す。Radix はマウスを押した時点で切り替え、
// そのあとで欄が外れると切り替え先に入ってしまうので、切り替える前にこちらで欄を外しておく。
// YouTube タブの欄は切り替えでパネルごと外れるので、足した言葉の保存まで先に済ませる（flushSync）
function leaveField() {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) flushSync(() => active.blur());
}

export function SlotTabs({ value, onChange, labels, t }: SlotTabsProps) {
  return (
    <Tabs
      value={String(value)}
      onValueChange={(next) => {
        leaveField();
        onChange(next === "url" ? "url" : (Number(next) as SlotIndex));
      }}
      className="w-full gap-0"
      data-testid="slot-tabs"
    >
      <TabsList className="grid h-11 w-full grid-cols-4">
        {SLOT_LABELS.slice(0, SLOT_COUNT).map((key, index) => {
          const slotName = t(key);
          const label = labels[index] || slotName;
          return (
            <TabsTrigger
              key={key}
              value={String(index)}
              // 長い名前は「…」で切る。何番目の設定かは読み上げとツールチップに残す
              className="min-w-0 text-sm"
              title={label === slotName ? undefined : `${slotName}：${label}`}
              aria-label={label === slotName ? undefined : `${slotName}：${label}`}
              data-testid={`slot-tab-${index}`}
            >
              <span className="truncate">{label}</span>
            </TabsTrigger>
          );
        })}
        <TabsTrigger value="url" className="min-w-0 text-sm" data-testid="slot-tab-url">
          {t("urlTab")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
