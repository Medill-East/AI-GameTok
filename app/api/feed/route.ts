import { getFeed } from "@/lib/store";
import type { VideoChannelSlug } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") as VideoChannelSlug | null;
  const cursor = Number(searchParams.get("cursor") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "20");
  const recycle = searchParams.get("recycle") === "1";
  const exclude = searchParams.get("exclude");
  const feed = await getFeed({
    channel: channel ?? undefined,
    cursor: Number.isNaN(cursor) ? 0 : cursor,
    limit: Number.isNaN(limit) ? 20 : limit,
    recycle,
    excludeIds: exclude
      ? exclude
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : undefined,
  });

  return Response.json(feed);
}
