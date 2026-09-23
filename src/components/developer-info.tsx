"use client";

type RelatedLink = {
  name: string;
  href: string;
};

const RELATED: RelatedLink[] = [
  { name: "推し活支援サービス：推しログ(ぬ)", href: "https://oshilog.life/" },
  {
    name: "配信者向け写真表示ソフト：StreamMediaViewer(ぬ)",
    href: "https://x.com/nnhr_nunu/status/2100926390078169405",
  },
  {
    name: "配信者向け雑談提供Webサービス：TopicStream(ぬ)",
    href: "https://topic-stream-amber.vercel.app/",
  },
  {
    name: "心音配信に合わせて動く心臓ソフトウェア：StreamHeartbeat(ぬ)",
    href: "https://github.com/nnhr-nunu/StreamHeartbeat_Nu",
  },
  {
    name: "Slay the Spire 2 催眠術師Mod",
    href: "https://x.com/nnhr_nunu/status/2083033452128207076",
  },
];

function ExternalLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary underline-offset-2 hover:underline"
    >
      {href}
    </a>
  );
}

type DeveloperInfoProps = {
  title: string;
};

export function DeveloperInfo({ title }: DeveloperInfoProps) {
  return (
    <footer className="mx-auto max-w-2xl px-4 pb-10 sm:px-6" data-testid="developer">
      <section className="space-y-5 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
        <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>

        <div className="space-y-2">
          <h3 className="font-medium">【開発者】</h3>
          <p>ぬぬはら</p>
          <p>
            Twitter：
            <ExternalLink href="https://x.com/nnhr_nunu" />
          </p>
          <p>
            催眠音声チャンネル：
            <ExternalLink href="https://www.youtube.com/@nnhr_nunu" />
          </p>
          <p>
            実写催眠チャンネル：
            <ExternalLink href="https://www.youtube.com/channel/UCqYpbbypex0iOikcZRenxGA" />
          </p>
          <p>バグ報告はDMなどで頂けたら幸いです。</p>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium">【開発した関連サービス】</h3>
          <ul className="space-y-3">
            {RELATED.map((item) => (
              <li key={item.href} className="space-y-0.5">
                <p>・{item.name}</p>
                <p>
                  <ExternalLink href={item.href} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </footer>
  );
}
