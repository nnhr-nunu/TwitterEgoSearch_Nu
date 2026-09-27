"use client";

import { CalendarRangeIcon } from "lucide-react";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isIsoDate, MIN_SEARCH_DATE, shiftIso, todayIso } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { DateSpanId } from "@/lib/types";
import { URL_PERIODS, type UrlDateMode, type UrlPeriod, type UrlSearchState } from "@/lib/url-search";

type PeriodFields = Pick<UrlSearchState, "period" | "dateMode" | "rangeStart" | "rangeEnd" | "aroundDate" | "dateSpan">;

type YoutubePeriodProps = {
  t: (key: MessageKey) => string;
  state: PeriodFields;
  patch: (next: Partial<PeriodFields>) => void;
  // 動画 1 本のときの公開日（YYYY-MM-DD）。あれば「公開日から 1 週間」を出す
  publishedDate?: string;
};

const PERIOD_LABELS: Record<UrlPeriod, MessageKey> = {
  all: "urlPeriodAll",
  day: "urlPeriodDay",
  week: "urlPeriodWeek",
  month: "urlPeriodMonth",
  year: "urlPeriodYear",
  custom: "urlPeriodCustom",
};

const SPANS: { id: DateSpanId; label: MessageKey }[] = [
  { id: "7", label: "span7" },
  { id: "14", label: "span14" },
  { id: "month", label: "spanMonth" },
  { id: "quarter", label: "spanQuarter" },
];

function invalid(value: string): boolean {
  return value.trim() !== "" && !isIsoDate(value);
}

function DateField({
  id,
  label,
  value,
  onChange,
  t,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  t: (key: MessageKey) => string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex h-7 items-center justify-between gap-1">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        {value ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onChange("")} data-testid={`${id}-clear`}>
            {t("rangeClear")}
          </Button>
        ) : null}
      </div>
      <Input
        id={id}
        type="date"
        value={value}
        min={MIN_SEARCH_DATE}
        max={todayIso()}
        className="h-10 px-2"
        aria-invalid={invalid(value) || undefined}
        data-testid={id}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function YoutubePeriod({ t, state, patch, publishedDate }: YoutubePeriodProps) {
  const custom = state.period === "custom";
  const setMode = (dateMode: UrlDateMode) =>
    patch(dateMode === "around" && !state.aroundDate ? { dateMode, aroundDate: todayIso() } : { dateMode });
  const issues: MessageKey[] = [];
  if (custom && state.dateMode === "range") {
    if (invalid(state.rangeStart) || invalid(state.rangeEnd)) issues.push("dateInvalid");
    if (isIsoDate(state.rangeStart) && isIsoDate(state.rangeEnd) && state.rangeStart > state.rangeEnd) issues.push("rangeReversed");
  }
  if (custom && state.dateMode === "around" && invalid(state.aroundDate)) issues.push("aroundInvalid");

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("urlPeriod")}</p>
      <Segmented
        options={URL_PERIODS.map((period) => ({ id: period, label: t(PERIOD_LABELS[period]) }))}
        value={state.period}
        label={t("urlPeriod")}
        onChange={(period) => patch(period === "custom" && state.dateMode === "around" && !state.aroundDate ? { period, aroundDate: todayIso() } : { period })}
        testId="url-period"
        columns="grid-cols-3 sm:grid-cols-6"
      />

      {custom ? (
        <div className="ml-1 space-y-3 border-l-2 border-primary/40 py-1 pl-4" data-testid="url-period-dates">
          <Segmented<UrlDateMode>
            options={[
              { id: "range", label: t("urlDateRange") },
              { id: "around", label: t("urlDateAround") },
            ]}
            value={state.dateMode}
            label={t("urlPeriodCustom")}
            onChange={setMode}
            testId="url-date-mode"
          />
          {state.dateMode === "range" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <DateField id="url-range-start" label={t("since")} value={state.rangeStart} onChange={(rangeStart) => patch({ rangeStart })} t={t} />
                <DateField id="url-range-end" label={t("until")} value={state.rangeEnd} onChange={(rangeEnd) => patch({ rangeEnd })} t={t} />
              </div>
              <p className="text-xs text-muted-foreground">{t("urlRangeHint")}</p>
            </>
          ) : (
            <>
              <DateField id="url-around-date" label={t("aroundDate")} value={state.aroundDate} onChange={(aroundDate) => patch({ aroundDate })} t={t} />
              <Segmented<DateSpanId>
                options={SPANS.map((span) => ({ id: span.id, label: t(span.label) }))}
                value={state.dateSpan}
                label={t("aroundDate")}
                onChange={(dateSpan) => patch({ dateSpan })}
                testId="url-date-span"
                columns="grid-cols-2 sm:grid-cols-4"
              />
            </>
          )}
          {issues.map((issue) => (
            <p key={issue} className="text-xs text-destructive" role="alert">
              {t(issue)}
            </p>
          ))}
        </div>
      ) : null}

      {publishedDate ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 text-primary hover:bg-primary/10 hover:text-primary"
          data-testid="url-from-publish"
          onClick={() =>
            patch({
              period: "custom",
              dateMode: "range",
              rangeStart: publishedDate,
              // まだ 1 週間たっていなければ終わりは空欄（今日まで）にする
              rangeEnd: shiftIso(publishedDate, 6) < todayIso() ? shiftIso(publishedDate, 6) : "",
            })
          }
        >
          <CalendarRangeIcon data-icon="inline-start" />
          {t("urlFromPublish").replace("{date}", publishedDate.replaceAll("-", "/"))}
        </Button>
      ) : null}
    </div>
  );
}
