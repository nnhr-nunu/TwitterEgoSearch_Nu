import { describe, expect, it } from "vitest";
import { createDefaultConfig, hydrateConfig } from "./defaults";
import { buildTransferHash, buildTransferUrl, hasTransferContent, parseTransferHash, TRANSFER_HASH_PREFIX } from "./transfer";
import { createDefaultUrlSearch } from "./url-search";

function slots() {
  return [
    hydrateConfig({
      keywords: ["ぬぬはら", "Nunu Hara", "#003_FA"],
      mutedHandles: ["nnhr_nunu"],
      mutedKeywords: ["#pr"],
      displayName: "自分",
      mediaOnly: true,
      sort: "likes",
      rangeFilter: true,
      rangeStart: "2026-09-01",
      rangeEnd: "2026-09-30",
    }),
    hydrateConfig({ handles: ["nnhr_nunu"], filterKeywords: ["告知"], matchAll: true, dateFilter: true, aroundDate: "2026-09-20", dateSpan: "14" }),
    createDefaultConfig(),
  ];
}

describe("transfer link", () => {
  it("round-trips the three setups and the YouTube tab", () => {
    const youtube = {
      ...createDefaultUrlSearch(),
      url: "https://www.youtube.com/@nnhr_nunu",
      channelWords: { UCqYpbbypex0iOikcZRenxGA: ["#ぬぬ配信"] },
      excluded: ["spam_bot"],
      period: "month" as const,
    };
    const hash = buildTransferHash(slots(), youtube);
    // URL にそのまま置ける文字だけにする
    expect(hash).toMatch(/^#import=[A-Za-z0-9_-]+$/);
    expect(parseTransferHash(hash)).toEqual({ slots: slots(), youtube });
  });

  it("leaves the YouTube tab alone when nothing was entered there", () => {
    const data = parseTransferHash(buildTransferHash(slots(), createDefaultUrlSearch()));
    expect(data?.youtube).toBeNull();
    expect(data?.slots[0].keywords).toEqual(["ぬぬはら", "Nunu Hara", "#003_FA"]);
  });

  it("puts the data after # so it is not sent to the server", () => {
    expect(buildTransferUrl("https://self-search.oshilog.life/", slots(), null)).toMatch(
      /^https:\/\/self-search\.oshilog\.life\/#import=/,
    );
  });

  it("knows when there is nothing to hand over", () => {
    const blank = [createDefaultConfig(), createDefaultConfig(), createDefaultConfig()];
    expect(hasTransferContent(blank, createDefaultUrlSearch())).toBe(false);
    expect(hasTransferContent(slots(), null)).toBe(true);
    expect(parseTransferHash(buildTransferHash(blank, null))).toBeNull();
  });

  it("hands over a setup that only has exclusions or a name", () => {
    const mutesOnly = [hydrateConfig({ mutedHandles: ["spam_bot"], mutedKeywords: ["#pr"] }), createDefaultConfig(), createDefaultConfig()];
    expect(hasTransferContent(mutesOnly, null)).toBe(true);
    expect(parseTransferHash(buildTransferHash(mutesOnly, null))?.slots[0].mutedHandles).toEqual(["spam_bot"]);
    const nameOnly = [createDefaultConfig(), hydrateConfig({ displayName: "推しA" }), createDefaultConfig()];
    expect(hasTransferContent(nameOnly, null)).toBe(true);
  });

  it("ignores other hashes and broken or tampered links", () => {
    expect(parseTransferHash("")).toBeNull();
    expect(parseTransferHash("#top")).toBeNull();
    expect(parseTransferHash(`${TRANSFER_HASH_PREFIX}%%%`)).toBeNull();
    expect(parseTransferHash(`${TRANSFER_HASH_PREFIX}${btoa("[1,2]")}`)).toBeNull();
    // 形の合わない値は既定値にして、読める項目だけ使う
    const odd = btoa(JSON.stringify({ v: 1, slots: [{ keywords: ["ok", 5], mutedHandles: "x", sort: "weird", rangeFilter: true, rangeStart: "9999-99-99" }] }));
    const data = parseTransferHash(`${TRANSFER_HASH_PREFIX}${odd}`);
    expect(data?.slots).toHaveLength(3);
    expect(data?.slots[0].keywords).toEqual(["ok"]);
    expect(data?.slots[0].mutedHandles).toEqual([]);
    expect(data?.slots[0].sort).toBe("latest");
    expect(data?.slots[0].rangeStart).toBe("");
  });
});
