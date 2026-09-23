"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import type { DateSpanId, SearchConfig } from "@/lib/types";

type FilterPanelProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

const SPANS: { id: DateSpanId; label: MessageKey }[] = [
  { id: "7", label: "span7" },
  { id: "14", label: "span14" },
  { id: "month", label: "spanMonth" },
  { id: "quarter", label: "spanQuarter" },
];

export function FilterPanel({ config, onChange, t }: FilterPanelProps) {
  function setAroundDate(aroundDate: string) {
    onChange({ dateFilter: true, aroundDate });
  }

  function setSpan(dateSpan: DateSpanId) {
    onChange({ dateFilter: true, dateSpan });
  }

  return (
    <div className="space-y-4">
      {/* 引用符トグルは非表示。引用は常にオン。 */}
      {false && (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
        <div className="min-w-0 space-y-1">
          <Label htmlFor="wrap-quotes" className="cursor-pointer">
            {t("wrapQuotes")}
          </Label>
          <p className="text-sm text-muted-foreground">{t("wrapQuotesHelp")}</p>
        </div>
        <Switch
          id="wrap-quotes"
          checked={config.wrapQuotes}
          onCheckedChange={(checked) => onChange({ wrapQuotes: checked })}
          aria-label={t("wrapQuotes")}
        />
      </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="around-date">{t("aroundDate")}</Label>
        <Input
          id="around-date"
          type="date"
          value={config.aroundDate}
          className="h-10"
          data-testid="around-date"
          onChange={(event) => setAroundDate(event.target.value)}
        />
      </div>

      <div
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-background p-1 sm:grid-cols-4"
        role="radiogroup"
        aria-label={t("aroundDate")}
        data-testid="date-span"
      >
        {SPANS.map((option) => {
          const selected = config.dateSpan === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`date-span-${option.id}`}
              className={`rounded-lg px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors sm:text-sm ${
                selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
              onClick={() => setSpan(option.id)}
            >
              {t(option.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
