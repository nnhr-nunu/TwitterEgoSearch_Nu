import { describe, expect, it } from "vitest";
import { createDefaultConfig, hydrateConfig } from "./defaults";
import { sharedImportTarget } from "./shared-import";

const filled = (keyword: string) => hydrateConfig({ keywords: [keyword] });

describe("sharedImportTarget", () => {
  it("uses the first empty setup without replacing anything", () => {
    const slots = [filled("ぬぬはら"), createDefaultConfig(), createDefaultConfig()];
    expect(sharedImportTarget(slots, 0)).toEqual({ target: 1, replaces: false });
    expect(sharedImportTarget(slots, 2)).toEqual({ target: 1, replaces: false });
  });

  it("replaces the open setup when all three are in use", () => {
    const slots = [filled("ぬぬはら"), filled("ぬぬさん"), filled("Nunu Hara")];
    expect(sharedImportTarget(slots, 0)).toEqual({ target: 0, replaces: true });
    expect(sharedImportTarget(slots, 2)).toEqual({ target: 2, replaces: true });
  });

  it("treats a setup with only a name or muted words as in use", () => {
    const slots = [
      hydrateConfig({ displayName: "自分" }),
      hydrateConfig({ mutedKeywords: ["#pr"] }),
      createDefaultConfig(),
    ];
    expect(sharedImportTarget(slots, 0)).toEqual({ target: 2, replaces: false });
  });
});
