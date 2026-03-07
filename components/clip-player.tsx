import { buildYoutubeEmbedUrl } from "@/lib/youtube";

interface ClipPlayerProps {
  videoId: string;
  startSec: number;
  endSec: number;
  active?: boolean;
}

export function ClipPlayer({
  videoId,
  startSec,
  endSec,
  active = false,
}: ClipPlayerProps) {
  return (
    <iframe
      className="absolute inset-0 h-full w-full"
      src={buildYoutubeEmbedUrl(videoId, {
        autoplay: active,
        mute: true,
        controls: true,
        startSec,
        endSec,
      })}
      title="GameTok clip player"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
