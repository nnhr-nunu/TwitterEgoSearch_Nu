import { describe, expect, it } from "vitest";
import { builtinPresets, configsMatch } from "./presets";

describe("builtin presets", () => {
  it("keeps demo shortcuts distinct from each other", () => {
    const presets = builtinPresets();
    expect(presets).toHaveLength(3);
    for (let i = 0; i < presets.length; i += 1) {
      for (let j = i + 1; j < presets.length; j += 1) {
        expect(configsMatch(presets[i].config, presets[j].config)).toBe(false);
      }
    }
  });
});
