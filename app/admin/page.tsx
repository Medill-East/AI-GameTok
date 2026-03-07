import Link from "next/link";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminOverview } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const overview = await getAdminOverview();

  return (
    <main className="section-shell space-y-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Admin Console</div>
          <h1 className="display-font mt-4 text-4xl font-bold">
            {"\u5185\u5bb9\u8fd0\u8425\u540e\u53f0"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-black/70">
            {
              "\u7ba1\u7406\u767d\u540d\u5355\u9891\u9053\u3001\u540c\u6b65\u957f\u89c6\u9891\u3001\u5ba1\u6838 AI \u5207\u7247\uff0c\u5e76\u63a7\u5236\u524d\u53f0\u7684\u7cbe\u9009\u4e0e\u53d1\u5e03\u72b6\u6001\u3002"
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
      <AdminDashboard overview={overview} />
    </main>
  );
}
