import Link from "next/link";
import { CHANNEL_LABELS } from "@/lib/constants";
import { searchCatalog } from "@/lib/store";
import type { VideoChannelSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    channel?: string;
    type?: "clips" | "videos" | "all";
  }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const channel = params.channel as VideoChannelSlug | undefined;
  const type = params.type ?? "all";
  const results = query
    ? await searchCatalog({
        query,
        channel,
        type,
        limit: 20,
      })
    : { clips: [], videos: [], nextCursor: null };

  return (
    <main className="section-shell space-y-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Search</div>
          <h1 className="display-font mt-4 text-4xl font-bold">
            {"\u4e3b\u9898\u641c\u7d22"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-black/70">
            {
              "\u6309\u6e38\u620f\u540d\u3001\u7cfb\u7edf\u3001\u4e3b\u9898\u6216\u9891\u9053\u641c\u5207\u7247\u3002\u7ed3\u679c\u4f18\u5148\u8fd4\u56de\u53ef\u76f4\u63a5\u89c2\u770b\u7684\u5207\u7247\uff0c\u540c\u65f6\u4fdd\u7559\u957f\u89c6\u9891\u5165\u53e3\u3002"
            }
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold"
        >
          {"\u8fd4\u56de\u9996\u9875"}
        </Link>
      </div>

      <form className="panel-card grid gap-4 rounded-[2rem] p-6 md:grid-cols-[minmax(0,1fr)_200px_180px_auto]">
        <label className="text-sm font-semibold">
          {"\u5173\u952e\u8bcd"}
          <input
            name="q"
            defaultValue={query}
            placeholder="\u6bd4\u5982\uff1aDisco Elysium / level design / retention"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
          />
        </label>
        <label className="text-sm font-semibold">
          {"\u9891\u9053"}
          <select
            name="channel"
            defaultValue={channel ?? ""}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
          >
            <option value="">{`\u5168\u90e8`}</option>
            {Object.entries(CHANNEL_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {"\u7ed3\u679c\u7c7b\u578b"}
          <select
            name="type"
            defaultValue={type}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
          >
            <option value="all">{`\u5168\u90e8`}</option>
            <option value="clips">{`\u5207\u7247`}</option>
            <option value="videos">{`\u89c6\u9891`}</option>
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          {"\u641c\u7d22"}
        </button>
      </form>

      {query ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="panel-card rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="display-font text-2xl font-bold">
                {"\u5207\u7247\u7ed3\u679c"}
              </h2>
              <span className="text-sm text-black/55">{results.clips.length} {"\u6761"}</span>
            </div>
            <div className="mt-5 space-y-4">
              {results.clips.length ? (
                results.clips.map((clip) => (
                  <article key={clip.id} className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                      {clip.channel.name} / {CHANNEL_LABELS[clip.channelSlug]} / Match {clip.matchScore}
                    </p>
                    <h3 className="mt-2 text-xl font-bold">{clip.zhTitle}</h3>
                    <p className="mt-2 text-sm leading-7 text-black/70">{clip.zhSummary}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/clip/${clip.id}`}
                        className="rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        {"\u770b\u5207\u7247"}
                      </Link>
                      <Link
                        href={`/video/${clip.video.id}?from=${clip.id}`}
                        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
                      >
                        {"\u7ee7\u7eed\u770b\u957f\u89c6\u9891"}
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-7 text-black/70">
                  {"\u6ca1\u6709\u5339\u914d\u7684\u5207\u7247\u3002"}
                </p>
              )}
            </div>
          </section>

          <section className="panel-card rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="display-font text-2xl font-bold">
                {"\u957f\u89c6\u9891\u7ed3\u679c"}
              </h2>
              <span className="text-sm text-black/55">{results.videos.length} {"\u6761"}</span>
            </div>
            <div className="mt-5 space-y-4">
              {results.videos.length ? (
                results.videos.map((video) => (
                  <article key={video.id} className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                      {video.channel.name} / Match {video.matchScore}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">{video.zhTitle}</h3>
                    <p className="mt-2 text-sm leading-7 text-black/70">{video.description}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/video/${video.id}`}
                        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
                      >
                        {"\u6253\u5f00\u89c6\u9891"}
                      </Link>
                      <span className="rounded-full border border-black/10 px-4 py-2 text-sm text-black/60">
                        {video.clipCount} {"\u4e2a\u5207\u7247"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-7 text-black/70">
                  {"\u6ca1\u6709\u5339\u914d\u7684\u957f\u89c6\u9891\u3002"}
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="panel-card rounded-[2rem] p-6 text-sm leading-7 text-black/70">
          {"\u8f93\u5165\u5173\u952e\u8bcd\u540e\uff0c\u53ef\u6309\u6e38\u620f\u540d\u3001\u8bbe\u8ba1\u4e3b\u9898\u3001\u589e\u957f\u95ee\u9898\u6216 AI \u5de5\u5177\u67e5\u627e\u5207\u7247\u548c\u957f\u89c6\u9891\u3002"}
        </section>
      )}
    </main>
  );
}
