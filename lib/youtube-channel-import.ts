import { buildYoutubeThumbnail } from "@/lib/youtube";
import type {
  Channel,
  Clip,
  StoreData,
  TranscriptSegment,
  Video,
  VideoChannelSlug,
} from "@/lib/types";

interface ExtractedVideo {
  sourceVideoId: string;
  title: string;
  durationSec: number;
  publishedAt: string;
  viewCount: number;
}

interface ChannelImportConfig {
  sourceChannelId: string;
  handle: string;
  videosUrl: string;
  description: string;
  focusLabel: string;
  defaultSlug: VideoChannelSlug;
  minDurationSec: number;
  includeAny?: string[];
  excludeAny?: string[];
}

interface ChapterMarker {
  title: string;
  startSec: number;
  endSec: number;
}

interface WatchDetails {
  description: string;
  chapters: ChapterMarker[];
  outline: TranscriptSegment[];
}

const CHANNEL_IMPORT_SOURCES: Record<string, ChannelImportConfig> = {
  ch_gdc: {
    sourceChannelId: "UC0JB7TSe49lg56u6qH8y_MQ",
    handle: "@GDCFestivalofGaming",
    videosUrl: "https://www.youtube.com/@GDCFestivalofGaming/videos?view=0&sort=p&flow=grid",
    description:
      "Game industry talks, production lessons, design methods and business strategy from GDC.",
    focusLabel: "\u6e38\u620f\u884c\u4e1a\u6f14\u8bb2\u4e0e\u65b9\u6cd5\u8bba",
    defaultSlug: "market",
    minDurationSec: 300,
    includeAny: [
      "design",
      "marketing",
      "steam",
      "mobile",
      "live service",
      "building",
      "rendering",
      "art",
      "procedural",
      "rules of the game",
      "pipeline",
      "production",
      "economy",
      "monet",
      "retention",
      "narrative",
      "combat",
      "animation",
      "vfx",
      "audio",
      "ux",
      "world",
      "career",
      "publishing",
      "indie",
      "launch",
    ],
    excludeAny: [
      "host announcement",
      "winners reveal",
      "concert",
      "#1reasontobe",
      "main stage",
      "festival trailer",
    ],
  },
  ch_gmtk: {
    sourceChannelId: "UCqJ-Xo29CKyLTjn6z2XwYAw",
    handle: "@GMTK",
    videosUrl: "https://www.youtube.com/@GMTK/videos?view=0&sort=p&flow=grid",
    description: "Game design breakdowns, level design essays and prototype thinking.",
    focusLabel: "\u6e38\u620f\u8bbe\u8ba1\u62c6\u89e3\u4e0e\u65b9\u6cd5",
    defaultSlug: "dev_design",
    minDurationSec: 300,
    excludeAny: [
      "trailer",
      "let's play",
      "sorry i stopped posting",
      "i've waited my whole life for this",
    ],
  },
  ch_noclip: {
    sourceChannelId: "UC0fDG3byEcMtbOqPMymDNbw",
    handle: "@NoclipDocs",
    videosUrl: "https://www.youtube.com/@NoclipDocs/videos?view=0&sort=p&flow=grid",
    description: "Studio documentaries, developer interviews and production deep dives.",
    focusLabel: "\u5de5\u4f5c\u5ba4\u7eaa\u5f55\u7247\u4e0e\u5e55\u540e\u6d41\u7a0b",
    defaultSlug: "documentary",
    minDurationSec: 300,
    excludeAny: ["teaser trailer", "announcing /noclip's brand new channel"],
  },
};

const GLOBAL_TITLE_BLACKLIST = [
  "official trailer",
  "teaser trailer",
  "coming soon",
  "host announcement",
  "winners reveal",
  "brand new channel",
  "video blog update",
];

const LOW_VALUE_CHAPTER_PATTERNS = [
  "intro",
  "credits",
  "credit",
  "outro",
  "sponsor",
  "subscribe",
  "patreon",
];

const GENERIC_CHAPTER_PATTERNS = [
  /^key segment$/i,
  /^hello$/i,
  /^december$/i,
  /^lesson \d+$/i,
  /^\d+\s+to\s+\d+$/i,
  /^honou?rable mentions$/i,
  /^other games$/i,
];

