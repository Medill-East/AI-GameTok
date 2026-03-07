"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipPlayer } from "@/components/clip-player";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { APP_NAME, CHANNEL_DESCRIPTIONS, CHANNEL_LABELS } from "@/lib/constants";
import type { FeedClip, VideoChannelSlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/youtube";

interface ClipFeedProps {
  clips: FeedClip[];
  currentChannel?: VideoChannelSlug;
}

export function ClipFeed({ clips, currentChannel }: ClipFeedProps) {
  const [activeId, setActiveId] = useState(clips[0]?.id ?? "");
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
        }
      },
      { threshold: [0.4, 0.7, 0.95] },
    );

    document.querySelectorAll<HTMLElement>("[data-clip-id]").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [clips]);

  return (
    <div className="relative h-[100svh] overflow-hidden rounded-[2rem] border border-white/50 bg-[#111] shadow-[0_30px_120px_rgba(17,34,24,0.25)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/30 to-transparent px-5 pb-8 pt-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow bg-white/14 text-white">Game Industry Feed</div>
            <h1 className="display-font mt-3 text-2xl font-bold">{APP_NAME}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/78">
              {
                "\u5148\u5237\u9ad8\u4fe1\u606f\u5bc6\u5ea6\u5207\u7247\uff0c\u518d\u7ad9\u5185\u7eed\u64ad\u539f\u89c6\u9891\u3002\u5f53\u524d\u9891\u9053\uff1a"
              }
              {currentChannel
                ? ` ${CHANNEL_LABELS[currentChannel]}`
                : ` ${"\u5168\u90e8\u7cbe\u9009"}`}
            </p>
          </div>
          <nav className="pointer-events-auto flex gap-2">
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm" href="/saved">
              {"\u6536\u85cf\u5939"}
            </Link>
            <Link className="rounded-full border border-white/20 px-4 py-2 text-sm" href="/admin">
              {"\u540e\u53f0"}
            </Link>
          </nav>
        </div>
        <div className="pointer-events-auto mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
          <Link
            href="/"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
              !currentChannel ? "bg-white text-black" : "bg-white/12 text-white/86",
            )}
          >
            {"\u5168\u90e8\u7cbe\u9009"}
          </Link>
          {channelEntries.map(([slug, label]) => (
            <Link
              key={slug}
              href={`/channel/${slug}`}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
                currentChannel === slug ? "bg-white text-black" : "bg-white/12 text-white/86",
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
              className="relative h-[100svh] snap-start overflow-hidden"
            >
              <Image
                src={clip.video.thumbnailUrl}
                alt={clip.zhTitle}
                fill
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/85" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,44,0.18),transparent_25rem)]" />
              <div className="absolute left-1/2 top-1/2 z-10 h-[52vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-white/12 bg-black/55 shadow-2xl">
                {isActive ? (
                  <ClipPlayer
                    videoId={clip.video.sourceVideoId}
                    startSec={clip.startSec}
                    endSec={clip.endSec}
                    active
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-full border border-white/20 bg-black/40 px-5 py-3 text-sm font-semibold tracking-[0.2em] text-white">
                      SLICE PREVIEW
                    </span>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 z-20 grid gap-6 px-5 pb-7 pt-36 text-white lg:grid-cols-[minmax(0,1fr)_120px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                    <span>{clip.channel.name}</span>
                    <span>/</span>
                    <span>{CHANNEL_LABELS[clip.channelSlug]}</span>
                    <span>/</span>
                    <span>{formatDuration(clip.endSec - clip.startSec)}</span>
                  </div>
                  <div>
                    <h2 className="display-font max-w-3xl text-3xl font-bold leading-tight">
                      {clip.zhTitle}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-white/70">
                      {clip.video.zhTitle} / {clip.channel.handle} /{" "}
                      {CHANNEL_DESCRIPTIONS[clip.channelSlug]}
                    </p>
                  </div>
                  <p className="max-w-2xl text-base leading-7 text-white/88">{clip.zhSummary}</p>
                  <div className="flex flex-wrap gap-2">
                    {clip.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-sm text-white/82"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-3xl border border-white/12 bg-white/8 p-4 text-sm leading-6 text-white/84">
                    <p className="font-semibold text-white">
                      {"\u5207\u7247\u8bf4\u660e"}
                    </p>
                    <p className="mt-2">{clip.transcriptZh}</p>
                  </div>
                </div>

                <div className="flex items-end justify-end lg:items-center">
                  <div className="flex flex-row gap-3 lg:flex-col">
                    <Link
                      href={`/video/${clip.video.id}?from=${clip.id}`}
                      className="rounded-full bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white shadow-lg"
                    >
                      {"\u7ee7\u7eed\u770b"}
                    </Link>
                    <SaveButton clipId={clip.id} />
                    <ShareButton title={clip.zhTitle} url={`/clip/${clip.id}`} />
                    <Link
                      href={`/clip/${clip.id}`}
                      className="rounded-full border border-white/20 bg-black/25 px-4 py-2 text-center text-sm font-semibold"
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
