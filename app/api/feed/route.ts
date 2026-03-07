import { getFeed } from "@/lib/store";
import type { VideoChannelSlug } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") as VideoChannelSlug | null;
  const cursor = Number(searchParams.get("cursor") ?? "0");
  const feed = await getFeed({
    channel: channel ?? undefined,
    cursor: Number.isNaN(cursor) ? 0 : cursor,
  });

  return Response.json(feed);
}