const HIGH_SIGNAL_CHAPTER_PATTERNS = [
  "design",
  "system",
  "story",
  "art",
  "level",
  "render",
  "tool",
  "pipeline",
  "marketing",
  "steam",
  "launch",
  "business",
  "production",
  "performance",
  "writing",
  "combat",
  "world",
  "route",
];

function walkForVideoRenderers(node: unknown, bucket: Array<Record<string, unknown>>) {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => walkForVideoRenderers(item, bucket));
    return;
  }

  if ("richItemRenderer" in node) {
    const richItem = node.richItemRenderer as {
      content?: { videoRenderer?: Record<string, unknown> };
    };
    if (richItem.content?.videoRenderer) {
      bucket.push(richItem.content.videoRenderer);
    }
  }

  if ("gridVideoRenderer" in node) {
    bucket.push(node.gridVideoRenderer as Record<string, unknown>);
  }

  Object.values(node).forEach((value) => walkForVideoRenderers(value, bucket));
}

function parseDuration(text?: string) {
  if (!text) {
    return 0;
  }

  const parts = text.split(":").map((item) => Number(item));
  if (parts.some((item) => Number.isNaN(item))) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0];
}

function parseViewCount(text?: string) {
  if (!text) {
    return 0;
  }

  const normalized = text.toLowerCase().replace(/,/g, "").replace(/views?/g, "").trim();
  const match = normalized.match(/([\d.]+)\s*([kmb])?/);
  if (!match) {
    return 0;
  }

  const base = Number(match[1]);
  const suffix = match[2];

  if (!suffix) {
    return Math.round(base);
  }

  if (suffix === "k") {
    return Math.round(base * 1_000);
  }

  if (suffix === "m") {
    return Math.round(base * 1_000_000);
  }

  if (suffix === "b") {
    return Math.round(base * 1_000_000_000);
  }

  return Math.round(base);
}

