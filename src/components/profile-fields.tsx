"use client";

import { ExternalLinkIcon } from "lucide-react";
import { SearchScope } from "@/components/search-scope";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeHandle, profileUrl } from "@/lib/handle";
import type { MessageKey } from "@/lib/i18n";
import { hasSearchHandle } from "@/lib/own-scope";
import type { SearchConfig } from "@/lib/types";

type ProfileFieldsProps = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
  t: (key: MessageKey) => string;
};

export function ProfileFields({ config, onChange, t }: ProfileFieldsProps) {
  const handle = config.handle;
  const href = profileUrl(handle);
  const showScope = hasSearchHandle(config);

  return (
    <div className="space-y-3" data-testid="handle-block">
      <div className="space-y-2">
        <Label htmlFor="handle">{t("handle")}</Label>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
          >
            @
          </span>
          <Input
            id="handle"
            value={handle}
            autoComplete="username"
            spellCheck={false}
            className="h-10 pl-7 text-base md:text-sm"
            placeholder={t("handlePlaceholder")}
            onChange={(event) => onChange({ handle: event.target.value })}
            onBlur={() => {
              const normalized = normalizeHandle(handle);
              if (normalized && normalized !== handle) onChange({ handle: normalized });
            }}
          />
        </div>
      </div>
      {showScope ? (
        <div
          className="space-y-2 border-l-2 border-primary/40 py-1 pl-3"
          data-testid="own-scope-nested"
        >
          <SearchScope config={config} onChange={onChange} t={t} />
        </div>
      ) : null}
      {handle.trim() ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {t("openProfile")}
          <ExternalLinkIcon className="size-3" />
        </a>
      ) : null}
    </div>
  );
}
