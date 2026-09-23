"use client";

import { ChipInput } from "@/components/chip-input";
import { FilterPanel } from "@/components/filter-panel";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { windowAround } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { SearchConfig } from "@/lib/types";

type ProfileFieldsProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

export function ProfileFields({ config, onChange, t }: ProfileFieldsProps) {
  function setDateFilter(dateFilter: boolean) {
    if (!dateFilter) {
      onChange({ dateFilter: false, since: "", until: "" });
      return;
    }
    const aroundDate = config.aroundDate;
    const { since, until } = windowAround(aroundDate, config.dateSpan);
    onChange({ dateFilter: true, aroundDate, since, until });
  }

  return (
    <div className="space-y-4" data-testid="handle-block">
      <ChipInput
        id="handle-input"
        label={t("handle")}
        placeholder={t("handlePlaceholder")}
        values={config.handles}
        onChange={(handles) => onChange({ handles, handle: handles[0] ?? "" })}
        addLabel={t("addKeyword")}
        savedToast={t("savedToast")}
        mode="handle"
        invalidMessage={t("muteInvalid")}
        testId="handle"
      />
      <ChipInput
        id="filter-keyword-input"
        label={t("filterKeywords")}
        placeholder={t("filterKeywordPlaceholder")}
        values={config.filterKeywords}
        onChange={(filterKeywords) => onChange({ filterKeywords })}
        addLabel={t("addKeyword")}
        savedToast={t("savedToast")}
        testId="filter-keyword"
      />
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
          <Label htmlFor="date-filter" className="cursor-pointer">
            {t("dateFilter")}
          </Label>
          <Switch
            id="date-filter"
            checked={config.dateFilter}
            onCheckedChange={setDateFilter}
            aria-label={t("dateFilter")}
            data-testid="date-filter"
          />
        </div>
        {config.dateFilter ? <FilterPanel config={config} onChange={onChange} t={t} /> : null}
      </div>
    </div>
  );
}
