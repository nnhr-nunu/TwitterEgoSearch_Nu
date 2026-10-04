import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./share-post";

const OG_ALT = `${SITE_NAME} — 名前も愛称も、まとめてエゴサ。`;

/** トップの説明。meta description・カード・構造化データで同じ文を使う */
export const SITE_DESCRIPTION =
  "名前・愛称・ハッシュタグを OR / AND でまとめて X(Twitter) 検索。エゴサーチはもちろん、推しのパブサ(パブリックサーチ)にも使えます。日付・画像で絞り込み、ミュートも可能。ログイン・アプリ連携不要の無料ツールです。";

/**
 * トップに置く WebSite の構造化データ（JSON-LD の文字列）。画面に文字を足さずに、
 * 検索エンジンへサイト名と何のサイトかを伝える。< は script タグを閉じないよう < にする
 */
export function websiteJsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "エゴサ支援ツール",
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "ja",
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

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
