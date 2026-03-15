import { runCatalogSync } from "@/lib/catalog-sync";
import { canWriteCatalog, readOnlyPreviewResponse } from "@/lib/preview-mode";

export async function POST() {
  if (!canWriteCatalog()) {
    return readOnlyPreviewResponse();
  }

  try {
    const summary = await runCatalogSync("manual", 48);
    return Response.json({ ok: true, summary });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}
