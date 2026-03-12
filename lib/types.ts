export type SourceType = "youtube";
export type Language = "en" | "zh" | "mixed";
export type DisplayLanguage = "zh" | "en";
export type TranscriptStatus = "ready" | "missing" | "processing";
export type ClipStatus = "draft" | "published" | "archived" | "needs_review";
export type ChannelSyncStatus = "idle" | "running" | "error";
export type WhitelistStatus = "active" | "paused";
export type ChannelAuthMode = "public" | "authorized";
export type AvailabilityStatus =
  | "ok"
  | "unavailable"
  | "private"
  | "deleted"
  | "embed_blocked"
  | "age_restricted";
export type ClipSignalSource = "public_heuristic" | "analytics_retention";

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
  authMode: ChannelAuthMode;
  analyticsConnectedAt?: string | null;
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
  viewCount: number;
  availabilityStatus: AvailabilityStatus;
  playbackCheckedAt: string | null;
  playbackErrorReason: string | null;
  searchText: string;
}

export interface Clip {
  id: string;
  videoId: string;
  channelSlug: VideoChannelSlug;
  startSec: number;
  endSec: number;
  enTitle: string;
  zhTitle: string;
  enSummary: string;
  zhSummary: string;
  zhTakeaways: string[];
  tags: string[];
  transcriptExcerpt: string;
  transcriptZh: string;
  score: number;
  confidence: number;
  status: ClipStatus;
  editorPick: boolean;
  signalSource: ClipSignalSource;
  rankScore: number;
  searchText: string;
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

export interface FeedPage {
  clips: FeedClip[];
  nextCursor: number | null;
  recycled?: boolean;
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
  playbackIssues: (Video & { channel: Channel; clipCount: number })[];
  counts: {
    publishedClips: number;
    pendingClips: number;
    videos: number;
    channels: number;
    playbackIssues: number;
  };
}

export interface SearchClipResult extends FeedClip {
  resultType: "clip";
  matchScore: number;
}

export interface SearchVideoResult extends Video {
  resultType: "video";
  matchScore: number;
  channel: Channel;
  clipCount: number;
}

export interface SearchResults {
  clips: SearchClipResult[];
  videos: SearchVideoResult[];
  nextCursor: number | null;
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
      | "enTitle"
      | "zhTitle"
      | "enSummary"
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
