import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase, migrate } from "./database.js";
import { loadRuntimeConfig } from "./runtime-config.js";
import { createImageStore } from "./image-storage.js";

const config = loadRuntimeConfig();
const storeImage = createImageStore();
if (config.temporarySecret) console.info("Using a temporary LOCAL signing key. Sign in again after restarting the API.");
const db = await connectDatabase(config.databaseUrl);
await migrate(db);
const app = createApp(db, {
  ...config, storeImage, trustProxy: config.vercel ? 1 : false,
});
export default app;
if (!config.vercel) {
  const server = app.listen(config.port, config.host, () => console.info(`AqarFlow Express API: http://localhost:${config.port} (${config.databaseUrl ? "PostgreSQL server" : "embedded PostgreSQL / PGlite"})`));
  const shutdown = () => server.close(async () => { await db.close(); process.exit(0); });
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
