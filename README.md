# エゴサ支援ツール(ぬ)

Twitter / X の検索 URL を組み立ててワンクリックで開く静的 Web アプリです。検索 API もログインも使いません。

## 必要環境

- Node.js 20 以上

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで http://127.0.0.1:43141 を開きます。

```bash
npm run lint
npm test
```

## 静的書き出し（無料ホスティング用）

```bash
npm run build
```

`out/` を GitHub Pages / Cloudflare Pages / Vercel に置きます。

公開 URL は `https://self-search.oshilog.life/` です（GitHub Pages のカスタムドメイン。DNS は Cloudflare の CNAME で `nnhr-nunu.github.io` へ、プロキシなし）。`main` へ push すると `.github/workflows/pages.yml` が GitHub Pages へ出します。初回だけ GitHub の Settings → Pages で Source を GitHub Actions にする必要があります。

YouTube タブでチャンネルの動画一覧を読み込むときは YouTube Data API v3 の無料枠を使います。サイトに組み込むキーは GitHub の Actions Variables（Secrets でも可）に `YOUTUBE_API_KEY` として入れます（Google Cloud でキーを作り、アプリケーションの制限を「HTTP リファラー」で `https://self-search.oshilog.life/*` と `http://127.0.0.1:43141/*`、API の制限を YouTube Data API v3 に）。ローカルでは `.env.local` に `NEXT_PUBLIC_YOUTUBE_API_KEY=...` を書きます。未設定のビルドでは、チャンネルの動画一覧は読み込めません（動画・ページの検索は使えます）。

サブパス付きで書き出したいとき:

```bash
NEXT_PUBLIC_BASE_PATH=/TwitterEgoSearch_Nu npm run build
```

---

# Self-Search Helper

Static web app that builds Twitter / X search URLs. No search API and no login.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43141
