import { buildYoutubeThumbnail } from "@/lib/youtube";
import type { RemoteCatalogVideo } from "@/lib/types";

export const REMOTE_VIDEO_CATALOG: RemoteCatalogVideo[] = [
  {
    id: "video_gdc_02",
    channelId: "ch_gdc",
    sourceVideoId: "dQw4w9WgXcQ",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Retention Is Product Design, Not a Live-Ops Patch",
    zhTitle: "留存不是运营补丁，而是产品设计本身",
    description:
      "A talk about how teams should bake long-term player motivation into the core loop before live-ops and rewards enter the picture.",
    durationSec: 2214,
    publishedAt: "2025-11-21T10:00:00.000Z",
    transcriptStatus: "ready",
    transcript: [
      {
        startSec: 30,
        durationSec: 11,
        text: "Teams often call retention a live-ops problem, but players leave long before content cadence becomes the real issue.",
      },
      {
        startSec: 41,
        durationSec: 12,
        text: "The first hour teaches whether mastery is possible, whether identity matters, and whether social status can emerge.",
      },
      {
        startSec: 53,
        durationSec: 12,
        text: "If those signals are absent, no streak bonus or return calendar will reverse the product decision.",
      },
      {
        startSec: 65,
        durationSec: 10,
        text: "Healthy retention comes from stable habits, not from surprise taxes on the player calendar.",
      },
      {
        startSec: 75,
        durationSec: 13,
        text: "Designers need a map of motivations, because each update either strengthens a habit loop or introduces friction.",
      },
      {
        startSec: 88,
        durationSec: 14,
        text: "When we tested the loop, the biggest lift came from clearer goals and less waiting, not from adding more currencies.",
      },
      {
        startSec: 102,
        durationSec: 14,
        text: "That is the uncomfortable lesson for leadership: growth targets are often downstream of tutorial quality and system clarity.",
      },
    ],
    generatedClips: [
      {
        channelSlug: "market",
        startSec: 30,
        endSec: 88,
        zhTitle: "留存问题往往在首小时就已经决定了",
        zhSummary:
          "这段切片把“留存”重新定义为核心产品设计问题，而不是运营阶段再补救的指标。真正决定用户是否会回来的是第一小时是否建立了目标感、成长感和身份认同。",
        zhTakeaways: [
          "留存失败通常是早期体验的问题，不是活动频次的问题。",
          "首小时必须让玩家感到自己能进步、能表达、能形成习惯。",
          "奖励系统只能放大已有动机，不能替代动机。",
        ],
        tags: ["留存", "增长", "首小时体验"],
        transcriptExcerpt:
          "Teams often call retention a live-ops problem, but players leave long before content cadence becomes the real issue.",
        transcriptZh:
          "很多团队把留存当成运营节奏问题，但玩家往往在内容更新之前就已经因为核心体验而离开了。",
        score: 89,
        confidence: 0.92,
        editorPick: true,
      },
    ],
  },
  {
    id: "video_gmtk_02",
    channelId: "ch_gmtk",
    sourceVideoId: "jNQXAC9IVRw",
    sourceUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    title: "How Levels Teach Without Breaking Flow",
    zhTitle: "关卡如何在不打断节奏的前提下完成教学",
    description:
      "A deep dive into environmental teaching, layered affordances and tutorial pacing in modern action games.",
    durationSec: 1820,
    publishedAt: "2025-10-12T09:00:00.000Z",
    transcriptStatus: "ready",
    transcript: [
      {
        startSec: 48,
        durationSec: 11,
        text: "The best tutorial is often invisible because the level geometry quietly narrows the player's options without feeling restrictive.",
      },
      {
        startSec: 59,
        durationSec: 12,
        text: "A strong level does not explain the move, it makes the move the most attractive next action.",
      },
      {
        startSec: 71,
        durationSec: 10,
        text: "That is why sightlines, enemy placement and reward framing matter as much as input prompts.",
      },
      {
        startSec: 81,
        durationSec: 11,
        text: "Whenever the UI has to over-explain, the space itself may be failing to communicate.",
      },
      {
        startSec: 92,
        durationSec: 13,
        text: "Designers can layer complexity by repeating a lesson with a twist, letting players feel ownership instead of obedience.",
      },
      {
        startSec: 105,
        durationSec: 14,
        text: "What looks like elegance to the player is usually the result of ruthless iteration on timing and friction.",
      },
    ],
    generatedClips: [
      {
        channelSlug: "dev_design",
        startSec: 48,
        endSec: 105,
        zhTitle: "好的教学不是解释，而是让正确动作变成最自然的选择",
        zhSummary:
          "这段内容解释了关卡教学的本质：不是用更多 UI 和弹窗告诉玩家做什么，而是通过空间、敌人摆放和奖励引导，让玩家自己愿意做出正确动作。",
        zhTakeaways: [
          "无感教学依赖环境设计，而不是文本说明。",
          "视线、路径和奖励 framing 会直接影响玩家决策。",
          "重复同一规则并加入变化，是提升掌握感的关键方法。",
        ],
        tags: ["关卡设计", "新手引导", "无感教学"],
        transcriptExcerpt:
          "A strong level does not explain the move, it makes the move the most attractive next action.",
        transcriptZh:
          "优秀的关卡不会直接解释动作，而是让那个动作自然成为玩家最想做的下一步。",
        score: 86,
        confidence: 0.88,
        editorPick: true,
      },
    ],
  },
  {
    id: "video_noclip_02",
    channelId: "ch_noclip",
    sourceVideoId: "3fumBcKC6RE",
    sourceUrl: "https://www.youtube.com/watch?v=3fumBcKC6RE",
    title: "Inside the Production Rituals of a Healthy Studio",
    zhTitle: "健康工作室的跨职能协作仪式",
    description:
      "A documentary-style interview on production rituals, async communication and decision making in distributed teams.",
    durationSec: 2440,
    publishedAt: "2025-12-03T09:00:00.000Z",
    transcriptStatus: "ready",
    transcript: [
      {
        startSec: 60,
        durationSec: 12,
        text: "The teams shipping well were not the teams with the most meetings, they were the teams with the clearest interfaces between disciplines.",
      },
      {
        startSec: 72,
        durationSec: 12,
        text: "A designer knew what kind of prototype engineering needed, and engineering knew what level of fidelity art could postpone.",
      },
      {
        startSec: 84,
        durationSec: 11,
        text: "That created trust because requests arrived with context instead of panic.",
      },
      {
        startSec: 95,
        durationSec: 12,
        text: "Studios often underestimate how much morale improves when decisions are documented while they are still fresh.",
      },
      {
        startSec: 107,
        durationSec: 12,
        text: "The ritual is simple: decide in the room, document before lunch, and revisit only if a new risk appears.",
      },
      {
        startSec: 119,
        durationSec: 13,
        text: "Without that ritual, every sprint starts by rediscovering the same constraints.",
      },
    ],
    generatedClips: [
      {
        channelSlug: "documentary",
        startSec: 60,
        endSec: 119,
        zhTitle: "高效团队不是会议更多，而是接口更清晰",
        zhSummary:
          "这段纪录片式访谈把团队效率问题拆回到跨职能接口设计：设计、程序、美术之间如果明确彼此需要什么，协作效率和团队士气都会显著提升。",
        zhTakeaways: [
          "高效协作的前提是接口清晰，而不是会议密度高。",
          "决策需要在当天被记录，否则团队会反复重新讨论。",
          "上下游信息带着上下文交接，能显著减少恐慌式请求。",
        ],
        tags: ["制作流程", "跨团队协作", "纪录片"],
        transcriptExcerpt:
          "The teams shipping well were not the teams with the most meetings, they were the teams with the clearest interfaces between disciplines.",
        transcriptZh: "真正交付稳定的团队，不是会议最多的团队，而是跨职能接口最清晰的团队。",
        score: 77,
        confidence: 0.7,
        editorPick: false,
      },
    ],
  },
];

export function buildSeedThumbnail(videoId: string) {
  return buildYoutubeThumbnail(videoId);
}
