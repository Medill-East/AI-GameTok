"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore, useState } from "react";
import { ClipPlayer, type ClipPlayerStatus } from "@/components/clip-player";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import {
  APP_NAME,
  CHANNEL_LABELS,
  PLAYER_SOUND_KEY,
} from "@/lib/constants";
import type { FeedClip, VideoChannelSlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/youtube";

interface ClipFeedProps {
  clips: FeedClip[];
  currentChannel?: VideoChannelSlug;
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

export function ClipFeed({ clips, currentChannel }: ClipFeedProps) {
  const [activeId, setActiveId] = useState(clips[0]?.id ?? "");
  const [playbackStatus, setPlaybackStatus] = useState<ClipPlayerStatus>("idle");
  const soundEnabled = useSyncExternalStore(
    subscribeToSoundPreference,
    getSoundPreferenceSnapshot,
    () => false,
  );
  const channelEntries = useMemo(
    () => Object.entries(CHANNEL_LABELS) as Array<[VideoChannelSlug, string]>,
    [],
  );

  useEffect(() => {
    if (!clips.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (best?.target instanceof HTMLElement) {
          setActiveId(best.target.dataset.clipId ?? clips[0].id);
          setPlaybackStatus("idle");
        }
      },
      { threshold: [0.4, 0.7, 0.95] },
    );

    document.querySelectorAll<HTMLElement>("[data-clip-id]").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [clips]);

  function toggleSound() {
    const next = !soundEnabled;

    try {
      window.localStorage.setItem(PLAYER_SOUND_KEY, next ? "on" : "off");
      window.dispatchEvent(new Event("gametok:sound-change"));
    } catch {}
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#111] md:rounded-[2rem] md:border md:border-white/50 md:shadow-[0_30px_120px_rgba(17,34,24,0.25)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 via-black/36 to-transparent px-3 pb-5 pt-[calc(env(safe-area-inset-top)+0.65rem)] text-white md:px-5 md:pb-8 md:pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="display-font text-lg font-bold md:mt-2 md:text-2xl">
              {APP_NAME}
            </h1>
          </div>
          <nav className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className={cn(
                "min-h-10 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition md:px-4 md:text-sm",
                soundEnabled
                  ? "bg-[var(--accent)] text-white"
                  : "border border-white/20 bg-black/25 text-white",
              )}
            >
              {soundEnabled ? "\u58f0\u97f3\u5f00" : "\u58f0\u97f3\u5173"}
            </button>
            <Link
              className="min-h-10 rounded-full border border-white/20 px-3 py-2 text-xs md:px-4 md:text-sm"
              href="/saved"
            >
              {"\u6536\u85cf\u5939"}
            </Link>
            <Link
              className="hidden min-h-10 rounded-full border border-white/20 px-4 py-2 text-sm md:inline-flex"
              href="/admin"
            >
              {"\u540e\u53f0"}
            </Link>
          </nav>
        </div>
        <div className="pointer-events-auto mt-3 flex gap-2 overflow-x-auto hide-scrollbar md:mt-4">
          <Link
            href="/"
            className={cn(
              "rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition md:px-4 md:text-sm",
              !currentChannel ? "bg-white !text-black" : "bg-white/12 text-white/86",
            )}
          >
            {"\u5168\u90e8\u7cbe\u9009"}
          </Link>
          {channelEntries.map(([slug, label]) => (
            <Link
              key={slug}
              href={`/channel/${slug}`}
              className={cn(
                "rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition md:px-4 md:text-sm",
                currentChannel === slug ? "bg-white !text-black" : "bg-white/12 text-white/86",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto">
        {clips.map((clip) => {
          const isActive = clip.id === activeId;

          return (
            <article
              key={clip.id}
              data-clip-id={clip.id}
              className="relative h-[100dvh] snap-start overflow-hidden"
            >
              <Image
                src={clip.video.thumbnailUrl}
                alt={clip.zhTitle}
                fill
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/85" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,44,0.18),transparent_25rem)]" />
              <div className="absolute inset-x-0 top-[18svh] z-10 h-[52svh] overflow-hidden bg-black shadow-2xl md:left-1/2 md:top-1/2 md:h-[52vh] md:w-[calc(100%-2rem)] md:max-w-5xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[2rem] md:border md:border-white/12 md:bg-black/55">
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
                    <span className="rounded-full border border-white/20 bg-black/40 px-5 py-3 text-sm font-semibold tracking-[0.2em] text-white">
                      SLICE PREVIEW
                    </span>
                  </div>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-24 text-white md:grid md:grid-cols-[minmax(0,1fr)_120px] md:gap-6 md:px-5 md:pb-7 md:pt-36">
                <div className="rounded-t-[1.6rem] bg-gradient-to-t from-black/90 via-black/72 to-black/18 px-4 pb-4 pt-5 backdrop-blur-md md:rounded-none md:bg-transparent md:px-0 md:pb-0 md:pt-0 md:backdrop-blur-0">
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 md:text-xs">
                    <span>{clip.channel.name}</span>
                    <span>/</span>
                    <span>{CHANNEL_LABELS[clip.channelSlug]}</span>
                    <span>/</span>
                    <span>{formatDuration(clip.endSec - clip.startSec)}</span>
                  </div>
                  <Link href={`/clip/${clip.id}`} className="mt-3 block">
                    <h2 className="display-font line-clamp-2 max-w-3xl text-[1.65rem] font-bold leading-tight md:text-3xl">
                      {clip.zhTitle}
                    </h2>
                    <p className="mt-2 line-clamp-1 max-w-2xl text-sm text-white/72">
                      {clip.video.zhTitle} / {clip.channel.handle}
                    </p>
                  </Link>
                  {clip.zhSummary.trim().length >= 40 ? (
                    <Link href={`/clip/${clip.id}`} className="mt-3 block">
                      <p className="hidden max-w-2xl text-base leading-7 text-white/88 md:line-clamp-2">
                        {clip.zhSummary}
                      </p>
                    </Link>
                  ) : null}
                  <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
                    {clip.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-sm text-white/82"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {playbackStatus === "blocked" && isActive ? (
                    <p className="mt-3 text-xs text-white/72">
                      Safari blocked autoplay. Tap the player once to continue.
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex items-end justify-end md:mt-0 md:items-center">
                  <div className="flex w-full flex-row gap-2 md:w-auto md:flex-col md:gap-3">
                    <Link
                      href={`/video/${clip.video.id}?from=${clip.id}`}
                      className="min-h-11 flex-1 rounded-full bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white shadow-lg md:flex-none"
                    >
                      {"\u7ee7\u7eed\u770b"}
                    </Link>
                    <SaveButton clipId={clip.id} className="flex-1" />
                    <ShareButton title={clip.zhTitle} url={`/clip/${clip.id}`} className="flex-1" />
                    <Link
                      href={`/clip/${clip.id}`}
                      className="hidden rounded-full border border-white/20 bg-black/25 px-4 py-2 text-center text-sm font-semibold lg:block"
                    >
                      {"\u8be6\u60c5"}
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
