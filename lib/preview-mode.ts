const READ_ONLY_MESSAGE =
  "当前线上预览版为只读模式。后台写入、同步和重建类操作已在线上禁用。";

export function isReadOnlyPreview() {
  if (process.env.GAMETOK_READ_ONLY_PREVIEW === "0") {
    return false;
  }

  if (process.env.GAMETOK_READ_ONLY_PREVIEW === "1") {
    return true;
  }

  return process.env.VERCEL === "1" && process.env.NODE_ENV !== "development";
}

export function getReadOnlyPreviewMessage() {
  return READ_ONLY_MESSAGE;
}

export function readOnlyPreviewResponse() {
  return Response.json(
    {
      ok: false,
      error: READ_ONLY_MESSAGE,
    },
    { status: 403 },
  );
}
