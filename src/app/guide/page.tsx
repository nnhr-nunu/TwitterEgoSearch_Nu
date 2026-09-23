import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdRailLayout, AdSlot } from "@/components/ad-slot";

export const metadata: Metadata = {
  title: "使い方 | エゴサ支援ツール(ぬ)",
  description:
    "エゴサ支援ツール(ぬ)の使い方。自分の名前のエゴサはもちろん、推しの話題やファンアート、推し本人の過去の投稿を探すときにも使えます。",
};

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
      {children}
    </section>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="font-heading text-lg font-semibold tracking-tight">{children}</h2>;
}

/** 画面上の入力欄の名前。本文中で目立たせて、ツールの画面と見比べやすくする。 */
function Field({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[0.95em] font-medium whitespace-nowrap">
      {children}
    </span>
  );
}

type UseCase = {
  title: string;
  lead: string;
  steps: ReactNode[];
};

const USE_CASES: UseCase[] = [
  {
    title: "自分の感想やファンの反応を見つけたい（エゴサ）",
    lead: "自分の名前・愛称・作品名で、他の人がつぶやいてくれた投稿をまとめて探します。",
    steps: [
      <>
        <Field>検索名称</Field> に、呼ばれ方をすべて入れる（例：本名義・略称・ひらがな表記・作品名・ファンアートタグ）
      </>,
      <>
        <Field>検索結果から除外するアカウント</Field> に自分の @id を入れると、自分の投稿が混ざらない
      </>,
      <>
        宣伝や bot が多いときは <Field>検索結果から除外するキーワード</Field> に「#pr」などを入れる
      </>,
    ],
  },
  {
    title: "推しの話題やファンアートを追いたい",
    lead: "推しの名前や愛称、ファンアートタグで、ファンのみんなの投稿を探します。",
    steps: [
      <>
        <Field>検索名称</Field> に推しの名前・愛称・ファンアートタグ・ファンの呼び名などを入れる
      </>,
      <>
        イラストや写真だけ見たいときは <Field>画像や動画ありで絞り込む</Field> をオンにする
      </>,
      <>
        盛り上がった投稿から見たいときは <Field>話題のポスト順</Field>、新しい順に追いたいときは <Field>最新順</Field>
      </>,
    ],
  },
  {
    title: "推し本人の「あの投稿」をもう一度見たい",
    lead: "告知・配信・グッズ情報など、推しが過去に投稿した内容をピンポイントで探します。",
    steps: [
      <>
        <Field>アカウントで絞り込む</Field> に推しの @id を入れる（推し本人の投稿だけになります）
      </>,
      <>
        <Field>キーワードで絞り込む</Field> に「告知」「配信」「グッズ」など覚えている言葉を入れる
      </>,
      <>
        時期の見当がつくなら <Field>日付で絞り込む</Field> で「去年の誕生日の前後7日」のように指定する
      </>,
    ],
  },
  {
    title: "イベントや配信の感想をまとめて読みたい",
    lead: "開催日の前後に絞ると、当日の実況や感想が見つけやすくなります。",
    steps: [
      <>
        <Field>検索名称</Field> にイベント名やハッシュタグを入れる
      </>,
      <>
        <Field>区間で絞り込む</Field> で開催日から数日後までを指定する
      </>,
    ],
  },
];

type FieldHelp = {
  name: string;
  body: string;
};

