"use client";

import { ExternalLinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeHandle, profileUrl } from "@/lib/handle";
import type { MessageKey } from "@/lib/i18n";

type ProfileFieldsProps = {
  handle: string;
  onHandleChange: (value: string) => void;
  t: (key: MessageKey) => string;
};

export function ProfileFields({ handle, onHandleChange, t }: ProfileFieldsProps) {
  const href = profileUrl(handle);

  return (
    <div className="space-y-2">
      <Label htmlFor="handle">{t("handle")}</Label>
      <p className="text-xs text-muted-foreground">{t("handleHint")}</p>
      <Input
        id="handle"
        value={handle}
        autoComplete="username"
        spellCheck={false}
        className="h-10 text-base md:text-sm"
        placeholder={t("handlePlaceholder")}
        onChange={(event) => onHandleChange(event.target.value)}
        onBlur={() => {
          const normalized = normalizeHandle(handle);
          if (normalized && normalized !== handle) onHandleChange(normalized);
        }}
      />
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
