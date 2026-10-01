"use client";

import { PlusIcon } from "lucide-react";

// 入力欄の下に出す候補。押すとその言葉・アカウントを足す（設定1〜3 と YouTube タブで同じ見た目）
export function SuggestionChips({
  label,
  items,
  onAdd,
  testId,
}: {
  label: string;
  items: string[];
  onAdd: (item: string) => void;
  testId: string;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
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
    </div>
  );
}
