export type SourceType = "youtube";
export type Language = "en" | "zh" | "mixed";
export type TranscriptStatus = "ready" | "missing" | "processing";
export type ClipStatus = "draft" | "published" | "archived" | "needs_review";
export type ChannelSyncStatus = "idle" | "running" | "error";
export type WhitelistStatus = "active" | "paused";

export type VideoChannelSlug =
  | "market"
  | "breakdown"
  | "dev_design"
  | "documentary"
  | "ai_tools";

export interface TranscriptSegment {
  startSec: number;
  durationSec: number;
  text: string;
}

export interface Channel {
  id: string;
  sourceType: SourceType;
  sourceChannelId: string;
  name: string;
  handle: string;
  language: Language;
  description: string;
  avatarUrl: string;
  themeColor: string;
  whitelistStatus: WhitelistStatus;
  syncStatus: ChannelSyncStatus;
  lastSyncedAt: string | null;
}

export interface Video {
  id: string;
  channelId: string;
  sourceVideoId: string;
  sourceUrl: string;
  title: string;
  zhTitle: string;
  description: string;
  durationSec: number;
  thumbnailUrl: string;
  transcriptStatus: TranscriptStatus;
  publishedAt: string;
}

export interface Clip {
  id: string;
  videoId: string;
  channelSlug: VideoChannelSlug;
  startSec: number;
  endSec: number;
  zhTitle: string;
  zhSummary: string;
  zhTakeaways: string[];
  tags: string[];
  transcriptExcerpt: string;
  transcriptZh: string;
  score: number;
  confidence: number;
  status: ClipStatus;
  editorPick: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreData {
  channels: Channel[];
  videos: Video[];
  clips: Clip[];
  transcripts: Record<string, TranscriptSegment[]>;
}

export interface FeedClip extends Clip {
  video: Video;
  channel: Channel;
  watchUrl: string;
  continueAtSec: number;
}

export interface VideoDetail extends Video {
  channel: Channel;
  clips: FeedClip[];
  transcript: TranscriptSegment[];
}

export interface AdminOverview {
  channels: Channel[];
  videos: (Video & { channel: Channel; clipCount: number })[];
  clips: FeedClip[];
  pendingClips: FeedClip[];
  counts: {
    publishedClips: number;
    pendingClips: number;
    videos: number;
    channels: number;
  };
}

export interface RemoteCatalogVideo {
  id: string;
  channelId: string;
  sourceVideoId: string;
  sourceUrl: string;
  title: string;
  zhTitle: string;
  description: string;
  durationSec: number;
  publishedAt: string;
  transcriptStatus: TranscriptStatus;
  transcript: TranscriptSegment[];
  generatedClips: Array<
    Pick<
      Clip,
      | "channelSlug"
      | "startSec"
      | "endSec"
      | "zhTitle"
      | "zhSummary"
      | "zhTakeaways"
      | "tags"
      | "transcriptExcerpt"
      | "transcriptZh"
      | "score"
      | "confidence"
      | "editorPick"
    >
  >;
}
