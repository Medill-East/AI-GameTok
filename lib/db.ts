import initialStore from "@/data/store.json";
import { buildYoutubeWatchUrl } from "@/lib/youtube";
import type {
  Channel,
  Clip,
  FeedClip,
  SearchClipResult,
  SearchResults,
  SearchVideoResult,
  SyncRun,
  StoreData,
  TranscriptSegment,
  Video,
  VideoChannelSlug,
} from "@/lib/types";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const DEFAULT_AVAILABILITY_STATUS = "ok";

type SyncRunStatus = "success" | "error";
type SyncRunTrigger = "manual" | "cron";
type DbClient = Pool | PoolClient;

interface FinishSyncRunOptions {
  status: SyncRunStatus;
  channelsProcessed?: number;
  videosProcessed?: number;
  clipsProcessed?: number;
  errorSummary?: string | null;
  details?: object | null;
}

interface ChannelRow extends QueryResultRow {
  id: string;
  source_type: Channel["sourceType"];
  source_channel_id: string;
  name: string;
  handle: string;
  language: Channel["language"];
  description: string;
  avatar_url: string;
  theme_color: string;
  whitelist_status: Channel["whitelistStatus"];
  sync_status: Channel["syncStatus"];
  last_synced_at: Date | string | null;
  auth_mode: Channel["authMode"];
  content_tier: Channel["contentTier"];
  analytics_connected_at: Date | string | null;
}

interface VideoRow extends QueryResultRow {
  id: string;
  channel_id: string;
  source_video_id: string;
  source_url: string;
  title: string;
  zh_title: string;
  description: string;
  duration_sec: number;
  thumbnail_url: string;
  transcript_status: Video["transcriptStatus"];
  published_at: Date | string;
  view_count: number;
  availability_status: Video["availabilityStatus"];
  playback_checked_at: Date | string | null;
  playback_error_reason: string | null;
  playback_mode: Video["playbackMode"];
  search_text: string;
}

interface ClipRow extends QueryResultRow {
  id: string;
  video_id: string;
  channel_slug: Clip["channelSlug"];
  start_sec: number;
  end_sec: number;
  en_title: string;
  zh_title: string;
  en_summary: string;
  zh_summary: string;
  zh_takeaways: string[];
  tags: string[];
  transcript_excerpt: string;
  transcript_zh: string;
  score: number;
  confidence: number | string;
  status: Clip["status"];
  editor_pick: boolean;
  signal_source: Clip["signalSource"];
  rank_score: number | string;
  search_text: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TranscriptRow extends QueryResultRow {
  video_id: string;
  segments: TranscriptSegment[];
}

interface SyncRunRow extends QueryResultRow {
  id: string | number;
  trigger_source: SyncRun["triggerSource"];
  status: SyncRun["status"];
  started_at: Date | string;
  finished_at: Date | string | null;
  channels_processed: number;
  videos_processed: number;
  clips_processed: number;
  error_summary: string | null;
  details: Record<string, unknown> | null;
}

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.SUPABASE_DB_URL ??
    ""
  );
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

interface ParsedDatabaseUrl {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
}

function parseDatabaseUrl(connectionString: string): ParsedDatabaseUrl {
  const normalized = connectionString.trim();
  const match = normalized.match(
    /^postgresql:\/\/([^:]+):(.+)@(\[[^\]]+\]|[^:/]+):(\d+)\/([^?]+)(?:\?.*)?$/,
  );

  if (!match) {
    throw new Error("DATABASE_URL format is invalid.");
  }

  const [, user, password, host, port, database] = match;

  return {
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    host: host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host,
    port: Number(port),
    database,
  };
}

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

function getPool() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("Database is not configured.");
  }

  if (!pool) {
    const parsed = parseDatabaseUrl(connectionString);

    pool = new Pool({
      host: parsed.host,
      port: parsed.port,
      database: parsed.database,
      user: parsed.user,
      password: parsed.password,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 5_000,
    });
  }

  return pool;
}

async function query<T extends QueryResultRow>(
  client: DbClient,
  text: string,
  params: unknown[] = [],
) {
  return client.query<T>(text, params);
}

