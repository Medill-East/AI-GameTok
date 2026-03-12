import { CHANNEL_LABELS, CHANNEL_LABELS_EN } from "@/lib/constants";
import type { Clip, DisplayLanguage, Video, VideoChannelSlug } from "@/lib/types";

export function getChannelLabel(slug: VideoChannelSlug, language: DisplayLanguage) {
  return language === "en" ? CHANNEL_LABELS_EN[slug] : CHANNEL_LABELS[slug];
}

export function getClipTitle(
  clip: Pick<Clip, "zhTitle" | "enTitle" | "transcriptExcerpt">,
  language: DisplayLanguage,
  fallbackTitle?: string,
) {
  if (language === "en") {
    return clip.enTitle || fallbackTitle || clip.transcriptExcerpt || clip.zhTitle;
  }

  return clip.zhTitle || fallbackTitle || clip.enTitle || clip.transcriptExcerpt;
}

export function getClipSummary(
  clip: Pick<Clip, "zhSummary" | "enSummary" | "transcriptExcerpt">,
  language: DisplayLanguage,
  fallbackSummary?: string,
) {
  if (language === "en") {
    return clip.enSummary || fallbackSummary || clip.transcriptExcerpt || clip.zhSummary;
  }

  return clip.zhSummary || fallbackSummary || clip.enSummary || clip.transcriptExcerpt;
}

export function getVideoTitle(
  video: Pick<Video, "zhTitle" | "title">,
  language: DisplayLanguage,
) {
  return language === "en" ? video.title || video.zhTitle : video.zhTitle || video.title;
}
