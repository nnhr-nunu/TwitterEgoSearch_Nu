# 広告（Google AdSense）

- 広告枠は入力カードの下に 1 つ（`src/components/ad-slot.tsx`）。検索ボタンの近くには置かない（誤クリック防止）。
- 幅 1280px 以上かつ高さ 720px 以上の画面だけ、本文の左右に 160×600 の縦長広告を出す（`AdRailLayout`）。狭い画面では描画も push もしない。
- トップと `/guide/` に広告を出す。`/privacy/` には出さない。
- ID は GitHub の Repository variables から入れる。未設定なら広告関連のタグは一切出ない。
  - `ADSENSE_CLIENT` … `ca-pub-` で始まるパブリッシャー ID
  - `ADSENSE_SLOT` … ディスプレイ広告ユニットのスロット ID（数字）
  - `ADSENSE_SIDE_SLOT` … 左右の縦長広告のスロット ID（任意。未設定なら `ADSENSE_SLOT` を使い回す）
- 配信されなかった枠（`data-ad-status="unfilled"`）はラベルごと隠す。
- 開発時は `data-adtest="on"` を付け、無効な表示回数を計上しない。
- `ads.txt` はドメイン直下に置く必要があるため、このリポジトリではなく `nnhr-nunu.github.io` リポジトリに置く。
- AdSense の「自動広告」はオフ推奨（サイトの雰囲気を崩すため）。
- 広告の説明は `/privacy/`（`src/app/privacy/page.tsx`）。
