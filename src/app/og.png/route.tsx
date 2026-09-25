import { ImageResponse } from "next/og";

// シェア投稿のリンクカード（/og.png）。静的エクスポートなのでビルド時に 1 枚だけ作る。
// opengraph-image.tsx だと拡張子なしで出力され、GitHub Pages が image/png で返さないため route にしている
export const dynamic = "force-static";

const OG_SIZE = { width: 1200, height: 630 };

const TITLE = "エゴサ支援ツール(ぬ)";
const TAGLINE = "名前も愛称も、まとめてエゴサ。";
const SAMPLE = "“名前” OR “愛称” OR “#タグ”";
const SUB = "ログイン不要・無料 / X の検索をワンタップで";

// 使う文字だけを Google Fonts から取り寄せる（日本語フォントを丸ごと抱えない）
async function loadFont(text: string, weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(text)}`,
  ).then((res) => res.text());
  const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error("Noto Sans JP could not be loaded for the OG image");
  return fetch(src).then((res) => res.arrayBuffer());
}

function BirdMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 32 32">
      <path
        fill="#1DA1F2"
        d="M8 19.2c4.4 2.8 9.8 3 13.4.2 2.6-2 3.8-4.8 4.2-6.8-.8.4-1.8.8-2.8.8 1-.6 1.8-1.6 2.2-2.8-.8.6-1.8 1-2.8 1.2C20.4 10.4 19 10 17.6 10c-2.6 0-4.6 2.2-4.6 4.8 0 .4 0 .8.2 1.2-3.8-.2-7.2-2-9.4-4.8-.4.8-.6 1.6-.6 2.4 0 1.6.8 3.2 2.2 4-.8 0-1.4-.2-2-.6v.2c0 2.2 1.6 4.2 3.6 4.6-.4.2-.8.2-1.2.2-.2 0-.6 0-.8-.2.6 1.8 2.2 3.2 4.2 3.2-1.6 1.2-3.6 2-5.6 2-.4 0-.6 0-1-.2 2 1.4 4.4 2.2 7 2.2 8.4 0 13-7 13-13v-.6c.8-.6 1.6-1.4 2.2-2.4-.8.4-1.6.6-2.4.8.8-.4 1.6-1.2 2-2.2z"
      />
    </svg>
  );
}

export async function GET() {
  const [bold, regular] = await Promise.all([
    loadFont(`${TITLE}TWITTER (X)`, 700),
    loadFont(`${TAGLINE}${SAMPLE}${SUB}self-search.oshilog.life`, 400),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#fff",
          fontFamily: "Noto Sans JP",
          backgroundImage: "linear-gradient(135deg, #1da1f2 0%, #1a8cd8 55%, #0c6fae 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.10)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BirdMark />
          </div>
          <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 6, opacity: 0.9 }}>TWITTER (X)</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>{TITLE}</span>
          <span style={{ fontSize: 40, opacity: 0.95 }}>{TAGLINE}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              background: "#fff",
              color: "#536471",
              borderRadius: 9999,
              padding: "20px 32px",
              fontSize: 30,
              boxShadow: "0 12px 32px rgba(8, 60, 100, 0.25)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1DA1F2" strokeWidth="3" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span>{SAMPLE}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, opacity: 0.9 }}>
            <span>{SUB}</span>
            <span>self-search.oshilog.life</span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Noto Sans JP", data: bold, weight: 700, style: "normal" },
        { name: "Noto Sans JP", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
