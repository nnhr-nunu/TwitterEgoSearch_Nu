import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "./defaults";
import { ownScopeOf, patchOwnScope } from "./own-scope";

describe("own scope", () => {
  it("never turns exclude-own and from-self on together", () => {
    for (const scope of ["others", "everyone", "self"] as const) {
      const patch = patchOwnScope(scope);
      expect(patch.fromSelf && patch.excludeOwn).toBe(false);
      expect(
        ownScopeOf({ ...createDefaultConfig(), handle: "user", handles: ["user"], ...patch }),
      ).toBe(scope);
    }
  });

  it("treats an empty username as everyone, even if exclude-own is stored", () => {
    expect(
      ownScopeOf({
        ...createDefaultConfig(),
        handle: "",
        handles: [],
        excludeOwn: true,
        fromSelf: false,
      }),
    ).toBe("everyone");
  });
});
