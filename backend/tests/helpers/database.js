import { PGlite } from "@electric-sql/pglite";

export async function connectTestDatabase(directory = "memory://") {
  const instance = new PGlite(directory);
  await instance.waitReady;
  const wrap = (client) => ({
    query: (sql, params = []) => client.query(sql, params),
    exec: (sql) => client.exec(sql),
  });
  return {
    kind: "pglite",
    ...wrap(instance),
    transaction: (work) => instance.transaction((tx) => work(wrap(tx))),
    close: () => instance.close(),
  };
}
