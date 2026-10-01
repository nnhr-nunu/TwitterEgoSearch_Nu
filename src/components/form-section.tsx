import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// 入力カードの中の「絞り込む」「除外する」などのまとまり。見出しがあるので、中の項目名は短くできる
export function FormSection({
  icon: Icon,
  title,
  children,
  testId,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section className="space-y-4 border-t border-border pt-5" aria-label={title} data-testid={testId}>
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Icon className="size-4" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}
