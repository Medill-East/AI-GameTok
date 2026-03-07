export function buildYoutubeEmbedUrl(
  videoId: string,
  options?: {
    autoplay?: boolean;
    mute?: boolean;
    controls?: boolean;
    startSec?: number;
    endSec?: number;
  },
) {
  const url = new URL(`https://www.youtube.com/embed/${videoId}`);

  if (options?.autoplay) {
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("playsinline", "1");
  }

  if (options?.mute) {
    url.searchParams.set("mute", "1");
  }

  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("controls", options?.controls === false ? "0" : "1");

  if (typeof options?.startSec === "number") {
    url.searchParams.set("start", String(Math.max(0, Math.floor(options.startSec))));
  }

  if (typeof options?.endSec === "number") {
    url.searchParams.set("end", String(Math.max(0, Math.floor(options.endSec))));
  }

  return url.toString();
}

export function buildYoutubeWatchUrl(videoId: string, startSec = 0) {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.max(
    0,
    Math.floor(startSec),
  )}s`;
}

export function buildYoutubeThumbnail(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value, index) => String(value).padStart(index === 0 ? 1 : 2, "0"))
      .join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
