import type { HonorificId } from "./types";

export const HONORIFIC_CATALOG = [
  { id: "san", suffix: "さん", defaultOn: true },
  { id: "chan", suffix: "ちゃん", defaultOn: true },
  { id: "kun", suffix: "くん", defaultOn: false },
  { id: "kimi", suffix: "君", defaultOn: false },
  { id: "sama", suffix: "様", defaultOn: true },
  { id: "sensei", suffix: "先生", defaultOn: false },
  { id: "tan", suffix: "たん", defaultOn: false },
  { id: "shi", suffix: "氏", defaultOn: false },
] as const satisfies ReadonlyArray<{
  id: HonorificId;
  suffix: string;
  defaultOn: boolean;
}>;

export const ALL_HONORIFIC_IDS = HONORIFIC_CATALOG.map((item) => item.id);

export const DEFAULT_HONORIFIC_IDS: HonorificId[] = HONORIFIC_CATALOG.filter(
  (item) => item.defaultOn,
).map((item) => item.id);

const ID_SET = new Set<string>(ALL_HONORIFIC_IDS);

export function isHonorificId(value: string): value is HonorificId {
  return ID_SET.has(value);
}

export function normalizeHonorificIds(raw: string[]): HonorificId[] {
  const seen = new Set<HonorificId>();
  const out: HonorificId[] = [];
  for (const value of raw) {
    if (!isHonorificId(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return ALL_HONORIFIC_IDS.filter((id) => seen.has(id));
}

export function suffixesFor(ids: HonorificId[]): string[] {
  const enabled = new Set(ids);
  return HONORIFIC_CATALOG.filter((item) => enabled.has(item.id)).map((item) => item.suffix);
}

export function hasHonorificSuffix(term: string): boolean {
  return HONORIFIC_CATALOG.some((item) => term.endsWith(item.suffix));
}

export function expandSearchTerms(bases: string[], honorifics: HonorificId[]): string[] {
  const suffixes = suffixesFor(honorifics);
  const seen = new Set<string>();
  const out: string[] = [];

  function add(raw: string) {
    const term = raw.trim();
    if (!term || seen.has(term)) return;
    seen.add(term);
    out.push(term);
  }

  for (const base of bases) {
    const trimmed = base.trim();
    if (!trimmed) continue;
    add(trimmed);
    if (hasHonorificSuffix(trimmed)) continue;
    for (const suffix of suffixes) add(`${trimmed}${suffix}`);
  }
  return out;
}

export function isDerivedHonorific(term: string, bases: string[], honorifics: HonorificId[]): boolean {
  const trimmed = term.trim();
  const suffixes = suffixesFor(honorifics);
  if (suffixes.length === 0) return false;
  return bases.some((base) => {
    const root = base.trim();
    return Boolean(root) && trimmed !== root && suffixes.some((suffix) => trimmed === `${root}${suffix}`);
  });
}

export function toggleHonorific(current: HonorificId[], id: HonorificId): HonorificId[] {
  const enabled = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  return normalizeHonorificIds(enabled);
}
