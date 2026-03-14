import { isReadOnlyPreview, readOnlyPreviewResponse } from "@/lib/preview-mode";
import { updateStore } from "@/lib/store";
import { rebuildVideoFromSource } from "@/lib/youtube-channel-import";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  if (isReadOnlyPreview()) {
    return readOnlyPreviewResponse();
  }

  const { id } = await context.params;
  let summary = {
    importedVideos: 0,
    importedClips: 0,
    skippedVideos: 0,
    removedVideos: 0,
    removedClips: 0,
  };

  try {
    await updateStore(async (current) => {
      const result = await rebuildVideoFromSource(current, id);
      summary = result.summary;
      return result.next;
    });

    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to rebuild clips." },
      { status: 400 },
    );
  }
}
