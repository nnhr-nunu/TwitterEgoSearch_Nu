const NAME_SPLIT = /[ \u3000,，、]+/;

export function splitSearchNames(raw: string): string[] {
  const normalized = raw.normalize("NFC");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of normalized.split(NAME_SPLIT)) {
    const token = part.trim();
    if (!token) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}
