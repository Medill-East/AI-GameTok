import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoAdminEditor } from "@/components/video-admin-editor";
import { getReadOnlyPreviewMessage, isReadOnlyPreview } from "@/lib/preview-mode";
import { getVideoDetail } from "@/lib/store";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVideoPage({ params }: PageProps) {
  const { id } = await params;
  const video = await getVideoDetail(id);
  const readOnlyPreview = isReadOnlyPreview();

  if (!video) {
    notFound();
  }

  return (
    <main className="section-shell space-y-8 py-8">
      <Link
        href="/admin"
        className="inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-3 text-sm font-semibold"
      >
        {"\u8fd4\u56de\u540e\u53f0"}
      </Link>
      {readOnlyPreview ? (
        <div className="rounded-[1.5rem] border border-[var(--accent)]/30 bg-[var(--accent)]/8 px-5 py-4 text-sm leading-7 text-black/72">
          {getReadOnlyPreviewMessage()}
        </div>
      ) : null}
      <VideoAdminEditor video={video} readOnlyPreview={readOnlyPreview} />
    </main>
  );
}
