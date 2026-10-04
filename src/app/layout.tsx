import type { Metadata } from "next";
import { Noto_Sans_JP, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { adConfig, adScriptSrc } from "@/lib/ads";
import { SITE_NAME, SITE_URL } from "@/lib/share-post";
import { pageMetadata } from "@/lib/site-metadata";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  // 太さを並べると、日本語の分割（約 120 個）ごとに @font-face が太さの数だけ増え、描画を止める CSS が重くなる。
  // 可変フォント 1 つなら CSS は約 3 分の 1 で、読むフォントファイルは同じ（Google Fonts は太さを並べても可変フォントを返す）
  weight: "variable",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // シェア投稿を X に貼ったとき大きいカードで出す。画像は app/og.png/route.tsx
  ...pageMetadata({
    title: `${SITE_NAME} | X(Twitter)のエゴサ・推しのパブサをまとめて検索`,
    description:
      "名前・愛称・ハッシュタグを OR / AND でまとめて X(Twitter) 検索。エゴサーチはもちろん、推しのパブサ(パブリックサーチ)にも使えます。日付・画像で絞り込み、ミュートも可能。ログイン・アプリ連携不要の無料ツールです。",
    path: "/",
  }),
  keywords: [
    "エゴサ",
    "エゴサーチ",
    "パブサ",
    "パブリックサーチ",
    "推し",
    "X 検索",
    "Twitter 検索",
    "高度な検索",
    "検索コマンド",
  ],
  // AdSense のサイト所有確認用。ID 未設定なら出さない。
  ...(adConfig.client ? { other: { "google-adsense-account": adConfig.client } } : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased`}
    >
      {adConfig.client ? (
        <head>
          {/* next/script は data-nscript を付けて AdSense が警告するため素の script を使う。 */}
          <script async src={adScriptSrc(adConfig.client)} crossOrigin="anonymous" />
        </head>
      ) : null}
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
