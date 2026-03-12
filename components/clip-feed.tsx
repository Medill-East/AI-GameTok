"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  BookmarkIcon,
  GlobeIcon,
  MenuIcon,
  PlayIcon,
  SearchIcon,
  SparkGridIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "@/components/icons";
import { ClipPlayer, type ClipPlayerStatus } from "@/components/clip-player";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { useDisplayLanguage } from "@/components/use-display-language";
import {
  APP_NAME,
  CHANNEL_LABELS,
  PLAYER_SOUND_KEY,
} from "@/lib/constants";
import { getChannelLabel, getClipSummary, getClipTitle } from "@/lib/display";
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
  const { language, toggleLanguage } = useDisplayLanguage();
  const copy = useMemo(
    () =>
      language === "en"
        ? {
            search: "Search",
            soundOn: "Sound on",
            soundOff: "Sound off",
            language: "中文",
            menu: "Browse",
            saved: "Saved",
            admin: "Admin",
            all: "All",
            continueWatching: "Continue",
            loadingMore: "Loading more",
            autoplayBlocked: "Safari blocked autoplay. Tap the player once to continue.",
            categories: "Categories",
            library: "Library",
            duration: "clip",
          }
        : {
            search: "\u641c\u7d22",
            soundOn: "\u58f0\u97f3\u5f00",
            soundOff: "\u58f0\u97f3\u5173",
            language: "EN",
            menu: "\u9891\u9053",
            saved: "\u6536\u85cf\u5939",
            admin: "\u540e\u53f0",
            all: "\u5168\u90e8",
            continueWatching: "\u7ee7\u7eed\u770b",
            loadingMore: "\u7ee7\u7eed\u52a0\u8f7d",
            autoplayBlocked: "Safari \u7981\u6b62\u4e86\u81ea\u52a8\u64ad\u653e\uff0c\u70b9\u4e00\u4e0b\u89c6\u9891\u53ef\u7ee7\u7eed\u3002",
            categories: "\u9891\u9053\u5206\u7c7b",
            library: "\u5185\u5bb9\u5e93",
            duration: "\u5207\u7247",
          },
    [language],
  );
  const initialItems = useMemo(() => materializeClips(initialClips), [initialClips]);
  const [feedItems, setFeedItems] = useState<RenderedFeedClip[]>(initialItems);
  const [activeKey, setActiveKey] = useState(initialItems[0]?.renderKey ?? "");
  const [playbackStatus, setPlaybackStatus] = useState<ClipPlayerStatus>("idle");
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [seenClipIds, setSeenClipIds] = useState<string[]>(initialClips.map((clip) => clip.id));
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/86 via-black/38 to-transparent px-3 pb-4 pt-[calc(env(safe-area-inset-top)+0.55rem)] text-white md:px-5 md:pb-8 md:pt-5">
        <div className="flex items-center justify-end gap-2 md:justify-between md:gap-3">
          <div className="hidden min-w-0 md:block">
            <h1 className="display-font text-lg font-bold md:mt-1 md:text-2xl">
              {APP_NAME}
            </h1>
          </div>
          <nav className="pointer-events-auto flex items-center gap-2">
            <Link
              aria-label={copy.search}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/28 text-white transition hover:bg-black/40 md:w-auto md:gap-2 md:px-4"
              href="/search"
              title={copy.search}
            >
              <SearchIcon className="h-5 w-5" />
              <span className="hidden md:inline">{copy.search}</span>
            </Link>
            <button
              type="button"
              aria-label={soundEnabled ? copy.soundOn : copy.soundOff}
              onClick={toggleSound}
              className={cn(
                "pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full transition md:w-auto md:gap-2 md:px-4",
                soundEnabled
                  ? "bg-[var(--accent)] text-white"
                  : "border border-white/20 bg-black/28 text-white hover:bg-black/40",
              )}
              title={soundEnabled ? copy.soundOn : copy.soundOff}
            >
              {soundEnabled ? (
                <VolumeOnIcon className="h-5 w-5" />
              ) : (
                <VolumeOffIcon className="h-5 w-5" />
              )}
              <span className="hidden md:inline">
                {soundEnabled ? copy.soundOn : copy.soundOff}
              </span>
            </button>
            <button
              type="button"
              aria-label={copy.language}
              onClick={toggleLanguage}
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/28 text-white transition hover:bg-black/40 md:w-auto md:gap-2 md:px-4"
              title={copy.language}
            >
              <GlobeIcon className="h-5 w-5" />
              <span className="hidden md:inline">{copy.language}</span>
            </button>
            <button
              type="button"
              aria-label={copy.menu}
              onClick={() => setMenuOpen((current) => !current)}
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/28 text-white transition hover:bg-black/40 md:hidden"
              title={copy.menu}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Link
              aria-label={copy.saved}
              className="hidden h-12 items-center justify-center rounded-full border border-white/20 bg-black/28 text-white transition hover:bg-black/40 md:inline-flex md:gap-2 md:px-4"
              href="/saved"
              title={copy.saved}
            >
              <BookmarkIcon className="h-5 w-5" />
              <span>{copy.saved}</span>
            </Link>
            <Link
              aria-label={copy.admin}
              className="hidden h-12 items-center justify-center rounded-full border border-white/20 bg-black/28 text-white transition hover:bg-black/40 md:inline-flex md:gap-2 md:px-4"
              href="/admin"
              title={copy.admin}
            >
              <SparkGridIcon className="h-5 w-5" />
              <span>{copy.admin}</span>
            </Link>
          </nav>
        </div>
        <div className="pointer-events-auto mt-4 hidden gap-2 overflow-x-auto hide-scrollbar md:flex">
          <Link
            href="/"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
              !currentChannel ? "bg-white !text-black" : "bg-white/12 text-white/86",
            )}
          >
            {copy.all}
          </Link>
          {channelEntries.map(([slug]) => (
            <Link
              key={slug}
              href={`/channel/${slug}`}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
                currentChannel === slug ? "bg-white !text-black" : "bg-white/12 text-white/86",
              )}
            >
              {getChannelLabel(slug, language)}
            </Link>
          ))}
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 z-30 bg-black/35 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+3.8rem)] z-40 w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.5rem] border border-white/12 bg-black/88 p-3 text-white shadow-2xl md:hidden">
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/52">
              {copy.categories}
            </div>
            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold",
                  !currentChannel ? "bg-white text-black" : "bg-white/8 text-white",
                )}
              >
                <span>{copy.all}</span>
              </Link>
              {channelEntries.map(([slug]) => (
                <Link
                  key={slug}
                  href={`/channel/${slug}`}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold",
                    currentChannel === slug ? "bg-white text-black" : "bg-white/8 text-white",
                  )}
                >
                  <span>{getChannelLabel(slug, language)}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/52">
                {copy.library}
              </div>
              <div className="space-y-1">
                <Link
                  href="/saved"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center rounded-2xl bg-white/8 px-3 py-3 text-sm font-semibold text-white"
                >
                  {copy.saved}
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto">
        {feedItems.map((clip) => {
          const isActive = clip.renderKey === activeKey;
          const title = getClipTitle(clip, language, clip.video.title);
          const summary = getClipSummary(clip, language, clip.video.description);

          return (
            <article
              key={clip.renderKey}
              data-render-key={clip.renderKey}
              className="relative h-[100dvh] snap-start overflow-hidden"
            >
              <Image
                src={clip.video.thumbnailUrl}
                alt={title}
                fill
                unoptimized
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/18 to-black/82" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,44,0.14),transparent_24rem)]" />

              <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-10 h-[55svh] overflow-hidden bg-black shadow-2xl md:left-1/2 md:top-1/2 md:h-[52vh] md:w-[calc(100%-2rem)] md:max-w-5xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[2rem] md:border md:border-white/12 md:bg-black/55">
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

              <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-16 text-white md:px-5 md:pb-7 md:pt-36">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30svh] bg-gradient-to-t from-black via-black/84 to-transparent md:h-[28rem]" />
                <div className="relative min-h-[8.5rem] pr-20 md:min-h-[10rem] md:max-w-3xl md:pr-0">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/68 md:text-xs">
                    <span className="truncate">{clip.channel.name}</span>
                    <span>/</span>
                    <span>{getChannelLabel(clip.channelSlug, language)}</span>
                    <span>/</span>
                    <span>{formatDuration(clip.endSec - clip.startSec)} {copy.duration}</span>
                  </div>
                  <Link href={`/clip/${clip.id}`} className="mt-2 block">
                    <h2 className="display-font line-clamp-1 text-[1rem] font-bold leading-tight md:line-clamp-2 md:text-3xl">
                      {title}
                    </h2>
                    {summary.trim().length >= 20 ? (
                      <p className="mt-2 line-clamp-2 max-w-xl text-[12px] leading-5 text-white/82 md:text-base md:leading-7">
                        {summary}
                      </p>
                    ) : null}
                  </Link>
                  {playbackStatus === "blocked" && isActive ? (
                    <p className="mt-2 text-[11px] text-white/64 md:text-xs">
                      {copy.autoplayBlocked}
                    </p>
                  ) : null}
                </div>

                <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-30 flex flex-col gap-3 md:bottom-7 md:right-5">
                  <Link
                    href={`/video/${clip.video.id}?from=${clip.id}`}
                    aria-label={copy.continueWatching}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:brightness-110 md:w-auto md:gap-2 md:px-4"
                    title={copy.continueWatching}
                  >
                    <PlayIcon className="h-5 w-5" />
                    <span className="hidden md:inline">{copy.continueWatching}</span>
                  </Link>
                  <SaveButton clipId={clip.id} iconOnlyMobile className="h-12 w-12 px-0 md:h-auto md:w-auto md:px-4" />
                  <ShareButton
                    title={title}
                    url={`/clip/${clip.id}`}
                    iconOnlyMobile
                    className="h-12 w-12 px-0 md:h-auto md:w-auto md:px-4"
                  />
                </div>

                {isLoadingMore && isActive && feedItems.length - activeIndex <= 2 ? (
                  <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.3rem)] flex justify-center md:bottom-3">
                    <span className="rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/72">
                      {copy.loadingMore}
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
