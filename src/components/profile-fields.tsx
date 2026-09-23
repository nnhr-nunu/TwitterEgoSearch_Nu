"use client";

import { ChipInput } from "@/components/chip-input";
import { DateFilters } from "@/components/date-filters";
import type { MessageKey } from "@/lib/i18n";
import type { SearchConfig } from "@/lib/types";

type ProfileFieldsProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

export function ProfileFields({ config, onChange, t }: ProfileFieldsProps) {
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
      <DateFilters config={config} onChange={onChange} t={t} />
    </div>
  );
}
