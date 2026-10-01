"use client";

import { PlusIcon, XIcon } from "lucide-react";

// 入力欄の下に出す候補。押すとその言葉・アカウントを足す（設定1〜3 と YouTube タブで同じ見た目）
export function SuggestionChips({
  label,
  items,
  onAdd,
  onDismiss,
  dismissLabel,
  testId,
}: {
  label: string;
  items: string[];
  onAdd: (item: string) => void;
  // 渡すと、最後に候補をまとめて隠す × を出す
  onDismiss?: () => void;
  dismissLabel?: string;
  testId: string;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label} data-testid={testId}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs transition-colors hover:bg-muted"
          onClick={() => onAdd(item)}
        >
          <PlusIcon className="size-3" aria-hidden />
          {item}
        </button>
      ))}
      {onDismiss ? (
        <button
          type="button"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={dismissLabel}
          title={dismissLabel}
          onClick={onDismiss}
          data-testid={`${testId}-dismiss`}
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
