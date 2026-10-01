"use client";

import type { ReactNode } from "react";
import { FilterPanel } from "@/components/filter-panel";
import { Segmented } from "@/components/segmented";
import { ToggleRow } from "@/components/toggle-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_SEARCH_DATE, dateIssues, todayIso } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { SearchConfig } from "@/lib/types";

type DateFiltersProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

function Nested({ children }: { children: ReactNode }) {
  return (
    <div className="ml-1 space-y-3 border-l-2 border-primary/40 py-1 pl-4">{children}</div>
  );
}

function ClearBound({
  label,
  onClick,
  testId,
}: {
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      data-testid={testId}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function DateNote({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <p className="text-xs text-destructive" role="alert" data-testid={testId}>
      {children}
    </p>
  );
}

// 期間は「すべて・日付の前後・開始日〜終了日」のどれか 1 つ（YouTube タブの「期間」と同じ見せ方）
type Period = "all" | "around" | "range";

const PERIOD_OPTIONS: { id: Period; label: MessageKey }[] = [
  { id: "all", label: "urlPeriodAll" },
  { id: "around", label: "urlPeriodAround" },
  { id: "range", label: "urlPeriodRange" },
];

function periodOf(config: SearchConfig): Period {
  if (config.rangeFilter) return "range";
  return config.dateFilter ? "around" : "all";
}

export function DateFilters({ config, onChange, t }: DateFiltersProps) {
  function setPeriod(period: Period) {
    if (period !== "range") {
      onChange({ dateFilter: period === "around", rangeFilter: false });
      return;
    }
    // 開始日が空なら、終了日は設定を作った日の「今日」のまま古くなっていることがある（直近の投稿が落ちる）ので今日に直す。
    // 開始日まで入れてあれば自分で決めた区間なので、そのまま戻す
    onChange({
      dateFilter: false,
      rangeFilter: true,
      rangeEnd: config.rangeStart ? config.rangeEnd || todayIso() : todayIso(),
    });
  }

  const period = periodOf(config);
  const issues = dateIssues(config);
  const startInvalid = issues.includes("rangeStartInvalid");
  const endInvalid = issues.includes("rangeEndInvalid");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("urlPeriod")}</p>
        <Segmented<Period>
          options={PERIOD_OPTIONS.map((option) => ({ id: option.id, label: t(option.label) }))}
          value={period}
          label={t("urlPeriod")}
          onChange={setPeriod}
          testId="period"
        />
        {period === "around" ? (
          <Nested>
            <FilterPanel config={config} onChange={onChange} t={t} />
          </Nested>
        ) : null}
        {period === "range" ? (
          <Nested>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="range-start">{t("since")}</Label>
                <ClearBound
                  label={t("rangeClear")}
                  testId="range-start-clear"
                  onClick={() => onChange({ rangeStart: "" })}
                />
              </div>
              <Input
                id="range-start"
                type="date"
                value={config.rangeStart}
                min={MIN_SEARCH_DATE}
                max={todayIso()}
                className="h-10"
                aria-invalid={startInvalid || undefined}
                data-testid="range-start"
                onChange={(event) => onChange({ rangeStart: event.target.value })}
              />
              {startInvalid ? <DateNote>{t("dateInvalid")}</DateNote> : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="range-end">{t("until")}</Label>
                <ClearBound
                  label={t("rangeClear")}
                  testId="range-end-clear"
                  onClick={() => onChange({ rangeEnd: "" })}
                />
              </div>
              <Input
                id="range-end"
                type="date"
                value={config.rangeEnd}
                min={MIN_SEARCH_DATE}
                max={todayIso()}
                className="h-10"
                aria-invalid={endInvalid || undefined}
                data-testid="range-end"
                onChange={(event) => onChange({ rangeEnd: event.target.value })}
              />
              {endInvalid ? <DateNote>{t("dateInvalid")}</DateNote> : null}
            </div>
            {issues.includes("rangeReversed") ? <DateNote>{t("rangeReversed")}</DateNote> : null}
          </Nested>
        ) : null}
      </div>

      <div className="space-y-1">
        <ToggleRow
          id="media-filter"
          label={t("media")}
          checked={config.mediaOnly}
          onCheckedChange={(mediaOnly) => onChange({ mediaOnly })}
          testId="media-filter"
        />
      </div>
    </div>
  );
}
