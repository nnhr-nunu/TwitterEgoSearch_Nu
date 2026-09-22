"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { MessageKey } from "@/lib/i18n";
import { hasSearchHandle, ownScopeOf, patchOwnScope } from "@/lib/own-scope";
import type { OwnScope, SearchConfig } from "@/lib/types";

type SearchScopeProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

const SCOPES: { id: OwnScope; label: MessageKey; hint: MessageKey }[] = [
  { id: "others", label: "ownScopeOthers", hint: "ownScopeOthersHint" },
  { id: "everyone", label: "ownScopeEveryone", hint: "ownScopeEveryoneHint" },
  { id: "self", label: "ownScopeSelf", hint: "ownScopeSelfHint" },
];

export function SearchScope({ config, onChange, t }: SearchScopeProps) {
  const hasHandle = hasSearchHandle(config);
  const scope = ownScopeOf(config);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("ownScope")}</p>
        <p className="text-xs text-muted-foreground">
          {hasHandle ? t("ownScopeWithHandle") : t("ownScopeWithoutHandle")}
        </p>
        <div
          className="grid gap-2 rounded-xl border border-border bg-background p-1 sm:grid-cols-3"
          role="radiogroup"
          aria-label={t("ownScope")}
          data-testid="own-scope"
        >
          {SCOPES.map((option) => {
            const selected = scope === option.id;
            const locked = !hasHandle && option.id !== "everyone";
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={locked}
                disabled={locked}
                data-testid={`own-scope-${option.id}`}
                title={locked ? t("ownScopeLocked") : undefined}
                className={`rounded-lg px-3 py-2 text-left transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : locked
                      ? "cursor-not-allowed text-muted-foreground opacity-60"
                      : "text-foreground hover:bg-muted"
                }`}
                onClick={() => {
                  if (locked) return;
                  onChange(patchOwnScope(option.id));
                }}
              >
                <span className="block text-sm font-medium">{t(option.label)}</span>
                <span className={`mt-0.5 block text-xs ${selected ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                  {locked ? t("ownScopeLocked") : t(option.hint)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2.5">
        <div className="min-w-0 space-y-1">
          <Label htmlFor="media-only" className="cursor-pointer">
            {t("media")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("mediaHint")}</p>
        </div>
        <Switch
          id="media-only"
          checked={config.mediaOnly}
          onCheckedChange={(checked) => onChange({ mediaOnly: checked })}
          aria-label={t("media")}
          data-testid="media-only"
        />
      </div>
    </div>
  );
}
