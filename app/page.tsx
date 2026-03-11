import { ClipFeed } from "@/components/clip-feed";
import { getFeed } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { clips } = await getFeed();

  return (
    <main className="h-[100dvh] md:px-4 md:py-6 xl:px-6">
      <ClipFeed clips={clips} />
    </main>
  );
}
