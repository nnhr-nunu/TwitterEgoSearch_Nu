import { describe, expect, it } from "vitest";
import { builtinPresets, configsMatch } from "./presets";

describe("builtin presets", () => {
  it("keeps the own-posts shortcut distinct while media is hidden", () => {
    const presets = builtinPresets();
    expect(presets).toHaveLength(3);
    const [latest, media, own] = presets;
    // 画像・動画つきだけ非表示中は latest と media が同じになる
    expect(configsMatch(latest.config, own.config)).toBe(false);
    expect(configsMatch(media.config, own.config)).toBe(false);
  });
});