async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
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

function serializeDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

async function seedDatabaseIfEmpty(client: DbClient) {
  const rows = await query<{ count: number }>(
    client,
    "select count(*)::int as count from channels",
  );

  if ((rows.rows[0]?.count ?? 0) > 0) {
    return;
  }

  await writeStoreToDatabase(
    normalizeStore(initialStore as unknown as StoreData),
    client,
  );
}

async function ensureDatabaseReady() {
  if (!isDatabaseConfigured()) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const client = getPool();

      await query(
        client,
        `create table if not exists channels (
          id text primary key,
          source_type text not null,
          source_channel_id text not null,
          name text not null,
          handle text not null,
          language text not null,
          description text not null,
          avatar_url text not null,
          theme_color text not null,
          whitelist_status text not null,
          sync_status text not null,
          last_synced_at timestamptz null,
          auth_mode text not null,
          content_tier text not null,
          analytics_connected_at timestamptz null
        )`,
      );

      await query(
        client,
        `create table if not exists videos (
          id text primary key,
          channel_id text not null references channels(id) on delete cascade,
          source_video_id text not null,
          source_url text not null,
          title text not null,
          zh_title text not null,
          description text not null,
          duration_sec integer not null,
          thumbnail_url text not null,
          transcript_status text not null,
          published_at timestamptz not null,
          view_count integer not null default 0,
          availability_status text not null default 'ok',
          playback_checked_at timestamptz null,
          playback_error_reason text null,
          playback_mode text not null default 'platform_embed',
          search_text text not null default ''
        )`,
      );

      await query(
        client,
        `create table if not exists clips (
          id text primary key,
          video_id text not null references videos(id) on delete cascade,
          channel_slug text not null,
          start_sec integer not null,
          end_sec integer not null,
          en_title text not null,
          zh_title text not null,
          en_summary text not null,
          zh_summary text not null,
          zh_takeaways jsonb not null default '[]'::jsonb,
          tags jsonb not null default '[]'::jsonb,
          transcript_excerpt text not null,
          transcript_zh text not null,
          score integer not null,
          confidence numeric not null,
          status text not null,
          editor_pick boolean not null default false,
          signal_source text not null default 'public_heuristic',
          rank_score numeric not null default 0,
          search_text text not null default '',
          created_at timestamptz not null,
          updated_at timestamptz not null
        )`,
      );

      await query(
        client,
        `create table if not exists transcripts (
          video_id text primary key references videos(id) on delete cascade,
          segments jsonb not null default '[]'::jsonb
        )`,
      );

      await query(
        client,
        `create table if not exists sync_runs (
          id bigserial primary key,
          trigger_source text not null,
          status text not null,
          started_at timestamptz not null default now(),
          finished_at timestamptz null,
          channels_processed integer not null default 0,
          videos_processed integer not null default 0,
          clips_processed integer not null default 0,
          error_summary text null,
          details jsonb null
        )`,
      );

      await seedDatabaseIfEmpty(client);
    })();
  }

  await initPromise;
}

async function insertChannels(client: DbClient, channels: Channel[]) {
  if (!channels.length) {
    return;
  }

  for (const channel of channels) {
    const normalized = normalizeChannel(channel);

    await query(
      client,
      `insert into channels (
        id,
        source_type,
        source_channel_id,
        name,
        handle,
        language,
        description,
        avatar_url,
        theme_color,
        whitelist_status,
        sync_status,
        last_synced_at,
        auth_mode,
        content_tier,
        analytics_connected_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )`,
      [
        normalized.id,
        normalized.sourceType,
        normalized.sourceChannelId,
        normalized.name,
        normalized.handle,
        normalized.language,
        normalized.description,
        normalized.avatarUrl,
        normalized.themeColor,
        normalized.whitelistStatus,
        normalized.syncStatus,
        serializeDate(normalized.lastSyncedAt),
        normalized.authMode,
        normalized.contentTier,
        serializeDate(normalized.analyticsConnectedAt ?? null),
      ],
    );
  }
}

