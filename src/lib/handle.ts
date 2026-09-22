const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

export function normalizeHandle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const fromUrl = handleFromProfileUrl(trimmed);
  if (fromUrl) return fromUrl;

  return trimmed.replace(/^@+/, "").trim();
}

export function handleFromProfileUrl(raw: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withScheme);
    const host = url.hostname.replace(/^www\./, "");
    if (host !== "x.com" && host !== "twitter.com") return null;
    const first = url.pathname.split("/").filter(Boolean)[0] ?? "";
    const handle = first.replace(/^@+/, "");
    return HANDLE_RE.test(handle) ? handle : null;
  } catch {
    return null;
  }
}

export function isLikelyHandle(raw: string): boolean {
  const handle = normalizeHandle(raw);
  return HANDLE_RE.test(handle);
}

export function uniqueHandles(handles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of handles) {
    const handle = normalizeHandle(raw);
    if (!HANDLE_RE.test(handle)) continue;
    const key = handle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(handle);
  }
  return out;
}

export function parseHandleList(raw: string): string[] {
  const tokens = raw
    .split(/[\s,、]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return uniqueHandles(tokens);
}

export function profileUrl(handle: string): string {
  const normalized = normalizeHandle(handle);
  return normalized ? `https://x.com/${normalized}` : "https://x.com";
}