function parsePublishedTime(text?: string) {
  if (!text) {
    return new Date().toISOString();
  }

  const normalized = text.toLowerCase();
  const match = normalized.match(
    /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/,
  );

  if (!match) {
    return new Date().toISOString();
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const now = new Date();

  if (unit === "minute") {
    now.setMinutes(now.getMinutes() - amount);
  } else if (unit === "hour") {
    now.setHours(now.getHours() - amount);
  } else if (unit === "day") {
    now.setDate(now.getDate() - amount);
  } else if (unit === "week") {
    now.setDate(now.getDate() - amount * 7);
  } else if (unit === "month") {
    now.setMonth(now.getMonth() - amount);
  } else if (unit === "year") {
    now.setFullYear(now.getFullYear() - amount);
  }

  return now.toISOString();
}

function inferChannelSlug(title: string, fallback: VideoChannelSlug): VideoChannelSlug {
  const normalized = title.toLowerCase();

  if (
    normalized.includes("design") ||
    normalized.includes("level") ||
    normalized.includes("tutorial") ||
    normalized.includes("prototype")
  ) {
    return "dev_design";
  }

  if (
    normalized.includes("market") ||
    normalized.includes("retention") ||
    normalized.includes("business") ||
    normalized.includes("monet") ||
    normalized.includes("publishing") ||
    normalized.includes("steam")
  ) {
    return "market";
  }

  if (
    normalized.includes("inside") ||
    normalized.includes("documentary") ||
    normalized.includes("studio") ||
    normalized.includes("interview")
  ) {
    return "documentary";
  }

  if (
    normalized.includes("tool") ||
    normalized.includes("engine") ||
    normalized.includes("pipeline") ||
    normalized.includes("workflow") ||
    normalized.includes("rendering")
  ) {
    return "ai_tools";
  }

  if (
    normalized.includes("breakdown") ||
    normalized.includes("why ") ||
    normalized.includes("what's the point") ||
    normalized.includes("how games do")
  ) {
    return "breakdown";
  }

  return fallback;
}

function cleanDescription(description: string) {
  return description
    .replaceAll("\\n", "\n")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isPromotionalLine(line: string) {
  const normalized = line.toLowerCase();

  return [
    "support us on patreon",
    "subscribe",
    "join noclip on youtube",
    "website:",
    "store:",
    "instagram:",
    "twitter:",
    "twitch:",
    "podcast:",
    "podcast channel:",
    "edited by",
    "filmed by",
    "gameplay capture",
    "captions by",
    "archive youtube channel:",
    "archive dot org page:",
  ].some((pattern) => normalized.includes(pattern));
}

function extractLeadParagraph(description: string) {
  const cleaned = cleanDescription(description);
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !isPromotionalLine(line) && !/^https?:\/\//i.test(line))
        .join(" ")
        .trim(),
    )
    .filter(Boolean);

  const paragraph =
    paragraphs.find(
      (item) => item.length >= 40 && !/(patreon|subscribe|http|www\.)/i.test(item),
    ) ??
    paragraphs[0] ??
    "";

  return paragraph.slice(0, 420);
}

function parseTimestampToSeconds(input: string) {
  const parts = input.split(":").map((item) => Number(item));
  if (parts.some((item) => Number.isNaN(item))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

function extractChapters(description: string, durationSec: number) {
  const matches = cleanDescription(description)
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^((?:\d+:)?\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(.+)$/);
      if (!match) {
        return null;
      }

      const startSec = parseTimestampToSeconds(match[1]);
      if (startSec === null) {
        return null;
      }

      return {
        startSec,
        title: match[2].trim(),
      };
    })
    .filter(Boolean) as Array<{ startSec: number; title: string }>;

  const deduped = matches.filter(
    (item, index) =>
      index ===
      matches.findIndex(
        (candidate) =>
          candidate.startSec === item.startSec && candidate.title === item.title,
      ),
  );

  return deduped
    .map((item, index) => ({
      title: item.title,
      startSec: item.startSec,
      endSec:
        index < deduped.length - 1 ? deduped[index + 1].startSec : durationSec,
    }))
    .filter((item) => item.endSec - item.startSec >= 30);
}

function sanitizeChapterTitle(title: string) {
  return title
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+[-\u2013\u2014]\s*$/g, "")
    .trim();
}

function isWeakChapterTitle(title: string) {
  const normalized = sanitizeChapterTitle(title);

  if (normalized.length < 6) {
    return true;
  }

  return GENERIC_CHAPTER_PATTERNS.some((pattern) => pattern.test(normalized));
}

