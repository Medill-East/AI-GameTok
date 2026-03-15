const WRITE_DISABLED_MESSAGE =
  "当前环境为只读模式。后台写入、同步和重建类操作只在内部运营环境开放。";

const INTERNAL_ONLY_MESSAGE =
  "当前接口只在 GameTok 内部运营环境开放。";

export function isInternalAdminEnabled() {
  if (process.env.GAMETOK_INTERNAL_ADMIN === "1") {
    return true;
  }

  if (process.env.GAMETOK_INTERNAL_ADMIN === "0") {
    return false;
  }

  return process.env.NODE_ENV === "development";
}

export function isReadOnlyPreview() {
  if (process.env.GAMETOK_READ_ONLY_PREVIEW === "1") {
    return true;
  }

  if (process.env.GAMETOK_READ_ONLY_PREVIEW === "0") {
    return false;
  }

  if (isInternalAdminEnabled()) {
    return false;
  }

  return process.env.VERCEL === "1" && process.env.NODE_ENV !== "development";
}

export function canWriteCatalog() {
  return isInternalAdminEnabled() && !isReadOnlyPreview();
}

export function getReadOnlyPreviewMessage() {
  return WRITE_DISABLED_MESSAGE;
}

export function readOnlyPreviewResponse() {
  return Response.json(
    {
      ok: false,
      error: WRITE_DISABLED_MESSAGE,
    },
    { status: 403 },
  );
}

export function internalOnlyResponse() {
  return Response.json(
    {
      ok: false,
      error: INTERNAL_ONLY_MESSAGE,
    },
    { status: 403 },
  );
}

export function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");

  return authHeader === `Bearer ${secret}`;
}
