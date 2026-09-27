"use client";

// 並び順・期間・動画の種類などの 1 つだけ選ぶ切り替え。設定1〜3 と YouTube タブで同じ見た目にする
export type SegmentedOption<T extends string> = { id: T; label: string; count?: number };

function segmentClass(selected: boolean): string {
  return `rounded-lg px-1.5 py-2 text-center text-xs font-medium leading-tight transition-colors sm:px-3 sm:text-sm ${
    selected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
  }`;
}

export function Segmented<T extends string>({
  options,
  value,
  label,
  onChange,
  testId,
  columns,
}: {
  options: SegmentedOption<T>[];
  value: T;
  label: string;
  onChange: (value: T) => void;
  testId: string;
  // 選択肢が多くて 1 行に入らないときの列指定（例: "grid-cols-3 sm:grid-cols-6"）。省略すると 1 行に並べる
  columns?: string;
}) {
  return (
    <div
      className={`grid gap-1 rounded-xl border border-border bg-background p-1 ${columns ?? ""}`}
      style={columns ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
    >
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`${testId}-${option.id}`}
            className={segmentClass(selected)}
            onClick={() => onChange(option.id)}
          >
            {option.count === undefined ? (
              option.label
            ) : (
              // 件数付きは、狭い画面では件数を下の行に出して折り返しを揃える
              <span className="flex flex-col items-center sm:flex-row sm:justify-center sm:gap-1">
                <span className="whitespace-nowrap">{option.label}</span>
                <span className={`text-[10px] tabular-nums sm:text-xs ${selected ? "opacity-80" : "text-muted-foreground"}`}>
                  {option.count}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
