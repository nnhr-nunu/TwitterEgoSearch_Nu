"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type FloatingSearchProps = {
  url: string;
  label: string;
  // 画面上部の検索ボタンの data-testid。これが見えているあいだは出さない
  watchTestId: string;
  onOpen: () => void;
};

// 下のほうの欄を直しているあいだも、上まで戻らずに検索できるよう画面の下に出す検索ボタン。
// 広告が見えているあいだ（誤クリック防止）と、スマホで入力欄に打っているあいだ（キーボードの上に出て欄を隠さないため）は
// 出さない。いちばん下のリンクを隠さないよう、出す画面ではページの下に余白を取る（FLOATING_SEARCH_SPACE）
export const FLOATING_SEARCH_SPACE = "pb-24";

export function FloatingSearch({ url, label, watchTestId, onOpen }: FloatingSearchProps) {
  const [topVisible, setTopVisible] = useState(true);
  const [adVisible, setAdVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const top = document.querySelector(`[data-testid="${watchTestId}"]`);
    const ad = document.querySelector('[data-testid="ad-slot"]');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === top) setTopVisible(entry.isIntersecting);
        if (entry.target === ad) setAdVisible(entry.isIntersecting);
      }
    });
    if (top) observer.observe(top);
    if (ad) observer.observe(ad);
    return () => observer.disconnect();
  }, [watchTestId]);

  useEffect(() => {
    // キーボードが画面に出るのはタッチの端末だけなので、マウスで使う画面では打っているあいだも出しておく
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    // focusout の時点ではまだ次の欄にフォーカスが移っていないので、移ったあとで見る
    const update = () =>
      requestAnimationFrame(() => {
        const active = document.activeElement;
        setTyping(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement);
      });
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    // 空の設定で 1 文字目を打ったときのように、欄に打っている最中に作られることもあるので、作った時点でも見る
    update();
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);

  const show = !topVisible && !adVisible && !typing;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background/85 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] transition-all duration-200 sm:px-6 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      inert={!show}
      data-testid="floating-search"
      data-shown={show ? "true" : "false"}
    >
      <div className="mx-auto max-w-2xl">
        <Button size="lg" className="h-12 w-full text-base shadow-lg" asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            // 中クリックで別タブに開いたときも「検索を開いた」に数える
            onAuxClick={(event) => event.button === 1 && onOpen()}
          >
            <SearchIcon data-icon="inline-start" />
            {label}
          </a>
        </Button>
      </div>
    </div>
  );
}