async function insertVideos(client: DbClient, videos: Video[]) {
  if (!videos.length) {
    return;
  }

  for (const video of videos) {
    const normalized = normalizeVideo(video);

    await query(
      client,
      `insert into videos (
        id,
        channel_id,
        source_video_id,
        source_url,
        title,
        zh_title,
        description,
        duration_sec,
        thumbnail_url,
        transcript_status,
        published_at,
        view_count,
        availability_status,
        playback_checked_at,
        playback_error_reason,
        playback_mode,
        search_text
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      )`,
      [
        normalized.id,
        normalized.channelId,
        normalized.sourceVideoId,
        normalized.sourceUrl,
        normalized.title,
        normalized.zhTitle,
        normalized.description,
        normalized.durationSec,
        normalized.thumbnailUrl,
        normalized.transcriptStatus,
        new Date(normalized.publishedAt),
        normalized.viewCount,
        normalized.availabilityStatus,
        serializeDate(normalized.playbackCheckedAt),
        normalized.playbackErrorReason,
        normalized.playbackMode,
        normalized.searchText,
      ],
    );
  }
}

async function insertClips(client: DbClient, clips: Clip[]) {
  if (!clips.length) {
    return;
  }

  for (const clip of clips) {
    const normalized = normalizeClip(clip);

    await query(
      client,
      `insert into clips (
        id,
        video_id,
        channel_slug,
        start_sec,
        end_sec,
        en_title,
        zh_title,
        en_summary,
        zh_summary,
        zh_takeaways,
        tags,
        transcript_excerpt,
        transcript_zh,
        score,
        confidence,
        status,
        editor_pick,
        signal_source,
        rank_score,
        search_text,
        created_at,
        updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )`,
      [
        normalized.id,
        normalized.videoId,
        normalized.channelSlug,
        normalized.startSec,
        normalized.endSec,
        normalized.enTitle,
        normalized.zhTitle,
        normalized.enSummary,
        normalized.zhSummary,
        JSON.stringify(normalized.zhTakeaways),
        JSON.stringify(normalized.tags),
        normalized.transcriptExcerpt,
        normalized.transcriptZh,
        normalized.score,
        normalized.confidence,
        normalized.status,
        normalized.editorPick,
        normalized.signalSource,
        normalized.rankScore,
        normalized.searchText,
        new Date(normalized.createdAt),
        new Date(normalized.updatedAt),
      ],
    );
  }
}

async function insertTranscripts(
  client: DbClient,
  transcripts: Record<string, TranscriptSegment[]>,
) {
  for (const [videoId, segments] of Object.entries(transcripts)) {
    await query(
      client,
      `insert into transcripts (video_id, segments)
       values ($1, $2::jsonb)`,
      [videoId, JSON.stringify(segments)],
    );
  }
}

async function writeStoreToDatabase(next: StoreData, existingClient?: DbClient) {
  const normalized = normalizeStore(next);

  const writer = async (client: DbClient) => {
    await query(client, "delete from transcripts");
    await query(client, "delete from clips");
    await query(client, "delete from videos");
    await query(client, "delete from channels");

    await insertChannels(client, normalized.channels);
    await insertVideos(client, normalized.videos);
    await insertClips(client, normalized.clips);
    await insertTranscripts(client, normalized.transcripts);
  };

  if (existingClient) {
    await writer(existingClient);
    return;
  }

  await withTransaction(writer);
}

export async function dbWriteStore(next: StoreData) {
  await ensureDatabaseReady();
  await writeStoreToDatabase(next);
}

export async function dbBootstrapStore(next: StoreData) {
  await ensureDatabaseReady();
  await writeStoreToDatabase(next);
}

