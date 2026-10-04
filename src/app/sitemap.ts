import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/share-post";

// 静的エクスポートなので、ビルド時に sitemap.xml を 1 枚だけ作る
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/guide/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/guide/search-operators/`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy/`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
