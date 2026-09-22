"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  expandSearchTerms,
  HONORIFIC_CATALOG,
  isDerivedHonorific,
  toggleHonorific,
} from "@/lib/honorifics";
import type { MessageKey } from "@/lib/i18n";
import type { HonorificId } from "@/lib/types";

type KeywordEditorProps = {
  keywords: string[];
  honorifics: HonorificId[];
  onChange: (keywords: string[]) => void;
  onHonorificsChange: (honorifics: HonorificId[]) => void;
  t: (key: MessageKey) => string;
};

export function KeywordEditor({
  keywords,
  honorifics,
  onChange,
  onHonorificsChange,
  t,
}: KeywordEditorProps) {
  const [draft, setDraft] = useState("");
  const terms = expandSearchTerms(keywords, honorifics);

  function addKeyword() {
    const next = draft.trim();
    if (!next) return;
    if (!keywords.includes(next)) onChange([...keywords, next]);
    setDraft("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="keyword-input">{t("keywords")}</Label>
        <div className="flex gap-2">
          <Input
            id="keyword-input"
            value={draft}
            placeholder={t("keywordPlaceholder")}
            className="h-10 text-base md:text-sm"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addKeyword();
              }
            }}
          />
          <Button type="button" variant="secondary" className="h-10" onClick={addKeyword}>
            {t("addKeyword")}
          </Button>
        </div>
      </div>
      {keywords.length === 0 ? null : (
        <ul className="flex flex-wrap gap-2" data-testid="keyword-list">
          {keywords.map((keyword) => (
            <li key={keyword}>
              <Badge variant="secondary" className="h-7 gap-1 pr-1 text-sm">
                <span className="max-w-48 truncate">{keyword}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label={`${t("deletePreset")}: ${keyword}`}
                  data-testid="remove-keyword"
                  onClick={() => onChange(keywords.filter((item) => item !== keyword))}
                >
                  <XIcon className="size-3.5" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">{t("honorifics")}</p>
        <div className="flex flex-wrap gap-2" data-testid="honorific-toggles" role="group" aria-label={t("honorifics")}>
          {HONORIFIC_CATALOG.map((item) => {
            const on = honorifics.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                data-testid={`honorific-${item.id}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
                onClick={() => onHonorificsChange(toggleHonorific(honorifics, item.id))}
              >
                {item.suffix}
              </button>
            );
          })}
        </div>
      </div>

      {terms.length === 0 ? null : (
        <div className="space-y-2" data-testid="search-words">
          <p className="text-sm font-medium">{t("searchWords")}</p>
          <ul className="flex flex-wrap gap-2">
            {terms.map((term) => {
              const derived = isDerivedHonorific(term, keywords, honorifics);
              return (
                <li key={term}>
                  <Badge
                    variant={derived ? "outline" : "secondary"}
                    className="h-7 gap-1 text-sm"
                    data-derived={derived ? "true" : "false"}
                  >
                    <span className="max-w-48 truncate">{term}</span>
                    {derived ? (
                      <span className="pl-0.5 text-[10px] text-muted-foreground">
                        {t("autoChip")}
                      </span>
                    ) : null}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
