const STATUS_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
  "mobile.x.com",
]);

export function tweetIntentUrl(options: { text?: string; url?: string }): string {
  const params = new URLSearchParams();
  if (options.text?.trim()) params.set("text", options.text.trim());
  if (options.url?.trim()) params.set("url", options.url.trim());
  return `https://x.com/intent/tweet?${params.toString()}`;
}

export function parseStatusUrl(raw: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw.trim())
      ? raw.trim()
      : `https://${raw.trim()}`;
    const url = new URL(withScheme);
    if (!STATUS_HOSTS.has(url.hostname)) return null;
    const match = url.pathname.match(/\/status\/(\d+)/);
    if (!match) return null;
    const handle = url.pathname.split("/").filter(Boolean)[0] ?? "i";
    return `https://x.com/${handle}/status/${match[1]}`;
  } catch {
    return null;
  }
}

export function quotePostIntentUrl(statusUrl: string): string | null {
  const normalized = parseStatusUrl(statusUrl);
  if (!normalized) return null;
  return tweetIntentUrl({ url: normalized });
}
