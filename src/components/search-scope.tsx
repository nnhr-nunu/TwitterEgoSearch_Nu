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
      className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1"
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
            className={`rounded-lg px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors sm:px-3 sm:text-sm ${
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
