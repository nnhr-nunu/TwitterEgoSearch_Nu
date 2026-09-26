import type { Metadata } from "next";
import { Noto_Sans_JP, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { adConfig, adScriptSrc } from "@/lib/ads";
import { SITE_NAME, SITE_URL } from "@/lib/share-post";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const OG_ALT = "エゴサ支援ツール(ぬ) — 名前も愛称も、まとめてエゴサ。";
const TITLE = `${SITE_NAME} | X(Twitter)のエゴサ・推しのパブサをまとめて検索`;
const description =
  "名前・愛称・ハッシュタグを OR / AND でまとめて X(Twitter) 検索。エゴサーチはもちろん、推しのパブサ(パブリックサーチ)にも使えます。日付・画像で絞り込み、ミュートも可能。ログイン・アプリ連携不要の無料ツールです。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description,
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
  alternates: { canonical: "/" },
  // シェア投稿を X に貼ったとき大きいカードで出す。画像は app/og.png/route.tsx
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description,
    url: "/",
    locale: "ja_JP",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description,
    images: [{ url: "/og.png", alt: OG_ALT }],
  },
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