async function fetchTextWithRetry(url: string, init: RequestInit, attempts = 2) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Request failed for ${url}`);
}

async function fetchWatchDetails(videoId: string, durationSec: number): Promise<WatchDetails> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const html = await fetchTextWithRetry(
    url,
    {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    },
    2,
  );

  const match = html.match(/"shortDescription":"([\s\S]*?)","isCrawlable"/);
  const rawDescription = match ? JSON.parse(`"${match[1]}"`) : "";
  const description = cleanDescription(rawDescription);
  const chapters = extractChapters(description, durationSec);

  return {
    description,
    chapters,
    outline: chapters.map((chapter) => ({
      startSec: chapter.startSec,
      durationSec: Math.max(1, chapter.endSec - chapter.startSec),
      text: chapter.title,
    })),
  };
}

function buildSummary(
  channelName: string,
  videoTitle: string,
  chapterTitle: string,
  leadParagraph: string,
) {
  const lead = leadParagraph ? ` ${leadParagraph}` : "";
  return `\u6765\u81ea ${channelName} \u7684\u300a${videoTitle}\u300b\u7ae0\u8282\u300c${chapterTitle}\u300d\u3002${lead}`.trim();
}

function buildTakeaways(
  focusLabel: string,
  chapterTitle: string,
  videoTitle: string,
) {
  return [
    `\u6765\u81ea\u300a${videoTitle}\u300b\u7684\u300c${chapterTitle}\u300d\u7247\u6bb5\u3002`,
    `\u5185\u5bb9\u4e3b\u9898\uff1a${focusLabel}\u3002`,
    "\u70b9\u51fb\u201c\u7ee7\u7eed\u770b\u201d\u53ef\u76f4\u63a5\u8df3\u5230\u539f\u89c6\u9891\u5bf9\u5e94\u65f6\u95f4\u70b9\u3002",
  ];
}

function scoreFromViews(viewCount: number) {
  if (viewCount >= 1_000_000) {
    return 95;
  }
  if (viewCount >= 500_000) {
    return 90;
  }
  if (viewCount >= 250_000) {
    return 86;
  }
  return 82;
}

function extractVideoTopicKeywords(videoTitle: string) {
  return videoTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= 5 &&
        ![
          "making",
          "documentary",
          "video",
          "games",
          "game",
          "about",
          "their",
          "there",
          "these",
          "those",
          "part",
          "series",
          "iconic",
        ].includes(word),
    );
}

function shouldImportVideo(item: ExtractedVideo, config: ChannelImportConfig) {
  const normalized = item.title.toLowerCase();

  if (item.durationSec < config.minDurationSec) {
    return false;
  }

  if (GLOBAL_TITLE_BLACKLIST.some((pattern) => normalized.includes(pattern))) {
    return false;
  }

  if (config.excludeAny?.some((pattern) => normalized.includes(pattern))) {
    return false;
  }

  if (config.includeAny?.length) {
    return config.includeAny.some((pattern) => normalized.includes(pattern));
  }

  return true;
}

function scoreChapter(chapter: ChapterMarker, videoTitle?: string) {
  const normalized = sanitizeChapterTitle(chapter.title).toLowerCase();
  let score = 0;

  if (!LOW_VALUE_CHAPTER_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    score += 3;
  }

  if (HIGH_SIGNAL_CHAPTER_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    score += 4;
  }

  if (chapter.startSec > 0) {
    score += 1;
  }

  if (chapter.endSec - chapter.startSec >= 75) {
    score += 1;
  }

  if (
    videoTitle &&
    extractVideoTopicKeywords(videoTitle).some((keyword) => normalized.includes(keyword))
  ) {
    score += 2;
  }

  if (isWeakChapterTitle(normalized)) {
    score -= 4;
  }

  return score;
}

function pickChapterClips(
  chapters: ChapterMarker[],
  durationSec: number,
  videoTitle: string,
) {
  const candidates = chapters
    .map((chapter) => ({
      ...chapter,
      title: sanitizeChapterTitle(chapter.title),
    }))
    .filter(
      (chapter) =>
        chapter.title &&
        !LOW_VALUE_CHAPTER_PATTERNS.some((pattern) =>
          chapter.title.toLowerCase().includes(pattern),
        ),
    )
    .map((chapter) => ({
      ...chapter,
      chapterScore: scoreChapter(chapter, videoTitle),
    }))
    .sort((left, right) => {
      if (left.chapterScore !== right.chapterScore) {
        return right.chapterScore - left.chapterScore;
      }

      return left.startSec - right.startSec;
    })
    .slice(0, 3)
    .sort((left, right) => left.startSec - right.startSec);

  if (!candidates.length) {
    const fallbackStart = durationSec > 480 ? 45 : 20;
    return [
      {
        title: "",
        startSec: fallbackStart,
        endSec: Math.min(durationSec - 10, fallbackStart + 75),
      },
    ];
  }

  return candidates.map((chapter) => ({
    title: chapter.title,
    startSec: chapter.startSec,
    endSec: Math.min(chapter.endSec, chapter.startSec + 85),
  }));
}

function buildClipHeadline(
  channelName: string,
  videoTitle: string,
  chapterTitle: string,
  index: number,
) {
  const normalizedChapterTitle = sanitizeChapterTitle(chapterTitle);

  if (!normalizedChapterTitle || isWeakChapterTitle(normalizedChapterTitle)) {
    return `${channelName} / ${videoTitle}${index > 0 ? ` - Part ${index + 1}` : ""}`;
  }

  return `${channelName} / ${normalizedChapterTitle}`;
}

function buildClipTranscriptNote(chapterTitle: string, videoTitle: string, index: number) {
  const normalizedChapterTitle = sanitizeChapterTitle(chapterTitle);

  if (!normalizedChapterTitle || isWeakChapterTitle(normalizedChapterTitle)) {
    return `\u81ea\u52a8\u5207\u7247\u4f9d\u636e\uff1a\u300a${videoTitle}\u300b\u7684\u9ad8\u4fe1\u53f7\u65f6\u95f4\u6bb5 ${index + 1}\u3002`;
  }

  return `\u81ea\u52a8\u5207\u7247\u4f9d\u636e\uff1a\u89c6\u9891\u539f\u59cb\u7ae0\u8282\u300c${normalizedChapterTitle}\u300d\u3002`;
}

async function validateYoutubeVideo(videoId: string) {
  const url =
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function fetchChannelVideos(channelId: string) {
  const config = CHANNEL_IMPORT_SOURCES[channelId];

  if (!config) {
    return [];
  }

  const html = await fetchTextWithRetry(
    config.videosUrl,
    {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    },
    2,
  );
  const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);

  if (!match?.[1]) {
    throw new Error(`Could not parse channel page for ${channelId}`);
  }

  const data = JSON.parse(match[1]) as unknown;
  const renderers: Array<Record<string, unknown>> = [];
  walkForVideoRenderers(data, renderers);

  const deduped = new Map<string, ExtractedVideo>();

  renderers.forEach((renderer) => {
    const sourceVideoId = renderer.videoId;
    if (typeof sourceVideoId !== "string" || deduped.has(sourceVideoId)) {
      return;
    }

    const title = (
      ((renderer.title as { runs?: Array<{ text: string }> })?.runs ?? [])
        .map((item) => item.text)
        .join("") ||
      ((renderer.title as { simpleText?: string })?.simpleText ?? "")
    ).trim();

    if (!title) {
      return;
    }

    const overlays =
      (renderer.thumbnailOverlays as Array<{
        thumbnailOverlayTimeStatusRenderer?: { text?: { simpleText?: string } };
      }>) ?? [];

    const durationText = overlays.find(
      (item) => item.thumbnailOverlayTimeStatusRenderer?.text?.simpleText,
    )?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText;

    deduped.set(sourceVideoId, {
      sourceVideoId,
      title,
      durationSec: parseDuration(durationText),
      publishedAt: parsePublishedTime(
        (renderer.publishedTimeText as { simpleText?: string })?.simpleText,
      ),
      viewCount: parseViewCount(
        (renderer.viewCountText as { simpleText?: string })?.simpleText ??
          (renderer.shortViewCountText as { simpleText?: string })?.simpleText,
      ),
    });
  });

  return [...deduped.values()];
}

async function selectVideosForImport(channelId: string, limit: number) {
  const config = CHANNEL_IMPORT_SOURCES[channelId];
  const extracted = await fetchChannelVideos(channelId);
  const selected: ExtractedVideo[] = [];

  for (const item of extracted) {
    if (!shouldImportVideo(item, config)) {
      continue;
    }

    if (!(await validateYoutubeVideo(item.sourceVideoId))) {
      continue;
    }

    selected.push(item);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function toVideoRecord(channelId: string, item: ExtractedVideo, watchDetails: WatchDetails): Video {
  return {
    id: `video_${channelId}_${item.sourceVideoId}`,
    channelId,
    sourceVideoId: item.sourceVideoId,
    sourceUrl: `https://www.youtube.com/watch?v=${item.sourceVideoId}`,
    title: item.title,
    zhTitle: item.title,
    description:
      extractLeadParagraph(watchDetails.description) ||
      "Imported from the channel's validated video list.",
    durationSec: item.durationSec,
    thumbnailUrl: buildYoutubeThumbnail(item.sourceVideoId),
    transcriptStatus: watchDetails.outline.length ? "ready" : "missing",
    publishedAt: item.publishedAt,
  };
}

