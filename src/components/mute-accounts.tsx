"use client";

import { ChipInput } from "@/components/chip-input";
import type { MessageKey } from "@/lib/i18n";

type MuteAccountsProps = {
  handles: string[];
  onChange: (handles: string[]) => void;
  t: (key: MessageKey) => string;
};

export function MuteAccounts({ handles, onChange, t }: MuteAccountsProps) {
  return (
    <ChipInput
      id="mute-input"
      label={t("muteAccounts")}
      placeholder={t("mutePlaceholder")}
      values={handles}
      onChange={onChange}
      addLabel={t("addMute")}
      savedToast={t("savedToast")}
      mode="handle"
      invalidMessage={t("muteInvalid")}
      testId="mute"
    />
  );
}
