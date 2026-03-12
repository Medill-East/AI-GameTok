"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useSyncExternalStore, useState } from "react";
import {
  BookmarkIcon,
  PlayIcon,
  SearchIcon,
  SparkGridIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "@/components/icons";
import { ClipPlayer, type ClipPlayerStatus } from "@/components/clip-player";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import {
  APP_NAME,
  CHANNEL_LABELS,
  PLAYER_SOUND_KEY,
} from "@/lib/constants";
import type { FeedClip, FeedPage, VideoChannelSlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/youtube";

interface ClipFeedProps {
  initialClips: FeedClip[];
  initialNextCursor: number | null;
  currentChannel?: VideoChannelSlug;
}

interface RenderedFeedClip extends FeedClip {
  renderKey: string;
}

function subscribeToSoundPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = () => onStoreChange();

  window.addEventListener("storage", listener);
  window.addEventListener("gametok:sound-change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("gametok:sound-change", listener);
  };
}

function getSoundPreferenceSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(PLAYER_SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

function materializeClips(clips: FeedClip[], startIndex = 0): RenderedFeedClip[] {
  return clips.map((clip, index) => ({
    ...clip,
    renderKey: `${clip.id}::${startIndex + index}`,
  }));
}

export function ClipFeed({
  initialClips,
  initialNextCursor,
  currentChannel,
}: ClipFeedProps) {
  const initialItems = useMemo(() => materializeClips(initialClips), [initialClips]);
  const [feedItems, setFeedItems] = useState<RenderedFeedClip[]>(initialItems);
  const [activeKey, setActiveKey] = useState(initialItems[0]?.renderKey ?? "");
  const [playbackStatus, setPlaybackStatus] = useState<ClipPlayerStatus>("idle");
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [seenClipIds, setSeenClipIds] = useState<string[]>(initialClips.map((clip) => clip.id));
  const soundEnabled = useSyncExternalStore(
    subscribeToSoundPreference,
    getSoundPreferenceSnapshot,
    () => false,
  );
  const channelEntries = useMemo(
    () => Object.entries(CHANNEL_LABELS) as Array<[VideoChannelSlug, string]>,
    [],
  );
  const activeIndex = useMemo(
    () => feedItems.findIndex((item) => item.renderKey === activeKey),
    [activeKey, feedItems],
  );

  useEffect(() => {
    setFeedItems(initialItems);
    setActiveKey(initialItems[0]?.renderKey ?? "");
    setPlaybackStatus("idle");
    setNextCursor(initialNextCursor);
    setSeenClipIds(initialClips.map((clip) => clip.id));
  }, [currentChannel, initialClips, initialItems, initialNextCursor]);

  useEffect(() => {
    if (!feedItems.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (best?.target instanceof HTMLElement) {
          setActiveKey(best.target.dataset.renderKey ?? feedItems[0].renderKey);
          setPlaybackStatus("idle");
        }
      },
      { threshold: [0.4, 0.7, 0.95] },
    );

    document.querySelectorAll<HTMLElement>("[data-render-key]").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [feedItems]);

  const recentClipIds = useMemo(
    () => Array.from(new Set(feedItems.slice(-18).map((item) => item.id))),
    [feedItems],
  );

  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !feedItems.length) {
      return;
    }

    const recycle = nextCursor === null;
    const params = new URLSearchParams();
    params.set("limit", "16");

    if (currentChannel) {
      params.set("channel", currentChannel);
    }

    if (recycle) {
      params.set("recycle", "1");
      params.set("cursor", String(seenClipIds.length));

      if (recentClipIds.length) {
        params.set("exclude", recentClipIds.join(","));
      }
    } else {
      params.set("cursor", String(nextCursor));
    }

    setIsLoadingMore(true);

    try {
      const response = await fetch(`/api/feed?${params.toString()}`);

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as FeedPage;
      const filteredForRecycle =
        recycle && recentClipIds.length
          ? result.clips.filter((clip) => !recentClipIds.includes(clip.id))
          : result.clips;
      const batch = filteredForRecycle.length ? filteredForRecycle : result.clips;

      if (!batch.length) {
        return;
      }

      setFeedItems((current) => [
        ...current,
        ...materializeClips(batch, current.length),
      ]);
      setSeenClipIds((current) =>
        Array.from(new Set([...current, ...batch.map((clip) => clip.id)])),
      );

      if (!recycle) {
        setNextCursor(result.nextCursor);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentChannel, feedItems.length, isLoadingMore, nextCursor, recentClipIds, seenClipIds.length]);

  useEffect(() => {
    if (activeIndex < 0 || isLoadingMore || !feedItems.length) {
      return;
    }

    if (feedItems.length - activeIndex <= 5) {
      void fetchMore();
    }
  }, [activeIndex, feedItems.length, fetchMore, isLoadingMore]);

  function toggleSound() {
    const next = !soundEnabled;

    try {
      window.localStorage.setItem(PLAYER_SOUND_KEY, next ? "on" : "off");
      window.dispatchEvent(new Event("gametok:sound-change"));
    } catch {}
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#111] md:rounded-[2rem] md:border md:border-white/50 md:shadow-[0_30px_120px_rgba(17,34,24,0.25)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/82 via-black/28 to-transparent px-3 pb-4 pt-[calc(env(safe-area-inset-top)+0.55rem)] text-white md:px-5 md:pb-8 md:pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="hidden min-w-0 md:block">
            <h1 className="display-font text-lg font-bold md:mt-1 md:text-2xl">
              {APP_NAME}
            </h1>
          </div>
          <nav className="pointer-events-auto ml-auto flex items-center gap-2">
            <Link
              aria-label={"\u641c\u7d22"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white transition hover:bg-black/35 md:w-auto md:gap-2 md:px-4"
              href="/search"
              title={"\u641c\u7d22"}
            >
              <SearchIcon className="h-4 w-4" />
              <span className="hidden md:inline">{`\u641c\u7d22`}</span>
            </Link>
            <button
              type="button"
              aria-label={soundEnabled ? "\u5173\u95ed\u58f0\u97f3" : "\u6253\u5f00\u58f0\u97f3"}
              onClick={toggleSound}
              className={cn(
                "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full transition md:w-auto md:gap-2 md:px-4",
                soundEnabled
                  ? "bg-[var(--accent)] text-white"
                  : "border border-white/20 bg-black/20 text-white hover:bg-black/35",
              )}
              title={soundEnabled ? "\u58f0\u97f3\u5f00" : "\u58f0\u97f3\u5173"}
            >
              {soundEnabled ? (
                <VolumeOnIcon className="h-4 w-4" />
              ) : (
                <VolumeOffIcon className="h-4 w-4" />
              )}
              <span className="hidden md:inline">
                {soundEnabled ? "\u58f0\u97f3\u5f00" : "\u58f0\u97f3\u5173"}
              </span>
            </button>
            <Link
              aria-label={"\u6536\u85cf\u5939"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white transition hover:bg-black/35 md:w-auto md:gap-2 md:px-4"
              href="/saved"
              title={"\u6536\u85cf\u5939"}
            >
              <BookmarkIcon className="h-4 w-4" />
              <span className="hidden md:inline">{`\u6536\u85cf\u5939`}</span>
            </Link>
            <Link
              aria-label={"\u540e\u53f0"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white transition hover:bg-black/35 md:w-auto md:gap-2 md:px-4"
              href="/admin"
              title={"\u540e\u53f0"}
            >
              <SparkGridIcon className="h-4 w-4" />
              <span className="hidden md:inline">{`\u540e\u53f0`}</span>
            </Link>
          </nav>
        </div>
        <div className="pointer-events-auto mt-3 flex gap-2 overflow-x-auto hide-scrollbar md:mt-4">
          <Link
            href="/"
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition md:px-4 md:py-2 md:text-sm",
              !currentChannel ? "bg-white !text-black" : "bg-white/12 text-white/86",
            )}
          >
            {"\u5168\u90e8"}
          </Link>
          {channelEntries.map(([slug, label]) => (
            <Link
              key={slug}
              href={`/channel/${slug}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap transition md:px-4 md:py-2 md:text-sm",
                currentChannel === slug ? "bg-white !text-black" : "bg-white/12 text-white/86",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto">
        {feedItems.map((clip) => {
          const isActive = clip.renderKey === activeKey;

          return (
            <article
              key={clip.renderKey}
              data-render-key={clip.renderKey}
              className="relative h-[100dvh] snap-start overflow-hidden"
            >
              <Image
                src={clip.video.thumbnailUrl}
                alt={clip.zhTitle}
                fill
                unoptimized
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/16 via-black/22 to-black/82" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,44,0.16),transparent_24rem)]" />
              <div className="absolute inset-x-0 top-[11svh] z-10 h-[61svh] overflow-hidden bg-black shadow-2xl md:left-1/2 md:top-1/2 md:h-[52vh] md:w-[calc(100%-2rem)] md:max-w-5xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[2rem] md:border md:border-white/12 md:bg-black/55">
                {isActive ? (
                  <ClipPlayer
                    videoId={clip.video.sourceVideoId}
                    startSec={clip.startSec}
                    endSec={clip.endSec}
                    active
                    muted={!soundEnabled}
                    onPlaybackStateChange={setPlaybackStatus}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white">
                      SLICE
                    </span>
                  </div>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-20 text-white md:px-5 md:pb-7 md:pt-36">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38svh] bg-gradient-to-t from-black via-black/78 to-transparent md:h-[28rem]" />
                <div className="relative max-w-[calc(100%-5rem)] md:max-w-3xl">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/68 md:text-xs">
                    <span>{clip.channel.name}</span>
                    <span>/</span>
                    <span>{CHANNEL_LABELS[clip.channelSlug]}</span>
                    <span>/</span>
                    <span>{formatDuration(clip.endSec - clip.startSec)}</span>
                  </div>
                  <Link href={`/clip/${clip.id}`} className="mt-2 block">
                    <h2 className="display-font line-clamp-1 text-[1.08rem] font-bold leading-tight md:line-clamp-2 md:text-3xl">
                      {clip.zhTitle}
                    </h2>
                    {clip.zhSummary.trim().length >= 40 ? (
                      <p className="mt-2 line-clamp-2 max-w-xl text-[13px] leading-5 text-white/82 md:text-base md:leading-7">
                        {clip.zhSummary}
                      </p>
                    ) : null}
                  </Link>
                  {playbackStatus === "blocked" && isActive ? (
                    <p className="mt-2 text-[11px] text-white/64 md:text-xs">
                      Safari blocked autoplay. Tap the player once to continue.
                    </p>
                  ) : null}
                </div>

                <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.85rem)] right-3 z-30 flex flex-col gap-2.5 md:bottom-7 md:right-5">
                  <Link
                    href={`/video/${clip.video.id}?from=${clip.id}`}
                    aria-label={"\u7ee7\u7eed\u770b"}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:brightness-110 md:w-auto md:gap-2 md:px-4"
                    title={"\u7ee7\u7eed\u770b"}
                  >
                    <PlayIcon className="h-4 w-4" />
                    <span className="hidden md:inline">{`\u7ee7\u7eed\u770b`}</span>
                  </Link>
                  <SaveButton clipId={clip.id} iconOnlyMobile className="h-11 w-11 px-0 md:h-auto md:w-auto md:px-4" />
                  <ShareButton
                    title={clip.zhTitle}
                    url={`/clip/${clip.id}`}
                    iconOnlyMobile
                    className="h-11 w-11 px-0 md:h-auto md:w-auto md:px-4"
                  />
                </div>

                {isLoadingMore && isActive && feedItems.length - activeIndex <= 2 ? (
                  <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.4rem)] flex justify-center md:bottom-3">
                    <span className="rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/72">
                      LOADING MORE
                    </span>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
