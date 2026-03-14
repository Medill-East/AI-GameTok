import { isReadOnlyPreview, readOnlyPreviewResponse } from "@/lib/preview-mode";
import { getVideoDetail, touchVideoSearchIndex } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  if (isReadOnlyPreview()) {
    return readOnlyPreviewResponse();
  }

  const { id } = await context.params;
  const video = await getVideoDetail(id);

  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }

  await touchVideoSearchIndex(id);

  return Response.json({
    ok: true,
    indexedVideo: id,
    indexedClips: video.clips.length,
  });
}
