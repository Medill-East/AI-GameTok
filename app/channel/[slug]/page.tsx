import { notFound } from "next/navigation";
import { ClipFeed } from "@/components/clip-feed";
import { CHANNEL_LABELS } from "@/lib/constants";
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

  const { clips } = await getFeed({ channel });

  return (
    <main className="section-shell py-4 md:py-6">
      <ClipFeed clips={clips} currentChannel={channel} />
    </main>
  );
}
