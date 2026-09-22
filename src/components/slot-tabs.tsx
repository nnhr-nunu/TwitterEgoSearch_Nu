"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MessageKey } from "@/lib/i18n";
import type { SlotIndex } from "@/lib/types";
import { SLOT_COUNT } from "@/lib/types";

type SlotTabsProps = {
  value: SlotIndex;
  onChange: (index: SlotIndex) => void;
  t: (key: MessageKey) => string;
};

const SLOT_LABELS: MessageKey[] = ["slot1", "slot2", "slot3"];

export function SlotTabs({ value, onChange, t }: SlotTabsProps) {
  return (
    <Tabs
      value={String(value)}
      onValueChange={(next) => onChange(Number(next) as SlotIndex)}
      className="w-full gap-0"
      data-testid="slot-tabs"
    >
      <TabsList className="grid h-11 w-full grid-cols-3">
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
      </TabsList>
    </Tabs>
  );
}
