"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SAVED_CLIPS_KEY } from "@/lib/constants";
import type { FeedClip } from "@/lib/types";

export function SavedClips() {
  const [clips, setClips] = useState<FeedClip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const raw = window.localStorage.getItem(SAVED_CLIPS_KEY);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];

      const list = await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(`/api/clips/${id}`);
          if (!response.ok) {
            return null;
          }
          return (await response.json()) as FeedClip;
        }),
      );

      setClips(list.filter(Boolean) as FeedClip[]);
      setLoading(false);
    };

    void run();
  }, []);

  if (loading) {
    return (
      <div className="panel-card rounded-[2rem] p-8">
        {"\u6b63\u5728\u52a0\u8f7d\u6536\u85cf\u5185\u5bb9..."}
      </div>
    );
  }

  if (!clips.length) {
    return (
      <div className="panel-card rounded-[2rem] p-8">
        <h2 className="display-font text-2xl font-bold">
          {"\u8fd8\u6ca1\u6709\u6536\u85cf\u5185\u5bb9"}
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-black/70">
          {
            "\u5728\u9996\u9875\u5237\u5230\u6709\u4ef7\u503c\u7684\u5207\u7247\u540e\u70b9\u4e00\u4e0b\u201c\u6536\u85cf\u201d\uff0c\u8fd9\u91cc\u4f1a\u53d8\u6210\u4f60\u7684\u6e38\u620f\u884c\u4e1a\u89c6\u9891\u7d20\u6750\u5e93\u3002"
          }
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          {"\u8fd4\u56de\u9996\u9875\u7ee7\u7eed\u5237"}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {clips.map((clip) => (
        <article key={clip.id} className="panel-card rounded-[2rem] p-5">
          <Image
            src={clip.video.thumbnailUrl}
            alt={clip.zhTitle}
            width={960}
            height={540}
            className="h-48 w-full rounded-[1.5rem] object-cover"
          />
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
              {clip.channel.name} / {clip.channel.handle}
            </p>
            <h3 className="display-font mt-2 text-2xl font-bold">{clip.zhTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-black/70">{clip.zhSummary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/clip/${clip.id}`}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                {"\u5207\u7247\u8be6\u60c5"}
              </Link>
              <Link
                href={`/video/${clip.video.id}?from=${clip.id}`}
                className="rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white"
              >
                {"\u7ad9\u5185\u7eed\u770b"}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
