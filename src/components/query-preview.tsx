"use client";

import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";

type QueryPreviewProps = {
  label: string;
  query: string;
  url: string;
  disabled: boolean;
  emptyMessage: string;
  onCopyQuery: () => void;
  onCopyUrl: () => void;
  t: (key: MessageKey) => string;
};

export function QueryPreview({
  label,
  query,
  url,
  disabled,
  emptyMessage,
  onCopyQuery,
  onCopyUrl,
  t,
}: QueryPreviewProps) {
  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-card/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex flex-wrap justify-end gap-1">
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onCopyQuery}>
            <CopyIcon data-icon="inline-start" />
            {t("copyQuery")}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onCopyUrl}>
            <CopyIcon data-icon="inline-start" />
            {t("copyUrl")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={disabled} asChild>
            <a href={disabled ? undefined : url} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon data-icon="inline-start" />
              {t("openOnTwitter")}
            </a>
          </Button>
        </div>
      </div>
      {disabled ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <pre className="overflow-x-auto rounded-lg bg-background/80 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {query}
        </pre>
      )}
    </div>
  );
}
