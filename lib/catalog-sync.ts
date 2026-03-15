import { finishSyncRun, startSyncRun } from "@/lib/db";
import { readStore, updateStore } from "@/lib/store";
import { importPopularVideosFromChannels } from "@/lib/youtube-channel-import";

export interface CatalogSyncSummary {
  importedVideos: number;
  importedClips: number;
  skippedVideos: number;
  removedVideos: number;
  removedClips: number;
}

function createEmptySummary(): CatalogSyncSummary {
  return {
    importedVideos: 0,
    importedClips: 0,
    skippedVideos: 0,
    removedVideos: 0,
    removedClips: 0,
  };
}

export async function runCatalogSync(
  triggerSource: "manual" | "cron",
  importLimit = 48,
) {
  const before = await readStore();
  const activeChannels = before.channels.filter(
    (channel) => channel.whitelistStatus === "active",
  ).length;
  const syncRunId = await startSyncRun(triggerSource);
  let summary = createEmptySummary();

  try {
    await updateStore(async (current) => {
      const result = await importPopularVideosFromChannels(current, importLimit);
      summary = result.summary;
      return result.next;
    });

    await finishSyncRun(syncRunId, {
      status: "success",
      channelsProcessed: activeChannels,
      videosProcessed: summary.importedVideos,
      clipsProcessed: summary.importedClips,
      details: summary,
    });

    return summary;
  } catch (error) {
    await finishSyncRun(syncRunId, {
      status: "error",
      channelsProcessed: activeChannels,
      videosProcessed: summary.importedVideos,
      clipsProcessed: summary.importedClips,
      errorSummary: error instanceof Error ? error.message : "Catalog sync failed",
      details: summary,
    });

    throw error;
  }
}
