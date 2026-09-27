# エゴサ タスク一覧（未完了のみ）

完了の詳細は `git log`。制約はエージェント用の `project-context.md`。

## 保留（方針待ち）

- **Grok による AI 反響レポート**（URL検索タブの次の段階）。xAI OAuth（Device Code Flow、Premium+ / 上位 SuperGrok のみ）で x_search を呼ぶ案。AGENTS.md の「API を呼ばない・DB を足さない・静的エクスポート維持」と衝突するため、別バックエンド（Cloudflare Workers + D1 + Queues など）を入れるかどうかをユーザーが決めてから着手する。
- YouTube API キーを用意して GitHub の Actions Variables に `YOUTUBE_API_KEY` を入れる（手順は README）。入れたら実チャンネル（@nnhr_nunu）で読み込み、ショート（UUSH）・配信（UULV）の判定と、まとめて検索の分割（480 文字）が X で通るかを確かめる。
- URL検索の `url:` 検索が X で期待どおり当たるか、実際の動画・チャンネル・ページで確かめる（特にチャンネルの `url:ハンドル` と、ページの `url:"ドメイン/パス"`）。
