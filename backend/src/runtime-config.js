import { validateDatabaseUrl } from "./database.js";

export function loadRuntimeConfig(env = process.env) {
  const vercel = env.VERCEL === "1";
  validateDatabaseUrl(env.DATABASE_URL);
  if (!env.SECRET_KEY) throw new Error("SECRET_KEY is required for deployment.");
  if (!env.BLOB_STORE_ID && !env.BLOB_READ_WRITE_TOKEN) throw new Error("Vercel Blob storage is required for persistent property photos in deployment.");
  const secret = env.SECRET_KEY;
  if (secret.trim().length < 32) throw new Error("SECRET_KEY must contain at least 32 random characters.");
  const deploymentHost = env.VERCEL_ENV === "preview" ? env.VERCEL_URL : env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const publicApiUrl = env.PUBLIC_API_URL || (vercel && deploymentHost ? `https://${deploymentHost}` : "");
  if (!URL.canParse(publicApiUrl)) throw new Error("PUBLIC_API_URL must be an absolute origin URL.");
  const publicUrl = new URL(publicApiUrl);
  if (publicUrl.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(publicUrl.hostname) ||
      publicUrl.username || publicUrl.password || publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash) {
    throw new Error("PUBLIC_API_URL must be a hosted HTTPS origin without credentials or a path.");
  }
  const origins = env.FRONTEND_ORIGINS ? env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) : [];
  for (const origin of origins) {
    if (!URL.canParse(origin) || new URL(origin).origin !== origin || new URL(origin).protocol !== "https:") {
      throw new Error("FRONTEND_ORIGINS must contain explicit HTTPS origins without paths or wildcards.");
    }
  }
  return {
    vercel, databaseUrl: env.DATABASE_URL, secret,
    origins: [...new Set([publicUrl.origin, ...origins])],
    publicApiUrl: publicUrl.origin, maxUploadMb: 4,
  };
}
