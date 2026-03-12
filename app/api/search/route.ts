import { searchCatalog } from "@/lib/store";
import type { VideoChannelSlug } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const channel = searchParams.get("channel") as VideoChannelSlug | null;
  const type = searchParams.get("type") as "clips" | "videos" | "all" | null;
  const cursor = Number(searchParams.get("cursor") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "20");

  if (!q.trim()) {
    return Response.json({ clips: [], videos: [], nextCursor: null });
  }

  const results = await searchCatalog({
    query: q,
    channel: channel ?? undefined,
    type: type ?? "all",
    cursor: Number.isNaN(cursor) ? 0 : cursor,
    limit: Number.isNaN(limit) ? 20 : limit,
  });

  return Response.json(results);
}
