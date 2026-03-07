import { patchClip } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    startSec?: number;
    endSec?: number;
    zhTitle?: string;
    zhSummary?: string;
    zhTakeaways?: string[];
    tags?: string[];
    score?: number;
    confidence?: number;
    editorPick?: boolean;
    channelSlug?: "market" | "breakdown" | "dev_design" | "documentary" | "ai_tools";
  };

  await patchClip(id, body);
  return Response.json({ ok: true });
}
