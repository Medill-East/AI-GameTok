import { canWriteCatalog, readOnlyPreviewResponse } from "@/lib/preview-mode";

const YOUTUBE_OAUTH_SCOPE = [
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

export async function POST() {
  if (!canWriteCatalog()) {
    return readOnlyPreviewResponse();
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return Response.json(
      {
        error:
          "Missing YOUTUBE_CLIENT_ID or YOUTUBE_REDIRECT_URI. Configure env vars to enable authorized-channel analytics.",
      },
      { status: 501 },
    );
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", YOUTUBE_OAUTH_SCOPE);

  return Response.json({ ok: true, authUrl: url.toString() });
}
