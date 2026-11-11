import { randomBytes } from "node:crypto";

export function loadRuntimeConfig(env = process.env) {
  const vercel = env.VERCEL === "1";
  const production = vercel || env.NODE_ENV === "production";
  if (production && !env.DATABASE_URL) throw new Error("DATABASE_URL is required for deployment; local PGlite cannot be used in the cloud.");
  if (production && !env.SECRET_KEY) throw new Error("SECRET_KEY is required for deployment.");
  if (production && !env.BLOB_STORE_ID && !env.BLOB_READ_WRITE_TOKEN) throw new Error("Vercel Blob storage is required for persistent property photos in deployment.");
  if (env.DATABASE_URL && (!URL.canParse(env.DATABASE_URL) || !["postgres:", "postgresql:"].includes(new URL(env.DATABASE_URL).protocol))) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  }
  const secret = env.SECRET_KEY || randomBytes(48).toString("base64url");
  if (secret.trim().length < 32) throw new Error("SECRET_KEY must contain at least 32 random characters.");
  const port = Number(env.PORT || 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535.");
  const deploymentHost = env.VERCEL_ENV === "preview" ? env.VERCEL_URL : env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const publicApiUrl = env.PUBLIC_API_URL || (vercel && deploymentHost ? `https://${deploymentHost}` : `http://localhost:${port}`);
  if (!URL.canParse(publicApiUrl)) throw new Error("PUBLIC_API_URL must be an absolute origin URL.");
  const publicUrl = new URL(publicApiUrl);
  if (!["http:", "https:"].includes(publicUrl.protocol) || (production && publicUrl.protocol !== "https:") ||
      publicUrl.username || publicUrl.password || publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash) {
    throw new Error("PUBLIC_API_URL must be an HTTP origin without credentials or a path, and must use HTTPS in deployment.");
  }
  const origins = env.FRONTEND_ORIGINS ? env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) : ["http://localhost:3000"];
  for (const origin of origins) {
    if (!URL.canParse(origin) || new URL(origin).origin !== origin || !["http:", "https:"].includes(new URL(origin).protocol)) {
      throw new Error("FRONTEND_ORIGINS must contain explicit HTTP origins without paths or wildcards.");
    }
  }
  return {
    vercel, databaseUrl: env.DATABASE_URL, secret, temporarySecret: !env.SECRET_KEY,
    port, host: env.HOST || "127.0.0.1",
    origins: [...new Set([publicUrl.origin, ...origins])],
    publicApiUrl: publicUrl.origin, uploadDir: env.UPLOAD_DIR || "uploads",
    maxUploadMb: vercel ? 4 : 5,
  };
}