export async function dbReadStore(): Promise<StoreData> {
  await ensureDatabaseReady();
  const client = getPool();

  const [channels, videos, clips, transcripts] = await Promise.all([
    query<ChannelRow>(client, "select * from channels order by name asc"),
    query<VideoRow>(client, "select * from videos order by published_at desc"),
    query<ClipRow>(client, "select * from clips order by updated_at desc"),
    query<TranscriptRow>(client, "select * from transcripts"),
  ]);

  return normalizeStore({
    channels: channels.rows.map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceChannelId: row.source_channel_id,
      name: row.name,
      handle: row.handle,
      language: row.language,
      description: row.description,
      avatarUrl: row.avatar_url,
      themeColor: row.theme_color,
      whitelistStatus: row.whitelist_status,
      syncStatus: row.sync_status,
      lastSyncedAt: toIsoString(row.last_synced_at),
      authMode: row.auth_mode,
      contentTier: row.content_tier,
      analyticsConnectedAt: toIsoString(row.analytics_connected_at),
    })),
    videos: videos.rows.map((row) => ({
      id: row.id,
      channelId: row.channel_id,
      sourceVideoId: row.source_video_id,
      sourceUrl: row.source_url,
      title: row.title,
      zhTitle: row.zh_title,
      description: row.description,
      durationSec: row.duration_sec,
      thumbnailUrl: row.thumbnail_url,
      transcriptStatus: row.transcript_status,
      publishedAt: toIsoString(row.published_at) ?? new Date().toISOString(),
      viewCount: row.view_count,
      availabilityStatus: row.availability_status,
      playbackCheckedAt: toIsoString(row.playback_checked_at),
      playbackErrorReason: row.playback_error_reason,
      playbackMode: row.playback_mode,
      searchText: row.search_text,
    })),
    clips: clips.rows.map((row) => ({
      id: row.id,
      videoId: row.video_id,
      channelSlug: row.channel_slug,
      startSec: row.start_sec,
      endSec: row.end_sec,
      enTitle: row.en_title,
      zhTitle: row.zh_title,
      enSummary: row.en_summary,
      zhSummary: row.zh_summary,
      zhTakeaways: Array.isArray(row.zh_takeaways) ? row.zh_takeaways : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      transcriptExcerpt: row.transcript_excerpt,
      transcriptZh: row.transcript_zh,
      score: row.score,
      confidence: Number(row.confidence),
      status: row.status,
      editorPick: row.editor_pick,
      signalSource: row.signal_source,
      rankScore: Number(row.rank_score),
      searchText: row.search_text,
      createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
      updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    })),
    transcripts: Object.fromEntries(
      transcripts.rows.map((row) => [
        row.video_id,
        Array.isArray(row.segments) ? (row.segments as TranscriptSegment[]) : [],
      ]),
    ),
  });
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

