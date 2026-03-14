import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClipById } from "@/lib/store";
import { formatDuration } from "@/lib/youtube";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClipDetailPage({ params }: PageProps) {
  const { id } = await params;
  const clip = await getClipById(id);

  if (!clip) {
    notFound();
  }

  return (
    <main className="section-shell space-y-8 py-8">
      <section className="panel-card grid gap-6 rounded-[2rem] p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="eyebrow">Highlight Detail</div>
          <h1 className="display-font text-4xl font-bold">{clip.zhTitle}</h1>
          <p className="max-w-3xl text-base leading-8 text-black/72">{clip.zhSummary}</p>
          <div className="rounded-[1.5rem] border border-black/8 bg-white/70 p-5 text-sm leading-7 text-black/68">
            这里展示的是一个用于快速理解主题的索引片段，不代表平台自托管了第三方完整视频。继续深入观看时，会优先把你带到站内原视频页，再由原平台完成长视频消费。
          </div>
          <div className="flex flex-wrap gap-2">
            {clip.zhTakeaways.map((item) => (
              <span
                key={item}
                className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="rounded-[1.5rem] border border-black/8 bg-white/70 p-5 text-sm leading-7">
            <p className="font-semibold">{"\u7247\u6bb5\u539f\u6587"}</p>
            <p className="mt-2">{clip.transcriptExcerpt}</p>
            <p className="mt-3 font-semibold">{"\u4e2d\u6587\u8f6c\u5199"}</p>
            <p className="mt-2">{clip.transcriptZh}</p>
          </div>
        </div>

        <aside className="rounded-[1.5rem] border border-black/8 bg-white/70 p-5">
          <Image
            src={clip.video.thumbnailUrl}
            alt={clip.zhTitle}
            width={960}
            height={540}
            unoptimized
            className="h-56 w-full rounded-[1.25rem] object-cover"
          />
          <div className="mt-4 space-y-3 text-sm text-black/65">
            <p>{clip.channel.name}</p>
            <p>{clip.video.zhTitle}</p>
            <p>
              {"\u7247\u6bb5\u65f6\u957f\uff1a"}
              {formatDuration(clip.endSec - clip.startSec)}
            </p>
            <p>
              {"\u539f\u89c6\u9891\u65f6\u957f\uff1a"}
              {formatDuration(clip.video.durationSec)}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/video/${clip.video.id}?from=${clip.id}`}
              className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
            >
              {"\u7ad9\u5185\u7eed\u770b\u957f\u89c6\u9891"}
            </Link>
            <a
              href={clip.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-black/10 px-4 py-3 text-sm font-semibold"
            >
              {"\u53bb YouTube \u770b\u539f\u89c6\u9891"}
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}
