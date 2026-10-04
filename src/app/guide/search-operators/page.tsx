import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { AdRailLayout } from "@/components/ad-slot";
import { DocCard, DocHeading, Field } from "@/components/doc-parts";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "X(Twitter)の検索コマンド一覧 | エゴサ支援ツール(ぬ)",
  description:
    "X(Twitter)の検索コマンド（OR・除外・from:・since:・until:・filter:media・min_faves: など）の意味と書き方の一覧。エゴサや推しのパブサで使える組み合わせの例つき。",
  path: "/guide/search-operators/",
});

/** 本文中のコマンド。長いものは空白や記号の位置で折り返す */
function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 font-mono text-[0.95em] break-words">{children}</code>;
}

/** 検索式。空白の位置でだけ折り返し、「-」の直後で切れて -from: などが離れないようにする */
function Query({ text }: { text: string }) {
  return text.split(" ").map((token, index) => (
    <Fragment key={index}>
      {index > 0 ? " " : null}
      <span className="whitespace-nowrap">{token}</span>
    </Fragment>
  ));
}

type Operator = {
  syntax: string;
  meaning: ReactNode;
  // このツールで作れるときの入力欄の名前。無ければ X の検索窓に直接書く
  field?: string;
};

type Section = {
  title: string;
  items: Operator[];
};

// 日付・長さの挙動は 2026-09 に X で確かめた内容（src/lib/url-search.ts の冒頭）に合わせる
const SECTIONS: Section[] = [
  {
    title: "言葉の組み合わせ",
    items: [
      {
        syntax: "ぬぬはら 新作",
        meaning: "空白で区切ると、すべての言葉を含む投稿を探します（AND）。",
        field: "この言葉も含む投稿だけ",
      },
      {
        syntax: "ぬぬはら OR nunuhara",
        meaning: "どれか 1 つでも含む投稿を探します。OR は大文字で、前後に空白を入れます。",
        field: "名前・愛称・ハッシュタグ",
      },
      {
        syntax: "(ぬぬはら OR nunuhara) 新作",
        meaning: "かっこでまとめると、OR と AND を組み合わせられます。",
      },
      {
        syntax: '"山田 太郎"',
        meaning: "引用符で囲むと、空白を含む言葉を 1 つの言葉として探します。",
        field: "名前・愛称・ハッシュタグ",
      },
      {
        syntax: "-ネタバレ",
        meaning: "先頭に - を付けると、その言葉を含む投稿を除きます。",
        field: "除外する（キーワード）",
      },
      {
        syntax: "#003_FA",
        meaning: "そのハッシュタグが付いた投稿を探します。",
        field: "名前・愛称・ハッシュタグ",
      },
    ],
  },
  {
    title: "アカウント",
    items: [
      {
        syntax: "from:nnhr_nunu",
        meaning: "その人の投稿だけを探します。@ は要りません。",
        field: "このアカウントの投稿だけ",
      },
      {
        syntax: "-from:nnhr_nunu",
        meaning: "その人の投稿を除きます。エゴサで自分の投稿を外すときに。",
        field: "除外する（アカウント）",
      },
      {
        syntax: "to:nnhr_nunu",
        meaning: "その人への返信を探します。",
      },
      {
        syntax: "@nnhr_nunu",
        meaning: "その人の @ が入った投稿（メンション・返信）を探します。",
      },
    ],
  },
  {
    title: "期間",
    items: [
      {
        syntax: "since:2026-09-01",
        meaning: "その日以降の投稿を探します。日本からは日本時間の 0 時から数えます。",
        field: "期間",
      },
      {
        syntax: "until:2026-09-30",
        meaning: "その日までの投稿を探します（その日を含みます）。since: と同じ日にすると、その 1 日分になります。",
        field: "期間",
      },
      {
        syntax: "since_time:1790000000",
        meaning: (
          <>
            UNIX 時間（1970 年からの秒数）より後の投稿を、秒単位で探します。
            <Code>since:2026-09-25_19:47:25_JST</Code> のように時刻まで書くこともできます。
          </>
        ),
        field: "前回の検索より後の投稿だけ",
      },
    ],
  },
  {
    title: "投稿の種類・反応",
    items: [
      {
        syntax: "filter:media",
        meaning: "画像か動画が付いた投稿だけを探します。ファンアートや写真を探すときに。",
        field: "画像・動画つきの投稿だけ",
      },
      {
        syntax: "filter:images",
        meaning: "画像が付いた投稿だけを探します。",
      },
      {
        syntax: "filter:links",
        meaning: "リンクが付いた投稿だけを探します。",
      },
      {
        syntax: "-filter:replies",
        meaning: "返信を除き、元の投稿だけにします。",
      },
      {
        syntax: "lang:ja",
        meaning: "X が日本語と判定した投稿だけを探します。",
      },
      {
        syntax: "min_faves:100",
        meaning: (
          <>
            いいねが 100 以上の投稿だけを探します。リポストは <Code>min_retweets:</Code>、返信は{" "}
            <Code>min_replies:</Code> です。
          </>
        ),
      },
      {
        syntax: 'url:"youtube.com/@nnhr_nunu"',
        meaning: "リンク先の URL にその文字を含む投稿を探します。短縮される前の URL で探せます。",
        field: "YouTube",
      },
    ],
  },
];

