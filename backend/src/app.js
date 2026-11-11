import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import swaggerUi from "swagger-ui-express";
import { insert, one, update } from "./database.js";
import * as schemas from "./schemas.js";
import { openapi } from "./openapi.js";

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const safeUser = ({ password_hash, ...user }) => user;
const publicProperty = ({ agency_id, assigned_agent_id, archived, ...property }) => property;
const isConfirmed = (stage) => ["booking", "documentation", "closed_won"].includes(stage);
const uuid = () => randomUUID();

export function createApp(db, config) {
  if (!config.secret || config.secret.length < 32) throw new Error("SECRET_KEY must contain at least 32 random characters");
  const app = express();
  app.set("trust proxy", config.trustProxy ?? false);
  const uploads = path.resolve(config.uploadDir || "uploads");
  const maxUploadMb = config.maxUploadMb ?? 5;
  const dummyHash = bcrypt.hashSync("not-a-real-user-password", 12);
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({
    origin: (origin, done) => done(null, !origin || (config.origins || ["http://localhost:3000"]).includes(origin)),
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json({ limit: "64kb" }));
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/v1/public/") && !req.path.startsWith("/media/")) res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/media", express.static(uploads, { dotfiles: "deny", index: false, fallthrough: true }));
  app.use("/demo-media", express.static(fileURLToPath(new URL("../public/demo/", import.meta.url)), { index: false, dotfiles: "deny" }));
  const propertyRecord = (property) => ({
    ...property,
    images: property.images.map((image) => image.startsWith("/demo-media/")
      ? new URL(image, config.publicApiUrl || "http://localhost:8000").href : image),
  });
  const publicRecord = (property) => publicProperty(propertyRecord(property));
  const api = express.Router();
  app.use("/api/v1", api);
  app.get("/openapi.json", (_req, res) => res.json(openapi));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  async function rateLimit(req, namespace, maximum, seconds) {
    const now = Date.now();
    const key = createHash("sha256").update(`${namespace}:${req.ip}:${Math.floor(now / (seconds * 1000))}`).digest("hex");
    const row = await db.transaction(async (tx) => {
      await tx.query("DELETE FROM rate_buckets WHERE expires_at < CURRENT_TIMESTAMP");
      return one(tx, `INSERT INTO rate_buckets(key,count,expires_at) VALUES($1,1,$2)
        ON CONFLICT(key) DO UPDATE SET count=rate_buckets.count+1 RETURNING count`, [key, new Date(now + seconds * 1000)]);
    });
    if (row.count > maximum) {
      const error = new HttpError(429, "Too many requests. Please try again later.");
      error.retryAfter = seconds;
      throw error;
    }
  }
  async function auth(req, _res, next) {
    const match = /^Bearer (.+)$/.exec(req.get("Authorization") || "");
    if (!match) fail(401, "Please sign in");
    let claims;
    try { claims = jwt.verify(match[1], config.secret, { algorithms: ["HS256"] }); }
    catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) fail(401, "Session expired. Please sign in again.");
      throw error;
    }
    if (typeof claims !== "object" || !schemas.id.safeParse(claims.sub).success || !schemas.id.safeParse(claims.jti).success) fail(401, "Invalid session");
    const session = await one(db, "SELECT * FROM sessions WHERE id=$1 AND user_id=$2 AND revoked=FALSE AND expires_at>CURRENT_TIMESTAMP", [claims.jti, claims.sub]);
    if (!session) fail(401, "Session expired. Please sign in again.");
    req.user = await one(db, "SELECT * FROM users WHERE id=$1", [claims.sub]);
    if (!req.user) fail(401, "Please sign in");
    req.sessionId = claims.jti;
    next();
  }
  function admin(req, _res, next) {
    if (req.user.role !== "admin") fail(403, "Administrator access required");
    next();
  }
  async function owned(tx, table, id, user, lock = false) {
    schemas.id.parse(id);
    let sql = `SELECT * FROM ${table} WHERE id=$1 AND agency_id=$2`;
    const params = [id, user.agency_id];
    if (table === "properties") sql += " AND archived=FALSE";
    else if (user.role === "agent") {
      sql += ` AND ${table === "leads" ? "assigned_agent_id" : "agent_id"}=$3`;
      params.push(user.id);
    }
    const row = await one(tx, sql + (lock ? " FOR UPDATE" : ""), params);
    if (!row) fail(404, "Record not found");
    return row;
  }
  async function agent(tx, id, user, lock = false) {
    const row = await one(tx, "SELECT * FROM users WHERE id=$1 AND agency_id=$2 AND role='agent'" + (lock ? " FOR UPDATE" : ""), [id, user.agency_id]);
    if (!row) fail(422, "Choose an agent from your agency");
    if (user.role === "agent" && row.id !== user.id) fail(403, "You can only manage your own assignments");
    return row;
  }
  async function audit(tx, user, action, entity_id, details = {}) {
    await insert(tx, "audit_logs", { id: uuid(), agency_id: user.agency_id, actor_id: user.id, action, entity_id, details });
  }
  async function changeProperty(tx, user, property, values, action = "property.updated") {
    const result = await update(tx, "properties", property.id, values);
    const keys = Object.keys(values).filter((key) => ["status", "published", "assigned_agent_id", "archived"].includes(key));
    await audit(tx, user, action, property.id, {
      fields: Object.keys(values),
      before: Object.fromEntries(keys.map((key) => [key, property[key]])),
      after: Object.fromEntries(keys.map((key) => [key, result[key]])),
    });
    return result;
  }
  async function activity(tx, lead, user, body) {
    return insert(tx, "activities", { id: uuid(), agency_id: lead.agency_id, lead_id: lead.id, actor_id: user?.id || null, body });
  }
  async function leadRecord(tx, row) {
    const activities = await tx.query("SELECT id,actor_id,body,created_at FROM activities WHERE agency_id=$1 AND lead_id=$2 ORDER BY created_at,id", [row.agency_id, row.id]);
    return { ...row, activities: activities.rows };
  }
  async function paginated(sql, params, paging, serializer = (row) => row) {
    const count = await one(db, `SELECT COUNT(*) AS total FROM (${sql}) AS result`, params);
    const result = await db.query(`${sql} ORDER BY created_at DESC,id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, paging.page_size, (paging.page - 1) * paging.page_size]);
    return { items: await Promise.all(result.rows.map(serializer)), total: Number(count.total), page: paging.page, page_size: paging.page_size };
  }
  const publicCondition = "published=TRUE AND archived=FALSE AND status IN ('available','reserved')";
  async function findPublic(id, tx = db) {
    schemas.id.parse(id);
    const item = await one(tx, `SELECT * FROM properties WHERE id=$1 AND ${publicCondition}`, [id]);
    if (!item) fail(404, "Property not found");
    return item;
  }
  function propertyQuery(query, user) {
    const data = schemas.propertyFilters.parse(query);
    const params = [];
    let sql = `SELECT * FROM properties WHERE ${user ? "archived=FALSE" : publicCondition}`;
    function condition(statement, value) { params.push(value); sql += ` AND ${statement.replaceAll("?", `$${params.length}`)}`; }
    if (user) condition("agency_id=?", user.agency_id);
    if (data.q) condition("(strpos(lower(title),lower(?))>0 OR strpos(lower(locality),lower(?))>0 OR strpos(lower(reference_code),lower(?))>0)", data.q);
    if (data.city) condition("lower(city)=lower(?)", data.city);
    if (data.purpose) condition("purpose=?", data.purpose);
    if (data.type) condition("type=?", data.type);
    if (data.min_price !== undefined) condition("price>=?", data.min_price);
    if (data.max_price !== undefined) condition("price<=?", data.max_price);
    if (data.bedrooms !== undefined) condition("bedrooms>=?", data.bedrooms);
    return { sql, params, data };
  }

  app.get("/health", async (_req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "PostgreSQL" });
  });
  api.post("/auth/login", async (req, res) => {
    await rateLimit(req, "login", 10, 300);
    const data = schemas.login.parse(req.body);
    const user = await one(db, "SELECT * FROM users WHERE email=$1", [data.email]);
    const valid = await bcrypt.compare(data.password, user?.password_hash || dummyHash);
    if (!valid || !user) fail(401, "Incorrect email or password");
    const session = await insert(db, "sessions", { id: uuid(), user_id: user.id, expires_at: new Date(Date.now() + 8 * 3600000) });
    res.json({
      access_token: jwt.sign({}, config.secret, { algorithm: "HS256", subject: user.id, jwtid: session.id, expiresIn: "8h" }),
      token_type: "bearer", user: safeUser(user),
    });
  });
  api.get("/auth/me", auth, (req, res) => res.json(safeUser(req.user)));
  api.post("/auth/logout", auth, async (req, res) => {
    await db.query("UPDATE sessions SET revoked=TRUE WHERE id=$1 AND user_id=$2", [req.sessionId, req.user.id]);
    res.json({ message: "Signed out" });
  });
  api.get("/users", auth, async (req, res) => {
    const users = await db.query("SELECT id,agency_id,full_name,email,role FROM users WHERE agency_id=$1 ORDER BY full_name", [req.user.agency_id]);
    res.json(users.rows);
  });
  api.post("/users", auth, admin, async (req, res) => {
    const data = schemas.userCreate.parse(req.body);
    const password_hash = await bcrypt.hash(data.password, 12);
    const user = await db.transaction(async (tx) => {
      const item = await insert(tx, "users", { id: uuid(), agency_id: req.user.agency_id, full_name: data.full_name, email: data.email, role: "agent", password_hash });
      await audit(tx, req.user, "user.created", item.id);
      return item;
    });
    res.status(201).json(safeUser(user));
  });

  api.get("/public/properties", async (req, res) => {
    const { sql, params, data } = propertyQuery(req.query);
    res.json(await paginated(sql, params, data, publicRecord));
  });
  api.get("/public/properties/:id", async (req, res) => res.json(publicRecord(await findPublic(req.params.id))));
  api.get("/properties", auth, async (req, res) => {
    const { sql, params, data } = propertyQuery(req.query, req.user);
    res.json(await paginated(sql, params, data, propertyRecord));
  });
  api.get("/properties/:id", auth, async (req, res) => res.json(propertyRecord(await owned(db, "properties", req.params.id, req.user))));
  api.get("/properties/:id/history", auth, async (req, res) => {
    await owned(db, "properties", req.params.id, req.user);
    const history = await db.query(`SELECT id,action,details,created_at,actor_id FROM audit_logs
      WHERE agency_id=$1 AND entity_id=$2 AND action LIKE 'property.%' ORDER BY created_at DESC,id DESC`,
    [req.user.agency_id, req.params.id]);
    res.json(history.rows);
  });
  api.post("/properties", auth, admin, async (req, res) => {
    const data = schemas.propertyCreate.parse(req.body);
    const item = await db.transaction(async (tx) => {
      if (data.assigned_agent_id) await agent(tx, data.assigned_agent_id, req.user);
      const property = await insert(tx, "properties", { id: uuid(), agency_id: req.user.agency_id, ...data });
      await audit(tx, req.user, "property.created", property.id, {
        after: { status: property.status, published: property.published, assigned_agent_id: property.assigned_agent_id },
      });
      return property;
    });
    res.status(201).json(propertyRecord(item));
  });
  api.patch("/properties/:id", auth, admin, async (req, res) => {
    const data = schemas.propertyPatch.parse(req.body);
    const item = await db.transaction(async (tx) => {
      const before = await owned(tx, "properties", req.params.id, req.user, true);
      if (data.assigned_agent_id) await agent(tx, data.assigned_agent_id, req.user);
      return changeProperty(tx, req.user, before, data);
    });
    res.json(propertyRecord(item));
  });
  api.delete("/properties/:id", auth, admin, async (req, res) => {
    await db.transaction(async (tx) => {
      const property = await owned(tx, "properties", req.params.id, req.user, true);
      const active = await one(tx, "SELECT id FROM deals WHERE property_id=$1 AND stage NOT IN ('closed_won','closed_lost') LIMIT 1", [req.params.id]);
      if (active) fail(409, "Close this property's open deals before archiving it");
      await changeProperty(tx, req.user, property, { archived: true, published: false }, "property.archived");
    });
    res.json({ message: "Property archived" });
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxUploadMb * 1024 * 1024, files: 1 } });
  api.post("/properties/:id/images", auth, admin, upload.single("file"), async (req, res) => {
    await owned(db, "properties", req.params.id, req.user);
    if (!req.file) fail(422, "Select a JPEG, PNG or WebP image");
    let content;
    try {
      const image = sharp(req.file.buffer, { limitInputPixels: 25_000_000, animated: false });
      const metadata = await image.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format)) fail(422, "Use a JPEG, PNG or WebP image");
      content = await image.rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(422, "Invalid image: use JPEG, PNG or WebP up to 25 megapixels");
    }
    const item = await db.transaction(async (tx) => {
      const property = await owned(tx, "properties", req.params.id, req.user, true);
      if (property.images.length >= 10) fail(422, "A maximum of 10 images is allowed");
      let url;
      if (config.storeImage) {
        url = await config.storeImage(content, { agencyId: req.user.agency_id, propertyId: property.id });
      } else {
        await mkdir(uploads, { recursive: true });
        const filename = `${uuid()}.jpg`;
        await writeFile(path.join(uploads, filename), content, { flag: "wx" });
        url = `${(config.publicApiUrl || "http://localhost:8000").replace(/\/$/, "")}/media/${filename}`;
      }
      const result = await update(tx, "properties", property.id, { images: [...property.images, url] });
      await audit(tx, req.user, "property.image_uploaded", result.id);
      return result;
    });
    res.json(propertyRecord(item));
  });

  api.post("/public/inquiries", async (req, res) => {
    await rateLimit(req, "inquiry", 10, 600);
    const { consent, website, ...data } = schemas.inquiry.parse(req.body);
    const item = await db.transaction(async (tx) => {
      const property = await findPublic(data.property_id, tx);
      const lead = await insert(tx, "leads", { id: uuid(), agency_id: property.agency_id, ...data, assigned_agent_id: property.assigned_agent_id });
      await activity(tx, lead, null, "Public inquiry received; visitor consent recorded.");
      return lead;
    });
    res.status(201).json({ id: item.id, message: "Your inquiry has been sent to the agency." });
  });
  api.get("/leads", auth, async (req, res) => {
    const paging = schemas.pagination.parse(req.query);
    const query = z.object({ q: z.string().max(200).default(""), stage: z.string().max(30).default("") }).parse(req.query);
    let sql = "SELECT * FROM leads WHERE agency_id=$1";
    const params = [req.user.agency_id];
    if (req.user.role === "agent") { params.push(req.user.id); sql += ` AND assigned_agent_id=$${params.length}`; }
    if (query.stage) { params.push(query.stage); sql += ` AND stage=$${params.length}`; }
    if (query.q) { params.push(query.q); sql += ` AND (strpos(lower(name),lower($${params.length}))>0 OR strpos(lower(email),lower($${params.length}))>0 OR strpos(phone,$${params.length})>0)`; }
    res.json(await paginated(sql, params, paging, (row) => leadRecord(db, row)));
  });
  api.post("/leads", auth, async (req, res) => {
    const { consent, website, ...data } = schemas.leadCreate.parse(req.body);
    const item = await db.transaction(async (tx) => {
      await owned(tx, "properties", data.property_id, req.user);
      if (req.user.role === "agent") data.assigned_agent_id = req.user.id;
      if (data.assigned_agent_id) await agent(tx, data.assigned_agent_id, req.user);
      const lead = await insert(tx, "leads", { id: uuid(), agency_id: req.user.agency_id, ...data });
      await audit(tx, req.user, "lead.created", lead.id);
      return leadRecord(tx, lead);
    });
    res.status(201).json(item);
  });
  api.get("/leads/:id", auth, async (req, res) => res.json(await leadRecord(db, await owned(db, "leads", req.params.id, req.user))));
  api.patch("/leads/:id", auth, async (req, res) => {
    const data = schemas.leadPatch.parse(req.body);
    const item = await db.transaction(async (tx) => {
      await owned(tx, "leads", req.params.id, req.user, true);
      if (Object.hasOwn(data, "assigned_agent_id")) {
        if (req.user.role !== "admin") fail(403, "Only administrators can reassign leads");
        if (data.assigned_agent_id) await agent(tx, data.assigned_agent_id, req.user);
      }
      const lead = await update(tx, "leads", req.params.id, data);
      const contactFields = ["name", "email", "phone", "message"];
      const changes = Object.entries(data).filter(([key]) => !contactFields.includes(key)).map(([key, value]) => `${key}: ${value}`);
      if (contactFields.some((key) => Object.hasOwn(data, key))) changes.unshift("Contact and inquiry details");
      await activity(tx, lead, req.user, "Updated " + changes.join(", "));
      await audit(tx, req.user, "lead.updated", lead.id, { fields: Object.keys(data) });
      return leadRecord(tx, lead);
    });
    res.json(item);
  });
  api.post("/leads/:id/activities", auth, async (req, res) => {
    const data = schemas.note.parse(req.body);
    const lead = await owned(db, "leads", req.params.id, req.user);
    res.status(201).json(await activity(db, lead, req.user, data.body));
  });

  async function linked(tx, data, user) {
    const property = await owned(tx, "properties", data.property_id, user, true);
    if (!["available", "reserved"].includes(property.status)) fail(409, "Visits and deals require an available or reserved property");
    const lead = await owned(tx, "leads", data.lead_id, user);
    await agent(tx, data.agent_id, user, true);
    if (lead.property_id !== property.id) fail(422, "The lead must belong to the selected property");
    if (lead.assigned_agent_id !== data.agent_id) fail(422, "Choose the agent assigned to the lead");
    return { property, lead };
  }
  async function visitConflict(tx, item, excludeId = null) {
    const match = await one(tx, `SELECT id FROM visits WHERE agency_id=$1 AND agent_id=$2
      AND status IN ('requested','confirmed') AND starts_at<$3 AND ends_at>$4
      AND ($5::uuid IS NULL OR id<>$5::uuid) LIMIT 1`, [item.agency_id, item.agent_id, item.ends_at, item.starts_at, excludeId]);
    if (match) fail(409, "This agent already has a visit during that time");
  }
  async function listAssigned(req, table, order) {
    const params = [req.user.agency_id];
    const restriction = req.user.role === "agent" ? " AND agent_id=$2" : "";
    if (restriction) params.push(req.user.id);
    return (await db.query(`SELECT * FROM ${table} WHERE agency_id=$1${restriction} ORDER BY ${order} LIMIT 500`, params)).rows;
  }
  api.get("/visits", auth, async (req, res) => res.json(await listAssigned(req, "visits", "starts_at,id")));
  api.post("/visits", auth, async (req, res) => {
    const data = schemas.visitCreate.parse(req.body);
    const item = await db.transaction(async (tx) => {
      const { lead } = await linked(tx, data, req.user);
      await visitConflict(tx, { ...data, agency_id: req.user.agency_id });
      const visit = await insert(tx, "visits", { id: uuid(), agency_id: req.user.agency_id, ...data });
      await update(tx, "leads", lead.id, { stage: "visit_scheduled" });
      await activity(tx, lead, req.user, `Visit scheduled for ${data.starts_at}`);
      await audit(tx, req.user, "visit.created", visit.id);
      return visit;
    });
    res.status(201).json(item);
  });
  api.patch("/visits/:id", auth, async (req, res) => {
    const data = schemas.visitPatch.parse(req.body);
    const item = await db.transaction(async (tx) => {
      const visit = await owned(tx, "visits", req.params.id, req.user, true);
      await agent(tx, visit.agent_id, req.user, true);
      if (["requested", "confirmed"].includes(data.status)) await visitConflict(tx, visit, visit.id);
      const result = await update(tx, "visits", visit.id, data);
      await activity(tx, { id: visit.lead_id, agency_id: req.user.agency_id }, req.user, `Visit status: ${result.status}`);
      await audit(tx, req.user, "visit.updated", visit.id, { status: result.status });
      return result;
    });
    res.json(item);
  });
  async function dealConflict(tx, propertyId, stage, excludeId = null) {
    if (!isConfirmed(stage)) return;
    const found = await one(tx, `SELECT id FROM deals WHERE property_id=$1 AND stage IN ('booking','documentation','closed_won')
      AND ($2::uuid IS NULL OR id<>$2::uuid) LIMIT 1`, [propertyId, excludeId]);
    if (found) fail(409, "This property already has a confirmed booking or closed deal");
  }
  function qualifiedLead(lead) {
    if (!["qualified", "visit_scheduled", "negotiation"].includes(lead.stage)) fail(409, "Qualify this lead before creating or confirming a deal");
  }
  async function dealEffect(tx, item, property, user, oldStage = null) {
    if (item.stage === "closed_won" && oldStage !== "closed_won") {
      await changeProperty(tx, user, property, { status: property.purpose === "sale" ? "sold" : "rented", published: false });
      await update(tx, "leads", item.lead_id, { stage: "converted" });
    } else if (["booking", "documentation"].includes(item.stage) && property.status !== "reserved") {
      await changeProperty(tx, user, property, { status: "reserved" });
    } else if (!isConfirmed(item.stage) && ["booking", "documentation"].includes(oldStage) && property.status === "reserved") {
      await changeProperty(tx, user, property, { status: "available" });
    }
    await activity(tx, { id: item.lead_id, agency_id: user.agency_id }, user, `Deal stage: ${item.stage}`);
    await audit(tx, user, "deal.updated", item.id, { old_stage: oldStage, stage: item.stage });
  }
  api.get("/deals", auth, async (req, res) => res.json(await listAssigned(req, "deals", "created_at DESC,id")));
  api.post("/deals", auth, async (req, res) => {
    const data = schemas.dealCreate.parse(req.body);
    const item = await db.transaction(async (tx) => {
      const { property, lead } = await linked(tx, data, req.user);
      qualifiedLead(lead);
      await dealConflict(tx, property.id, data.stage);
      const result = await insert(tx, "deals", { id: uuid(), agency_id: req.user.agency_id, ...data });
      await dealEffect(tx, result, property, req.user);
      return result;
    });
    res.status(201).json(item);
  });
  api.patch("/deals/:id", auth, async (req, res) => {
    const data = schemas.dealPatch.parse(req.body);
    const item = await db.transaction(async (tx) => {
      const deal = await owned(tx, "deals", req.params.id, req.user, true);
      const property = await owned(tx, "properties", deal.property_id, req.user, true);
      if (deal.stage === "closed_won" && data.stage && data.stage !== "closed_won") fail(409, "Closed won deals cannot be reopened in the MVP");
      if (data.stage && data.stage !== deal.stage && isConfirmed(data.stage)) {
        qualifiedLead(await owned(tx, "leads", deal.lead_id, req.user));
      }
      await dealConflict(tx, property.id, data.stage || deal.stage, deal.id);
      const result = await update(tx, "deals", deal.id, data);
      await dealEffect(tx, result, property, req.user, deal.stage);
      return result;
    });
    res.json(item);
  });
  api.get("/reports/dashboard", auth, async (req, res) => {
    async function count(table, condition = "TRUE") {
      const params = [req.user.agency_id];
      let where = `agency_id=$1 AND ${condition}`;
      if (req.user.role === "agent" && ["leads", "visits", "deals"].includes(table)) {
        params.push(req.user.id);
        where += ` AND ${table === "leads" ? "assigned_agent_id" : "agent_id"}=$2`;
      }
      return Number((await one(db, `SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`, params)).total);
    }
    const [published_properties, available_properties, new_leads, total_leads, upcoming_visits, open_deals] = await Promise.all([
      count("properties", publicCondition), count("properties", "archived=FALSE AND status='available'"),
      count("leads", "stage='new'"), count("leads"),
      count("visits", "starts_at>=CURRENT_TIMESTAMP AND status IN ('requested','confirmed')"),
      count("deals", "stage NOT IN ('closed_won','closed_lost')"),
    ]);
    res.json({ published_properties, available_properties, new_leads, total_leads, upcoming_visits, open_deals });
  });

  app.use((_req, _res, next) => next(new HttpError(404, "Route not found")));
  app.use((error, req, res, _next) => {
    if (error instanceof z.ZodError) return res.status(422).json({ detail: error.issues.map((issue) => ({ loc: ["body", ...issue.path], msg: issue.message })) });
    if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 422).json({ detail: `Upload one image of at most ${maxUploadMb} MB` });
    if (error.code === "23505") return res.status(409).json({ detail: "A record with these unique values already exists" });
    if (error.code === "23503" || error.code === "23514") return res.status(422).json({ detail: "Invalid linked record or field value" });
    if (error.type === "entity.parse.failed") return res.status(400).json({ detail: "Invalid JSON request body" });
    if (error.type === "entity.too.large") return res.status(413).json({ detail: "Request body is too large" });
    if (error.status) {
      if (error.status === 401) res.set("WWW-Authenticate", "Bearer");
      if (error.status === 429) res.set("Retry-After", String(error.retryAfter));
      return res.status(error.status).json({ detail: error.message });
    }
    console.error("API request failed", { method: req.method, path: req.path, error });
    res.status(500).json({ detail: "Unexpected server error. Please try again." });
  });
  return app;
}
