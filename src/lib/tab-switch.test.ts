import { describe, expect, it } from "vitest";
import { switchesTabOnMouseDown } from "./tab-switch";

describe("switchesTabOnMouseDown", () => {
  it("switches on a plain left click, also with shift / alt / cmd held", () => {
    expect(switchesTabOnMouseDown({ button: 0, ctrlKey: false })).toBe(true);
    const withModifiers = { button: 0, ctrlKey: false, metaKey: true, shiftKey: true, altKey: true };
    expect(switchesTabOnMouseDown(withModifiers)).toBe(true);
  });

  it("does not switch on a right or middle click", () => {
    expect(switchesTabOnMouseDown({ button: 2, ctrlKey: false })).toBe(false);
    expect(switchesTabOnMouseDown({ button: 1, ctrlKey: false })).toBe(false);
  });

  it("does not switch on ctrl + click (the context menu on a Mac)", () => {
    expect(switchesTabOnMouseDown({ button: 0, ctrlKey: true })).toBe(false);
  });
});
