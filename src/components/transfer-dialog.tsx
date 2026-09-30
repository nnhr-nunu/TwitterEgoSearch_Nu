"use client";

import { CopyIcon, Share2Icon, SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { siteOrigin } from "@/components/share-dialog";
import type { MessageKey } from "@/lib/i18n";
import { buildTransferUrl, hasTransferContent } from "@/lib/transfer";
import type { SearchConfig } from "@/lib/types";
import { loadUrlSearch } from "@/lib/url-search";

type AutoSaveNoteProps = {
  onTransfer: () => void;
  t: (key: MessageKey) => string;
};

// 「ブラウザに自動保存されます」の案内と、その保存先がこの端末だけであることへの出口（引き継ぎ）
export function AutoSaveNote({ onTransfer, t }: AutoSaveNoteProps) {
  return (
    <p className="px-1 text-center text-xs text-muted-foreground" data-testid="auto-save-note">
      <span className="inline-block">{t("autoSaveNote")}</span>{" "}
      <button
        type="button"
        className="inline-block py-1 text-primary underline-offset-2 hover:underline"
        onClick={onTransfer}
        data-testid="transfer-open"
      >
        {t("transferOpen")}
      </button>
    </p>
  );
}

type TransferDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: SearchConfig[];
  onCopy: (value: string) => Promise<boolean>;
  t: (key: MessageKey) => string;
};

/** 設定1〜3 と YouTube タブの内容を入れたリンクを作る。開いた側で取り込むかどうかを選ぶ */
export function TransferDialog({ open, onOpenChange, slots, onCopy, t }: TransferDialogProps) {
  // YouTube タブの内容は、そのタブが保存した値から読む。開いているあいだだけ作る
  const youtube = open ? loadUrlSearch() : null;
  const ready = open && hasTransferContent(slots, youtube);
  const url = ready ? buildTransferUrl(siteOrigin(), slots, youtube) : "";
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function nativeShare() {
    try {
      await navigator.share({ url });
    } catch {
      // キャンセルは無視する
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-cols-1 overflow-y-auto sm:max-w-md [&>*]:min-w-0"
        data-testid="transfer-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SmartphoneIcon className="size-4 text-primary" aria-hidden />
            {t("transferTitle")}
          </DialogTitle>
          <DialogDescription>{t("transferLead")}</DialogDescription>
        </DialogHeader>

        {ready ? (
          <>
            <p
              className="truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground"
              data-testid="transfer-url"
            >
              {url}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("transferWarn")}</p>
            <DialogFooter>
              {canNativeShare ? (
                <Button type="button" variant="ghost" onClick={() => void nativeShare()}>
                  <Share2Icon data-icon="inline-start" />
                  {t("transferSend")}
                </Button>
              ) : null}
              <Button type="button" onClick={() => void onCopy(url)} data-testid="transfer-copy">
                <CopyIcon data-icon="inline-start" />
                {t("transferCopy")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="transfer-empty">
            {t("transferEmpty")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
