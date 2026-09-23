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

公開 URL は `https://nnhr-nunu.github.io/TwitterEgoSearch_Nu/` です。`main` へ push すると `.github/workflows/pages.yml` が GitHub Pages へ出します。初回だけ GitHub の Settings → Pages で Source を GitHub Actions にする必要があります。

プロジェクトサイト用の書き出し:

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