export async function dbSearchCatalog(options: {
  query: string;
  channel?: VideoChannelSlug;
  type?: "clips" | "videos" | "all";
  cursor?: number;
  limit?: number;
}): Promise<SearchResults> {
  await ensureDatabaseReady();
  const client = getPool();
  const searchQuery = options.query.trim();
  const type = options.type ?? "all";
  const cursor = options.cursor ?? 0;
  const limit = options.limit ?? 20;
  const limitPlusOne = limit + 1;
  const likeQuery = `%${searchQuery}%`;

  const clipParams: unknown[] = [searchQuery, likeQuery];
  let clipChannelClause = "";
  if (options.channel) {
    clipParams.push(options.channel);
    clipChannelClause = `and c.channel_slug = $${clipParams.length}`;
  }
  clipParams.push(limitPlusOne, cursor);
  const clipLimitIndex = clipParams.length - 1;
  const clipOffsetIndex = clipParams.length;

  const videoParams: unknown[] = [searchQuery, likeQuery];
  let videoChannelClause = "";
  if (options.channel) {
    videoParams.push(options.channel);
    videoChannelClause = `and exists (
      select 1 from clips c
      where c.video_id = v.id and c.channel_slug = $${videoParams.length}
    )`;
  }
  videoParams.push(limitPlusOne, cursor);
  const videoLimitIndex = videoParams.length - 1;
  const videoOffsetIndex = videoParams.length;

  const clipIds =
    type === "videos"
      ? []
      : (
          await query<{ id: string; match_score: number }>(
            client,
            `select
               c.id,
               (
                 (
                   ts_rank_cd(
                     to_tsvector(
                       'simple',
                       concat_ws(
                         ' ',
                         coalesce(c.en_title, ''),
                         coalesce(c.zh_title, ''),
                         coalesce(c.en_summary, ''),
                         coalesce(c.zh_summary, ''),
                         coalesce(c.transcript_excerpt, ''),
                         coalesce(c.transcript_zh, ''),
                         coalesce(v.title, ''),
                         coalesce(v.zh_title, ''),
                         coalesce(ch.name, ''),
                         coalesce(ch.handle, '')
                       )
                     ),
                     plainto_tsquery('simple', $1)
                   ) * 1000
                 )
                 + c.rank_score
                 + case
                     when lower(
                       concat_ws(
                         ' ',
                         coalesce(c.en_title, ''),
                         coalesce(c.zh_title, ''),
                         coalesce(c.en_summary, ''),
                         coalesce(c.zh_summary, ''),
                         coalesce(c.transcript_excerpt, ''),
                         coalesce(c.transcript_zh, ''),
                         coalesce(v.title, ''),
                         coalesce(v.zh_title, ''),
                         coalesce(ch.name, ''),
                         coalesce(ch.handle, '')
                       )
                     ) like lower($2)
                     then 120
                     else 0
                   end
                 + case when lower(coalesce(c.tags::text, '')) like lower($2) then 80 else 0 end
               ) as match_score
             from clips c
             join videos v on v.id = c.video_id
             join channels ch on ch.id = v.channel_id
             where c.status = 'published'
               and v.availability_status = 'ok'
               ${clipChannelClause}
               and (
                 to_tsvector(
                   'simple',
                   concat_ws(
                     ' ',
                     coalesce(c.en_title, ''),
                     coalesce(c.zh_title, ''),
                     coalesce(c.en_summary, ''),
                     coalesce(c.zh_summary, ''),
                     coalesce(c.transcript_excerpt, ''),
                     coalesce(c.transcript_zh, ''),
                     coalesce(v.title, ''),
                     coalesce(v.zh_title, ''),
                     coalesce(ch.name, ''),
                     coalesce(ch.handle, '')
                   )
                 ) @@ plainto_tsquery('simple', $1)
                 or lower(
                   concat_ws(
                     ' ',
                     coalesce(c.en_title, ''),
                     coalesce(c.zh_title, ''),
                     coalesce(c.en_summary, ''),
                     coalesce(c.zh_summary, ''),
                     coalesce(c.transcript_excerpt, ''),
                     coalesce(c.transcript_zh, ''),
                     coalesce(v.title, ''),
                     coalesce(v.zh_title, ''),
                     coalesce(ch.name, ''),
                     coalesce(ch.handle, ''),
                     coalesce(c.tags::text, '')
                   )
                 ) like lower($2)
               )
             order by match_score desc
             limit $${clipLimitIndex}
             offset $${clipOffsetIndex}`,
            clipParams,
          )
        ).rows;

  const videoIds =
    type === "clips"
      ? []
      : (
          await query<{ id: string; match_score: number }>(
            client,
            `select
               v.id,
               (
                 (
                   ts_rank_cd(
                     to_tsvector(
                       'simple',
                       concat_ws(
                         ' ',
                         coalesce(v.title, ''),
                         coalesce(v.zh_title, ''),
                         coalesce(v.description, ''),
                         coalesce(ch.name, ''),
                         coalesce(ch.handle, '')
                       )
                     ),
                     plainto_tsquery('simple', $1)
                   ) * 1000
                 )
                 + (v.view_count / 1000)
                 + case
                     when lower(
                       concat_ws(
                         ' ',
                         coalesce(v.title, ''),
                         coalesce(v.zh_title, ''),
                         coalesce(v.description, ''),
                         coalesce(ch.name, ''),
                         coalesce(ch.handle, '')
                       )
                     ) like lower($2)
                     then 120
                     else 0
                   end
               ) as match_score
             from videos v
             join channels ch on ch.id = v.channel_id
             where v.availability_status = 'ok'
               ${videoChannelClause}
               and (
                 to_tsvector(
                   'simple',
                   concat_ws(
                     ' ',
                     coalesce(v.title, ''),
                     coalesce(v.zh_title, ''),
                     coalesce(v.description, ''),
                     coalesce(ch.name, ''),
                     coalesce(ch.handle, '')
                   )
                 ) @@ plainto_tsquery('simple', $1)
                 or lower(
                   concat_ws(
                     ' ',
                     coalesce(v.title, ''),
                     coalesce(v.zh_title, ''),
                     coalesce(v.description, ''),
                     coalesce(ch.name, ''),
                     coalesce(ch.handle, '')
                   )
                 ) like lower($2)
               )
             order by match_score desc
             limit $${videoLimitIndex}
             offset $${videoOffsetIndex}`,
            videoParams,
          )
        ).rows;

  const store = await dbReadStore();
  const videoMap = new Map(store.videos.map((video) => [video.id, video]));
  const channelMap = new Map(store.channels.map((channel) => [channel.id, channel]));
  const clipMap = new Map(store.clips.map((clip) => [clip.id, clip]));

  const clips = clipIds
    .slice(0, limit)
    .map((row) => {
      const clip = clipMap.get(row.id);

      if (!clip) {
        return null;
      }

      const hydrated = hydrateClip(clip, videoMap, channelMap);

      if (!hydrated) {
        return null;
      }

      return {
        ...hydrated,
        resultType: "clip" as const,
        matchScore: Number(row.match_score),
      } satisfies SearchClipResult;
    })
    .filter((value): value is SearchClipResult => Boolean(value));

  const clipsPerVideo = new Map<string, number>();
  for (const clip of store.clips) {
    clipsPerVideo.set(clip.videoId, (clipsPerVideo.get(clip.videoId) ?? 0) + 1);
  }

  const videos = videoIds
    .slice(0, limit)
    .map((row) => {
      const video = videoMap.get(row.id);

      if (!video) {
        return null;
      }

      const channel = channelMap.get(video.channelId);

      if (!channel) {
        return null;
      }

      return {
        ...video,
        resultType: "video" as const,
        matchScore: Number(row.match_score),
        channel,
        clipCount: clipsPerVideo.get(video.id) ?? 0,
      } satisfies SearchVideoResult;
    })
    .filter((value): value is SearchVideoResult => Boolean(value));

  return {
    clips,
    videos,
    nextCursor:
      clipIds.length > limit || videoIds.length > limit ? cursor + limit : null,
  };
}

