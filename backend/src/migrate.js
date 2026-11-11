import "dotenv/config";
import { connectDatabase, migrate } from "./database.js";

const db = await connectDatabase(process.env.DATABASE_URL);
try {
  await migrate(db);
  console.info("PostgreSQL schema is up to date.");
} finally {
  await db.close();
}
