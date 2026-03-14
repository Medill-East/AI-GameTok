"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { getReadOnlyPreviewMessage } from "@/lib/preview-mode";
import type { AdminOverview } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function AdminDashboard({
  overview,
  readOnlyPreview = false,
}: {
  overview: AdminOverview;
  readOnlyPreview?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [connecting, setConnecting] = useState(false);

  function refreshMessage(nextMessage: string) {
    setMessage(nextMessage);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["\u5df2\u53d1\u5e03\u5173\u952e\u7247\u6bb5", overview.counts.publishedClips],
          ["\u5f85\u5ba1\u6838\u7247\u6bb5", overview.counts.pendingClips],
          ["\u64ad\u653e\u5f02\u5e38", overview.counts.playbackIssues],
          ["\u89c6\u9891\u603b\u6570", overview.counts.videos],
          ["\u767d\u540d\u5355\u9891\u9053", overview.counts.channels],
        ].map(([label, value]) => (
          <div key={label} className="panel-card rounded-[1.75rem] p-5">
            <p className="text-sm text-black/60">{label}</p>
            <p className="display-font mt-3 text-4xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-card rounded-[2rem] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Operations</p>
              <h2 className="display-font mt-3 text-2xl font-bold">
                {"\u805a\u5408\u540c\u6b65\u4e0e\u5065\u5eb7\u68c0\u67e5"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={syncing || readOnlyPreview}
                onClick={() => {
                  if (readOnlyPreview) {
                    setMessage(getReadOnlyPreviewMessage());
                    return;
                  }
                  setSyncing(true);
                  startTransition(async () => {
                    const response = await fetch("/api/admin/sync/run", { method: "POST" });
                    const result = (await response.json()) as {
                      summary?: {
                        importedVideos: number;
                        importedClips: number;
                        removedVideos: number;
                        removedClips: number;
                      };
                      error?: string;
                    };
                    setSyncing(false);
                    refreshMessage(
                      result.error
                        ? result.error
                        : `\u540c\u6b65\u5b8c\u6210\uff0c+${result.summary?.importedVideos ?? 0} \u4e2a\u89c6\u9891\uff0c+${result.summary?.importedClips ?? 0} \u4e2a\u5207\u7247\uff0c\u6e05\u7406 ${result.summary?.removedVideos ?? 0} \u4e2a\u65e7\u89c6\u9891`,
                    );
                  });
                }}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {syncing ? "\u540c\u6b65\u4e2d..." : "\u7acb\u5373\u540c\u6b65"}
              </button>
              <button
                type="button"
                disabled={rechecking || readOnlyPreview}
                onClick={() => {
                  if (readOnlyPreview) {
                    setMessage(getReadOnlyPreviewMessage());
                    return;
                  }
                  setRechecking(true);
                  startTransition(async () => {
                    const response = await fetch("/api/admin/playback/recheck", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                    });
                    const result = (await response.json()) as {
                      checked?: number;
                      issues?: number;
                      error?: string;
                    };
                    setRechecking(false);
                    refreshMessage(
                      result.error
                        ? result.error
                        : `\u5df2\u91cd\u9a8c ${result.checked ?? 0} \u4e2a\u89c6\u9891\uff0c\u53d1\u73b0 ${result.issues ?? 0} \u4e2a\u64ad\u653e\u5f02\u5e38`,
                    );
                  });
                }}
                className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {rechecking ? "\u68c0\u67e5\u4e2d..." : "\u91cd\u9a8c\u53ef\u64ad\u6027"}
              </button>
              <button
                type="button"
                disabled={connecting || readOnlyPreview}
                onClick={() => {
                  if (readOnlyPreview) {
                    setMessage(getReadOnlyPreviewMessage());
                    return;
                  }
                  setConnecting(true);
                  startTransition(async () => {
                    const response = await fetch("/api/admin/youtube/connect", {
                      method: "POST",
                    });
                    const result = (await response.json()) as {
                      authUrl?: string;
                      error?: string;
                    };
                    setConnecting(false);
                    if (result.authUrl) {
                      window.open(result.authUrl, "_blank", "noopener,noreferrer");
                      setMessage(
                        "\u5df2\u6253\u5f00 YouTube Analytics \u6388\u6743\u94fe\u63a5\u3002\u6388\u6743\u56de\u8c03\u8fd8\u9700\u5728\u73af\u5883\u53d8\u91cf\u914d\u7f6e\u540e\u63a5\u5165\u3002",
                      );
                      return;
                    }

                    setMessage(result.error ?? "\u65e0\u6cd5\u751f\u6210\u6388\u6743\u94fe\u63a5\u3002");
                  });
                }}
                className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {connecting ? "\u51c6\u5907\u4e2d..." : "\u8fde\u63a5 Analytics"}
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-black/70">
            {
              "\u8fd9\u4e00\u7248\u4f1a\u5728\u540c\u6b65\u65f6\u81ea\u52a8\u8865\u9f50\u767d\u540d\u5355\u9891\u9053\u7684\u89c6\u9891\u5143\u6570\u636e\u3001\u53ef\u64ad\u6027\u72b6\u6001\u548c\u5173\u952e\u7247\u6bb5\u7d22\u5f15\u3002"
            }
          </p>
          {message ? <p className="mt-4 text-sm font-semibold text-[var(--forest)]">{message}</p> : null}
        </div>

        <form
          className="panel-card rounded-[2rem] p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (readOnlyPreview) {
              setMessage(getReadOnlyPreviewMessage());
              return;
            }
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
              "\u6b64\u5165\u53e3\u9002\u5408\u65b0\u589e\u81ea\u5b9a\u4e49 YouTube \u767d\u540d\u5355\u9891\u9053\u3002\u516c\u5f00\u7b2c\u4e09\u65b9\u9891\u9053\u9ed8\u8ba4\u4f5c\u4e3a\u805a\u5408\u6765\u6e90\uff0c\u6388\u6743\u9891\u9053\u624d\u4f1a\u540e\u7eed\u63a5\u5165\u66f4\u6df1\u5ea6\u7684\u5207\u7247\u80fd\u529b\u3002"
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
            disabled={adding || readOnlyPreview}
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
              {"\u5f85\u5ba1\u6838\u5173\u952e\u7247\u6bb5"}
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
                      {clip.signalSource} / Rank {clip.rankScore}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-black/70">
                {"\u5f53\u524d\u6ca1\u6709\u5f85\u5ba1\u6838\u7684\u5173\u952e\u7247\u6bb5\u3002"}
              </p>
            )}
          </div>
        </div>

        <div className="panel-card rounded-[2rem] p-6">
          <h2 className="display-font text-2xl font-bold">
            {"\u64ad\u653e\u5f02\u5e38"}
          </h2>
          <div className="mt-5 space-y-3">
            {overview.playbackIssues.length ? (
              overview.playbackIssues.map((video) => (
                <article
                  key={video.id}
                  className="flex items-start justify-between gap-4 rounded-[1.5rem] border border-black/8 bg-white/70 p-4"
                >
                  <div>
                    <p className="font-semibold">{video.zhTitle}</p>
                    <p className="mt-1 text-sm text-black/60">
                      {video.channel.name} / {video.availabilityStatus}
                    </p>
                    {video.playbackErrorReason ? (
                      <p className="mt-2 text-sm leading-6 text-black/65">{video.playbackErrorReason}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/admin/videos/${video.id}`}
                    className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
                  >
                    {"\u6253\u5f00"}
                  </Link>
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-black/70">
                {"\u5f53\u524d\u672a\u53d1\u73b0\u64ad\u653e\u5f02\u5e38\u89c6\u9891\u3002"}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[2rem] p-6">
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
                <p>{channel.authMode.toUpperCase()}</p>
                <p>{channel.contentTier}</p>
                <p>
                  {channel.lastSyncedAt
                    ? formatDate(channel.lastSyncedAt)
                    : "\u672a\u540c\u6b65"}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-card rounded-[2rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="display-font text-2xl font-bold">
              {"\u89c6\u9891\u5e93"}
            </h2>
            <p className="mt-2 text-sm text-black/65">
              {"\u67e5\u770b\u6bcf\u6761\u957f\u89c6\u9891\u7684\u53ef\u64ad\u72b6\u6001\u3001\u5173\u952e\u7247\u6bb5\u6570\u548c\u805a\u5408\u64ad\u653e\u65b9\u5f0f\u3002"}
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-black/8">
          <div className="grid grid-cols-[1.4fr_0.7fr_0.55fr_0.7fr_0.7fr_0.6fr] bg-black/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
            <span>{"\u89c6\u9891"}</span>
            <span>{"\u9891\u9053"}</span>
            <span>{"\u7247\u6bb5"}</span>
            <span>{"\u53ef\u64ad\u6027"}</span>
            <span>{"\u64ad\u653e\u6a21\u5f0f"}</span>
            <span>{"\u64cd\u4f5c"}</span>
          </div>
          {overview.videos.map((video) => (
            <div
              key={video.id}
              className="grid grid-cols-[1.4fr_0.7fr_0.55fr_0.7fr_0.7fr_0.6fr] items-center border-t border-black/6 bg-white/70 px-4 py-4 text-sm"
            >
              <div>
                <p className="font-semibold">{video.zhTitle}</p>
                <p className="mt-1 text-black/55">{video.title}</p>
              </div>
              <span>{video.channel.name}</span>
              <span>{video.clipCount}</span>
              <span className="font-semibold text-black/70">{video.availabilityStatus}</span>
              <span className="text-black/60">{video.playbackMode}</span>
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
