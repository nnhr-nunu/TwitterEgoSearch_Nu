import { describe, expect, it } from "vitest";
import { createOwnerSampleConfig } from "./defaults";
import type { HonorificId } from "./types";
import {
  buildPeopleQuery,
  buildPostsQuery,
  buildSearchUrl,
  canSearchPeople,
  canSearchPosts,
  orGroup,
  quoteTerm,
  sortParamOf,
} from "./query";

describe("quoteTerm", () => {
  it("wraps when requested and strips inner quotes", () => {
    expect(quoteTerm('ぬぬ"はら', true)).toBe('"ぬぬはら"');
  });

  it("wraps terms with spaces even without the flag", () => {
    expect(quoteTerm("nu nu", false)).toBe('"nu nu"');
  });

  it("leaves a single token alone when wrapping is off", () => {
    expect(quoteTerm("nnhr", false)).toBe("nnhr");
  });
});

describe("orGroup", () => {
  it("joins quoted keywords with OR", () => {
    expect(orGroup(["ぬぬはら", "ぬぬさん"], true)).toBe(
      '("ぬぬはら" OR "ぬぬさん")',
    );
  });
});

describe("buildPostsQuery", () => {
  it("builds the demo ego-search query", () => {
    const query = buildPostsQuery(createOwnerSampleConfig());
    expect(query).toContain("ぬぬはら");
    expect(query).toContain("ぬぬさん");
    expect(query).toContain("\uFF87\uFF87\u{1FAC0}");
    expect(query).not.toContain("ぬぬはらさん");
    expect(query).not.toContain("filter:media");
    expect(query).not.toContain("since:");
    expect(query).toContain("from:nnhr_nunu");
    expect(query).not.toContain("-from:nnhr_nunu");
  });

  it("narrows to the account with from: regardless of legacy own-scope flags", () => {
    const query = buildPostsQuery({
      ...createOwnerSampleConfig(),
      fromSelf: false,
      excludeOwn: true,
    });
    expect(query).toContain("from:nnhr_nunu");
    expect(query).not.toContain("-from:");
  });

  it("accepts a profile URL as the handle", () => {
    const query = buildPostsQuery({
      ...createOwnerSampleConfig(),
      handle: "https://x.com/nnhr_nunu",
      handles: ["https://x.com/nnhr_nunu"],
      keywords: ["test"],
      wrapQuotes: false,
    });
    expect(query).toContain("from:nnhr_nunu");
  });

  it("adds filter:media when the media toggle is on and keeps explicit dates", () => {
    const query = buildPostsQuery({
      ...createOwnerSampleConfig(),
      keywords: ["ぬぬはら"],
      mediaOnly: true,
      since: "2026-01-01",
      until: "2026-02-01",
    });
    expect(query).toContain("filter:media");
    expect(query).toContain("since:2026-01-01");
    expect(query).toContain("until:2026-02-01");
  });

  it("omits since/until when date filter is off", () => {
    const query = buildPostsQuery(createOwnerSampleConfig());
    expect(query).not.toContain("since:");
    expect(query).not.toContain("until:");
  });

  it("adds -from: for muted accounts but never mutes a narrowed account", () => {
    const query = buildPostsQuery({
      ...createOwnerSampleConfig(),
      keywords: ["ぬぬはら"],
      mutedHandles: ["spam_bot", "@nnhr_nunu", "https://x.com/noise_acc"],
    });
    expect(query).toContain("from:nnhr_nunu");
    expect(query).not.toContain("-from:nnhr_nunu");
    expect(query).toContain("-from:spam_bot");
    expect(query).toContain("-from:noise_acc");
  });

  it("ORs every narrowed @id with from:", () => {
    const query = buildPostsQuery({
      ...createOwnerSampleConfig(),
      handle: "alice",
      handles: ["alice", "alice_alt"],
      keywords: ["たろう"],
      honorifics: [],
      wrapQuotes: false,
      mediaOnly: false,
      mutedHandles: [],
      since: "",
      until: "",
    });
    expect(query).toBe("たろう (from:alice OR from:alice_alt)");
  });

  it("ANDs filter keywords and minuses muted keywords", () => {
    const query = buildPostsQuery({
      ...createOwnerSampleConfig(),
      keywords: ["たろう"],
      honorifics: [],
      wrapQuotes: true,
      mediaOnly: false,
      filterKeywords: ["イラスト"],
      mutedKeywords: ["広告"],
      mutedHandles: [],
      since: "",
      until: "",
    });
    expect(query).toContain('"たろう"');
    expect(query).toContain('"イラスト"');
    expect(query).toContain('-"広告"');
  });

  it("skips min_faves while the like-count filter is hidden", () => {
    const base = { ...createOwnerSampleConfig(), keywords: ["ぬぬはら"] };
    expect(buildPostsQuery(base)).not.toContain("min_faves:");
    expect(buildPostsQuery({ ...base, minFaves: 100 })).not.toContain("min_faves:");
  });

  it("allows an account-only search with no keywords", () => {
    const config = {
      ...createOwnerSampleConfig(),
      keywords: [],
      mediaOnly: false,
      since: "",
      until: "",
    };
    expect(canSearchPosts(config)).toBe(true);
    expect(buildPostsQuery(config)).toBe("from:nnhr_nunu");
  });

  it("does not add honorifics when none are on", () => {
    const query = buildPostsQuery({
      ...createOwnerSampleConfig(),
      keywords: ["\uFF87\uFF87\u{1FAC0}"],
      honorifics: [],
      mediaOnly: false,
    });
    expect(query).toContain("\uFF87\uFF87\u{1FAC0}");
    expect(query).not.toContain("\uFF87\uFF87\u{1FAC0}さん");
  });

  it("searches everyone by 呼ばれ方 when the username is empty", () => {
    const config = {
      ...createOwnerSampleConfig(),
      handle: "",
      handles: [],
      keywords: ["たろう"],
      honorifics: [] as HonorificId[],
      excludeOwn: true,
      mediaOnly: false,
      mutedHandles: [],
    };
    expect(canSearchPosts(config)).toBe(true);
    const query = buildPostsQuery(config);
    expect(query).toContain("たろう");
    expect(query).not.toContain("-from:");
    expect(query).not.toContain("from:");
  });
});

