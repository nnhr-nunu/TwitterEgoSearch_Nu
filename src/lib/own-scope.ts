import { normalizeHandle } from "./handle";
import type { OwnScope, SearchConfig } from "./types";

export function hasSearchHandle(config: SearchConfig): boolean {
  return Boolean(normalizeHandle(config.handle));
}

export function ownScopeOf(config: SearchConfig): OwnScope {
  if (!hasSearchHandle(config)) return "everyone";
  if (config.fromSelf) return "self";
  if (config.excludeOwn) return "others";
  return "everyone";
}

export function patchOwnScope(scope: OwnScope): Pick<SearchConfig, "fromSelf" | "excludeOwn"> {
  if (scope === "self") return { fromSelf: true, excludeOwn: false };
  if (scope === "everyone") return { fromSelf: false, excludeOwn: false };
  return { fromSelf: false, excludeOwn: true };
}
