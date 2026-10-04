import type { Metadata } from "next";
import Link from "next/link";

// Next.js の既定の 404 は英語で戻るリンクもないので、日本語で置き換える（GitHub Pages は out/404.html を返す）
export const metadata: Metadata = {
  title: "ページが見つかりません | エゴサ支援ツール(ぬ)",
  // layout の正規 URL（トップ）を引き継がない
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          ページが見つかりません
        </h1>
        <p className="text-sm leading-relaxed [word-break:auto-phrase] text-foreground">
          URL が間違っているか、ページが移動した可能性があります。
        </p>
        <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="text-primary underline-offset-2 hover:underline">
            ← ツールに戻る
          </Link>
          <Link href="/guide/" className="text-primary underline-offset-2 hover:underline">
            使い方
          </Link>
        </p>
      </main>
    </div>
  );
}
