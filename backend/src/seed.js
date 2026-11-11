import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { connectDatabase, insert, migrate, one } from "./database.js";
import { newAccountCredentials } from "./account-passwords.js";

const db = await connectDatabase(process.env.DATABASE_URL);
try {
  await migrate(db);
  const credentials = newAccountCredentials(process.env.ADMIN_EMAIL, process.env.AGENT_EMAIL);
  const email = credentials.admin;
  const agentEmail = credentials.agent;
  if (await one(db, "SELECT id FROM users WHERE email=$1", [email])) {
    throw new Error("Administrator already exists. Existing cloud data and credentials were preserved. Do not reseed a populated database.");
  }
  const credentialsFile = process.env.CREDENTIALS_FILE || ".demo-credentials.cloud.json";
  const [adminHash, agentHash] = await Promise.all([credentials.admin_password, credentials.agent_password].map((password) => bcrypt.hash(password, 12)));
  await db.transaction(async (tx) => {
    const agency = await insert(tx, "agencies", { id: randomUUID(), name: "VIRELEO" });
    const admin = await insert(tx, "users", {
      id: randomUUID(), agency_id: agency.id, full_name: "VIRELEO Administrator",
      email, password_hash: adminHash, role: "admin",
    });
    const agent = await insert(tx, "users", {
      id: randomUUID(), agency_id: agency.id, full_name: "VIRELEO Agent",
      email: agentEmail, password_hash: agentHash, role: "agent",
    });
    const samples = [
      { reference_code: "AF-001", title: "Contemporary family home in DHA", city: "Lahore", locality: "DHA Phase 6", type: "house", purpose: "sale", price: "42500000", area: 10, area_unit: "marla", bedrooms: 4, bathrooms: 4, images: ["/demo-media/villa.jpg"] },
      { reference_code: "AF-002", title: "Bright apartment with city views", city: "Islamabad", locality: "Bahria Town", type: "apartment", purpose: "rent", price: "85000", area: 1450, area_unit: "sq ft", bedrooms: 2, bathrooms: 2, images: ["/demo-media/apartment.jpg"] },
      { reference_code: "AF-003", title: "Corner plot in established community", city: "Karachi", locality: "Scheme 33", type: "plot", purpose: "sale", price: "18000000", area: 240, area_unit: "sq yd", bedrooms: 0, bathrooms: 0, images: ["/demo-media/plot.jpg"] },
    ];
    let first;
    for (const data of samples) {
      const property = await insert(tx, "properties", {
        id: randomUUID(), agency_id: agency.id, ...data, status: "available", published: true,
        assigned_agent_id: agent.id, currency: "PKR", address: `${data.locality}, ${data.city}, Pakistan`,
        description: "Illustrative demonstration listing, not a real property advertisement. Contact the agency to arrange a visit.",
      });
      first ||= property;
    }
    const lead = await insert(tx, "leads", {
      id: randomUUID(), agency_id: agency.id, property_id: first.id, name: "Demo Customer",
      email: "customer@example.com", phone: "+923001234567",
      message: "I would like to arrange a visit.", assigned_agent_id: agent.id,
    });
    await insert(tx, "activities", { id: randomUUID(), agency_id: agency.id, lead_id: lead.id, actor_id: admin.id, body: "Demo inquiry added." });
    await writeFile(credentialsFile, JSON.stringify(credentials, null, 2), { mode: 0o600, flag: "wx" });
  });
  console.info(`Demo data created. Admin/agent credentials are in ${credentialsFile}; keep this file private and out of Git.`);
} finally {
  await db.close();
}
