import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { readFile } from "node:fs/promises";

export async function connectDatabase(url, directory = process.env.PGLITE_DIR || "./.data") {
  if (url) {
    const pool = new pg.Pool({ connectionString: url, max: 10 });
    await pool.query("SELECT 1");
    const wrap = (client) => ({
      query: (sql, params = []) => client.query(sql, params),
      exec: (sql) => client.query(sql),
    });
    return {
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
  const instance = new PGlite(directory);
  await instance.waitReady;
  const wrap = (client) => ({
    query: (sql, params = []) => client.query(sql, params),
    exec: (sql) => client.exec(sql),
  });
  return {
    ...wrap(instance),
    transaction: (work) => instance.transaction((tx) => work(wrap(tx))),
    close: () => instance.close(),
  };
}

export async function migrate(db) {
  await db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  await db.transaction(async (tx) => {
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
