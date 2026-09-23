import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | エゴサ支援ツール(ぬ)",
  description: "エゴサ支援ツール(ぬ)の広告・Cookie・保存データの扱いについて。",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 sm:px-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          プライバシーポリシー
        </h1>

        <div className="space-y-6 rounded-xl border border-border bg-card p-4 text-foreground">
          <Section title="入力した内容の扱い">
            <p>
              当ツールに入力した検索名称・アカウント・除外設定などは、お使いのブラウザの localStorage
              にのみ保存されます。運営者のサーバーへ送信・保存することはありません。
            </p>
            <p>
              「投稿を検索」を押すと、組み立てた検索条件を含む URL で X（旧 Twitter）の検索画面を開きます。
              その先の取り扱いは X のプライバシーポリシーに従います。
            </p>
          </Section>

          <Section title="広告について">
            <p>
              当ツールは第三者配信の広告サービス「Google AdSense」を利用しています。Google
              などの第三者配信事業者は Cookie を使用して、ユーザーが当サイトや他のサイトに過去にアクセスした際の情報に基づいて広告を配信します。
            </p>
            <p>
              Google が広告 Cookie を使用することにより、ユーザーが当サイトや他のサイトにアクセスした際の情報に基づいて、Google
              やそのパートナーが適切な広告をユーザーに表示できます。
            </p>
            <p>
              パーソナライズ広告は
              <ExternalLink href="https://adssettings.google.com/">Google の広告設定</ExternalLink>
              で無効にできます。また、
              <ExternalLink href="https://www.aboutads.info/">www.aboutads.info</ExternalLink>
              にアクセスすれば、第三者配信事業者の Cookie を無効にできます。
            </p>
            <p>
              Google によるデータの利用については
              <ExternalLink href="https://policies.google.com/technologies/partner-sites">
                Google のポリシーと規約
              </ExternalLink>
              をご覧ください。
            </p>
          </Section>

          <Section title="お問い合わせ">
            <p>
              ご質問は X（
              <ExternalLink href="https://x.com/nnhr_nunu">@nnhr_nunu</ExternalLink>
              ）の DM までお願いします。
            </p>
          </Section>

          <p className="text-xs text-muted-foreground">制定日：2026年9月24日</p>
        </div>

        <p className="text-center text-sm">
          <Link href="/" className="text-primary underline-offset-2 hover:underline">
            ← ツールに戻る
          </Link>
        </p>
      </main>
    </div>
  );
}
