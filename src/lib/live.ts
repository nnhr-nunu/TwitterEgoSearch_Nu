import { buildSearchUrl, buildPostsQuery } from "./query";
import type { SearchConfig } from "./types";

export const LIVE_TAB_SESSION_KEY = "egosearch-nu:live-tab";

export function buildLivePostsUrl(config: SearchConfig): string {
  return buildSearchUrl(buildPostsQuery(config), "posts", true);
}

export function maybeOpenLiveTab(url: string): "opened" | "blocked" | "skipped" {
  if (typeof window === "undefined" || !url) return "skipped";
  try {
    if (window.sessionStorage.getItem(LIVE_TAB_SESSION_KEY)) return "skipped";
    window.sessionStorage.setItem(LIVE_TAB_SESSION_KEY, "1");
  } catch {
    return "skipped";
  }
  const popup = window.open(url, "_blank");
  if (!popup) return "blocked";
  try {
    popup.opener = null;
  } catch {
    // ignore
  }
  return "opened";
}
