"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MessageKey } from "@/lib/i18n";
import type { SlotIndex } from "@/lib/types";
import { SLOT_COUNT } from "@/lib/types";

// 設定1〜3 と、その隣の YouTube（URL から反応を探す）
export type TabValue = SlotIndex | "url";

type SlotTabsProps = {
  value: TabValue;
  onChange: (value: TabValue) => void;
  t: (key: MessageKey) => string;
};

const SLOT_LABELS: MessageKey[] = ["slot1", "slot2", "slot3"];

export function SlotTabs({ value, onChange, t }: SlotTabsProps) {
  return (
    <Tabs
      value={String(value)}
      onValueChange={(next) => onChange(next === "url" ? "url" : (Number(next) as SlotIndex))}
      className="w-full gap-0"
      data-testid="slot-tabs"
    >
      <TabsList className="grid h-11 w-full grid-cols-4">
        {SLOT_LABELS.slice(0, SLOT_COUNT).map((label, index) => (
          <TabsTrigger
            key={label}
            value={String(index)}
            className="text-sm"
            data-testid={`slot-tab-${index}`}
          >
            {t(label)}
          </TabsTrigger>
        ))}
        <TabsTrigger value="url" className="text-sm" data-testid="slot-tab-url">
          {t("urlTab")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