const FIELDS: FieldHelp[] = [
  {
    name: "検索名称",
    body: "探したい言葉です。複数入れると「どれか1つでも含む投稿」を探します。スペースや「、」で区切ってまとめて入力できます。表記ゆれ（ひらがな・カタカナ・略称・敬称つき）は別々に入れておくと取りこぼしが減ります。",
  },
  {
    name: "アカウントで絞り込む",
    body: "入れた @id の人の投稿だけに絞ります。推し本人や自分の過去の投稿を探すときに使います。検索名称が空でも、ここだけ入れれば検索できます。",
  },
  {
    name: "キーワードで絞り込む",
    body: "ここに入れた言葉を「すべて含む」投稿だけに絞ります。検索名称と組み合わせて「推しの名前 ＋ グッズ」のように使います。",
  },
  {
    name: "除外するアカウント / キーワード",
    body: "見たくない人や言葉を結果から外します。自分の @id、bot、「#pr」「プレゼント企画」などを入れておくと結果がすっきりします。",
  },
  {
    name: "日付で絞り込む",
    body: "「対象の日付」を決めて、その前後7日・14日・1ヶ月・3ヶ月の投稿を探します。だいたいの時期しか覚えていないときに便利です。",
  },
  {
    name: "区間で絞り込む",
    body: "開始日と終了日をはっきり決めて探します。終了日は空でも大丈夫です。",
  },
  {
    name: "画像や動画ありで絞り込む",
    body: "画像や動画がついた投稿だけにします。ファンアートや写真を探すときに。",
  },
  {
    name: "最新順 / 話題のポスト順",
    body: "X の検索画面のどのタブで開くかを選びます。最新順は新しい投稿から、話題のポスト順は反応の多い投稿から並びます。",
  },
  {
    name: "設定1〜3",
    body: "3つの条件を別々に覚えておけます。「設定1は自分のエゴサ、設定2は推しA、設定3は推しB」のように使い分けると、切り替えるだけですぐ検索できます。",
  },
];

type Faq = {
  q: string;
  a: string;
};

const FAQS: Faq[] = [
  {
    q: "ログインや登録は必要ですか？",
    a: "このツール自体には不要です。ただし X の仕様で、検索結果を見るには X にログインしている必要があることがあります。",
  },
  {
    q: "入力した内容はどこに保存されますか？",
    a: "お使いのブラウザの中だけに自動保存されます。運営者のサーバーには送られません。別のブラウザや端末には引き継がれないのでご注意ください。",
  },
  {
    q: "検索結果が0件になります。",
    a: "絞り込みを1つずつ外して試してみてください。特に「日付」と「区間」を両方使っていて期間が重なっていないと0件になります。鍵アカウントの投稿など、X の検索に出てこない投稿は見つけられません。",
  },
  {
    q: "スマホでも使えますか？",
    a: "使えます。「投稿を検索」を押すと、ブラウザまたは X アプリで検索結果が開きます。よく使うならホーム画面に追加しておくと便利です。",
  },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <AdRailLayout label="広告">
        <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 sm:px-6">
          <div className="space-y-2 px-1">
            <p className="text-sm">
              <Link href="/" className="text-primary underline-offset-2 hover:underline">
                ← エゴサ支援ツール(ぬ)
              </Link>
            </p>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">使い方</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              X（旧 Twitter）の検索を、条件つきでワンクリックで開けるツールです。自分の名前を探すエゴサはもちろん、推しの話題やファンアート、推し本人の過去の投稿を探すときにも使えます。
            </p>
          </div>

          <Card>
            <Heading>基本は3ステップ</Heading>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <Field>検索名称</Field> に探したい名前を入れる（推しの名前でも OK）
              </li>
              <li>必要なら、アカウント・キーワード・日付などで絞り込む</li>
              <li>
                <Field>最新順</Field> か <Field>話題のポスト順</Field> を選んで <Field>投稿を検索</Field>
                を押す
              </li>
            </ol>
            <p className="text-muted-foreground">
              入力した内容はブラウザに自動保存されるので、次からは開いてボタンを押すだけです。
            </p>
          </Card>

          <Card>
            <Heading>こんなときに便利</Heading>
            <div className="divide-y divide-border">
              {USE_CASES.map((item) => (
                <div key={item.title} className="space-y-2 py-4 first:pt-1 last:pb-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.lead}</p>
                  <ul className="list-disc space-y-1.5 pl-5">
                    {item.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Heading>入力欄ごとの説明</Heading>
            <dl className="divide-y divide-border">
              {FIELDS.map((item) => (
                <div key={item.name} className="space-y-1 py-3 first:pt-1 last:pb-1">
                  <dt className="font-semibold">{item.name}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <Heading>よくある質問</Heading>
            <dl className="divide-y divide-border">
              {FAQS.map((item) => (
                <div key={item.q} className="space-y-1 py-3 first:pt-1 last:pb-1">
                  <dt className="font-semibold">Q. {item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            さっそく使ってみる
          </Link>

          <AdSlot label="広告" />

          <p className="text-center text-xs">
            <Link href="/privacy/" className="text-muted-foreground underline-offset-2 hover:underline">
              プライバシーポリシー
            </Link>
          </p>
        </main>
      </AdRailLayout>
    </div>
  );
}
