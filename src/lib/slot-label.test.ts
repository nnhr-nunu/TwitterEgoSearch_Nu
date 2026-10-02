import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./defaults";
import { slotLabelOf, slotTitleOf } from "./slot-label";

describe("slotLabelOf", () => {
  it("falls back to 設定N for an empty setup", () => {
    expect(slotLabelOf(createDefaultConfig(), "設定2")).toBe("設定2");
  });

  it("shows the first search name, or the first account when there are no names", () => {
    const config = createDefaultConfig();
    expect(slotLabelOf({ ...config, keywords: [" ", "ぬぬはら", "ぬぬさん"], handles: ["nnhr_nunu"] }, "設定1")).toBe("ぬぬはら");
    expect(slotLabelOf({ ...config, handles: ["nnhr_nunu"] }, "設定1")).toBe("@nnhr_nunu");
  });

  it("prefers a name the user gave", () => {
    const config = { ...createDefaultConfig(), keywords: ["ぬぬはら"], displayName: " 自分 " };
    expect(slotLabelOf(config, "設定1")).toBe("自分");
  });
});

describe("slotTitleOf", () => {
  it("shows only 設定N when the tab has no other name", () => {
    expect(slotTitleOf(createDefaultConfig(), "設定2", "{slot}「{name}」")).toBe("設定2");
  });

  it("puts the tab name next to 設定N", () => {
    const config = { ...createDefaultConfig(), keywords: ["ぬぬはら"] };
    expect(slotTitleOf(config, "設定1", "{slot}「{name}」")).toBe("設定1「ぬぬはら」");
    expect(slotTitleOf({ ...config, displayName: "自分" }, "Setup 1", '{slot} ("{name}")')).toBe('Setup 1 ("自分")');
  });

  it("keeps a $ in the name as it is", () => {
    const config = { ...createDefaultConfig(), displayName: "$$ぬぬ$&" };
    expect(slotTitleOf(config, "設定1", "{slot}「{name}」")).toBe("設定1「$$ぬぬ$&」");
  });
});
