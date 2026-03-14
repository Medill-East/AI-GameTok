"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { buildYoutubeEmbedUrl } from "@/lib/youtube";

type YoutubePlayerState = -1 | 0 | 1 | 2 | 3 | 5;

type YoutubePlayerMessage =
  | {
      id?: string;
      event?: string;
      info?: number | { playerState?: number };
    }
  | undefined;

export type ClipPlayerStatus =
  | "idle"
  | "trying_sound"
  | "trying_muted"
  | "playing"
  | "blocked";

interface ClipPlayerProps {
  videoId: string;
  startSec: number;
  endSec: number;
  active?: boolean;
  muted?: boolean;
  blockedHint?: string;
  continueUrl?: string;
  continueLabel?: string;
  watchUrl?: string;
  watchLabel?: string;
  onPlaybackStateChange?: (status: ClipPlayerStatus) => void;
}

const YOUTUBE_ORIGINS = new Set([
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
]);

const PLAYING_STATE: YoutubePlayerState = 1;

function buildPlayerMessage(id: string, func: string, args: unknown[] = []) {
  return JSON.stringify({
    event: "command",
    func,
    args,
    id,
  });
}

function parseYoutubeMessage(raw: unknown): YoutubePlayerMessage {
  if (!raw) {
    return undefined;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as YoutubePlayerMessage;
    } catch {
      return undefined;
    }
  }

  if (typeof raw === "object") {
    return raw as YoutubePlayerMessage;
  }

  return undefined;
}

export function ClipPlayer({
  videoId,
  startSec,
  endSec,
  active = false,
  muted = true,
  blockedHint = "Playback was interrupted. Continue in-site or open YouTube.",
  continueUrl,
  continueLabel = "Continue in site",
  watchUrl,
  watchLabel = "Open YouTube",
  onPlaybackStateChange,
}: ClipPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const soundRetryTimerRef = useRef<number | null>(null);
  const blockedTimerRef = useRef<number | null>(null);
  const playerStateRef = useRef<YoutubePlayerState | null>(null);
  const [bootMuted] = useState(muted);
  const [status, setStatus] = useState<ClipPlayerStatus>("idle");
  const playerDomId = useId().replace(/:/g, "");
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const updateStatus = useCallback(
    (nextStatus: ClipPlayerStatus) => {
      setStatus(nextStatus);
      onPlaybackStateChange?.(nextStatus);
    },
    [onPlaybackStateChange],
  );

  const clearTimers = useCallback(() => {
    if (soundRetryTimerRef.current !== null) {
      window.clearTimeout(soundRetryTimerRef.current);
      soundRetryTimerRef.current = null;
    }

    if (blockedTimerRef.current !== null) {
      window.clearTimeout(blockedTimerRef.current);
      blockedTimerRef.current = null;
    }
  }, []);

  const postCommand = useCallback(
    (func: string, args: unknown[] = []) => {
      const iframe = iframeRef.current;

      if (!iframe?.contentWindow) {
        return;
      }

      iframe.contentWindow.postMessage(buildPlayerMessage(playerDomId, func, args), "*");
    },
    [playerDomId],
  );

  const registerPlayerEvents = useCallback(() => {
    const iframe = iframeRef.current;

    if (!iframe?.contentWindow) {
      return;
    }

    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "listening",
        id: playerDomId,
        channel: "widget",
      }),
      "*",
    );

    postCommand("addEventListener", ["onStateChange"]);
    postCommand("addEventListener", ["onReady"]);
  }, [playerDomId, postCommand]);

  const markBlockedIfStillPending = useCallback(() => {
    blockedTimerRef.current = window.setTimeout(() => {
      if (playerStateRef.current === PLAYING_STATE) {
        return;
      }

      updateStatus("blocked");
    }, 1400);
  }, [updateStatus]);

  const startAutoplayAttempt = useCallback(
    (preferMuted: boolean) => {
      clearTimers();

      if (preferMuted) {
        postCommand("mute");
        postCommand("playVideo");
        updateStatus("trying_muted");
        markBlockedIfStillPending();
        return;
      }

      postCommand("unMute");
      postCommand("playVideo");
      updateStatus("trying_sound");

      soundRetryTimerRef.current = window.setTimeout(() => {
        if (playerStateRef.current === PLAYING_STATE) {
          return;
        }

        postCommand("mute");
        postCommand("playVideo");
        updateStatus("trying_muted");
        markBlockedIfStillPending();
      }, 1200);
    },
    [clearTimers, markBlockedIfStillPending, postCommand, updateStatus],
  );

  const handleManualPlay = useCallback(() => {
    clearTimers();

    if (muted) {
      postCommand("mute");
      updateStatus("trying_muted");
    } else {
      postCommand("unMute");
      updateStatus("trying_sound");
    }

    postCommand("playVideo");
  }, [clearTimers, muted, postCommand, updateStatus]);

  useEffect(() => {
    if (!active || !iframeLoaded || status === "idle") {
      return;
    }

    if (muted) {
      postCommand("mute");
      return;
    }

    postCommand("unMute");
  }, [active, iframeLoaded, muted, postCommand, status]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!YOUTUBE_ORIGINS.has(event.origin)) {
        return;
      }

      const payload = parseYoutubeMessage(event.data);

      if (!payload || (payload.id && payload.id !== playerDomId)) {
        return;
      }

      if (payload.event === "onReady" && active) {
        registerPlayerEvents();
        return;
      }

      if (payload.event !== "onStateChange" && payload.event !== "infoDelivery") {
        return;
      }

      const state =
        typeof payload.info === "number"
          ? payload.info
          : payload.info?.playerState;

      if (typeof state !== "number") {
        return;
      }

      playerStateRef.current = state as YoutubePlayerState;

      if (state === PLAYING_STATE) {
        clearTimers();
        updateStatus("playing");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [active, clearTimers, playerDomId, registerPlayerEvents, updateStatus]);

  useEffect(() => {
    return () => {
      clearTimers();
      updateStatus("idle");
    };
  }, [clearTimers, updateStatus]);

  const iframeSrc = useMemo(() => {
    return buildYoutubeEmbedUrl(videoId, {
      autoplay: active,
      mute: bootMuted,
      controls: true,
      startSec,
      endSec,
    });
  }, [active, bootMuted, endSec, startSec, videoId]);

  return (
    <div className="absolute inset-0 bg-black">
      <iframe
        ref={iframeRef}
        id={playerDomId}
        className="absolute inset-0 h-full w-full"
        src={iframeSrc}
        title="GameTok clip player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => {
          setIframeLoaded(true);
          playerStateRef.current = null;
          registerPlayerEvents();

          if (active) {
            startAutoplayAttempt(bootMuted);
          }
        }}
      />
      {status === "blocked" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-6 text-center text-white">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/72">
              Tap To Play
            </p>
            <p className="text-sm text-white/88">{blockedHint}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleManualPlay}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
              >
                Play Clip
              </button>
              {continueUrl ? (
                <a
                  href={continueUrl}
                  className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white"
                >
                  {continueLabel}
                </a>
              ) : null}
              {watchUrl ? (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white"
                >
                  {watchLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
