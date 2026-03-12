import { SearchView } from "@/components/search-view";
import { searchCatalog } from "@/lib/store";
import type { VideoChannelSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    channel?: string;
    type?: "clips" | "videos" | "all";
  }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const channel = params.channel as VideoChannelSlug | undefined;
  const type = params.type ?? "all";
  const results = query
    ? await searchCatalog({
        query,
        channel,
        type,
        limit: 20,
      })
    : { clips: [], videos: [], nextCursor: null };

  return <SearchView query={query} channel={channel} type={type} results={results} />;
}
