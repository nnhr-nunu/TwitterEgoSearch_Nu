# X の実検索で確かめる一覧

このツールが組み立てる検索を X で開き、期待どおりかを確かめる（X の仕様は予告なく変わるので、3 か月ごとと、検索の組み立てを変えたとき）。
X にログインした状態で各リンクを開き、結果の表に ○×と気づいたことを書く（AI は X にログインしないので、本人が開いて結果を伝える）。

- 表は `src/lib/x-check.ts` から `npm run x-check` で作る（手で書き換えない。`npm test` で組み立てとずれていないかを見る）
- × のときに直す所: 1〜8 は `src/lib/query.ts`、9 は `NEGATIVE_FILL_LIMIT`（`src/lib/query.ts`）と `src/lib/negative-words.ts`、10 は `src/lib/name-variants.ts`、11・12 は `src/lib/url-search.ts`（冒頭のコメントに前回の結果がある）

<!-- x-check:start -->
| # | 確かめること | 期待 | X で開く |
|---|---|---|---|
| 1 | 名前 1 つ（引用符で完全一致） | その名前を含む投稿が出る | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22&src=typed_query&f=live) |
| 2 | 名前とハッシュタグの OR | どちらかを含む投稿が出る（1 より多い） | [開く](https://x.com/search?q=%28%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+OR+%22%23%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%E7%B5%B5%22%29&src=typed_query&f=live) |
| 3 | AND（すべてを含む） | 両方を含む投稿だけ（2 より少ない） | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+%22%E5%82%AC%E7%9C%A0%22&src=typed_query&f=live) |
| 4 | 本人の投稿を除く（-from:） | @nnhr_nunu の投稿が出ない | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+-from%3Annhr_nunu&src=typed_query&f=live) |
| 5 | 除外する言葉（-"…"） | 「配信」を含む投稿が出ない | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+-%22%E9%85%8D%E4%BF%A1%22&src=typed_query&f=live) |
| 6 | 期間（since: と until: を同じ日） | 2026-10-01（日本時間）の投稿だけ | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+since%3A2026-10-01+until%3A2026-09-30&src=typed_query&f=live) |
| 7 | 前回より後だけ（since_time:） | 2026-10-01 12:00（日本時間）より後の投稿だけ | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+since_time%3A1790823600&src=typed_query&f=live) |
| 8 | 画像・動画つきだけ（filter:media） | 画像か動画のある投稿だけ | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+filter%3Amedia&src=typed_query&f=live) |
| 9 | ネガティブワード入り（約 490 文字） | エラーにならず結果が出る。「嫌い」などを含む投稿が出ない | [開く](https://x.com/search?q=%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+-%22%E5%AB%8C%E3%81%84%22+-%22%E3%81%86%E3%81%96%E3%81%84%22+-%22%E3%82%A6%E3%82%B6%E3%81%84%22+-%22%E3%81%8D%E3%82%82%E3%81%84%22+-%22%E3%82%AD%E3%83%A2%E3%81%84%22+-%22%E6%B0%97%E6%8C%81%E3%81%A1%E6%82%AA%E3%81%84%22+-%22%E3%81%A4%E3%81%BE%E3%82%89%E3%81%AA%E3%81%84%22+-%22%E3%81%A4%E3%81%BE%E3%82%89%E3%82%93%22+-%22%E3%83%96%E3%82%B9%22+-%22%E6%B6%88%E3%81%88%E3%82%8D%22+-%22%E3%82%AA%E3%83%AF%E3%82%B3%E3%83%B3%22+-%22%E5%AE%B3%E6%82%AA%22+-%22%E3%83%91%E3%82%AF%E3%83%AA%22+-%22%E8%A9%90%E6%AC%BA%E5%B8%AB%22+-%22%E7%8A%AF%E7%BD%AA%E8%80%85%22+-%22%E5%98%98%E3%81%A4%E3%81%8D%22+-%22%E4%B8%8D%E5%BF%AB%22+-%22%E3%83%A0%E3%82%AB%E3%81%A4%E3%81%8F%22+-%22%E3%82%80%E3%81%8B%E3%81%A4%E3%81%8F%22+-%22%E3%81%A4%E3%81%BE%E3%82%93%E3%81%AA%E3%81%84%22+-%22%E3%81%8A%E3%82%82%E3%82%93%E3%81%AA%E3%81%84%22+-%22%E9%9D%A2%E7%99%BD%E3%81%8F%E3%81%AA%E3%81%84%22+-%22%E3%81%8D%E3%81%97%E3%82%87%E3%81%84%22+-%22%E3%82%AD%E3%82%B7%E3%83%A7%E3%81%84%22+-%22%E6%B0%97%E8%89%B2%E6%82%AA%E3%81%84%22+-%22%E3%83%96%E3%82%B5%E3%82%A4%E3%82%AF%22+-%22%E4%B8%8D%E6%84%89%E5%BF%AB%22+-%22%E7%97%9B%E3%80%85%E3%81%97%E3%81%84%22+-%22%E8%A6%8B%E8%8B%A6%E3%81%97%E3%81%84%22+-%22%E3%82%A4%E3%82%BF%E3%81%84%22+-%22%E5%BC%95%E9%80%80%E3%81%97%E3%82%8D%22+-%22%E8%BE%9E%E3%82%81%E3%82%8D%22+-%22%E5%B9%BB%E6%BB%85%22+-%22%E5%A4%B1%E6%9C%9B%22+-%22%E5%8A%A3%E5%8C%96%22+-%22%E7%9B%97%E4%BD%9C%22+-%22%E3%83%88%E3%83%AC%E3%83%91%E3%82%AF%22+-%22%E7%84%A1%E8%83%BD%22+-%22%E6%89%8D%E8%83%BD%E3%81%AA%E3%81%84%22+-%22%E6%80%A7%E6%A0%BC%E6%82%AA%E3%81%84%22+-%22%E5%9B%B3%E3%80%85%E3%81%97%E3%81%84%22+-%22%E9%9D%9E%E5%B8%B8%E8%AD%98%22+-%22%E9%A3%BD%E3%81%8D%E3%81%9F%22+-%22%E3%81%8C%E3%81%A3%E3%81%8B%E3%82%8A%22+-%22%E3%83%90%E3%83%90%E3%82%A2%22+-%22%E3%83%87%E3%83%96%22+-%22%E3%82%B4%E3%83%9F%22+-%22%E5%BA%95%E8%BE%BA%22+-hate+-cringe+-sucks+-annoying+-worst+-boring+-overrated+-cringy+-disgusting+-stupid+-idiot+-dumb+-pathetic+-scammer+-criminal+-liar&src=typed_query&f=live) |
| 10 | カナの表記ゆれを足す | 1 より多ければ、カナの候補を出す意味がある | [開く](https://x.com/search?q=%28%22%E3%81%AC%E3%81%AC%E3%81%AF%E3%82%89%22+OR+%22%E3%83%8C%E3%83%8C%E3%83%8F%E3%83%A9%22+OR+%22%EF%BE%87%EF%BE%87%EF%BE%8A%EF%BE%97%22%29&src=typed_query&f=live) |
| 11 | YouTube チャンネルのリンク（url:"youtube.com/@…"） | チャンネルのリンクを貼った投稿が出る | [開く](https://x.com/search?q=url%3A%22youtube.com%2F%40nnhr_nunu%22&src=typed_query&f=live) |
| 12 | YouTube 動画のリンク（url:動画ID） | その動画のリンクを貼った投稿だけ | [開く](https://x.com/search?q=url%3A2vESpdgZMvI&src=typed_query&f=live) |
<!-- x-check:end -->

## 結果

| 日付 | # | ○× | 気づいたこと |
|---|---|---|---|
