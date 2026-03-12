import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { ProxyAgent } from "undici";
import { buildYoutubeThumbnail } from "@/lib/youtube";
import type {
  AvailabilityStatus,
  Channel,
  Clip,
  Language,
  StoreData,
  TranscriptSegment,
  Video,
  VideoChannelSlug,
} from "@/lib/types";

const execFileAsync = promisify(execFile);

interface HttpTextResponse {
  status: number;
  ok: boolean;
  text: string;
}

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
  language?: Language;
  maxClips?: number;
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

interface PlaybackHealth {
  availabilityStatus: AvailabilityStatus;
  playbackCheckedAt: string;
  playbackErrorReason: string | null;
}

const POWERSHELL_FETCH_SCRIPT = `
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$headersObject = ConvertFrom-Json $env:CODEX_HTTP_HEADERS
$headers = @{}
if ($headersObject) {
  $headersObject.PSObject.Properties | ForEach-Object {
    $headers[$_.Name] = [string]$_.Value
  }
}
$statusCode = 0
$body = ''
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $env:CODEX_HTTP_URL -Headers $headers
  $statusCode = [int]$response.StatusCode
  $body = [string]$response.Content
} catch {
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
      $reader = New-Object System.IO.StreamReader($stream)
      $body = $reader.ReadToEnd()
      $reader.Close()
    }
  } else {
    throw
  }
}
$payload = @{ status = $statusCode; body = $body } | ConvertTo-Json -Compress -Depth 4
[Console]::Out.Write($payload)
`;

const POWERSHELL_PROXY_SCRIPT = `
$proxyEnabled = (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings').ProxyEnable
$proxyServer = (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings').ProxyServer
if ($proxyEnabled -eq 1 -and $proxyServer) {
  [Console]::Out.Write([string]$proxyServer)
}
`;

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
    maxClips: 5,
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
    maxClips: 5,
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
    maxClips: 5,
    excludeAny: ["teaser trailer", "announcing /noclip's brand new channel"],
  },
  ch_sakurai: {
    sourceChannelId: "UCv1DvRY5PyHHt3KN9ghunuw",
    handle: "@sora_sakurai_en",
    videosUrl:
      "https://www.youtube.com/channel/UCv1DvRY5PyHHt3KN9ghunuw/videos?view=0&sort=p&flow=grid",
    description:
      "Masahiro Sakurai's practical breakdowns on game design, controls, feel, production and communication.",
    focusLabel: "\u6e38\u620f\u5236\u4f5c\u65b9\u6cd5\u4e0e\u8bbe\u8ba1\u539f\u5219",
    defaultSlug: "dev_design",
    minDurationSec: 90,
    language: "en",
    maxClips: 4,
    excludeAny: ["shorts", "livestream", "trailer"],
  },
  ch_ai_games: {
    sourceChannelId: "UCIb63jDtcb1FptUljjQYZRA",
    handle: "@AIandGames",
    videosUrl: "https://www.youtube.com/@AIandGames/videos?view=0&sort=p&flow=grid",
    description:
      "Deep dives into game AI, simulation systems, generative workflows and production tooling.",
    focusLabel: "\u6e38\u620f AI \u4e0e\u5236\u4f5c\u5de5\u5177",
    defaultSlug: "ai_tools",
    minDurationSec: 240,
    language: "en",
    maxClips: 5,
    includeAny: ["ai", "simulation", "npc", "director", "tool", "systems"],
    excludeAny: ["livestream", "channel update", "trailer"],
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
  "controls",
  "camera",
  "ai",
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
    normalized.includes("prototype") ||
    normalized.includes("controls")
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
    normalized.includes("rendering") ||
    normalized.includes("ai")
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

function toHeaderMap(headers?: HeadersInit) {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, String(value)]),
  );
}

