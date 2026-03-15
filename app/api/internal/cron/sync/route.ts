import { runCatalogSync } from "@/lib/catalog-sync";
import { isAuthorizedCronRequest } from "@/lib/preview-mode";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized cron request.",
      },
      { status: 401 },
    );
  }

  try {
    const summary = await runCatalogSync("cron", 48);
    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Scheduled sync failed",
      },
      { status: 500 },
    );
  }
}
