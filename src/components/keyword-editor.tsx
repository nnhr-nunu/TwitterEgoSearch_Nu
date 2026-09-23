"use client";

import { ChipInput } from "@/components/chip-input";
import {
  expandSearchTerms,
  HONORIFIC_CATALOG,
  isDerivedHonorific,
  toggleHonorific,
} from "@/lib/honorifics";
import { splitSearchNames } from "@/lib/keywords";
import type { MessageKey } from "@/lib/i18n";
import type { HonorificId } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

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
  const terms = expandSearchTerms(keywords, honorifics);

  return (
    <div className="space-y-4">
      <ChipInput
        id="keyword-input"
        label={t("keywords")}
        placeholder={t("keywordPlaceholder")}
        values={keywords}
        onChange={onChange}
        addLabel={t("addKeyword")}
        savedToast={t("savedToast")}
        tokenize={splitSearchNames}
        testId="keyword"
      />

      {/* 敬称ピッカーと自動チップは非表示。検索名称は利用者がフルで入れる。 */}
      {false && (
        <>
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
        </>
      )}
    </div>
  );
}
