"use client";

import type { ReactNode } from "react";
import { FilterPanel } from "@/components/filter-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { todayIso } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { SearchConfig } from "@/lib/types";

type DateFiltersProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
  testId,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        data-testid={testId}
      />
    </div>
  );
}

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

export function DateFilters({ config, onChange, t }: DateFiltersProps) {
  function setDateFilter(dateFilter: boolean) {
    onChange({ dateFilter });
  }

  function setRangeFilter(rangeFilter: boolean) {
    if (!rangeFilter) {
      onChange({ rangeFilter: false });
      return;
    }
    onChange({
      rangeFilter: true,
      rangeEnd: config.rangeEnd || todayIso(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <ToggleRow
          id="date-filter"
          label={t("dateFilter")}
          checked={config.dateFilter}
          onCheckedChange={setDateFilter}
          testId="date-filter"
        />
        {config.dateFilter ? (
          <Nested>
            <FilterPanel config={config} onChange={onChange} t={t} />
          </Nested>
        ) : null}
      </div>

      <div className="space-y-1">
        <ToggleRow
          id="range-filter"
          label={t("rangeFilter")}
          checked={config.rangeFilter}
          onCheckedChange={setRangeFilter}
          testId="range-filter"
        />
        {config.rangeFilter ? (
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
                className="h-10"
                data-testid="range-start"
                onChange={(event) => onChange({ rangeStart: event.target.value })}
              />
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
                className="h-10"
                data-testid="range-end"
                onChange={(event) => onChange({ rangeEnd: event.target.value })}
              />
            </div>
          </Nested>
        ) : null}
      </div>
    </div>
  );
}
