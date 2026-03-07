import { setClipStatus } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await setClipStatus(id, "published");
  return Response.json({ ok: true });
}
