import { describe, expect, it } from "vitest";
import { pageMetadata } from "./site-metadata";

describe("pageMetadata", () => {
  const meta = pageMetadata({ title: "使い方", description: "説明", path: "/guide/" });

  it("リンクカードの URL と見出しをそのページのものにする", () => {
    expect(meta.alternates).toEqual({ canonical: "/guide/" });
    expect(meta.openGraph).toMatchObject({ title: "使い方", description: "説明", url: "/guide/" });
    expect(meta.twitter).toMatchObject({ title: "使い方", description: "説明" });
  });

  it("ページで openGraph を書くと親の値が丸ごと消えるので、画像もページごとに持つ", () => {
    expect(meta.openGraph).toMatchObject({ siteName: "エゴサ支援ツール(ぬ)", locale: "ja_JP" });
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: "/og.png", width: 1200 })]);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
    expect(meta.twitter?.images).toEqual([expect.objectContaining({ url: "/og.png" })]);
  });
});
