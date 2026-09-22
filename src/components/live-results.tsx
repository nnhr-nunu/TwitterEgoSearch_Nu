"use client";

import { ExternalLinkIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MessageKey } from "@/lib/i18n";
import { maybeOpenLiveTab } from "@/lib/live";

type LiveResultsProps = {
  url: string;
  autoOpen: boolean;
  t: (key: MessageKey) => string;
};

export function LiveResults({ url, autoOpen, t }: LiveResultsProps) {
  const [tabNote, setTabNote] = useState<"opened" | "blocked" | "skipped" | null>(null);

  useEffect(() => {
    if (!autoOpen || !url) return;
    const result = maybeOpenLiveTab(url);
    if (result === "skipped") return;
    const frame = requestAnimationFrame(() => setTabNote(result));
    return () => cancelAnimationFrame(frame);
  }, [autoOpen, url]);

  return (
    <Card className="border-primary/40 bg-card" data-testid="live-results">
      <CardHeader className="border-b bg-secondary/60">
        <CardTitle className="flex items-center gap-2 text-primary">
          <SearchIcon className="size-5" aria-hidden />
          {t("liveTitle")}
        </CardTitle>
        <CardDescription className="text-pretty text-foreground/80">
          {t("liveBody")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        <p className="text-sm text-foreground/80">{t("liveEmbedBlocked")}</p>
        <Button type="button" size="lg" className="h-12 w-full text-base" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" data-testid="live-open">
            <ExternalLinkIcon data-icon="inline-start" />
            {t("liveOpen")}
          </a>
        </Button>
        {tabNote === "opened" ? (
          <p className="text-xs text-muted-foreground">{t("liveTabOpened")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
