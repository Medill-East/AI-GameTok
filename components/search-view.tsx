"use client";

import Link from "next/link";
import { GlobeIcon, SearchIcon } from "@/components/icons";
import { useDisplayLanguage } from "@/components/use-display-language";
import { CHANNEL_LABELS, CHANNEL_LABELS_EN } from "@/lib/constants";
import { getClipSummary, getClipTitle, getVideoTitle } from "@/lib/display";
import type { SearchResults, VideoChannelSlug } from "@/lib/types";

interface SearchViewProps {
  query: string;
  channel?: VideoChannelSlug;
  type: "clips" | "videos" | "all";
  results: SearchResults;
}

export function SearchView({ query, channel, type, results }: SearchViewProps) {
  const { language, toggleLanguage } = useDisplayLanguage();
  const copy =
    language === "en"
      ? {
          eyebrow: "Search",
          title: "Topic Search",
          intro:
            "Search high-signal highlights by game, mechanic, topic or channel. Highlights come first, with long videos kept as the next step.",
          home: "Back to feed",
          keyword: "Keyword",
          keywordPlaceholder: "For example: Disco Elysium / level design / retention",
          channelLabel: "Channel",
          all: "All",
          resultType: "Result type",
          highlights: "Highlights",
          videos: "Videos",
          search: "Search",
          highlightResults: "Highlight Results",
          videoResults: "Video Results",
          itemCount: "items",
          openHighlight: "Open highlight",
          continueWatching: "Continue video",
          openVideo: "Open video",
          highlightCount: "highlights",
          emptyHighlights: "No highlights matched this search.",
          emptyVideos: "No long videos matched this search.",
          emptyState:
            "Enter a keyword to search highlights and long videos by game name, design topic, growth issue or AI tooling.",
          match: "Match",
          language: "\u4e2d\u6587",
        }
      : {
          eyebrow: "\u641c\u7d22",
          title: "\u4e3b\u9898\u641c\u7d22",
          intro:
            "\u6309\u6e38\u620f\u540d\u3001\u7cfb\u7edf\u3001\u4e3b\u9898\u6216\u9891\u9053\u641c\u7d22\u5173\u952e\u7247\u6bb5\u3002\u7ed3\u679c\u4f18\u5148\u8fd4\u56de\u9002\u5408\u5feb\u901f\u7406\u89e3\u7684\u7d22\u5f15\u7247\u6bb5\uff0c\u540c\u65f6\u4fdd\u7559\u957f\u89c6\u9891\u5165\u53e3\u3002",
          home: "\u8fd4\u56de\u9996\u9875",
          keyword: "\u5173\u952e\u8bcd",
          keywordPlaceholder: "\u6bd4\u5982\uff1aDisco Elysium / level design / retention",
          channelLabel: "\u9891\u9053",
          all: "\u5168\u90e8",
          resultType: "\u7ed3\u679c\u7c7b\u578b",
          highlights: "\u5173\u952e\u7247\u6bb5",
          videos: "\u957f\u89c6\u9891",
          search: "\u641c\u7d22",
          highlightResults: "\u5173\u952e\u7247\u6bb5\u7ed3\u679c",
          videoResults: "\u957f\u89c6\u9891\u7ed3\u679c",
          itemCount: "\u6761",
          openHighlight: "\u6253\u5f00\u7247\u6bb5",
          continueWatching: "\u7ee7\u7eed\u770b\u957f\u89c6\u9891",
          openVideo: "\u6253\u5f00\u89c6\u9891",
          highlightCount: "\u4e2a\u7247\u6bb5",
          emptyHighlights: "\u6ca1\u6709\u5339\u914d\u7684\u5173\u952e\u7247\u6bb5\u3002",
          emptyVideos: "\u6ca1\u6709\u5339\u914d\u7684\u957f\u89c6\u9891\u3002",
          emptyState:
            "\u8f93\u5165\u5173\u952e\u8bcd\u540e\uff0c\u53ef\u6309\u6e38\u620f\u540d\u3001\u8bbe\u8ba1\u4e3b\u9898\u3001\u589e\u957f\u95ee\u9898\u6216 AI \u5de5\u5177\u67e5\u627e\u5173\u952e\u7247\u6bb5\u548c\u957f\u89c6\u9891\u3002",
          match: "\u5339\u914d\u5ea6",
          language: "EN",
        };

  return (
    <main className="section-shell space-y-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{copy.eyebrow}</div>
          <h1 className="display-font mt-4 text-4xl font-bold">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-black/70">{copy.intro}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 text-sm font-semibold"
          >
            <GlobeIcon className="h-5 w-5" />
            <span>{copy.language}</span>
          </button>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold"
          >
            {copy.home}
          </Link>
        </div>
      </div>

      <form className="panel-card grid gap-4 rounded-[2rem] p-6 md:grid-cols-[minmax(0,1fr)_200px_180px_auto]">
        <label className="text-sm font-semibold">
          {copy.keyword}
          <input
            name="q"
            defaultValue={query}
            placeholder={copy.keywordPlaceholder}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
          />
        </label>
        <label className="text-sm font-semibold">
          {copy.channelLabel}
          <select
            name="channel"
            defaultValue={channel ?? ""}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
          >
            <option value="">{copy.all}</option>
            {Object.keys(CHANNEL_LABELS).map((slug) => (
              <option key={slug} value={slug}>
                {language === "en"
                  ? CHANNEL_LABELS_EN[slug as VideoChannelSlug]
                  : CHANNEL_LABELS[slug as VideoChannelSlug]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {copy.resultType}
          <select
            name="type"
            defaultValue={type}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
          >
            <option value="all">{copy.all}</option>
            <option value="clips">{copy.highlights}</option>
            <option value="videos">{copy.videos}</option>
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex self-end rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          <SearchIcon className="mr-2 h-4 w-4" />
          {copy.search}
        </button>
      </form>

      {query ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="panel-card rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="display-font text-2xl font-bold">{copy.highlightResults}</h2>
              <span className="text-sm text-black/55">
                {results.clips.length} {copy.itemCount}
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {results.clips.length ? (
                results.clips.map((clip) => (
                  <article key={clip.id} className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                      {clip.channel.name} /{" "}
                      {language === "en"
                        ? CHANNEL_LABELS_EN[clip.channelSlug]
                        : CHANNEL_LABELS[clip.channelSlug]}{" "}
                      / {copy.match} {clip.matchScore}
                    </p>
                    <h3 className="mt-2 text-xl font-bold">
                      {getClipTitle(clip, language, clip.video.title)}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-black/70">
                      {getClipSummary(clip, language, clip.video.description)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/clip/${clip.id}`}
                        className="rounded-full bg-[var(--forest)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        {copy.openHighlight}
                      </Link>
                      <Link
                        href={`/video/${clip.video.id}?from=${clip.id}`}
                        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
                      >
                        {copy.continueWatching}
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-7 text-black/70">{copy.emptyHighlights}</p>
              )}
            </div>
          </section>

          <section className="panel-card rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="display-font text-2xl font-bold">{copy.videoResults}</h2>
              <span className="text-sm text-black/55">
                {results.videos.length} {copy.itemCount}
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {results.videos.length ? (
                results.videos.map((video) => (
                  <article key={video.id} className="rounded-[1.5rem] border border-black/8 bg-white/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
                      {video.channel.name} / {copy.match} {video.matchScore}
                    </p>
                    <h3 className="mt-2 text-lg font-bold">{getVideoTitle(video, language)}</h3>
                    <p className="mt-2 text-sm leading-7 text-black/70">{video.description}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/video/${video.id}`}
                        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
                      >
                        {copy.openVideo}
                      </Link>
                      <span className="rounded-full border border-black/10 px-4 py-2 text-sm text-black/60">
                        {video.clipCount} {copy.highlightCount}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-7 text-black/70">{copy.emptyVideos}</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="panel-card rounded-[2rem] p-6 text-sm leading-7 text-black/70">
          {copy.emptyState}
        </section>
      )}
    </main>
  );
}
