import type { ReactNode } from "react";

// 使い方・検索コマンド一覧など、読み物のページで使う部品

export function DocCard({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
      {children}
    </section>
  );
}

export function DocHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-heading text-lg font-semibold tracking-tight">{children}</h2>;
}

/** 画面上の入力欄の名前。本文中で目立たせて、ツールの画面と見比べやすくする。 */
export function Field({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[0.95em] font-medium whitespace-nowrap">
      {children}
    </span>
  );
}
