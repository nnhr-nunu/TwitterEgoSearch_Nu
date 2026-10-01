import { buildSearchUrl, buildPostsQuery } from "./query";
import type { Locale, SearchConfig } from "./types";

export function buildLivePostsUrl(config: SearchConfig, locale?: Locale): string {
  return buildSearchUrl(
    buildPostsQuery(config, { locale }),
    "posts",
    config.sort ?? (config.latest ? "latest" : "likes"),
  );
}
