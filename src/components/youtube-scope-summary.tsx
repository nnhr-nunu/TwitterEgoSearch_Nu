"use client";

import type { MessageKey } from "@/lib/i18n";
import { type ScopeInfo, scopeLines } from "@/lib/youtube-scope";

// 何を探すかを、期間や種類の切り替えのすぐ下で文章にして見せる（文の組み立ては youtube-scope.ts）
export function YoutubeScopeSummary({ t, info, words }: { t: (key: MessageKey) => string; info: ScopeInfo; words: string[] }) {
  const { main, notes } = scopeLines(t, info, words);
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5" data-testid="url-scope" aria-live="polite">
      <p className="text-sm leading-relaxed">{main}</p>
      {notes.map((note) => (
        <p key={note} className="text-xs leading-relaxed text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
  );
}
