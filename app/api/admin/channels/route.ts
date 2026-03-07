import { addChannel, readStore } from "@/lib/store";
import { buildChannelFromUrl } from "@/lib/sync";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };

    if (!body.url) {
      return Response.json({ error: "\u7f3a\u5c11\u9891\u9053 URL\u3002" }, { status: 400 });
    }

    const current = await readStore();
    const channel = buildChannelFromUrl(body.url, current.channels.length);
    await addChannel(channel);

    return Response.json({ ok: true, channel });
  } catch {
    return Response.json({ error: "\u9891\u9053 URL \u4e0d\u5408\u6cd5\u3002" }, { status: 400 });
  }
}
