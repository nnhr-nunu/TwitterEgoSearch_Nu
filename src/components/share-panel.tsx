"use client";

import { Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MessageKey } from "@/lib/i18n";

type SharePanelProps = {
  shareUrl: string;
  t: (key: MessageKey) => string;
  onCopy: (value: string) => Promise<boolean>;
};

export function SharePanel({ shareUrl, t, onCopy }: SharePanelProps) {
  async function copy() {
    const ok = await onCopy(shareUrl);
    toast[ok ? "success" : "error"](ok ? t("copied") : t("copyFailed"));
  }

  return (
    <div className="space-y-2">
      <Label>{t("shareLink")}</Label>
      <p className="text-xs text-muted-foreground">{t("shareHint")}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={shareUrl} className="h-10 font-mono text-xs" />
        <Button type="button" className="h-10" variant="secondary" onClick={() => void copy()}>
          <Share2Icon data-icon="inline-start" />
          {t("copyShare")}
        </Button>
      </div>
    </div>
  );
}
