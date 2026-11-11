import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { connectDatabase, insert, migrate, one } from "./database.js";

const db = await connectDatabase(process.env.DATABASE_URL);
try {
  await migrate(db);
  const email = process.env.DEMO_ADMIN_EMAIL || "admin@vireleo.local";
  if (await one(db, "SELECT id FROM users WHERE email=$1", [email])) {
    throw new Error("Demo administrator already exists. Existing data was preserved. See .demo-credentials.json for the generated local login.");
  }
  const password = process.env.DEMO_PASSWORD || randomBytes(18).toString("base64url");
  if (password.length < 12 || Buffer.byteLength(password) > 72) throw new Error("DEMO_PASSWORD must contain 12+ characters and at most 72 UTF-8 bytes");
  const password_hash = await bcrypt.hash(password, 12);
  await db.transaction(async (tx) => {
    const agency = await insert(tx, "agencies", { id: randomUUID(), name: "VIRELEO" });
    const admin = await insert(tx, "users", {
      id: randomUUID(), agency_id: agency.id, full_name: "VIRELEO Administrator",
      email, password_hash, role: "admin",
    });
    const agent = await insert(tx, "users", {
      id: randomUUID(), agency_id: agency.id, full_name: "VIRELEO Agent",
      email: "agent@vireleo.local", password_hash, role: "agent",
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
    await writeFile(".demo-credentials.json", JSON.stringify({
      note: "LOCAL DEMO ONLY. Ignored by Git. Never reuse this password for real accounts.",
      admin: email, agent: "agent@vireleo.local", password,
    }, null, 2), { mode: 0o600, flag: "wx" });
  });
  console.info("Demo data created. Local admin/agent credentials are in backend\\.demo-credentials.json (ignored by Git).");
} finally {
  await db.close();
}
