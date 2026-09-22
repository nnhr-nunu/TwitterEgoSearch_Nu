"use client";

import { ChipInput } from "@/components/chip-input";
import type { MessageKey } from "@/lib/i18n";

type MuteKeywordsProps = {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  t: (key: MessageKey) => string;
};

export function MuteKeywords({ keywords, onChange, t }: MuteKeywordsProps) {
  return (
    <ChipInput
      id="mute-keyword-input"
      label={t("muteKeywords")}
      placeholder={t("muteKeywordPlaceholder")}
      values={keywords}
      onChange={onChange}
      addLabel={t("addKeyword")}
      savedToast={t("savedToast")}
      testId="mute-keyword"
    />
  );
}
