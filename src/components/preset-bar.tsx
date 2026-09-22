"use client";

import { BookmarkPlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MessageKey } from "@/lib/i18n";
import { configsMatch } from "@/lib/presets";
import type { SavedPreset, SearchConfig } from "@/lib/types";

type PresetBarProps = {
  config: SearchConfig;
  presets: SavedPreset[];
  onApply: (config: SearchConfig) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  t: (key: MessageKey) => string;
};

export function PresetBar({
  config,
  presets,
  onApply,
  onSave,
  onDelete,
  t,
}: PresetBarProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <BookmarkPlusIcon data-icon="inline-start" />
          {t("savePreset")}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{t("saved")}</p>
      {presets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noPresets")}</p>
      ) : (
        <ul className="space-y-2">
          {presets.map((preset) => {
            const active = configsMatch(config, preset.config);
            return (
              <li
                key={preset.id}
                className="flex items-center gap-2 rounded-lg border border-border/70 px-2 py-1.5"
              >
                <button
                  type="button"
                  className={`min-w-0 flex-1 truncate text-left text-sm ${active ? "font-medium text-primary" : ""}`}
                  onClick={() => onApply(preset.config)}
                >
                  {preset.name}
                </button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("deletePreset")}
                  onClick={() => onDelete(preset.id)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("savePreset")}</DialogTitle>
            <DialogDescription>{t("presetName")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preset-name">{t("presetName")}</Label>
            <Input
              id="preset-name"
              value={name}
              placeholder={t("presetNamePlaceholder")}
              className="h-10"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!name.trim()}
              onClick={() => {
                onSave(name.trim());
                setName("");
                setOpen(false);
              }}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
