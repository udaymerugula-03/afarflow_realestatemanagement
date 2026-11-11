import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { insert } from "./database.js";

export function newAccountCredentials(admin, agent) {
  const email = z.string().trim().email().toLowerCase();
  admin = email.parse(admin);
  agent = email.parse(agent);
  if (admin === agent) {
    throw new Error("Distinct Admin and Agent account emails are required.");
  }
  return {
    note: "PRIVATE CLOUD MVP CREDENTIALS. Ignored by Git. Share each account only with its intended user.",
    admin, agent,
    admin_password: randomBytes(24).toString("base64url"),
    agent_password: randomBytes(24).toString("base64url"),
    updated_at: new Date().toISOString(),
  };
}

export async function rotateAccountPasswords(db, accounts, prepareCredentials) {
  const credentials = newAccountCredentials(accounts.admin, accounts.agent);
  const hashes = await Promise.all([credentials.admin_password, credentials.agent_password].map((password) => bcrypt.hash(password, 12)));
  return db.transaction(async (tx) => {
    const { rows } = await tx.query("SELECT id,agency_id,email,role FROM users WHERE email=$1 OR email=$2 ORDER BY id FOR UPDATE",
      [credentials.admin, credentials.agent]);
    const admin = rows.find((user) => user.email === credentials.admin && user.role === "admin");
    const agent = rows.find((user) => user.email === credentials.agent && user.role === "agent");
    if (!admin || !agent || rows.length !== 2 || admin.agency_id !== agent.agency_id) {
      throw new Error("Credential rotation requires existing Admin and Agent accounts in the same agency. No accounts were changed.");
    }
    // Prepare the private recovery file before changing the database; never log passwords.
    await prepareCredentials(credentials);
    for (const [user, hash] of [[admin, hashes[0]], [agent, hashes[1]]]) {
      await tx.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, user.id]);
      await insert(tx, "audit_logs", {
        id: randomUUID(), agency_id: user.agency_id, actor_id: null,
        action: "user.password_rotated", entity_id: user.id,
        details: { source: "administrative_cli", sessions_revoked: true },
      });
    }
    await tx.query("UPDATE sessions SET revoked=TRUE WHERE user_id=$1 OR user_id=$2", [admin.id, agent.id]);
    return credentials;
  });
}
