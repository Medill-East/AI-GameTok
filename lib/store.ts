import { promises as fs } from "node:fs";
import path from "node:path";
import initialStore from "@/data/store.json";
import { buildYoutubeWatchUrl } from "@/lib/youtube";
import type {
  AdminOverview,
  AvailabilityStatus,
  Channel,
  Clip,
  FeedClip,
  FeedPage,
  SearchClipResult,
  SearchResults,
  SearchVideoResult,
  StoreData,
  TranscriptSegment,
  Video,
  VideoChannelSlug,
  VideoDetail,
} from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const DEFAULT_AVAILABILITY_STATUS: AvailabilityStatus = "ok";

let writeQueue: Promise<void> = Promise.resolve();

async function ensureStore() {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf-8");
  }
}

function normalizeChannel(channel: Channel): Channel {
  return {
    ...channel,
    authMode: channel.authMode ?? "public",
    contentTier: channel.contentTier ?? "third_party_public",
    analyticsConnectedAt: channel.analyticsConnectedAt ?? null,
  };
}

function normalizeVideo(video: Video): Video {
  return {
    ...video,
    viewCount: video.viewCount ?? 0,
    availabilityStatus: video.availabilityStatus ?? DEFAULT_AVAILABILITY_STATUS,
    playbackCheckedAt: video.playbackCheckedAt ?? null,
    playbackErrorReason: video.playbackErrorReason ?? null,
    playbackMode:
      video.playbackMode ??
      (video.availabilityStatus && video.availabilityStatus !== "ok"
        ? "platform_link"
        : "platform_embed"),
    searchText: video.searchText ?? "",
  };
}

function normalizeClip(clip: Clip): Clip {
  return {
    ...clip,
    enTitle: clip.enTitle ?? "",
    enSummary: clip.enSummary ?? "",
    signalSource: clip.signalSource ?? "public_heuristic",
    rankScore: clip.rankScore ?? clip.score,
    searchText: clip.searchText ?? "",
  };
}

function normalizeStore(data: StoreData): StoreData {
  return {
    channels: data.channels.map((channel) => normalizeChannel(channel as Channel)),
    videos: data.videos.map((video) => normalizeVideo(video as Video)),
    clips: data.clips.map((clip) => normalizeClip(clip as Clip)),
    transcripts: data.transcripts ?? {},
  };
}