function buildClipRecords(
  video: Video,
  channelName: string,
  focusLabel: string,
  defaultSlug: VideoChannelSlug,
  item: ExtractedVideo,
  watchDetails: WatchDetails,
) {
  const leadParagraph = extractLeadParagraph(watchDetails.description);
  const chapterSlices = pickChapterClips(
    watchDetails.chapters,
    video.durationSec,
    video.title,
  );
  const baseScore = scoreFromViews(item.viewCount);

  return chapterSlices.map((chapter, index) => {
    const channelSlug = inferChannelSlug(
      `${video.title} ${chapter.title}`,
      defaultSlug,
    );
    const chapterTitle = sanitizeChapterTitle(chapter.title) || video.title;
    const clipTitle = buildClipHeadline(channelName, video.title, chapterTitle, index);

    return {
      id: `clip_${video.sourceVideoId}_${index}`,
      videoId: video.id,
      channelSlug,
      startSec: chapter.startSec,
      endSec: chapter.endSec,
      zhTitle: clipTitle,
      zhSummary: buildSummary(channelName, video.title, chapterTitle, leadParagraph),
      zhTakeaways: buildTakeaways(focusLabel, chapterTitle, video.title),
      tags: [channelName, focusLabel, chapterTitle],
      transcriptExcerpt: chapterTitle,
      transcriptZh: buildClipTranscriptNote(chapterTitle, video.title, index),
      score: Math.max(80, baseScore - index * 2),
      confidence: watchDetails.chapters.length ? 0.94 : 0.82,
      status: "published" as const,
      editorPick: index === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies Clip;
  });
}

function clearChannelContent(data: StoreData, channelId: string) {
  const removedVideoIds = new Set(
    data.videos.filter((video) => video.channelId === channelId).map((video) => video.id),
  );

  data.videos = data.videos.filter((video) => video.channelId !== channelId);

  const beforeClipCount = data.clips.length;
  data.clips = data.clips.filter((clip) => !removedVideoIds.has(clip.videoId));

  const nextTranscripts: StoreData["transcripts"] = {};
  Object.entries(data.transcripts).forEach(([videoId, transcript]) => {
    if (!removedVideoIds.has(videoId)) {
      nextTranscripts[videoId] = transcript;
    }
  });
  data.transcripts = nextTranscripts;

  return {
    removedVideos: removedVideoIds.size,
    removedClips: beforeClipCount - data.clips.length,
  };
}

function syncManagedChannelMetadata(channel: Channel, config: ChannelImportConfig) {
  channel.sourceChannelId = config.sourceChannelId;
  channel.handle = config.handle;
  channel.description = config.description;
}

export async function importPopularVideosFromChannels(
  data: StoreData,
  limitPerChannel = 24,
) {
  const next: StoreData = structuredClone(data);
  const summary = {
    importedVideos: 0,
    importedClips: 0,
    skippedVideos: 0,
    removedVideos: 0,
    removedClips: 0,
  };

  for (const channel of next.channels) {
    if (channel.whitelistStatus !== "active") {
      continue;
    }

    const config = CHANNEL_IMPORT_SOURCES[channel.id];
    if (!config) {
      continue;
    }

    syncManagedChannelMetadata(channel, config);

    const removed = clearChannelContent(next, channel.id);
    summary.removedVideos += removed.removedVideos;
    summary.removedClips += removed.removedClips;

    const items = await selectVideosForImport(channel.id, limitPerChannel);

    for (const item of items) {
      try {
        const watchDetails = await fetchWatchDetails(item.sourceVideoId, item.durationSec);
        const video = toVideoRecord(channel.id, item, watchDetails);
        const clips = buildClipRecords(
          video,
          channel.name,
          config.focusLabel,
          config.defaultSlug,
          item,
          watchDetails,
        );

        next.videos.push(video);
        next.clips.push(...clips);
        next.transcripts[video.id] = watchDetails.outline;
        summary.importedVideos += 1;
        summary.importedClips += clips.length;
      } catch {
        summary.skippedVideos += 1;
      }
    }

    channel.lastSyncedAt = new Date().toISOString();
    channel.syncStatus = "idle";
  }

  next.videos.sort(
    (left, right) =>
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );

  next.clips.sort((left, right) => {
    if (left.editorPick !== right.editorPick) {
      return left.editorPick ? -1 : 1;
    }

    return right.score - left.score;
  });

  return { next, summary };
}
