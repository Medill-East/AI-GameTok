"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildYoutubeEmbedUrl } from "@/lib/youtube";

interface ClipPlayerProps {
  videoId: string;
  startSec: number;
  endSec: number;
  active?: boolean;
  muted?: boolean;
}

export function ClipPlayer({
  videoId,
  startSec,
  endSec,
  active = false,
  muted = true,
}: ClipPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [initialMuted] = useState(muted);
  const src = useMemo(
    () =>
      buildYoutubeEmbedUrl(videoId, {
        autoplay: active,
        mute: initialMuted,
        controls: true,
        startSec,
        endSec,
      }),
    [active, endSec, initialMuted, startSec, videoId],
  );

  useEffect(() => {
    const iframe = iframeRef.current;

    if (!iframe?.contentWindow) {
      return;
    }

    const command = JSON.stringify({
      event: "command",
      func: muted ? "mute" : "unMute",
      args: [],
    });

    const postCommand = () => {
      iframe.contentWindow?.postMessage(command, "https://www.youtube.com");
    };

    postCommand();
    const timeoutId = window.setTimeout(postCommand, 150);

    return () => window.clearTimeout(timeoutId);
  }, [muted]);

  return (
    <iframe
      ref={iframeRef}
      className="absolute inset-0 h-full w-full"
      src={src}
      title="GameTok clip player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
