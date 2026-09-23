"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { adConfig } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdUnitProps = {
  slot: string;
  className?: string;
  style?: CSSProperties;
  /** 省略すると `style` の大きさに合わせて配信される（左右の縦長枠）。 */
  format?: "auto";
};

function AdUnit({ slot, className, style, format }: AdUnitProps) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    const ins = ref.current;
    // StrictMode の二重実行や再マウントで同じ枠へ二度 push しない。
    if (!ins || ins.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // 広告ブロッカーなどで失敗しても画面は壊さない。
    }
  }, []);

  return (
    <ins
      ref={ref}
      className={`adsbygoogle ${className ?? ""}`}
      style={style}
      data-ad-client={adConfig.client}
      data-ad-slot={slot}
      {...(format ? { "data-ad-format": format, "data-full-width-responsive": "true" } : {})}
      {...(process.env.NODE_ENV !== "production" ? { "data-adtest": "on" } : {})}
    />
  );
}

function AdLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{children}</p>
  );
}

type AdSlotProps = {
  label: string;
};

/** 本文下のディスプレイ広告。ID 未設定・広告なし（unfilled）のときは何も見せない。 */
export function AdSlot({ label }: AdSlotProps) {
  if (!adConfig.client || !adConfig.slot) return null;

  return (
    <aside className="ad-slot space-y-1" aria-label={label} data-testid="ad-slot">
      <AdLabel>{label}</AdLabel>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <AdUnit slot={adConfig.slot} className="block min-h-[100px]" format="auto" />
      </div>
    </aside>
  );
}

// 本文 42rem + 左右 160px の枠と余白が収まり、縦長広告が画面に入りきるときだけ出す。
const WIDE_QUERY = "(min-width: 1280px) and (min-height: 720px)";

function subscribeWide(onChange: () => void) {
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useWideScreen(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

function AdRail({ label, side }: AdSlotProps & { side: "left" | "right" }) {
  return (
    <aside
      className="ad-slot sticky top-6 mt-6 w-[160px] shrink-0 space-y-1 self-start"
      aria-label={label}
      data-testid={`ad-rail-${side}`}
    >
      <AdLabel>{label}</AdLabel>
      <AdUnit slot={adConfig.sideSlot} className="inline-block" style={{ width: 160, height: 600 }} />
    </aside>
  );
}

type AdRailLayoutProps = {
  label: string;
  children: ReactNode;
};

/** PC など左右に余白がある画面だけ、本文の両脇に縦長広告を並べる。狭い画面では本文だけ。 */
export function AdRailLayout({ label, children }: AdRailLayoutProps) {
  const wide = useWideScreen();
  const rails = wide && Boolean(adConfig.client && adConfig.sideSlot);

  if (!rails) return <>{children}</>;

  return (
    <div className="flex items-start justify-center gap-8 px-6">
      <AdRail label={label} side="left" />
      <div className="w-full max-w-2xl min-w-0">{children}</div>
      <AdRail label={label} side="right" />
    </div>
  );
}
