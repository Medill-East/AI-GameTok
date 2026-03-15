import { canWriteCatalog, readOnlyPreviewResponse } from "@/lib/preview-mode";
import { updateStore } from "@/lib/store";
import { recheckVideoPlayback } from "@/lib/youtube-channel-import";

export async function POST(request: Request) {
  if (!canWriteCatalog()) {
    return readOnlyPreviewResponse();
  }

  const body = (await request.json().catch(() => ({}))) as { videoId?: string };
  let checked = 0;
  let issues = 0;

  await updateStore(async (current) => {
    const next = structuredClone(current);
    const targets = body.videoId
      ? next.videos.filter((video) => video.id === body.videoId)
      : next.videos;

    for (const video of targets) {
      const health = await recheckVideoPlayback(video.sourceVideoId);
      video.availabilityStatus = health.availabilityStatus;
      video.playbackCheckedAt = health.playbackCheckedAt;
      video.playbackErrorReason = health.playbackErrorReason;
      checked += 1;
      if (health.availabilityStatus !== "ok") {
        issues += 1;
      }
    }

    return next;
  });

  return Response.json({ ok: true, checked, issues });
}
