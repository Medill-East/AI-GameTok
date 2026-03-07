"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { AdminOverview } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function AdminDashboard({ overview }: { overview: AdminOverview }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["\u5df2\u53d1\u5e03\u5207\u7247", overview.counts.publishedClips],
          ["\u5f85\u5ba1\u6838\u5207\u7247", overview.counts.pendingClips],
          ["\u89c6\u9891\u603b\u6570", overview.counts.videos],
          ["\u767d\u540d\u5355\u9891\u9053", overview.counts.channels],
        ].map(([label, value]) => (
          <div key={label} className="panel-card rounded-[1.75rem] p-5">
            <p className="text-sm text-black/60">{label}</p>
            <p className="display-font mt-3 text-4xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Sync Control</p>
              <h2 className="display-font mt-3 text-2xl font-bold">
                {"\u9891\u9053\u540c\u6b65"}
              </h2>
            </div>
            <button
              type="button"
              disabled={syncing}
              onClick={() => {
                setSyncing(true);
                startTransition(async () => {
                  const response = await fetch("/api/admin/sync/run", { method: "POST" });
                  const result = (await response.json()) as {
                    summary?: { importedVideos: number; importedClips: number };
                    error?: string;
                  };
                  setSyncing(false);
                  setMessage(
                    result.error
                      ? result.error
                      : `\u540c\u6b65\u5b8c\u6210\uff0c+${result.summary?.importedVideos ?? 0} \u4e2a\u89c6\u9891\uff0c+${
                          result.summary?.importedClips ?? 0
                        } \u4e2a\u5207\u7247`,
                  );
                  router.refresh();
                });
              }}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {syncing ? "\u540c\u6b65\u4e2d..." : "\u7acb\u5373\u540c\u6b65"}
            </button>
          </div>
          <p className="mt-4 text-sm leading-7 text-black/70">
            {
              "v1 \u5df2\u63a5\u5165 GDC\u3001GMTK \u548c Noclip \u7684\u771f\u5b9e YouTube \u9891\u9053\u3002\u6bcf\u6b21\u540c\u6b65\u4f1a\u5148\u6e05\u7406\u65e7\u7684\u6258\u7ba1\u6570\u636e\uff0c\u518d\u5bfc\u5165\u65b0\u7684\u9ad8\u8d28\u91cf\u70ed\u95e8\u89c6\u9891\u3002"
            }
          </p>
          {message ? <p className="mt-4 text-sm font-semibold text-[var(--forest)]">{message}</p> : null}
        </div>

        <form
          className="panel-card rounded-[2rem] p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const url = String(form.get("url") ?? "").trim();

            if (!url) {
              setMessage("\u8bf7\u8f93\u5165\u9891\u9053 URL\u3002");
              return;
            }

            setAdding(true);
            startTransition(async () => {
              const response = await fetch("/api/admin/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
              });

              const result = (await response.json()) as { error?: string };
              setAdding(false);
              setMessage(result.error ?? "\u9891\u9053\u5df2\u52a0\u5165\u767d\u540d\u5355\u3002");
              if (response.ok) {
                (event.currentTarget as HTMLFormElement).reset();
                router.refresh();
              }
            });
          }}
        >
          <p className="eyebrow">Whitelist</p>
          <h2 className="display-font mt-3 text-2xl font-bold">
            {"\u65b0\u589e\u9891\u9053"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-black/70">
            {
              "\u9996\u7248\u652f\u6301\u8bb0\u5f55 YouTube \u9891\u9053 URL\u3002\u81ea\u5b9a\u4e49\u9891\u9053\u4f1a\u5148\u8fdb\u5165\u767d\u540d\u5355\uff0c\u540e\u7eed\u53ef\u4ee5\u518d\u63a5\u5165\u5b9e\u9645\u540c\u6b65\u89c4\u5219\u3002"
            }
          </p>
          <label className="mt-5 block text-sm font-semibold text-black/70">
            {"YouTube \u9891\u9053 URL"}
            <input
              name="url"
              type="url"
              placeholder="https://www.youtube.com/@example"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={adding}
            className="mt-4 rounded-full border border-black/10 px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {adding ? "\u6dfb\u52a0\u4e2d..." : "\u52a0\u5165\u767d\u540d\u5355"}
          </button>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="panel-card rounded-[2rem] p-6">
          <div className="flex items-center justify-between">
            <h2 className="display-font text-2xl font-bold">
              {"\u5f85\u5ba1\u6838\u5207\u7247"}
            </h2>
            <span className="text-sm text-black/55">{overview.pendingClips.length} {"\u6761"}</span>
          </div>
          <div className="mt-5 space-y-4">
            {overview.pendingClips.length ? (
              overview.pendingClips.map((clip) => (
                <article key={clip.id} className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                    {clip.channel.name} / {clip.video.zhTitle}
                  </p>
                  <h3 className="mt-2 text-lg font-bold">{clip.zhTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/70">{clip.zhSummary}</p>
                  <div className="mt-4 flex gap-3">
                    <Link
                      href={`/admin/videos/${clip.video.id}#${clip.id}`}
                      className="rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      {"\u5ba1\u6838\u5e76\u7f16\u8f91"}
                    </Link>
                    <span className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold">
                      Score {clip.score} / Confidence {(clip.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-black/70">
                {"\u5f53\u524d\u6ca1\u6709\u5f85\u5ba1\u6838\u5207\u7247\u3002"}
              </p>
            )}
          </div>
        </div>

        <div className="panel-card rounded-[2rem] p-6">
          <h2 className="display-font text-2xl font-bold">
            {"\u9891\u9053\u767d\u540d\u5355"}
          </h2>
          <div className="mt-5 space-y-3">
            {overview.channels.map((channel) => (
              <article
                key={channel.id}
                className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-black/8 bg-white/70 p-4"
              >
                <div>
                  <p className="font-semibold">{channel.name}</p>
                  <p className="text-sm text-black/60">
                    {channel.handle} / {channel.description}
                  </p>
                </div>
                <div className="text-right text-xs text-black/55">
                  <p>{channel.whitelistStatus === "active" ? "ACTIVE" : "PAUSED"}</p>
                  <p>
                    {channel.lastSyncedAt
                      ? formatDate(channel.lastSyncedAt)
                      : "\u672a\u540c\u6b65"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[2rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="display-font text-2xl font-bold">
              {"\u89c6\u9891\u5e93"}
            </h2>
            <p className="mt-2 text-sm text-black/65">
              {"\u67e5\u770b\u6bcf\u6761\u957f\u89c6\u9891\u53ca\u5176 AI \u5207\u7247\u7ed3\u679c\u3002"}
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-black/8">
          <div className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr] bg-black/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
            <span>{"\u89c6\u9891"}</span>
            <span>{"\u9891\u9053"}</span>
            <span>{"\u5207\u7247\u6570"}</span>
            <span>{"\u64cd\u4f5c"}</span>
          </div>
          {overview.videos.map((video) => (
            <div
              key={video.id}
              className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr] items-center border-t border-black/6 bg-white/70 px-4 py-4 text-sm"
            >
              <div>
                <p className="font-semibold">{video.zhTitle}</p>
                <p className="mt-1 text-black/55">{video.title}</p>
              </div>
              <span>{video.channel.name}</span>
              <span>{video.clipCount}</span>
              <Link
                href={`/admin/videos/${video.id}`}
                className="inline-flex w-fit rounded-full border border-black/10 px-4 py-2 font-semibold"
              >
                {"\u6253\u5f00"}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
