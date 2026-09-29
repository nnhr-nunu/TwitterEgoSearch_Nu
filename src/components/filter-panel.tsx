"use client";

import { Segmented } from "@/components/segmented";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MIN_SEARCH_DATE, dateIssues, todayIso } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import { DATE_SPAN_IDS, type DateSpanId, type SearchConfig } from "@/lib/types";

type FilterPanelProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

// 「対象の日付」の前後の幅。設定1〜3 と YouTube タブで同じ選択肢にする
export const DATE_SPAN_LABELS: Record<DateSpanId, MessageKey> = {
  "7": "span7",
  "14": "span14",
  month: "spanMonth",
  quarter: "spanQuarter",
};

export function dateSpanOptions(t: (key: MessageKey) => string) {
  return DATE_SPAN_IDS.map((id) => ({ id, label: t(DATE_SPAN_LABELS[id]) }));
}

export function FilterPanel({ config, onChange, t }: FilterPanelProps) {
  function setAroundDate(aroundDate: string) {
    onChange({ dateFilter: true, aroundDate });
  }

  function setSpan(dateSpan: DateSpanId) {
    onChange({ dateFilter: true, dateSpan });
  }

  const aroundInvalid = dateIssues(config).includes("aroundInvalid");

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
          min={MIN_SEARCH_DATE}
          max={todayIso()}
          className="h-10"
          aria-invalid={aroundInvalid || undefined}
          data-testid="around-date"
          onChange={(event) => setAroundDate(event.target.value)}
        />
        {aroundInvalid ? (
          <p className="text-xs text-destructive" data-testid="around-date-error">
            {t("aroundInvalid")}
          </p>
        ) : null}
      </div>

      <Segmented<DateSpanId>
        options={dateSpanOptions(t)}
        value={config.dateSpan}
        label={t("aroundDate")}
        onChange={setSpan}
        testId="date-span"
        columns="grid-cols-2 sm:grid-cols-4"
      />
    </div>
  );
}
