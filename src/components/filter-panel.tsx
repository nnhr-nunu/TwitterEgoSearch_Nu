"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { daysAgoIso } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n";
import type { SearchConfig } from "@/lib/types";

type FilterPanelProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

export function FilterPanel({ config, onChange, t }: FilterPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
        <div className="min-w-0">
          <Label htmlFor="wrap-quotes" className="cursor-pointer">
            {t("wrapQuotes")}
          </Label>
        </div>
        <Switch
          id="wrap-quotes"
          checked={config.wrapQuotes}
          onCheckedChange={(checked) => onChange({ wrapQuotes: checked })}
          aria-label={t("wrapQuotes")}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
        <div className="min-w-0">
          <Label htmlFor="latest" className="cursor-pointer">
            {config.latest ? t("latest") : t("top")}
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {config.latest ? "f=live" : "top"}
          </p>
        </div>
        <Switch
          id="latest"
          checked={config.latest}
          onCheckedChange={(checked) => onChange({ latest: checked })}
          aria-label={t("latest")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="since">{t("since")}</Label>
          <Input
            id="since"
            type="date"
            value={config.since}
            className="h-10"
            data-testid="since-date"
            onChange={(event) => onChange({ since: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="until">{t("until")}</Label>
          <Input
            id="until"
            type="date"
            value={config.until}
            className="h-10"
            data-testid="until-date"
            onChange={(event) => onChange({ until: event.target.value })}
          />
        </div>
      </div>

      {config.since || config.until ? (
        <p className="text-sm text-foreground" data-testid="date-range-summary">
          {config.since || "—"} → {config.until || t("dateRangeOpen")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="since-last-7"
          aria-pressed={config.since === daysAgoIso(7) && !config.until}
          onClick={() => onChange({ since: daysAgoIso(7), until: "" })}
        >
          {t("last7")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="since-last-30"
          aria-pressed={config.since === daysAgoIso(30) && !config.until}
          onClick={() => onChange({ since: daysAgoIso(30), until: "" })}
        >
          {t("last30")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-testid="clear-dates"
          onClick={() => onChange({ since: "", until: "" })}
        >
          {t("clearDates")}
        </Button>
      </div>
    </div>
  );
}
