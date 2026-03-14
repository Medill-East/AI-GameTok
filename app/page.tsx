import { ClipFeed } from "@/components/clip-feed";
import { isReadOnlyPreview } from "@/lib/preview-mode";
import { getFeed } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { clips, nextCursor } = await getFeed({ limit: 16 });
  const readOnlyPreview = isReadOnlyPreview();

  return (
    <main className="h-[100dvh] md:px-4 md:py-6 xl:px-6">
      <ClipFeed
        initialClips={clips}
        initialNextCursor={nextCursor}
        readOnlyPreview={readOnlyPreview}
      />
    </main>
  );
}
