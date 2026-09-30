import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./defaults";
import { slotLabelOf } from "./slot-label";

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