function normalizeProxyUrl(rawProxy: string) {
  if (!rawProxy) {
    return null;
  }

  const primary = rawProxy
    .split(";")
    .map((entry) => entry.trim())
    .find(Boolean);

  if (!primary) {
    return null;
  }

  const candidate = primary.includes("=") ? primary.split("=").at(-1)?.trim() : primary;

  if (!candidate) {
    return null;
  }

  return /^https?:\/\//i.test(candidate) ? candidate : `http://${candidate}`;
}

function resolveProxyUrl() {
  const envProxy =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy;

  if (envProxy) {
    return normalizeProxyUrl(envProxy);
  }

  if (process.platform !== "win32") {
    return null;
  }

  try {
    const stdout = execFileSync("powershell.exe", ["-NoProfile", "-Command", POWERSHELL_PROXY_SCRIPT], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
    return normalizeProxyUrl(stdout);
  } catch {
    return null;
  }
}

const proxyUrl = resolveProxyUrl();
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;

async function fetchTextViaPowerShell(
  url: string,
  headers?: HeadersInit,
): Promise<HttpTextResponse> {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-Command", POWERSHELL_FETCH_SCRIPT],
    {
      env: {
        ...process.env,
        CODEX_HTTP_URL: url,
        CODEX_HTTP_HEADERS: JSON.stringify(toHeaderMap(headers)),
      },
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  );

  const parsed = JSON.parse(stdout.trim()) as { status?: number; body?: string };
  const status = Number(parsed.status ?? 0);

  return {
    status,
    ok: status >= 200 && status < 300,
    text: parsed.body ?? "",
  };
}

async function requestText(url: string, init: RequestInit): Promise<HttpTextResponse> {
  try {
    const response = await fetch(url, {
      ...init,
      dispatcher: proxyAgent ?? undefined,
    } as RequestInit & { dispatcher?: ProxyAgent });

    return {
      status: response.status,
      ok: response.ok,
      text: await response.text(),
    };
  } catch {
    return fetchTextViaPowerShell(url, init.headers);
  }
}

async function fetchTextWithRetry(url: string, init: RequestInit, attempts = 2) {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await requestText(url, init);

      if (!response.ok || !response.text) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return response.text;
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
  if (viewCount >= 100_000) {
    return 82;
  }
  return 76;
}

function scoreFromFreshness(publishedAt: string) {
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24)),
  );

  if (ageDays <= 30) {
    return 8;
  }
  if (ageDays <= 180) {
    return 5;
  }
  if (ageDays <= 365) {
    return 3;
  }

  return 0;
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
          "sakurai",
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
  maxClips = 5,
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
    .slice(0, maxClips)
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

function classifyPlaybackStatus(status: string, reason: string | null): AvailabilityStatus {
  const normalizedReason = reason?.toLowerCase() ?? "";

  if (status === "LOGIN_REQUIRED" && normalizedReason.includes("age")) {
    return "age_restricted";
  }

  if (normalizedReason.includes("private")) {
    return "private";
  }

  if (normalizedReason.includes("deleted") || normalizedReason.includes("removed")) {
    return "deleted";
  }

  if (status === "UNPLAYABLE" || status === "ERROR") {
    return "unavailable";
  }

  return "embed_blocked";
}

