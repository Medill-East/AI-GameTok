import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import {
  getReadOnlyPreviewMessage,
  isInternalAdminEnabled,
  isReadOnlyPreview,
} from "@/lib/preview-mode";
import { getAdminOverview } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isInternalAdminEnabled()) {
    notFound();
  }

  const overview = await getAdminOverview();
  const readOnlyPreview = isReadOnlyPreview();

  return (
    <main className="section-shell space-y-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Catalog Console</div>
          <h1 className="display-font mt-4 text-4xl font-bold">
            {"\u5185\u5bb9\u76ee\u5f55\u4e0e\u5ba1\u6838\u540e\u53f0"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-black/70">
            {
              "\u7ba1\u7406\u767d\u540d\u5355\u9891\u9053\u3001\u540c\u6b65\u957f\u89c6\u9891\u3001\u7ef4\u62a4\u5173\u952e\u7247\u6bb5\u7d22\u5f15\uff0c\u5e76\u63a7\u5236\u524d\u53f0\u7684\u63a8\u8350\u4e0e\u53d1\u5e03\u72b6\u6001\u3002"
            }
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-semibold"
        >
          {"\u8fd4\u56de\u524d\u53f0"}
        </Link>
      </div>
      {readOnlyPreview ? (
        <div className="rounded-[1.5rem] border border-[var(--accent)]/30 bg-[var(--accent)]/8 px-5 py-4 text-sm leading-7 text-black/72">
          {getReadOnlyPreviewMessage()}
        </div>
      ) : null}
      <AdminDashboard overview={overview} readOnlyPreview={readOnlyPreview} />
    </main>
  );
}