describe("people and urls", () => {
  it("builds a people query without from operators", () => {
    expect(buildPeopleQuery(createOwnerSampleConfig())).toContain("ぬぬはら");
    expect(buildPeopleQuery(createOwnerSampleConfig())).not.toContain("from:");
  });

  it("maps 話題のポスト順 onto X f=top without inventing operators", () => {
    expect(sortParamOf("latest")).toBe("live");
    expect(sortParamOf("likes")).toBe("top");
    expect(sortParamOf("oldest")).toBeNull();
    expect(buildSearchUrl("ぬぬはら", "posts", "latest")).toContain("f=live");
    expect(buildSearchUrl("ぬぬはら", "posts", "likes")).toContain("f=top");
    expect(buildSearchUrl("ぬぬはら", "posts", "oldest")).not.toMatch(/[?&]f=/);
    expect(buildSearchUrl("ぬぬはら", "people", "latest")).toContain("f=user");
  });

  it("blocks empty people search", () => {
    expect(canSearchPeople({ ...createOwnerSampleConfig(), keywords: ["  "] })).toBe(
      false,
    );
  });
});

describe("matchAll", () => {
  it("AND トグルがオンなら検索名を空白でつなぐ", () => {
    const config = { ...createOwnerSampleConfig(), handles: [], handle: "", keywords: ["ぬぬはら", "推し"], matchAll: true };
    expect(buildPostsQuery(config)).toBe('"ぬぬはら" "推し"');
  });

  it("既定はオフで OR のまま", () => {
    const config = { ...createOwnerSampleConfig(), handles: [], handle: "", keywords: ["ぬぬはら", "推し"] };
    expect(createOwnerSampleConfig().matchAll).toBe(false);
    expect(buildPostsQuery(config)).toBe('("ぬぬはら" OR "推し")');
  });
});
