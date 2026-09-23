import type { Metadata } from "next";
import { Noto_Sans_JP, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { adConfig, adScriptSrc } from "@/lib/ads";
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

export const metadata: Metadata = {
  title: "エゴサ支援ツール(ぬ)",
  description: "Twitter / X の検索URLを組み立ててワンクリックで開くエゴサ支援ツール。ログインもAPIも不要です。",
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
