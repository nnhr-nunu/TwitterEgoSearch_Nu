"use client";

import { DownloadIcon, SmartphoneIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBlankConfig } from "@/lib/defaults";
import type { MessageKey } from "@/lib/i18n";
import { shareSubjectLabel } from "@/lib/share-post";
import type { TransferData } from "@/lib/transfer";
import type { Locale } from "@/lib/types";

type TransferBannerProps = {
  data: TransferData;
  locale: Locale;
  // この端末にすでに設定があるか（あれば置き換わることを伝える）
  replaces: boolean;
  onImport: () => void;
  onDismiss: () => void;
  t: (key: MessageKey) => string;
};

/** 引き継ぎ用リンクを開いたときのカード。何が入っているかを見せてから、取り込むかどうかを選んでもらう */
export function TransferBanner({ data, locale, replaces, onImport, onDismiss, t }: TransferBannerProps) {
  const rows = data.slots.map((slot, index) => {
    const name = slot.displayName.trim();
    const subjects = shareSubjectLabel(slot, locale, 3);
    return {
      label: t(`slot${index + 1}` as MessageKey),
      value: isBlankConfig(slot) ? t("transferBlank") : name ? `${name}（${subjects}）` : subjects,
    };
  });
  if (data.youtube) rows.push({ label: t("urlTab"), value: data.youtube.url || t("transferYoutubeWords") });

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-card to-card p-5 shadow-sm"
      data-testid="transfer-banner"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-primary">
            <SmartphoneIcon className="size-3.5" aria-hidden />
            {t("transferEyebrow")}
          </p>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onDismiss} aria-label={t("close")}>
            <XIcon />
          </Button>
        </div>

        <h2 className="font-heading text-xl leading-snug font-bold tracking-tight">{t("transferHeading")}</h2>

        <dl className="space-y-1.5 text-sm" data-testid="transfer-rows">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="w-16 shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 break-words">{row.value}</dd>
            </div>
          ))}
        </dl>

        {replaces ? <p className="text-xs leading-relaxed text-muted-foreground">{t("transferReplaceNote")}</p> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" size="lg" className="h-11" onClick={onImport} data-testid="transfer-import">
            <DownloadIcon data-icon="inline-start" />
            {t("transferImport")}
          </Button>
          <Button type="button" variant="ghost" size="lg" className="h-11" onClick={onDismiss} data-testid="transfer-dismiss">
            {t("transferCancel")}
          </Button>
        </div>
      </div>
    </section>
  );
}