type Example = {
  title: string;
  query: string;
  note: string;
};

const EXAMPLES: Example[] = [
  {
    title: "自分のエゴサ（自分の投稿は除く）",
    query: "(ぬぬはら OR nunuhara OR ぬぬさん) -from:nnhr_nunu",
    note: "表記ゆれ（ひらがな・カタカナ・ローマ字・愛称）を OR でまとめると、取りこぼしが減ります。",
  },
  {
    title: "推しのファンアート",
    query: "(#003_FA OR ぬぬはら) filter:media",
    note: "ファンアートのタグと名前をまとめて、画像・動画つきに絞ります。",
  },
  {
    title: "推し本人の、ある月の投稿",
    query: "from:nnhr_nunu since:2026-09-01 until:2026-09-30",
    note: "「あの告知はいつだったか」を探すときに。",
  },
  {
    title: "話題になった投稿だけ",
    query: "ぬぬはら min_faves:100 -filter:replies",
    note: "反応の多い投稿から見たいときに。数字は好みで調整します。",
  },
];

const CAUTIONS: ReactNode[] = [
  <>
    コマンドの「:」の前後に空白を入れると効きません（<Code>from: nnhr_nunu</Code> ではなく{" "}
    <Code>from:nnhr_nunu</Code>）。
  </>,
  <>
    小文字の <Code>or</Code> は、ふつうの言葉として探されます。
  </>,
  "検索の文字は約 500 文字までです。超えると X がエラーを出します。",
  "鍵アカウントの投稿など、X の検索に出てこない投稿は見つかりません。検索結果を見るには、X へのログインが必要なことがあります。",
  "X の仕様は予告なく変わることがあります（このページの内容は 2026 年 9 月に確かめたものです）。",
];

export default function SearchOperatorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AdRailLayout label="広告">
        <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 sm:px-6">
          <div className="space-y-2 px-1">
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/" className="text-primary underline-offset-2 hover:underline">
                ← エゴサ支援ツール(ぬ)
              </Link>
              <Link href="/guide/" className="text-primary underline-offset-2 hover:underline">
                使い方
              </Link>
            </p>
            <h1 className="font-heading text-3xl font-bold tracking-tight [word-break:auto-phrase] text-foreground">
              X(Twitter)の検索コマンド一覧
            </h1>
            <p className="text-sm leading-relaxed [word-break:auto-phrase] text-muted-foreground">
              X の検索窓には、言葉のほかに「コマンド（検索演算子）」を書けます。期間・アカウント・除外などで絞り込むと、エゴサや推しのパブサで欲しい投稿が見つけやすくなります。
              エゴサ支援ツール(ぬ)は、画面で選んだ条件からこのコマンドを組み立てて X の検索を開きます。ツールで作れるものには、対応する入力欄の名前を添えました。
            </p>
          </div>

          {SECTIONS.map((section) => (
            <DocCard key={section.title}>
              <DocHeading>{section.title}</DocHeading>
              <dl className="divide-y divide-border">
                {section.items.map((item) => (
                  <div key={item.syntax} className="space-y-1 py-3 first:pt-1 last:pb-1">
                    <dt>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.95em] break-words">
                        <Query text={item.syntax} />
                      </code>
                    </dt>
                    <dd>{item.meaning}</dd>
                    {item.field ? (
                      <dd className="text-muted-foreground">
                        ツールでは <Field>{item.field}</Field>
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </DocCard>
          ))}

          <DocCard>
            <DocHeading>組み合わせの例</DocHeading>
            <div className="divide-y divide-border">
              {EXAMPLES.map((item) => (
                <div key={item.title} className="space-y-1.5 py-3 first:pt-1 last:pb-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p>
                    <code className="block rounded bg-muted px-2 py-1.5 font-mono text-[0.95em] break-words">
                      <Query text={item.query} />
                    </code>
                  </p>
                  <p className="text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>
          </DocCard>

          <DocCard>
            <DocHeading>気をつけること</DocHeading>
            <ul className="list-disc space-y-1.5 pl-5">
              {CAUTIONS.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </DocCard>

          <p className="px-1 text-sm leading-relaxed text-muted-foreground">
            コマンドを覚えなくても、エゴサ支援ツール(ぬ)なら欄に名前を入れて条件を選ぶだけで、この検索を作れます。作った検索はブラウザに保存され、次からはボタン 1 つで開けます。
          </p>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            ツールで検索を作る
          </Link>
        </main>
      </AdRailLayout>
    </div>
  );
}
