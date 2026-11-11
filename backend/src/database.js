import pg from "pg";
import { readFile } from "node:fs/promises";

export function validateDatabaseUrl(url) {
  if (!url) throw new Error("DATABASE_URL is required; embedded database fallback has been removed.");
  if (!URL.canParse(url)) throw new Error("DATABASE_URL must be a hosted PostgreSQL connection URL.");
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname ||
      /^(localhost|.*\.localhost|127(?:\.\d+){0,3}|\[::1\]|0\.0\.0\.0)$/i.test(parsed.hostname)) {
    throw new Error("DATABASE_URL must be a hosted PostgreSQL connection URL, not a local database.");
  }
}

export async function connectDatabase(url) {
  validateDatabaseUrl(url);
  const pool = new pg.Pool({
    connectionString: url, max: process.env.VERCEL === "1" ? 2 : 10,
    connectionTimeoutMillis: 15000, idleTimeoutMillis: 10000,
    allowExitOnIdle: process.env.VERCEL === "1",
  });
  pool.on("error", (error) => console.error("PostgreSQL idle connection error", { code: error.code, message: error.message }));
  await pool.query("SELECT 1");
  const wrap = (client) => ({
    query: (sql, params = []) => client.query(sql, params),
    exec: (sql) => client.query(sql),
  });
  return {
    kind: "postgres",
    ...wrap(pool),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work(wrap(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

export async function migrate(db) {
  await db.transaction(async (tx) => {
    if (db.kind === "postgres") await tx.query("SELECT pg_advisory_xact_lock($1)", [1798901]);
    await tx.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)");
    for (const [version, filename] of [
      ["001", "001_initial.sql"], ["002", "002_india_demo.sql"], ["003", "003_real_demo_photos.sql"],
      ["004", "004_pakistan_demo.sql"],
    ]) {
      const exists = await tx.query("SELECT version FROM schema_migrations WHERE version = $1", [version]);
      if (!exists.rows.length) {
        const sql = await readFile(new URL(`../migrations/${filename}`, import.meta.url), "utf8");
        await tx.exec(sql);
        await tx.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
      }
    }
  });
}

export async function one(db, sql, params = []) {
  return (await db.query(sql, params)).rows[0] ?? null;
}

export async function insert(db, table, values) {
  // Table and column names come only from application code and strict schemas.
  const columns = Object.keys(values);
  return one(db, `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
    columns.map((key) => key === "images" || key === "details" ? JSON.stringify(values[key]) : values[key]));
}

export async function update(db, table, id, values) {
  const columns = Object.keys(values);
  if (!columns.length) return one(db, `SELECT * FROM ${table} WHERE id = $1`, [id]);
  return one(db, `UPDATE ${table} SET ${columns.map((key, i) => `${key}=$${i + 1}`).join(",")} WHERE id=$${columns.length + 1} RETURNING *`,
    [...columns.map((key) => key === "images" ? JSON.stringify(values[key]) : values[key]), id]);
}
