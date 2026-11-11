import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { connectDatabase } from "./database.js";
import { rotateAccountPasswords } from "./account-passwords.js";

const credentialsFile = path.resolve(process.env.CREDENTIALS_FILE || ".demo-credentials.cloud.json");
const pendingFile = credentialsFile.replace(/\.json$/, "") + ".pending.json";
const accounts = JSON.parse(await readFile(credentialsFile, "utf8"));
const db = await connectDatabase(process.env.DATABASE_URL);
try {
  await rotateAccountPasswords(db, accounts, async (credentials) => {
    await writeFile(pendingFile, JSON.stringify(credentials, null, 2), { mode: 0o600, flag: "wx" });
    console.info(`Private replacement credentials prepared at ${pendingFile}. Retain this file if finalization fails.`);
  });
  await rename(pendingFile, credentialsFile);
  console.info(`Separate Admin/Agent passwords saved privately to ${credentialsFile}. Existing sessions for both accounts were revoked.`);
} finally {
  await db.close();
}