function buildVideoSearchText(video: Video, channel?: Channel) {
  return [
    video.zhTitle,
    video.title,
    video.description,
    channel?.name,
    channel?.handle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildClipSearchText(clip: Clip, video?: Video, channel?: Channel) {
  return [
    clip.enTitle,
    clip.zhTitle,
    clip.enSummary,
    clip.zhSummary,
    clip.tags.join(" "),
    clip.transcriptExcerpt,
    clip.transcriptZh,
    video?.title,
    video?.zhTitle,
    channel?.name,
    channel?.handle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function enrichSearchText(data: StoreData): StoreData {
  const channels = new Map(data.channels.map((channel) => [channel.id, channel]));
  const videos = data.videos.map((video) => {
    const channel = channels.get(video.channelId);
    return {
      ...video,
      searchText: buildVideoSearchText(video, channel),
    };
  });
  const videoMap = new Map(videos.map((video) => [video.id, video]));

  const clips = data.clips.map((clip) => {
    const video = videoMap.get(clip.videoId);
    const channel = video ? channels.get(video.channelId) : undefined;

    return {
      ...clip,
      searchText: buildClipSearchText(clip, video, channel),
    };
  });

  return {
    ...data,
    videos,
    clips,
  };
}

export async function readStore(): Promise<StoreData> {
  await ensureStore();
  const content = await fs.readFile(STORE_PATH, "utf-8");
  const parsed = JSON.parse(content) as StoreData;
  return enrichSearchText(normalizeStore(parsed));
}

export async function updateStore(
  updater: (current: StoreData) => StoreData | Promise<StoreData>,
) {
  const task = writeQueue.then(async () => {
    const current = await readStore();
    const next = enrichSearchText(normalizeStore(await updater(current)));
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

    if (left.rankScore !== right.rankScore) {
      return right.rankScore - left.rankScore;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function remixClips(clips: Clip[], seed = 0) {
  const buckets = new Map<string, Clip[]>();

  clips.forEach((clip) => {
    const bucketKey = `${clip.channelSlug}`;
    const current = buckets.get(bucketKey) ?? [];
    current.push(clip);
    buckets.set(bucketKey, current);
  });

  const keys = [...buckets.keys()];

  if (!keys.length) {
    return [];
  }

  const rotation = ((seed % keys.length) + keys.length) % keys.length;
  const orderedKeys = [...keys.slice(rotation), ...keys.slice(0, rotation)];
  const mixed: Clip[] = [];
  let lastVideoId = "";

  while (orderedKeys.some((key) => (buckets.get(key)?.length ?? 0) > 0)) {
    orderedKeys.forEach((key) => {
      const bucket = buckets.get(key);

      if (!bucket?.length) {
        return;
      }

      const preferredIndex = bucket.findIndex((clip) => clip.videoId !== lastVideoId);
      const nextClip = bucket.splice(preferredIndex >= 0 ? preferredIndex : 0, 1)[0];

      if (!nextClip) {
        return;
      }

      mixed.push(nextClip);
      lastVideoId = nextClip.videoId;
    });
  }

  return mixed;
}

function videoMatchesAvailability(video: Video) {
  return video.availabilityStatus === "ok";
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function tokenize(input: string) {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function scoreSearchDocument(searchText: string, query: string, titleText: string, tags: string[] = []) {
  if (!query.trim()) {
    return 0;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const tokens = tokenize(query);
  let score = 0;

  if (titleText.toLowerCase().includes(normalizedQuery)) {
    score += 120;
  }

  if (tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))) {
    score += 80;
  }

  tokens.forEach((token) => {
    if (titleText.toLowerCase().includes(token)) {
      score += 40;
    }

    if (searchText.includes(token)) {
      score += 15;
    }
  });

  return score;
}

export async function getFeed(options?: {
  channel?: VideoChannelSlug;
  cursor?: number;
  limit?: number;
  excludeIds?: string[];
  recycle?: boolean;
}): Promise<FeedPage> {
  const data = await readStore();
  const channelMap = new Map(data.channels.map((channel) => [channel.id, channel]));
  const videoMap = new Map(data.videos.map((video) => [video.id, video]));
  const excludeSet = new Set(options?.excludeIds ?? []);

  const filtered = sortClips(data.clips).filter((clip) => {
    const video = videoMap.get(clip.videoId);

    return (
      clip.status === "published" &&
      !!video &&
      videoMatchesAvailability(video) &&
      (!options?.channel || clip.channelSlug === options.channel)
    );
  });

  const cursor = options?.cursor ?? 0;
  const limit = options?.limit ?? 20;
  const unseen = excludeSet.size
    ? filtered.filter((clip) => !excludeSet.has(clip.id))
    : filtered;

  const source = options?.recycle
    ? remixClips(unseen.length >= limit ? unseen : filtered, cursor)
    : unseen.length > cursor
      ? unseen
      : filtered;
  const slice = options?.recycle
    ? source.slice(0, limit)
    : source.slice(cursor, cursor + limit);
  const clips = slice
    .map((clip) => hydrateClip(clip, videoMap, channelMap))
    .filter(Boolean) as FeedClip[];

  return {
    clips,
    nextCursor:
      options?.recycle || cursor + limit >= unseen.length ? null : cursor + limit,
    recycled: options?.recycle ?? false,
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

export async function getVideoById(id: string) {
  const data = await readStore();
  return data.videos.find((item) => item.id === id) ?? null;
}

export async function getChannelById(id: string) {
  const data = await readStore();
  return data.channels.find((item) => item.id === id) ?? null;
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

  const playbackIssues = videos.filter((video) => video.availabilityStatus !== "ok");

  return {
    channels: data.channels,
    videos,
    clips,
    pendingClips: clips.filter((clip) => clip.status === "needs_review"),
    playbackIssues,
    counts: {
      publishedClips: data.clips.filter((clip) => clip.status === "published").length,
      pendingClips: data.clips.filter((clip) => clip.status === "needs_review").length,
      videos: data.videos.length,
      channels: data.channels.length,
      playbackIssues: playbackIssues.length,
    },
  };
}

export async function searchCatalog(options: {
  query: string;
  channel?: VideoChannelSlug;
  type?: "clips" | "videos" | "all";
  cursor?: number;
  limit?: number;
}): Promise<SearchResults> {
  const data = await readStore();
  const channelMap = new Map(data.channels.map((channel) => [channel.id, channel]));
  const videoMap = new Map(data.videos.map((video) => [video.id, video]));
  const cursor = options.cursor ?? 0;
  const limit = options.limit ?? 20;
  const type = options.type ?? "all";

  const clips =
    type === "videos"
      ? []
      : data.clips
          .filter((clip) => clip.status === "published")
          .map((clip) => {
            const hydrated = hydrateClip(clip, videoMap, channelMap);

            if (!hydrated || !videoMatchesAvailability(hydrated.video)) {
              return null;
            }

            if (options.channel && hydrated.channelSlug !== options.channel) {
              return null;
            }

            const matchScore = scoreSearchDocument(
              hydrated.searchText,
              options.query,
              `${hydrated.zhTitle} ${hydrated.enTitle} ${hydrated.video.zhTitle} ${hydrated.video.title}`,
              hydrated.tags,
            );

            if (!matchScore) {
              return null;
            }

            return {
              ...hydrated,
              resultType: "clip" as const,
              matchScore: matchScore + hydrated.rankScore,
            } satisfies SearchClipResult;
          })
          .filter(isDefined)
          .sort((left, right) => right.matchScore - left.matchScore) as SearchClipResult[];

  const videos =
    type === "clips"
      ? []
      : data.videos
          .map((video) => {
            const channel = channelMap.get(video.channelId);

            if (!channel || !videoMatchesAvailability(video)) {
              return null;
            }

            if (options.channel) {
              const videoClips = data.clips.filter((clip) => clip.videoId === video.id);
              if (!videoClips.some((clip) => clip.channelSlug === options.channel)) {
                return null;
              }
            }

            const matchScore = scoreSearchDocument(
              video.searchText,
              options.query,
              `${video.zhTitle} ${video.title}`,
            );

            if (!matchScore) {
              return null;
            }

            return {
              ...video,
              resultType: "video" as const,
              matchScore: matchScore + Math.round(video.viewCount / 1000),
              channel,
              clipCount: data.clips.filter((clip) => clip.videoId === video.id).length,
            } satisfies SearchVideoResult;
          })
          .filter(isDefined)
          .sort((left, right) => right.matchScore - left.matchScore) as SearchVideoResult[];

  const nextCursor =
    cursor + limit < Math.max(clips.length, videos.length) ? cursor + limit : null;

  return {
    clips: clips.slice(cursor, cursor + limit),
    videos: videos.slice(cursor, cursor + limit),
    nextCursor,
  };
}

export async function addChannel(channel: Channel) {
  return updateStore((current) => ({
    ...current,
    channels: [normalizeChannel(channel), ...current.channels],
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
      | "signalSource"
      | "rankScore"
    >
  >,
) {
  return updateStore((current) => ({
    ...current,
    clips: current.clips.map((clip) =>
      clip.id === id
        ? normalizeClip({
            ...clip,
            ...changes,
            rankScore:
              typeof changes.rankScore === "number"
                ? changes.rankScore
                : typeof changes.score === "number"
                  ? changes.score
                  : clip.rankScore,
            updatedAt: new Date().toISOString(),
          })
        : clip,
    ),
  }));
}

export async function patchVideo(
  id: string,
  changes: Partial<
    Pick<
      Video,
      | "availabilityStatus"
      | "playbackCheckedAt"
      | "playbackErrorReason"
      | "transcriptStatus"
      | "description"
      | "viewCount"
    >
  >,
) {
  return updateStore((current) => ({
    ...current,
    videos: current.videos.map((video) =>
      video.id === id
        ? normalizeVideo({
            ...video,
            ...changes,
          })
        : video,
    ),
  }));
}

export async function setClipStatus(id: string, status: Clip["status"]) {
  return patchClip(id, { status });
}

export async function replaceVideoClips(
  videoId: string,
  clips: Clip[],
  transcript: TranscriptSegment[],
) {
  return updateStore((current) => ({
    ...current,
    clips: [
      ...current.clips.filter((clip) => clip.videoId !== videoId),
      ...clips.map((clip) => normalizeClip(clip)),
    ],
    transcripts: {
      ...current.transcripts,
      [videoId]: transcript,
    },
  }));
}

export async function touchVideoSearchIndex(id: string) {
  return updateStore((current) => ({
    ...current,
    videos: current.videos.map((video) =>
      video.id === id
        ? {
            ...video,
            searchText: buildVideoSearchText(
              video,
              current.channels.find((channel) => channel.id === video.channelId),
            ),
          }
        : video,
    ),
    clips: current.clips.map((clip) => {
      if (clip.videoId !== id) {
        return clip;
      }

      const video = current.videos.find((item) => item.id === clip.videoId);
      const channel = video
        ? current.channels.find((item) => item.id === video.channelId)
        : undefined;

      return {
        ...clip,
        searchText: buildClipSearchText(clip, video, channel),
      };
    }),
  }));
}

export async function getVideoTranscript(id: string): Promise<TranscriptSegment[]> {
  const data = await readStore();
  return data.transcripts[id] ?? [];
}
