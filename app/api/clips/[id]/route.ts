import { getClipById } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const clip = await getClipById(id);

  if (!clip) {
    return Response.json({ error: "Clip not found" }, { status: 404 });
  }

  return Response.json(clip);
}
