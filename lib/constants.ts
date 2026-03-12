import type { VideoChannelSlug } from "@/lib/types";

export const APP_NAME = "GameTok";
export const SAVED_CLIPS_KEY = "gametok:saved-clips";
export const PLAYER_SOUND_KEY = "gametok:player-sound";
export const LANGUAGE_PREFERENCE_KEY = "gametok:language";
export const AUTO_PUBLISH_SCORE = 80;
export const AUTO_PUBLISH_CONFIDENCE = 0.78;

export const CHANNEL_LABELS: Record<VideoChannelSlug, string> = {
  market: "\u5e02\u573a\u8d8b\u52bf",
  breakdown: "\u4ea7\u54c1\u62c6\u89e3",
  dev_design: "\u7814\u53d1\u8bbe\u8ba1",
  documentary: "\u7eaa\u5f55/\u8bbf\u8c08",
  ai_tools: "AI/\u5de5\u5177",
};

export const CHANNEL_LABELS_EN: Record<VideoChannelSlug, string> = {
  market: "Market Trends",
  breakdown: "Breakdowns",
  dev_design: "Dev & Design",
  documentary: "Docs & Interviews",
  ai_tools: "AI & Tools",
};

export const CHANNEL_DESCRIPTIONS: Record<VideoChannelSlug, string> = {
  market: "\u53d1\u884c\u3001\u589e\u957f\u3001\u7559\u5b58\u4e0e\u5546\u4e1a\u5316\u7b56\u7565\u3002",
  breakdown: "\u7cfb\u7edf\u8bbe\u8ba1\u3001\u6848\u4f8b\u62c6\u89e3\u4e0e\u4ea7\u54c1\u65b9\u6cd5\u8bba\u3002",
  dev_design: "\u5f00\u53d1\u6d41\u7a0b\u3001\u5173\u5361\u8bbe\u8ba1\u4e0e\u5236\u4f5c\u65b9\u6cd5\u3002",
  documentary: "\u56e2\u961f\u7eaa\u5f55\u7247\u3001\u8bbf\u8c08\u4e0e\u5e55\u540e\u751f\u4ea7\u6d41\u7a0b\u3002",
  ai_tools: "\u751f\u6210\u5f0f AI\u3001\u5236\u4f5c\u5de5\u5177\u548c\u5de5\u4f5c\u6d41\u3002",
};
