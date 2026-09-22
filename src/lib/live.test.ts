import { describe, expect, it } from "vitest";
import { createDefaultConfig, createOwnerSampleConfig } from "./defaults";
import { buildLivePostsUrl } from "./live";
import { canSearchPosts } from "./query";

describe("buildLivePostsUrl", () => {
  it("always uses the live tab even if the form is set to top", () => {
    const url = buildLivePostsUrl({
      ...createOwnerSampleConfig(),
      latest: false,
    });
    expect(url).toContain("f=live");
    expect(url.startsWith("https://x.com/search?")).toBe(true);
  });

  it("does not treat a blank first-run config as searchable", () => {
    const config = createDefaultConfig();
    expect(canSearchPosts(config)).toBe(false);
    expect(new URL(buildLivePostsUrl(config)).searchParams.get("q")).toBe("filter:media");
  });
});
