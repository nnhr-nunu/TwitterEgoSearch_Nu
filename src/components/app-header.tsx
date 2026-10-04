import { BirdIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n";

type AppHeaderProps = {
  t: (key: MessageKey) => string;
  onToggleLocale: () => void;
};

/**
 * ロゴ・サービス名・キャッチコピー。保存した設定を読み込む前（初期 HTML）から同じものを出し、
 * JS を動かさない検索ロボットやリンクのプレビューにも、何のサービスかと使い方へのリンクを見せる。
 */
export function AppHeader({ t, onToggleLocale }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      {/* ボタンはロゴの行に置き、タイトルに横幅をまるごと使わせる（スマホで「ツー／ル」と折り返さないように） */}
      <div className="mx-auto max-w-2xl space-y-2 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <BirdIcon className="size-7" aria-hidden />
            <p className="text-xs font-semibold tracking-[0.18em] uppercase">{t("brand")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/guide/" data-testid="guide-link">
                {t("guide")}
              </Link>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onToggleLocale}>
              {t("language")}
            </Button>
          </div>
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        {/* 初めて来た人に、何ができるサービスかを一言で伝える。狭い画面では文の切れ目で折り返す */}
        <p className="text-sm text-muted-foreground" data-testid="tagline">
          <span className="inline-block">{t("tagline")}</span>{" "}
          <span className="inline-block">{t("taglineNote")}</span>
        </p>
      </div>
    </header>
  );
}
