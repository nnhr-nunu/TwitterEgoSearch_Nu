"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import { formatMarkTime } from "@/lib/last-search";

type NewOnlyToggleProps = {
  // 「前回」として使う時刻（ミリ秒）と、いまの時刻
  baseline: number;
  now: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  t: (key: MessageKey) => string;
};

// 検索ボタンのすぐ下に置く「前回の検索より後の投稿だけ」。いつからの投稿かをスイッチの横に出す
export function NewOnlyToggle({ baseline, now, checked, onChange, t }: NewOnlyToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5">
      <div className="space-y-0.5">
        <Label htmlFor="new-only" className="cursor-pointer text-sm font-medium">
          {t("newOnly")}
        </Label>
        <p className="text-xs text-muted-foreground" data-testid="new-only-since">
          {t("newOnlySince").replace("{time}", formatMarkTime(baseline, now))}
        </p>
      </div>
      <Switch id="new-only" checked={checked} onCheckedChange={onChange} aria-label={t("newOnly")} data-testid="new-only" />
    </div>
  );
}
