"use client";

import type { MessageKey } from "@/lib/i18n";
import { ownScopeOf, patchOwnScope } from "@/lib/own-scope";
import type { OwnScope, SearchConfig } from "@/lib/types";

type SearchScopeProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

const SCOPES: { id: OwnScope; label: MessageKey }[] = [
  { id: "others", label: "ownScopeOthers" },
  { id: "everyone", label: "ownScopeEveryone" },
  { id: "self", label: "ownScopeSelf" },
];

export function SearchScope({ config, onChange, t }: SearchScopeProps) {
  const scope = ownScopeOf(config);

  return (
    <div
      className="grid gap-2 rounded-xl border border-border bg-background p-1 sm:grid-cols-3"
      role="radiogroup"
      aria-label={t("ownScope")}
      data-testid="own-scope"
    >
      {SCOPES.map((option) => {
        const selected = scope === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`own-scope-${option.id}`}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              selected
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
            onClick={() => onChange(patchOwnScope(option.id))}
          >
            {t(option.label)}
          </button>
        );
      })}
    </div>
  );
}
