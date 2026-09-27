import { describe, expect, it } from "vitest";
import { channelNameWords, titleKeyword } from "./title-keywords";

describe("titleKeyword", () => {
  it.each([
    ["【歌ってみた】シャルル / ぬぬはら【cover】", "シャルル"],
    ["『シャルル』を歌ってみた #shorts", "シャルル"],
    ["夜に駆ける - ぬぬはら (Official Music Video)", "夜に駆ける"],
    ["Lemon covered by ぬぬはら", "Lemon"],
    ["【雑談】今日はゆっくり話そう！初見さん歓迎 #新人Vtuber", "今日はゆっくり話そう！初見さん歓迎"],
    ["#shorts", ""],
    ["【MV】", ""],
  ])("%s → %s", (title, keyword) => {
    expect(titleKeyword(title)).toBe(keyword);
  });

  it("skips segments that are only the channel name", () => {
    expect(titleKeyword("ぬぬはら / シャルル", ["ぬぬはら"])).toBe("シャルル");
    expect(titleKeyword("ぬぬはら - 夜に駆ける (Official Music Video)", ["ぬぬはら"])).toBe("夜に駆ける");
  });

  it("cuts long titles at a word boundary", () => {
    const keyword = titleKeyword("とても長いタイトルの配信です、今日はみんなでゲームをしながらのんびり話していきましょう");
    expect(keyword).toBe("とても長いタイトルの配信です");
  });
});

describe("channelNameWords", () => {
  it.each([
    ["ぬぬはら / nnhr Ch.", ["ぬぬはら", "nnhr"]],
    ["ぬぬはらチャンネル【新人Vtuber】", ["ぬぬはら"]],
    ["Rich", ["Rich"]],
    ["Nunu Channel", ["Nunu"]],
  ])("%s", (title, words) => {
    expect(channelNameWords(title)).toEqual(words);
  });
});
