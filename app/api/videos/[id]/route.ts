import { getClipById, getVideoDetail } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const video = await getVideoDetail(id);

  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const clip = from ? await getClipById(from) : null;

  return Response.json({
    ...video,
    resumeFrom: clip?.continueAtSec ?? 0,
  });
}
