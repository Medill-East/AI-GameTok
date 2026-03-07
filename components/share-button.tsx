"use client";

import { useState } from "react";

export function ShareButton({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const absoluteUrl = url.startsWith("http")
          ? url
          : `${window.location.origin}${url}`;

        if (navigator.share) {
          await navigator.share({ title, url: absoluteUrl });
          return;
        }

        await navigator.clipboard.writeText(absoluteUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-full border border-white/20 bg-black/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/40"
    >
      {copied ? "\u5df2\u590d\u5236" : "\u5206\u4eab"}
    </button>
  );
}
