import { isReadOnlyPreview, readOnlyPreviewResponse } from "@/lib/preview-mode";
import { setClipStatus } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  if (isReadOnlyPreview()) {
    return readOnlyPreviewResponse();
  }

  const { id } = await context.params;
  await setClipStatus(id, "archived");
  return Response.json({ ok: true });
}
