import { zodToJsonSchema } from "zod-to-json-schema";
import * as schemas from "./schemas.js";

const paths = {};
const models = {};
for (const name of ["login", "userCreate", "propertyCreate", "propertyPatch", "inquiry", "leadCreate", "leadPatch", "note", "visitCreate", "visitPatch", "dealCreate", "dealPatch"]) {
  models[name] = zodToJsonSchema(schemas[name], { target: "openApi3", $refStrategy: "none" });
}
function route(method, url, summary, schema, publicAccess = false, paginated = false) {
  const parameters = [];
  for (const match of url.matchAll(/\{(\w+)\}/g)) parameters.push({ name: match[1], in: "path", required: true, schema: { type: "string", format: "uuid" } });
  if (paginated) parameters.push(
    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
    { name: "page_size", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 12 } },
    { name: "q", in: "query", schema: { type: "string" } },
  );
  const operation = {
    summary, security: publicAccess ? [] : [{ bearerAuth: [] }], parameters,
    responses: { 200: { description: "Successful response" }, 201: { description: "Record created" }, 401: { description: "Sign in required" }, 403: { description: "Insufficient permission" }, 404: { description: "Record not found" }, 409: { description: "Conflicting record or schedule" }, 422: { description: "Validation error" } },
  };
  if (schema) operation.requestBody = { required: true, content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } } };
  paths[`/api/v1${url}`] ??= {};
  paths[`/api/v1${url}`][method] = operation;
}
route("post", "/auth/login", "Sign in as Admin or Agent", "login", true);
route("get", "/auth/me", "Current signed-in user");
route("post", "/auth/logout", "Revoke the current session");
route("get", "/users", "Agency staff directory");
route("post", "/users", "Admin: create an Agent", "userCreate");
route("get", "/public/properties", "Published available/reserved property search", null, true, true);
route("get", "/public/properties/{id}", "Public listing details", null, true);
route("post", "/public/inquiries", "Create a lead from a visitor inquiry", "inquiry", true);
route("get", "/properties", "Agency inventory search", null, false, true);
route("post", "/properties", "Admin: create a property", "propertyCreate");
route("get", "/properties/{id}", "Agency inventory details");
route("get", "/properties/{id}/history", "Agency-scoped property activity and status history");
route("patch", "/properties/{id}", "Admin: edit or publish/unpublish a property", "propertyPatch");
route("delete", "/properties/{id}", "Admin: archive a property");
route("post", "/properties/{id}/images", "Admin: upload a property image");
paths["/api/v1/properties/{id}/images"].post.requestBody = {
  required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } },
};
route("get", "/leads", "CRM leads visible to the current user", null, false, true);
route("post", "/leads", "Create a staff-entered lead", "leadCreate");
route("get", "/leads/{id}", "Lead details and activity");
route("patch", "/leads/{id}", "Edit contact/inquiry, stage/follow-up or Admin assignment", "leadPatch");
route("post", "/leads/{id}/activities", "Record a note", "note");
route("get", "/visits", "Agency/assigned visits");
route("post", "/visits", "Request or confirm a visit, checking agent conflicts", "visitCreate");
route("patch", "/visits/{id}", "Update visit outcome", "visitPatch");
route("get", "/deals", "Agency/assigned deals");
route("post", "/deals", "Create a linked deal from a qualified, visit-scheduled or negotiating lead", "dealCreate");
route("patch", "/deals/{id}", "Update deal stage or offer", "dealPatch");
route("get", "/reports/dashboard", "Role-scoped live dashboard counts");
for (const url of ["/api/v1/public/properties", "/api/v1/properties"]) {
  paths[url].get.parameters.push(...["city", "purpose", "type", "min_price", "max_price", "bedrooms"].map((name) => ({
    name, in: "query", schema: { type: ["min_price", "max_price", "bedrooms"].includes(name) ? "number" : "string" },
  })));
}
paths["/api/v1/leads"].get.parameters.push({ name: "stage", in: "query", schema: { type: "string", enum: schemas.stages.lead } });

export const openapi = {
  openapi: "3.0.3", info: { title: "AqarFlow REST API", version: "1.0.0", description: "Pakistan internship MVP: Admin/Agent workspace and public property inquiries. All money is in Pakistani rupees (PKR)." },
  paths, components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } }, schemas: models },
};
