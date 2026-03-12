"use client";

import { useEffect, useState } from "react";
import { BookmarkFilledIcon, BookmarkIcon } from "@/components/icons";
import { SAVED_CLIPS_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";

function readSavedIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_CLIPS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function SaveButton({
  clipId,
  className,
  iconOnlyMobile = false,
}: {
  clipId: string;
  className?: string;
  iconOnlyMobile?: boolean;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSavedIds().includes(clipId));
  }, [clipId]);

  return (
    <button
      type="button"
      aria-label={saved ? "\u53d6\u6d88\u6536\u85cf" : "\u6536\u85cf"}
      onClick={() => {
        const next = new Set(readSavedIds());

        if (next.has(clipId)) {
          next.delete(clipId);
        } else {
          next.add(clipId);
        }

        window.localStorage.setItem(SAVED_CLIPS_KEY, JSON.stringify([...next]));
        setSaved(next.has(clipId));
      }}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition lg:px-4",
        saved
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-white/20 bg-black/25 text-white hover:bg-black/40",
        className,
      )}
    >
      {saved ? <BookmarkFilledIcon className="h-5 w-5" /> : <BookmarkIcon className="h-5 w-5" />}
      <span className={iconOnlyMobile ? "hidden md:inline" : ""}>
        {saved ? "\u5df2\u6536\u85cf" : "\u6536\u85cf"}
      </span>
    </button>
  );
}
