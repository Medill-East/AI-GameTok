import { updateStore } from "@/lib/store";
import { importPopularVideosFromChannels } from "@/lib/youtube-channel-import";

export async function POST() {
  let summary = {
    importedVideos: 0,
    importedClips: 0,
    skippedVideos: 0,
  };

  await updateStore(async (current) => {
    const result = await importPopularVideosFromChannels(current);
    summary = result.summary;
    return result.next;
  });

  return Response.json({ ok: true, summary });
}
