import { createApp } from "./app.js";
import { connectDatabase, migrate } from "./database.js";
import { loadRuntimeConfig } from "./runtime-config.js";
import { createImageStore } from "./image-storage.js";

const config = loadRuntimeConfig();
const storeImage = createImageStore();
const db = await connectDatabase(config.databaseUrl);
await migrate(db);
const app = createApp(db, {
  ...config, storeImage, trustProxy: config.vercel ? 1 : false,
});
export default app;