async function validateYoutubePlayback(videoId: string): Promise<PlaybackHealth> {
  const playbackCheckedAt = new Date().toISOString();
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const html = await fetchTextWithRetry(
      watchUrl,
      {
        headers: {
          "user-agent": "Mozilla/5.0",
          "accept-language": "en-US,en;q=0.9",
        },
        cache: "no-store",
      },
      2,
    );

    const playabilityMatch = html.match(
      /"playabilityStatus":\{"status":"([^"]+)"(?:.*?"reason":"([^"]+)")?/,
    );

    if (playabilityMatch && playabilityMatch[1] !== "OK") {
      const reason = playabilityMatch[2]
        ? JSON.parse(`"${playabilityMatch[2]}"`)
        : "YouTube reported a playability restriction.";

      return {
        availabilityStatus: classifyPlaybackStatus(playabilityMatch[1], reason),
        playbackCheckedAt,
        playbackErrorReason: reason,
      };
    }

    const oembedUrl =
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedResponse = await requestText(oembedUrl, {
      headers: {
        "user-agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (oembedResponse.ok) {
      return {
        availabilityStatus: "ok",
        playbackCheckedAt,
        playbackErrorReason: null,
      };
    }

    return {
      availabilityStatus: "embed_blocked",
      playbackCheckedAt,
      playbackErrorReason: `oEmbed responded with ${oembedResponse.status}.`,
    };
  } catch (error) {
    return {
      availabilityStatus: "unavailable",
      playbackCheckedAt,
      playbackErrorReason:
        error instanceof Error ? error.message : "Failed to validate playback.",
    };
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

    selected.push(item);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function toVideoRecord(
  channelId: string,
  item: ExtractedVideo,
  watchDetails: WatchDetails,
  playbackHealth: PlaybackHealth,
): Video {
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
    viewCount: item.viewCount,
    availabilityStatus: playbackHealth.availabilityStatus,
    playbackCheckedAt: playbackHealth.playbackCheckedAt,
    playbackErrorReason: playbackHealth.playbackErrorReason,
    searchText: "",
  };
}

function buildClipRecords(
  video: Video,
  channel: Channel,
  config: ChannelImportConfig,
  item: ExtractedVideo,
  watchDetails: WatchDetails,
) {
  const leadParagraph = extractLeadParagraph(watchDetails.description);
  const chapterSlices = pickChapterClips(
    watchDetails.chapters,
    video.durationSec,
    video.title,
    config.maxClips ?? 5,
  );
  const baseScore = scoreFromViews(item.viewCount) + scoreFromFreshness(item.publishedAt);
  const defaultStatus =
    watchDetails.outline.length >= 1 && video.availabilityStatus === "ok"
      ? "published"
      : "needs_review";

  return chapterSlices.map((chapter, index) => {
    const channelSlug = inferChannelSlug(
      `${video.title} ${chapter.title}`,
      config.defaultSlug,
    );
    const chapterTitle = sanitizeChapterTitle(chapter.title) || video.title;
    const clipTitle = buildClipHeadline(channel.name, video.title, chapterTitle, index);
    const rankScore = Math.max(70, baseScore - index * 3);

    return {
      id: `clip_${video.sourceVideoId}_${index}`,
      videoId: video.id,
      channelSlug,
      startSec: chapter.startSec,
      endSec: chapter.endSec,
      zhTitle: clipTitle,
      zhSummary: buildSummary(channel.name, video.title, chapterTitle, leadParagraph),
      zhTakeaways: buildTakeaways(config.focusLabel, chapterTitle, video.title),
      tags: [channel.name, config.focusLabel, chapterTitle].filter(Boolean),
      transcriptExcerpt: chapterTitle,
      transcriptZh: buildClipTranscriptNote(chapterTitle, video.title, index),
      score: Math.max(70, baseScore - index * 2),
      confidence: watchDetails.chapters.length ? 0.94 : 0.78,
      status: defaultStatus,
      editorPick: index === 0,
      signalSource: channel.authMode === "authorized" ? "analytics_retention" : "public_heuristic",
      rankScore,
      searchText: "",
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
  channel.language = config.language ?? channel.language ?? "en";
  channel.authMode = channel.authMode ?? "public";
}

function buildManagedChannelRecord(id: string, config: ChannelImportConfig): Channel {
  const styles: Record<string, { themeColor: string; avatarUrl: string; name: string }> = {
    ch_gdc: {
      themeColor: "#ff6b2c",
      avatarUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
      name: "GDC",
    },
    ch_gmtk: {
      themeColor: "#0f6b4d",
      avatarUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80",
      name: "Game Maker's Toolkit",
    },
    ch_noclip: {
      themeColor: "#243c5a",
      avatarUrl:
        "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=400&q=80",
      name: "Noclip",
    },
    ch_sakurai: {
      themeColor: "#c44d2d",
      avatarUrl:
        "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=400&q=80",
      name: "Masahiro Sakurai",
    },
    ch_ai_games: {
      themeColor: "#4758bf",
      avatarUrl:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80",
      name: "AI and Games",
    },
  };

  const style = styles[id];

  return {
    id,
    sourceType: "youtube",
    sourceChannelId: config.sourceChannelId,
    name: style?.name ?? config.handle.replace(/^@/, ""),
    handle: config.handle,
    language: config.language ?? "en",
    description: config.description,
    avatarUrl:
      style?.avatarUrl ??
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80",
    themeColor: style?.themeColor ?? "#2a7f62",
    whitelistStatus: "active",
    syncStatus: "idle",
    lastSyncedAt: null,
    authMode: "public",
    analyticsConnectedAt: null,
  };
}

function ensureManagedChannels(data: StoreData) {
  Object.entries(CHANNEL_IMPORT_SOURCES).forEach(([id, config]) => {
    if (data.channels.some((channel) => channel.id === id)) {
      return;
    }

    data.channels.push(buildManagedChannelRecord(id, config));
  });
}

export function getManagedChannelConfigs() {
  return CHANNEL_IMPORT_SOURCES;
}

export async function recheckVideoPlayback(videoId: string) {
  return validateYoutubePlayback(videoId);
}

export async function rebuildVideoFromSource(data: StoreData, videoId: string) {
  const next: StoreData = structuredClone(data);
  const video = next.videos.find((item) => item.id === videoId);

  if (!video) {
    throw new Error("Video not found");
  }

  const channel = next.channels.find((item) => item.id === video.channelId);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const config = CHANNEL_IMPORT_SOURCES[channel.id];

  if (!config) {
    throw new Error("Managed channel config not found");
  }

  const watchDetails = await fetchWatchDetails(video.sourceVideoId, video.durationSec);
  const playbackHealth = await validateYoutubePlayback(video.sourceVideoId);
  const item: ExtractedVideo = {
    sourceVideoId: video.sourceVideoId,
    title: video.title,
    durationSec: video.durationSec,
    publishedAt: video.publishedAt,
    viewCount: video.viewCount,
  };
  const nextVideo = toVideoRecord(channel.id, item, watchDetails, playbackHealth);
  const nextClips =
    playbackHealth.availabilityStatus === "ok"
      ? buildClipRecords(nextVideo, channel, config, item, watchDetails)
      : [];

  next.videos = next.videos.map((item) => (item.id === videoId ? nextVideo : item));
  next.clips = [...next.clips.filter((clip) => clip.videoId !== videoId), ...nextClips];
  next.transcripts[nextVideo.id] = watchDetails.outline;

  return {
    next,
    summary: {
      importedVideos: 1,
      importedClips: nextClips.length,
      skippedVideos: 0,
      removedVideos: 0,
      removedClips: 0,
    },
  };
}

export async function importPopularVideosFromChannels(
  data: StoreData,
  limitPerChannel = 48,
) {
  const next: StoreData = structuredClone(data);
  const summary = {
    importedVideos: 0,
    importedClips: 0,
    skippedVideos: 0,
    removedVideos: 0,
    removedClips: 0,
  };

  ensureManagedChannels(next);

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
        const playbackHealth = await validateYoutubePlayback(item.sourceVideoId);
        const video = toVideoRecord(channel.id, item, watchDetails, playbackHealth);
        const clips =
          playbackHealth.availabilityStatus === "ok"
            ? buildClipRecords(video, channel, config, item, watchDetails)
            : [];

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

    return right.rankScore - left.rankScore;
  });

  return { next, summary };
}
