"use client";

import { QuoteIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MessageKey } from "@/lib/i18n";
import { parseStatusUrl, quotePostIntentUrl } from "@/lib/tweet-intent";

type QuoteTweetFieldsProps = {
  t: (key: MessageKey) => string;
};

export function QuoteTweetFields({ t }: QuoteTweetFieldsProps) {
  const [tweetUrl, setTweetUrl] = useState("");
  const normalized = parseStatusUrl(tweetUrl);
  const quoteUrl = quotePostIntentUrl(tweetUrl);

  return (
    <div className="space-y-2">
      <Label htmlFor="tweet-url">{t("pasteTweet")}</Label>
      <p className="text-xs text-muted-foreground">{t("pasteTweetHint")}</p>
      <Input
        id="tweet-url"
        value={tweetUrl}
        placeholder="https://twitter.com/user/status/…"
        className="h-10 text-base md:text-sm"
        onChange={(event) => setTweetUrl(event.target.value)}
      />
      {tweetUrl.trim() && !normalized ? (
        <p className="text-sm text-destructive">{t("invalidTweet")}</p>
      ) : null}
      {quoteUrl ? (
        <Button type="button" asChild>
          <a href={quoteUrl} target="_blank" rel="noopener noreferrer">
            <QuoteIcon data-icon="inline-start" />
            {t("quoteTweet")}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
