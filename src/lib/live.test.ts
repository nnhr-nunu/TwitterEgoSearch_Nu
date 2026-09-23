import { describe, expect, it } from "vitest";
import { createDefaultConfig, createOwnerSampleConfig } from "./defaults";
import { buildLivePostsUrl } from "./live";
import { canSearchPosts } from "./query";

describe("buildLivePostsUrl", () => {
  it("uses f=live for 最新順", () => {
    const url = buildLivePostsUrl({
      ...createOwnerSampleConfig(),
      sort: "latest",
      latest: true,
    });
    expect(url).toContain("f=live");
    expect(url.startsWith("https://x.com/search?")).toBe(true);
  });

  it("uses f=top for 人気順", () => {
    const url = buildLivePostsUrl({
      ...createOwnerSampleConfig(),
      sort: "likes",
      latest: false,
    });
    expect(url).toContain("f=top");
    expect(url).not.toContain("f=live");
  });

  it("omits f for 古い順 because X has no oldest-first tab", () => {
    const url = new URL(
      buildLivePostsUrl({
        ...createOwnerSampleConfig(),
        sort: "oldest",
        latest: false,
      }),
    );
    expect(url.searchParams.get("f")).toBeNull();
  });

  it("does not treat a blank first-run config as searchable", () => {
    const config = createDefaultConfig();
    expect(canSearchPosts(config)).toBe(false);
    const query = new URL(buildLivePostsUrl(config)).searchParams.get("q") ?? "";
    expect(query).toBe("");
    expect(query).not.toContain("filter:media");
    expect(query).not.toContain("since:");
  });
});
