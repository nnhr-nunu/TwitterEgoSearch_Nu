import { buildSearchUrl, buildPostsQuery } from "./query";
import type { SearchConfig } from "./types";

export function buildLivePostsUrl(config: SearchConfig): string {
  return buildSearchUrl(buildPostsQuery(config), "posts", config.sort ?? (config.latest ? "latest" : "likes"));
}
