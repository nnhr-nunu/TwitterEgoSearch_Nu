import { aiRobotsTxt } from "@/lib/aiGuard";
import { SITE_URL } from "@/lib/share-post";

// 静的エクスポートなので、ビルド時に out/robots.txt を 1 枚だけ作る
export const dynamic = "force-static";

/** AI の学習のボットは全部止め（aiGuard.ts）、ほかは全部読ませる */
export function GET() {
  const body = aiRobotsTxt({ rules: ["Allow: /"], sitemap: `${SITE_URL}/sitemap.xml` });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
