import { notFound } from "next/navigation";
import { ClipFeed } from "@/components/clip-feed";
import { CHANNEL_LABELS } from "@/lib/constants";
import { isReadOnlyPreview } from "@/lib/preview-mode";
import { getFeed } from "@/lib/store";
import type { VideoChannelSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: PageProps) {
  const { slug } = await params;
  const channel = slug as VideoChannelSlug;

  if (!(slug in CHANNEL_LABELS)) {
    notFound();
  }

  const { clips, nextCursor } = await getFeed({ channel, limit: 16 });
  const readOnlyPreview = isReadOnlyPreview();

  return (
    <main className="h-[100dvh] md:px-4 md:py-6 xl:px-6">
      <ClipFeed
        initialClips={clips}
        initialNextCursor={nextCursor}
        currentChannel={channel}
        readOnlyPreview={readOnlyPreview}
      />
    </main>
  );
}
