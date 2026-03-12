"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function ShareButton({
  title,
  url,
  className,
  iconOnlyMobile = false,
}: {
  title: string;
  url: string;
  className?: string;
  iconOnlyMobile?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={copied ? "\u94fe\u63a5\u5df2\u590d\u5236" : "\u5206\u4eab"}
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
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/40 lg:px-4",
        className,
      )}
    >
      <ShareIcon className="h-4 w-4" />
      <span className={iconOnlyMobile ? "hidden md:inline" : ""}>
        {copied ? "\u5df2\u590d\u5236" : "\u5206\u4eab"}
      </span>
    </button>
  );
}
