"use client";

import { useEffect, useState } from "react";
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
}: {
  clipId: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSavedIds().includes(clipId));
  }, [clipId]);

  return (
    <button
      type="button"
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
        "min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition lg:px-4",
        saved
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-white/20 bg-black/25 text-white hover:bg-black/40",
        className,
      )}
    >
      {saved ? "\u5df2\u6536\u85cf" : "\u6536\u85cf"}
    </button>
  );
}
