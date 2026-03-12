import type { Channel } from "@/lib/types";

export function buildChannelFromUrl(url: string, existingCount: number): Channel {
  const parsed = new URL(url);
  const handle = parsed.pathname.replaceAll("/", "") || `channel-${existingCount + 1}`;
  const label = handle.replace(/^@/, "").replaceAll("-", " ");

  return {
    id: `ch_custom_${existingCount + 1}`,
    sourceType: "youtube",
    sourceChannelId: handle,
    name: label,
    handle: handle.startsWith("@") ? handle : `@${handle}`,
    language: "en",
    description:
      "\u81ea\u5b9a\u4e49\u767d\u540d\u5355\u9891\u9053\uff0c\u7b49\u5f85\u63a5\u5165\u5b9e\u9645\u7684\u540c\u6b65\u4e0e\u5207\u7247\u6d41\u7a0b\u3002",
    avatarUrl:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80",
    themeColor: "#2a7f62",
    whitelistStatus: "active",
    syncStatus: "idle",
    lastSyncedAt: null,
    authMode: "public",
    analyticsConnectedAt: null,
  };
}
