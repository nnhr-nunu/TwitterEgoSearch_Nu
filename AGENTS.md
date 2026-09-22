# AI エージェント向けガイド（エゴサ）

Cursor で開発するときの最短導線。全文読み込みを避け、触るファイルだけ開く。

## 最初に読む（タスク別）

| やること | 入口 |
| -------- | ---- |
| 検索クエリの組み立て | [`query.ts`](./src/lib/query.ts) |
| 共有 URL | [`share-url.ts`](./src/lib/share-url.ts) |
| 画面 | [`search-app.tsx`](./src/components/search-app.tsx) |
| 未完了タスク | [`task.md`](./task.md) |
| セットアップ | [`README.md`](./README.md) |

## 読まない（日常改修）

| ファイル | 理由 | 代わり |
| -------- | ---- | ------ |
| `HISTORY.md`（作った場合） | アーカイブ | `git log` |
| 長い製品メモの全文 | トークン消費 | `task.md` / `src/lib/query.ts` |

## 制約

- X Search API は呼ばない。`x.com/search` と intent URL だけを生成する。
- 認証・データベース・有料 API を足さない。プリセットは `localStorage`。
- 静的エクスポート（`output: "export"`）を維持する。

## Git

切りの良いところで日本語メッセージを commit し `origin` へ push する。`.ts` / `.tsx` を変えたら `npm test` と `npm run lint`。

## ドキュメント

- 完了タスク → `task.md` から削除（履歴は `git log`）
- README は起動手順のみ。製品補足が必要なら `docs/product/`
- 800 行を超えるファイルは責務単位で分割する
