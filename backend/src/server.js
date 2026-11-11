import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createApp } from "./app.js";
import { connectDatabase, migrate } from "./database.js";

const secret = process.env.SECRET_KEY || randomBytes(48).toString("base64url");
if (!process.env.SECRET_KEY) console.info("Using a temporary LOCAL signing key. Sign in again after restarting the API.");
const db = await connectDatabase(process.env.DATABASE_URL);
await migrate(db);
const port = Number(process.env.PORT || 8000);
const app = createApp(db, {
  secret, origins: (process.env.FRONTEND_ORIGINS || "http://localhost:3000").split(",").map((item) => item.trim()),
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${port}`,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
});
const server = app.listen(port, "127.0.0.1", () => console.info(`AqarFlow Express API: http://localhost:${port} (${process.env.DATABASE_URL ? "PostgreSQL server" : "embedded PostgreSQL / PGlite"})`));
async function shutdown() {
  server.close(async () => { await db.close(); process.exit(0); });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