export async function startSyncRun(triggerSource: SyncRunTrigger) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureDatabaseReady();
  const client = getPool();
  const rows = await query<{ id: string | number }>(
    client,
    `insert into sync_runs (trigger_source, status)
     values ($1, 'running')
     returning id`,
    [triggerSource],
  );

  return String(rows.rows[0]?.id ?? "");
}

export async function finishSyncRun(
  id: string | null,
  options: FinishSyncRunOptions,
) {
  if (!id || !isDatabaseConfigured()) {
    return;
  }

  await ensureDatabaseReady();
  const client = getPool();

  await query(
    client,
    `update sync_runs
     set
       status = $1,
       finished_at = now(),
       channels_processed = $2,
       videos_processed = $3,
       clips_processed = $4,
       error_summary = $5,
       details = $6::jsonb
     where id = $7`,
    [
      options.status,
      options.channelsProcessed ?? 0,
      options.videosProcessed ?? 0,
      options.clipsProcessed ?? 0,
      options.errorSummary ?? null,
      options.details ? JSON.stringify(options.details) : null,
      Number(id),
    ],
  );
}

export async function listRecentSyncRuns(limit = 5): Promise<SyncRun[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  await ensureDatabaseReady();
  const client = getPool();
  const rows = await query<SyncRunRow>(
    client,
    `select *
     from sync_runs
     order by started_at desc
     limit $1`,
    [limit],
  );

  return rows.rows.map((row) => ({
    id: String(row.id),
    triggerSource: row.trigger_source,
    status: row.status,
    startedAt: toIsoString(row.started_at) ?? new Date().toISOString(),
    finishedAt: toIsoString(row.finished_at),
    channelsProcessed: row.channels_processed,
    videosProcessed: row.videos_processed,
    clipsProcessed: row.clips_processed,
    errorSummary: row.error_summary,
    details: row.details ?? null,
  }));
}
