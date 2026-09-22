"use client";

import { SearchIcon, UsersIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MessageKey } from "@/lib/i18n";
import { maybeOpenLiveTab } from "@/lib/live";

type LiveResultsProps = {
  url: string;
  peopleUrl: string;
  peopleOk: boolean;
  autoOpen: boolean;
  t: (key: MessageKey) => string;
};

export function LiveResults({ url, peopleUrl, peopleOk, autoOpen, t }: LiveResultsProps) {
  useEffect(() => {
    if (!autoOpen || !url) return;
    maybeOpenLiveTab(url);
  }, [autoOpen, url]);

  return (
    <Card className="border-primary/40 bg-card" data-testid="live-results">
      <CardContent className="space-y-2 pt-6">
        <Button type="button" size="lg" className="h-12 w-full text-base" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" data-testid="live-open">
            <SearchIcon data-icon="inline-start" />
            {t("searchPosts")}
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={!peopleOk}
          asChild={peopleOk}
        >
          {peopleOk ? (
            <a href={peopleUrl} target="_blank" rel="noopener noreferrer" data-testid="search-people">
              <UsersIcon data-icon="inline-start" />
              {t("searchPeople")}
            </a>
          ) : (
            <>
              <UsersIcon data-icon="inline-start" />
              {t("searchPeople")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
