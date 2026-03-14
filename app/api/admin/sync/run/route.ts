import { isReadOnlyPreview, readOnlyPreviewResponse } from "@/lib/preview-mode";
import { updateStore } from "@/lib/store";
import { importPopularVideosFromChannels } from "@/lib/youtube-channel-import";

export async function POST() {
  if (isReadOnlyPreview()) {
    return readOnlyPreviewResponse();
  }

  try {
    let summary = {
      importedVideos: 0,
      importedClips: 0,
      skippedVideos: 0,
      removedVideos: 0,
      removedClips: 0,
    };

    await updateStore(async (current) => {
      const result = await importPopularVideosFromChannels(current, 48);
      summary = result.summary;
      return result.next;
    });

    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
