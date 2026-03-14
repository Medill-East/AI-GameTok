"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { CHANNEL_LABELS } from "@/lib/constants";
import { getReadOnlyPreviewMessage } from "@/lib/preview-mode";
import type { FeedClip, VideoDetail, VideoChannelSlug } from "@/lib/types";
import { formatDuration } from "@/lib/youtube";

function ClipEditor({
  clip,
  readOnlyPreview = false,
}: {
  clip: FeedClip;
  readOnlyPreview?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    startSec: String(clip.startSec),
    endSec: String(clip.endSec),
    zhTitle: clip.zhTitle,
    zhSummary: clip.zhSummary,
    zhTakeaways: clip.zhTakeaways.join("\n"),
    tags: clip.tags.join(", "),
    score: String(clip.score),
    confidence: String(clip.confidence),
    channelSlug: clip.channelSlug,
    editorPick: clip.editorPick,
  });

  const mutate = (endpoint: string) => {
    if (readOnlyPreview) {
      setMessage(getReadOnlyPreviewMessage());
      return;
    }
    setSaving(true);
    startTransition(async () => {
      const response = await fetch(endpoint, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      setSaving(false);
      setMessage(result.error ?? "\u5df2\u66f4\u65b0\u3002");
      if (response.ok) {
        router.refresh();
      }
    });
  };

  return (
    <article id={clip.id} className="rounded-[2rem] border border-black/8 bg-white/75 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            {CHANNEL_LABELS[clip.channelSlug]} / {formatDuration(clip.endSec - clip.startSec)}
          </p>
          <h3 className="display-font mt-2 text-2xl font-bold">{clip.zhTitle}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-black/70">{clip.transcriptZh}</p>
        </div>
        <div className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold">
          {clip.status}
        </div>
      </div>

      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (readOnlyPreview) {
            setMessage(getReadOnlyPreviewMessage());
            return;
          }
          setSaving(true);
          startTransition(async () => {
            const response = await fetch(`/api/admin/clips/${clip.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                startSec: Number(form.startSec),
                endSec: Number(form.endSec),
                zhTitle: form.zhTitle,
                zhSummary: form.zhSummary,
                zhTakeaways: form.zhTakeaways
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean),
                tags: form.tags
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
                score: Number(form.score),
                confidence: Number(form.confidence),
                channelSlug: form.channelSlug,
                editorPick: form.editorPick,
              }),
            });
            const result = (await response.json()) as { error?: string };
            setSaving(false);
            setMessage(result.error ?? "\u5207\u7247\u5df2\u4fdd\u5b58\u3002");
            if (response.ok) {
              router.refresh();
            }
          });
        }}
      >
        <fieldset disabled={readOnlyPreview || saving} className="grid gap-4 md:grid-cols-4">
          <label className="text-sm font-semibold">
            {"\u5f00\u59cb\u79d2\u6570"}
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
              value={form.startSec}
              onChange={(event) => setForm((current) => ({ ...current, startSec: event.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold">
            {"\u7ed3\u675f\u79d2\u6570"}
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
              value={form.endSec}
              onChange={(event) => setForm((current) => ({ ...current, endSec: event.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold">
            Score
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
              value={form.score}
              onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold">
            Confidence
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
              value={form.confidence}
              onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))}
            />
          </label>
        </fieldset>

        <label className="text-sm font-semibold">
          {"\u4e2d\u6587\u6807\u9898"}
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
            value={form.zhTitle}
            disabled={readOnlyPreview || saving}
            onChange={(event) => setForm((current) => ({ ...current, zhTitle: event.target.value }))}
          />
        </label>

        <label className="text-sm font-semibold">
          {"\u4e2d\u6587\u6458\u8981"}
          <textarea
            className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
            value={form.zhSummary}
            disabled={readOnlyPreview || saving}
            onChange={(event) => setForm((current) => ({ ...current, zhSummary: event.target.value }))}
          />
        </label>

        <label className="text-sm font-semibold">
          {"\u5173\u952e\u8981\u70b9\uff08\u6bcf\u884c\u4e00\u6761\uff09"}
          <textarea
            className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
            value={form.zhTakeaways}
            disabled={readOnlyPreview || saving}
            onChange={(event) =>
              setForm((current) => ({ ...current, zhTakeaways: event.target.value }))
            }
          />
        </label>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold">
            {"\u6807\u7b7e\uff08\u9017\u53f7\u5206\u9694\uff09"}
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
              value={form.tags}
              disabled={readOnlyPreview || saving}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
            />
          </label>
          <label className="text-sm font-semibold">
            {"\u9891\u9053"}
            <select
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
              value={form.channelSlug}
              disabled={readOnlyPreview || saving}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  channelSlug: event.target.value as VideoChannelSlug,
                }))
              }
            >
              {Object.entries(CHANNEL_LABELS).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.editorPick}
              disabled={readOnlyPreview || saving}
              onChange={(event) =>
                setForm((current) => ({ ...current, editorPick: event.target.checked }))
              }
            />
            {"\u8bbe\u4e3a\u7cbe\u9009"}
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || readOnlyPreview}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "\u4fdd\u5b58\u4e2d..." : "\u4fdd\u5b58\u4fee\u6539"}
          </button>
          <button
            type="button"
            disabled={saving || readOnlyPreview}
            onClick={() => mutate(`/api/admin/clips/${clip.id}/publish`)}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold"
          >
            {"\u53d1\u5e03"}
          </button>
          <button
            type="button"
            disabled={saving || readOnlyPreview}
            onClick={() => mutate(`/api/admin/clips/${clip.id}/archive`)}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold"
          >
            {"\u4e0b\u7ebf"}
          </button>
          {message ? <p className="self-center text-sm text-[var(--forest)]">{message}</p> : null}
        </div>
      </form>
    </article>
  );
}

export function VideoAdminEditor({
  video,
  readOnlyPreview = false,
}: {
  video: VideoDetail;
  readOnlyPreview?: boolean;
}) {
  const router = useRouter();
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const runVideoAction = (endpoint: string, success: string) => {
    if (readOnlyPreview) {
      setStatusMessage(getReadOnlyPreviewMessage());
      return;
    }
    setRunningAction(endpoint);
    startTransition(async () => {
      const response = await fetch(endpoint, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      setRunningAction(null);
      setStatusMessage(result.error ?? success);
      if (response.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[2rem] p-6">
        <p className="eyebrow">Video Detail</p>
        <h1 className="display-font mt-3 text-4xl font-bold">{video.zhTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-black/70">{video.description}</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-black/62">
          公开第三方内容在这里以“聚合预览 + 关键片段索引”为主；只有授权或自有内容才会进入更深的短视频分发链路。
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-black/65">
          <span className="rounded-full border border-black/10 px-4 py-2">{video.channel.name}</span>
          <span className="rounded-full border border-black/10 px-4 py-2">
            {"\u5b57\u5e55\u72b6\u6001\uff1a"}
            {video.transcriptStatus}
          </span>
          <span className="rounded-full border border-black/10 px-4 py-2">
            {"\u5019\u9009\u5207\u7247\uff1a"}
            {video.clips.length}
          </span>
          <span className="rounded-full border border-black/10 px-4 py-2">
            {"\u53ef\u64ad\u6027\uff1a"}
            {video.availabilityStatus}
          </span>
          <span className="rounded-full border border-black/10 px-4 py-2">
            {"\u64ad\u653e\u6a21\u5f0f\uff1a"}
            {video.playbackMode}
          </span>
        </div>
        {video.playbackErrorReason ? (
          <p className="mt-4 text-sm leading-7 text-black/65">{video.playbackErrorReason}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={runningAction !== null || readOnlyPreview}
            onClick={() =>
              runVideoAction(`/api/admin/videos/${video.id}/reclip`, "\u5df2\u91cd\u8dd1\u5207\u7247\u3002")
            }
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {runningAction === `/api/admin/videos/${video.id}/reclip`
              ? "\u91cd\u8dd1\u4e2d..."
              : "\u91cd\u8dd1\u5207\u7247"}
          </button>
          <button
            type="button"
            disabled={runningAction !== null || readOnlyPreview}
            onClick={() =>
              runVideoAction(`/api/admin/videos/${video.id}/reindex`, "\u5df2\u91cd\u5efa\u641c\u7d22\u7d22\u5f15\u3002")
            }
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {"\u91cd\u5efa\u641c\u7d22\u7d22\u5f15"}
          </button>
          <button
            type="button"
            disabled={runningAction !== null || readOnlyPreview}
            onClick={() => {
              if (readOnlyPreview) {
                setStatusMessage(getReadOnlyPreviewMessage());
                return;
              }
              setRunningAction("playback");
              startTransition(async () => {
                const response = await fetch("/api/admin/playback/recheck", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ videoId: video.id }),
                });
                const result = (await response.json()) as { error?: string };
                setRunningAction(null);
                setStatusMessage(result.error ?? "\u5df2\u91cd\u9a8c\u8fd9\u6761\u89c6\u9891\u7684\u53ef\u64ad\u6027\u3002");
                if (response.ok) {
                  router.refresh();
                }
              });
            }}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {runningAction === "playback" ? "\u68c0\u67e5\u4e2d..." : "\u91cd\u9a8c\u53ef\u64ad\u6027"}
          </button>
          {statusMessage ? (
            <p className="self-center text-sm font-semibold text-[var(--forest)]">{statusMessage}</p>
          ) : null}
        </div>
      </section>

      <section className="panel-card rounded-[2rem] p-6">
        <h2 className="display-font text-2xl font-bold">
          {"AI \u5173\u952e\u7247\u6bb5\u7ed3\u679c"}
        </h2>
        <div className="mt-5 space-y-5">
          {video.clips.map((clip) => (
            <ClipEditor key={clip.id} clip={clip} readOnlyPreview={readOnlyPreview} />
          ))}
        </div>
      </section>
    </div>
  );
}
