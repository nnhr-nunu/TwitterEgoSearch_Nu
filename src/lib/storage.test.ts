import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultConfig } from "./defaults";
import {
  CONFIG_STORAGE_KEY,
  loadActiveSlot,
  loadSlots,
  saveActiveSlot,
  saveSlots,
  SLOT_INDEX_KEY,
  SLOTS_STORAGE_KEY,
} from "./storage";

function mockStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: globalThis.localStorage },
  });
}

describe("slot storage", () => {
  beforeEach(() => {
    mockStorage();
  });

  it("migrates a legacy single config into 設定1", () => {
    const legacy = {
      ...createDefaultConfig(),
      keywords: ["たろう"],
      handle: "demo_user",
      handles: ["demo_user"],
    };
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(legacy));
    const slots = loadSlots();
    expect(slots).toHaveLength(3);
    expect(slots[0].keywords).toEqual(["たろう"]);
    expect(slots[0].handles).toEqual(["demo_user"]);
    expect(slots[1].keywords).toEqual([]);
    expect(slots[2].keywords).toEqual([]);
  });

  it("round-trips three independent slots", () => {
    const slots = [createDefaultConfig(), createDefaultConfig(), createDefaultConfig()];
    slots[1] = { ...slots[1], keywords: ["二番目"], sort: "likes", latest: false };
    slots[2] = { ...slots[2], keywords: ["三番目"], sort: "oldest", latest: false };
    saveSlots(slots);
    saveActiveSlot(2);
    const loaded = loadSlots();
    expect(loaded[1].keywords).toEqual(["二番目"]);
    expect(loaded[1].sort).toBe("likes");
    expect(loaded[2].keywords).toEqual(["三番目"]);
    // 古い順は非表示にしたので最新順へ戻す
    expect(loaded[2].sort).toBe("latest");
    expect(loadActiveSlot()).toBe(2);
    expect(window.localStorage.getItem(SLOTS_STORAGE_KEY)).toContain("二番目");
    expect(window.localStorage.getItem(SLOT_INDEX_KEY)).toBe("2");
  });
});
