import { spawnSync } from "node:child_process";
import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.env.npm_execpath) throw new Error("Run this build through npm run build.");
const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", "build", "--prefix", "frontend"], {
  cwd: root,
  env: { ...process.env, VITE_API_URL: "/api/v1", VITE_MAX_IMAGE_MB: "4" },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await cp(new URL("../backend/public/demo/", import.meta.url), new URL("../frontend/dist/demo-media/", import.meta.url), { recursive: true });
