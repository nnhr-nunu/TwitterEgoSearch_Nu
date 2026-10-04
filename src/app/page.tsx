import { SearchApp } from "@/components/search-app";
import { websiteJsonLd } from "@/lib/site-metadata";

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteJsonLd() }} />
      <SearchApp />
    </>
  );
}
