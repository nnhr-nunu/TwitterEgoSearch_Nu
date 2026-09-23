import { describe, expect, it } from "vitest";
import { builtinPresets, configsMatch } from "./presets";

describe("builtin presets", () => {
  it("keeps latest, media, and own-posts shortcuts distinct", () => {
    const presets = builtinPresets();
    expect(presets).toHaveLength(3);
    const [latest, media, own] = presets;
    expect(latest.config.mediaOnly).toBe(false);
    expect(media.config.mediaOnly).toBe(true);
    expect(configsMatch(latest.config, media.config)).toBe(false);
    expect(configsMatch(latest.config, own.config)).toBe(false);
    expect(configsMatch(media.config, own.config)).toBe(false);
  });
});
