import { promises as fs } from "node:fs";
import path from "node:path";
import initialStore from "@/data/store.json";
import { buildYoutubeWatchUrl } from "@/lib/youtube";
import type {
  AdminOverview,
  Channel,
  Clip,
  FeedClip,
  StoreData,
  TranscriptSegment,
  Video,
  VideoDetail,
  VideoChannelSlug,
} from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStore() {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf-8");
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureStore();
  const content = await fs.readFile(STORE_PATH, "utf-8");
  return JSON.parse(content) as StoreData;
}

export async function updateStore(
  updater: (current: StoreData) => StoreData | Promise<StoreData>,
) {
  const task = writeQueue.then(async () => {
    const current = await readStore();
    const next = await updater(current);
    await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf-8");
    return next;
  });

  writeQueue = task.then(
    () => undefined,
    () => undefined,
  );

  return task;
}

function hydrateClip(
  clip: Clip,
  videoMap: Map<string, Video>,
  channelMap: Map<string, Channel>,
): FeedClip | null {
  const video = videoMap.get(clip.videoId);

  if (!video) {
    return null;
  }

  const channel = channelMap.get(video.channelId);

  if (!channel) {
    return null;
  }

  return {
    ...clip,
    video,
    channel,
    watchUrl: buildYoutubeWatchUrl(video.sourceVideoId, clip.startSec),
    continueAtSec: Math.min(video.durationSec, clip.endSec + 3),
  };
}

function sortClips(clips: Clip[]) {
  return [...clips].sort((left, right) => {
    if (left.editorPick !== right.editorPick) {
      return left.editorPick ? -1 : 1;
    }

    return (
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

export async function getFeed(options?: {
  channel?: VideoChannelSlug;
  cursor?: number;
  limit?: number;
}) {
  const data = await readStore();
  const channelMap = new Map(data.channels.map((channel) => [channel.id, channel]));
  const videoMap = new Map(data.videos.map((video) => [video.id, video]));

  const filtered = sortClips(data.clips).filter(
    (clip) =>
      clip.status === "published" &&
      (!options?.channel || clip.channelSlug === options.channel),
  );

  const cursor = options?.cursor ?? 0;
  const limit = options?.limit ?? 20;
  const slice = filtered.slice(cursor, cursor + limit);
  const clips = slice
    .map((clip) => hydrateClip(clip, videoMap, channelMap))
    .filter(Boolean) as FeedClip[];

  return {
    clips,
    nextCursor: cursor + limit < filtered.length ? cursor + limit : null,
  };
}

export async function getClipById(id: string) {
  const data = await readStore();
  const clip = data.clips.find((item) => item.id === id);

  if (!clip) {
    return null;
  }

  return hydrateClip(
    clip,
    new Map(data.videos.map((video) => [video.id, video])),
    new Map(data.channels.map((channel) => [channel.id, channel])),
  );
}

export async function getVideoDetail(id: string): Promise<VideoDetail | null> {
  const data = await readStore();
  const video = data.videos.find((item) => item.id === id);

  if (!video) {
    return null;
  }

  const channel = data.channels.find((item) => item.id === video.channelId);

  if (!channel) {
    return null;
  }

  const clips = data.clips
    .filter((clip) => clip.videoId === video.id && clip.status !== "archived")
    .map((clip) =>
      hydrateClip(
        clip,
        new Map([[video.id, video]]),
        new Map([[channel.id, channel]]),
      ),
    )
    .filter(Boolean) as FeedClip[];

  const transcript = data.transcripts[video.id] ?? [];

  return {
    ...video,
    channel,
    clips,
    transcript,
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const data = await readStore();
  const channelMap = new Map(data.channels.map((channel) => [channel.id, channel]));
  const videoMap = new Map(data.videos.map((video) => [video.id, video]));

  const clips = sortClips(data.clips)
    .map((clip) => hydrateClip(clip, videoMap, channelMap))
    .filter(Boolean) as FeedClip[];

  const videos = [...data.videos]
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    )
    .map((video) => {
      const channel = channelMap.get(video.channelId);

      if (!channel) {
        throw new Error(`Missing channel ${video.channelId}`);
      }

      return {
        ...video,
        channel,
        clipCount: data.clips.filter((clip) => clip.videoId === video.id).length,
      };
    });

  return {
    channels: data.channels,
    videos,
    clips,
    pendingClips: clips.filter((clip) => clip.status === "needs_review"),
    counts: {
      publishedClips: data.clips.filter((clip) => clip.status === "published").length,
      pendingClips: data.clips.filter((clip) => clip.status === "needs_review").length,
      videos: data.videos.length,
      channels: data.channels.length,
    },
  };
}

export async function addChannel(channel: Channel) {
  return updateStore((current) => ({
    ...current,
    channels: [channel, ...current.channels],
  }));
}

export async function patchClip(
  id: string,
  changes: Partial<
    Pick<
      Clip,
      | "startSec"
      | "endSec"
      | "zhTitle"
      | "zhSummary"
      | "zhTakeaways"
      | "tags"
      | "editorPick"
      | "channelSlug"
      | "score"
      | "confidence"
      | "status"
    >
  >,
) {
  return updateStore((current) => ({
    ...current,
    clips: current.clips.map((clip) =>
      clip.id === id
        ? {
            ...clip,
            ...changes,
            updatedAt: new Date().toISOString(),
          }
        : clip,
    ),
  }));
}

export async function setClipStatus(id: string, status: Clip["status"]) {
  return patchClip(id, { status });
}

export async function getVideoTranscript(id: string): Promise<TranscriptSegment[]> {
  const data = await readStore();
  return data.transcripts[id] ?? [];
}
