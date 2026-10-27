import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/robots.txt/route";
import { AiNotice } from "@/components/ai-notice";
import { AI_NOTICE_EN, AI_NOTICE_JA, AI_TRAIN_BOTS, CONTENT_SIGNAL } from "@/lib/aiGuard";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
  it("AI の学習のボットを全部止め、検索の約束（Content-Signal）を付ける", async () => {
    const res = GET();
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text).toContain("User-agent: GPTBot\n");
    for (const bot of AI_TRAIN_BOTS) expect(text).toContain(`User-agent: ${bot}\n`);
    expect(text).toMatch(/User-agent: Scrapy\nDisallow: \/\n/);
    expect(text).toContain(`Content-Signal: ${CONTENT_SIGNAL}`);
    expect(text).toContain("Disallow: /_archive/");
  });

  it("今までの決まり（ほかは全部読ませる）と sitemap を残す", async () => {
    const all = (await GET().text()).split("User-agent: *\n")[1];
    expect(all).toContain("Allow: /\n");
    expect(all).not.toMatch(/^Disallow: \/$/m);
    expect(all).toContain("Sitemap: https://self-search.oshilog.life/sitemap.xml");
  });
});

describe("ページの中の AI 向けの案内", () => {
  it("人の目・読み上げ・検索の抜粋に出さず、案内とおとりのリンクを置く", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    const html = renderToStaticMarkup(createElement(AiNotice));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("data-nosnippet");
    expect(html).not.toContain("display:none");
    expect(html).toContain("clip-path:inset(50%)");
    expect(html).toContain(AI_NOTICE_JA);
    expect(html).toContain(AI_NOTICE_EN.replace(/"/g, "&quot;"));
    expect(html).toContain('<a href="/_archive/" rel="nofollow" tabindex="-1">archive</a>');
  });

  it("おとりのリンクに basePath を付ける", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/self-search");
    expect(renderToStaticMarkup(createElement(AiNotice))).toContain('href="/self-search/_archive/"');
  });
});
