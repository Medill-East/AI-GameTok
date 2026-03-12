import Link from "next/link";
import { notFound } from "next/navigation";
import { buildYoutubeEmbedUrl, buildYoutubeWatchUrl, formatDuration } from "@/lib/youtube";
import { getClipById, getVideoDetail } from "@/lib/store";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function VideoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const video = await getVideoDetail(id);

  if (!video) {
    notFound();
  }

  const sourceClip = from ? await getClipById(from) : null;
  const resumeFrom = sourceClip?.continueAtSec ?? 0;

  return (
    <main className="section-shell space-y-8 py-8">
      <section className="panel-card grid gap-6 rounded-[2rem] p-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="eyebrow">Continue Watching</div>
          <h1 className="display-font text-4xl font-bold">{video.zhTitle}</h1>
          <p className="text-sm leading-7 text-black/72">{video.description}</p>
          {video.availabilityStatus === "ok" ? (
            <div className="aspect-video overflow-hidden rounded-[1.75rem] border border-black/10 bg-black">
              <iframe
                className="h-full w-full"
                src={buildYoutubeEmbedUrl(video.sourceVideoId, {
                  autoplay: false,
                  mute: false,
                  controls: true,
                  startSec: resumeFrom,
                })}
                title={video.zhTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-black/10 bg-white/80 p-6 text-sm leading-7 text-black/70">
              <p className="font-semibold text-black">
                {"\u8fd9\u6761\u89c6\u9891\u5f53\u524d\u4e0d\u9002\u5408\u7ad9\u5185\u64ad\u653e\u3002"}
              </p>
              <p className="mt-3">
                {video.playbackErrorReason ??
                  "\u53ef\u80fd\u662f\u5d4c\u5165\u53d7\u9650\u3001\u9690\u79c1\u8bbe\u7f6e\u53d8\u66f4\u6216 YouTube \u53ef\u64ad\u6027\u72b6\u6001\u53d1\u751f\u4e86\u53d8\u5316\u3002"}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <a
              href={buildYoutubeWatchUrl(video.sourceVideoId, resumeFrom)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-black/10 px-4 py-3 text-sm font-semibold"
            >
              {"\u53bb YouTube \u7ee7\u7eed\u770b"}
            </a>
            <Link
              href="/"
              className="rounded-full bg-[var(--forest)] px-4 py-3 text-sm font-semibold text-white"
            >
              {"\u8fd4\u56de\u5207\u7247\u6d41"}
            </Link>
          </div>
        </div>

        <aside className="rounded-[1.5rem] border border-black/8 bg-white/70 p-5">
          <h2 className="display-font text-2xl font-bold">
            {"\u8fd9\u6761\u957f\u89c6\u9891\u7684\u5207\u7247"}
          </h2>
          <div className="mt-4 space-y-3">
            {video.clips.map((clip) => (
              <Link
                key={clip.id}
                href={`/clip/${clip.id}`}
                className="block rounded-[1.25rem] border border-black/8 bg-white/70 p-4 transition hover:-translate-y-0.5"
              >
                <p className="font-semibold">{clip.zhTitle}</p>
                <p className="mt-2 text-sm text-black/65">
                  {formatDuration(clip.endSec - clip.startSec)} / Score {clip.score}
                </p>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
