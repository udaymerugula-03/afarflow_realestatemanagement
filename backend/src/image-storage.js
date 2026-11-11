import { randomUUID } from "node:crypto";
import { BlobError, put } from "@vercel/blob";

function unavailable() {
  const error = new Error("Property photo storage is unavailable. Please try again later.");
  error.status = 502;
  return error;
}

export function createImageStore(env = process.env, upload = put) {
  if (!env.BLOB_STORE_ID && !env.BLOB_READ_WRITE_TOKEN) {
    if (env.VERCEL === "1" || env.NODE_ENV === "production") throw new Error("Vercel Blob storage is required for persistent property photos in deployment.");
    return null;
  }
  return async (buffer, { agencyId, propertyId }) => {
    const options = {
      access: "public", contentType: "image/jpeg", addRandomSuffix: false,
      abortSignal: AbortSignal.timeout(20000),
      ...(env.BLOB_STORE_ID ? { storeId: env.BLOB_STORE_ID } : {}),
      ...(env.VERCEL !== "1" && env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
    };
    let result;
    try {
      result = await upload(`aqarflow/${agencyId}/${propertyId}/${randomUUID()}.jpg`, buffer, options);
    } catch (error) {
      if (error instanceof BlobError ||
          (error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name))) throw unavailable();
      throw error;
    }
    if (!result?.url || !URL.canParse(result.url)) throw unavailable();
    const image = new URL(result.url);
    if (image.protocol !== "https:" || !image.hostname.endsWith(".public.blob.vercel-storage.com") ||
        image.username || image.password || image.port) throw unavailable();
    return image.href;
  };
}
