import type { Metadata } from "next";
import { SITE_NAME } from "./share-post";

const OG_ALT = "エゴサ支援ツール(ぬ) — 名前も愛称も、まとめてエゴサ。";

/**
 * ページごとの title・description・正規 URL と、X や SNS に貼ったときのカード。
 * Next.js はページで openGraph・twitter を書くと layout の値を丸ごと置き換えるので、
 * 画像やサイト名もここでまとめて出す（書かないとトップの見出しと URL のカードになる）。
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      locale: "ja_JP",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: OG_ALT }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: "/og.png", alt: OG_ALT }],
    },
  };
}
