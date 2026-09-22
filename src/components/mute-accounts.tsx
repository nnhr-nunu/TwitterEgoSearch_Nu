"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseHandleList, uniqueHandles } from "@/lib/handle";
import type { MessageKey } from "@/lib/i18n";

type MuteAccountsProps = {
  handles: string[];
  onChange: (handles: string[]) => void;
  t: (key: MessageKey) => string;
};

export function MuteAccounts({ handles, onChange, t }: MuteAccountsProps) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const muted = uniqueHandles(handles);

  function addHandles() {
    const next = parseHandleList(draft);
    if (next.length === 0) {
      setInvalid(draft.trim().length > 0);
      return;
    }
    setInvalid(false);
    onChange(uniqueHandles([...muted, ...next]));
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="mute-input">{t("muteAccounts")}</Label>
      <div className="flex gap-2">
        <Input
          id="mute-input"
          value={draft}
          placeholder={t("mutePlaceholder")}
          className="h-10 text-base md:text-sm"
          autoComplete="off"
          spellCheck={false}
          data-testid="mute-input"
          onChange={(event) => {
            setDraft(event.target.value);
            if (invalid) setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addHandles();
            }
          }}
        />
        <Button type="button" variant="secondary" className="h-10" onClick={addHandles}>
          {t("addMute")}
        </Button>
      </div>
      {invalid ? (
        <p className="text-sm text-destructive" data-testid="mute-invalid">
          {t("muteInvalid")}
        </p>
      ) : null}
      {muted.length === 0 ? null : (
        <ul className="flex flex-wrap gap-2" data-testid="mute-list">
          {muted.map((handle) => (
            <li key={handle.toLowerCase()}>
              <Badge variant="secondary" className="h-7 gap-1 pr-1 text-sm">
                <span className="max-w-48 truncate">@{handle}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label={`${t("deletePreset")}: @${handle}`}
                  data-testid="remove-mute"
                  onClick={() =>
                    onChange(muted.filter((item) => item.toLowerCase() !== handle.toLowerCase()))
                  }
                >
                  <XIcon className="size-3.5" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
