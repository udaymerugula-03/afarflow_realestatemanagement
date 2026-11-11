import { expect, test, type Locator, type Page } from "@playwright/test";

const email = process.env.AQARFLOW_TEST_EMAIL;
const password = process.env.AQARFLOW_TEST_PASSWORD;
const agentEmail = process.env.AQARFLOW_TEST_AGENT_EMAIL;
const apiURL = (process.env.FRONTEND_TEST_API_URL || process.env.VITE_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

function field(root: Page | Locator, name: string) {
  return root.locator(`input[name="${name}"],select[name="${name}"],textarea[name="${name}"]`);
}

async function login(page: Page, account: string) {
  await page.goto("/login");
  await page.getByLabel("Work email", { exact: true }).fill(account);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.locator(".stats-grid .stat-card")).toHaveCount(6);
}

async function logout(page: Page) {
  const token = await page.evaluate(() => sessionStorage.getItem("aqarflow.access_token"));
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem("aqarflow.access_token"))).toBeNull();
  const response = await page.request.get(`${apiURL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  expect(response.status()).toBe(401);
}

function localDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

async function selectLead(page: Page, leadId: string, propertyId: string, agentId: string) {
  const form = page.locator(".workspace-main > form.panel");
  await form.getByRole("combobox", { name: "Lead", exact: true }).selectOption(leadId);
  await expect(field(form, "property_id")).toHaveValue(propertyId);
  await expect(field(form, "agent_id")).toHaveValue(agentId);
  await expect(field(form, "property_id").locator("option")).toHaveCount(2);
  await expect(field(form, "agent_id").locator("option")).toHaveCount(2);
  return form;
}

test("marketplace → property → CRM → visit conflict → closed deal, with role-aware access", async ({ page }) => {
  test.skip(!email || !password, "Set AQARFLOW_TEST_EMAIL and AQARFLOW_TEST_PASSWORD for a seeded local test agency.");
  let propertyId: string | undefined;
  let agentId = "";
  let leadId = "";
  let leadHref = "";
  let adminToken = "";
  const unique = Date.now();
  const followUp = new Date(Date.now() + 86400000);
  followUp.setMinutes(0, 0, 0);
  const startsAt = localDate(new Date(followUp.getTime() + 3600000));
  const endsAt = localDate(new Date(followUp.getTime() + 7200000));
  const leadName = `Playwright lead ${unique}`;

  try {
    await test.step("public listing filters and a real consent-based inquiry", async () => {
      await page.goto("/properties");
      await page.getByText("More filters", { exact: true }).click();
      await page.getByRole("combobox", { name: "Property type", exact: true }).selectOption("house");
      await page.getByRole("button", { name: "Find a property" }).click();
      const property = page.locator(".property-card").first();
      await expect(property).toBeVisible();
      await expect(property.locator(".eyebrow")).toContainText(/house/i);
      await property.click();
      const form = page.locator(".inquiry-panel form");
      await form.getByLabel("Your name", { exact: true }).fill("Playwright Visitor");
      await form.getByLabel("Email", { exact: true }).fill("playwright-visitor@example.com");
      await form.getByLabel("Phone", { exact: true }).fill("+923001234567");
      await form.getByRole("textbox", { name: "Your message", exact: true }).fill("Local frontend end-to-end inquiry verification.");
      await form.getByRole("checkbox").check();
      await form.getByRole("button", { name: "Send inquiry" }).click();
      await expect(form.locator(".success")).toContainText(/inquiry/i);
    });

    await test.step("administrator login uses session storage, not local storage", async () => {
      await login(page, email!);
      adminToken = await page.evaluate(() => sessionStorage.getItem("aqarflow.access_token") || "");
      expect(adminToken).not.toBe("");
      expect(await page.evaluate(() => localStorage.getItem("aqarflow.access_token"))).toBeNull();
    });

    await test.step("create, publish, and edit a property using the real API", async () => {
      await page.goto("/workspace/properties/new");
      const form = page.locator("form.panel");
      await field(form, "title").fill("Playwright integration home");
      await field(form, "reference_code").fill(`E2E-${unique}`);
      await field(form, "price").fill("15000000.00");
      await field(form, "area").fill("5");
      await field(form, "bedrooms").fill("3");
      await field(form, "bathrooms").fill("2");
      await field(form, "city").fill("Lahore");
      await field(form, "locality").fill("Test locality");
      await field(form, "address").fill("Local integration test address");
      await field(form, "description").fill("Local browser validation listing, archived after the test.");
      await field(form, "status").selectOption("available");
      await field(form, "published").check();
      await expect(field(form, "assigned_agent_id").locator("option")).not.toHaveCount(1);
      if (agentEmail) {
        const users = await page.request.get(`${apiURL}/users`, { headers: { Authorization: `Bearer ${adminToken}` } });
        const user = (await users.json() as { id: string; email: string; role: string }[]).find((item) => item.email === agentEmail && item.role === "agent");
        expect(user, "The configured agent must belong to the admin's agency").toBeTruthy();
        agentId = user!.id;
      } else {
        agentId = (await field(form, "assigned_agent_id").locator("option").nth(1).getAttribute("value"))!;
      }
      await field(form, "assigned_agent_id").selectOption(agentId);
      await form.getByRole("button", { name: "Create property", exact: true }).click();
      await expect(page).toHaveURL(/\/workspace\/properties\/(?!new)[^/]+$/);
      propertyId = new URL(page.url()).pathname.split("/").pop()!;
      await expect(page.locator('input[type="file"]')).toBeVisible();
      await expect(page.locator(".property-history")).toContainText("Property created");
      await field(form, "title").fill("Updated Playwright home");
      await field(form, "published").uncheck();
      await field(form, "status").selectOption("reserved");
      const saved = page.waitForResponse((response) => response.url().endsWith(`/properties/${propertyId}`) && response.request().method() === "PATCH");
      await form.getByRole("button", { name: "Save property", exact: true }).click();
      expect((await saved).ok()).toBe(true);
      await expect(page.locator(".workspace-heading h1")).toHaveText("Edit property");
      await expect(field(form, "title")).toHaveValue("Updated Playwright home");
      await expect(field(form, "assigned_agent_id")).toHaveValue(agentId);
      await expect(page.locator(".property-history")).toContainText("Status: Available to Reserved");
      await expect(page.locator(".property-history")).toContainText("Publication: Published to Unpublished");
      await field(form, "status").selectOption("available");
      await form.getByRole("button", { name: "Save property", exact: true }).click();
      await expect(page.locator(".property-history")).toContainText("Status: Reserved to Available");
    });

    await test.step("upload a real PNG and display the backend-hosted image", async () => {
      const image = await page.evaluate(async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 2; canvas.height = 2;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#132e3b"; context.fillRect(0, 0, 2, 2);
        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((result) => resolve(result!), "image/png"));
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      });
      await page.locator('input[type="file"]').setInputFiles({ name: "test-home.png", mimeType: "image/png", buffer: Buffer.from(image) });
      await page.getByRole("button", { name: "Upload photo", exact: true }).click();
      const photo = page.locator(".image-grid img");
      await expect(photo).toHaveCount(1);
      await expect.poll(() => photo.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await expect(page.locator(".property-history")).toContainText("Property photo uploaded");
      await field(page, "published").check();
      const saved = page.waitForResponse((response) => response.url().endsWith(`/properties/${propertyId}`) && response.request().method() === "PATCH");
      await page.getByRole("button", { name: "Save property", exact: true }).click();
      expect((await saved).ok()).toBe(true);
      await expect(field(page, "published")).toBeChecked();
    });

    await test.step("create and assign a lead, add a note, set stage and follow-up", async () => {
      await page.goto("/workspace/leads");
      await page.getByRole("button", { name: "+ Add lead", exact: true }).click();
      const form = page.locator(".workspace-main > form.panel");
      await field(form, "name").fill(leadName);
      await field(form, "email").fill("playwright-lead@example.com");
      await field(form, "phone").fill("+923001234567");
      await field(form, "property_id").selectOption(propertyId!);
      await field(form, "assigned_agent_id").selectOption(agentId);
      await field(form, "message").fill("End-to-end frontend workflow verification.");
      await form.getByRole("button", { name: "Create lead", exact: true }).click();
      const row = page.getByRole("row").filter({ hasText: leadName });
      leadHref = (await row.getByRole("link", { name: "Open" }).getAttribute("href"))!;
      leadId = leadHref.split("/").pop()!;
      await row.getByRole("link", { name: "Open" }).click();
      await page.getByRole("button", { name: "Edit contact details", exact: true }).click();
      const contactForm = page.getByRole("form", { name: "Edit contact and inquiry", exact: true });
      await field(contactForm, "name").fill("A");
      expect(await field(contactForm, "name").evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(false);
      await field(contactForm, "name").fill(`${leadName} updated`);
      await field(contactForm, "email").fill("UPDATED.LEAD@example.com");
      await field(contactForm, "phone").fill("+92 300 1234567");
      await field(contactForm, "message").fill("Updated contact and inquiry details from the MVP screen.");
      await contactForm.getByRole("button", { name: "Save contact details", exact: true }).click();
      await expect(page.locator(".contact-inquiry")).toContainText("updated.lead@example.com");
      await expect(page.locator(".contact-inquiry")).toContainText("+923001234567");
      await expect(page.locator(".contact-inquiry")).toContainText("Updated contact and inquiry details from the MVP screen.");
      await expect(page.locator(".workspace-heading h1")).toHaveText(`${leadName} updated`);
      await expect(page.getByRole("status").filter({ hasText: "Contact and inquiry details saved." })).toBeVisible();
      await expect(page.locator(".workspace-heading .badge")).toHaveText("New");

      await page.goto("/workspace/deals");
      await page.getByRole("button", { name: "+ Create deal", exact: true }).click();
      const unqualifiedDeal = await selectLead(page, leadId, propertyId!, agentId);
      await expect(unqualifiedDeal.getByRole("alert")).toContainText("Qualify this lead before creating a deal");
      await expect(unqualifiedDeal.getByRole("button", { name: "Create deal", exact: true })).toBeDisabled();
      await expect(unqualifiedDeal.getByRole("link", { name: "Open lead", exact: false })).toHaveAttribute("href", leadHref);
      await page.goto("/workspace/visits");
      await page.getByRole("button", { name: "+ Schedule visit", exact: true }).click();
      const unqualifiedVisit = await selectLead(page, leadId, propertyId!, agentId);
      await expect(field(unqualifiedVisit, "status")).toHaveValue("confirmed");
      await expect(unqualifiedVisit.getByRole("button", { name: "Schedule visit", exact: true })).toBeEnabled();
      await page.goto(leadHref);
      await page.getByLabel("New note", { exact: true }).fill("A useful note from the Playwright workflow test.");
      await page.getByRole("button", { name: "Add note", exact: true }).click();
      await expect(page.locator(".timeline")).toContainText("A useful note from the Playwright workflow test.");
      await field(page, "stage").selectOption("qualified");
      await field(page, "next_follow_up_at").fill(localDate(followUp));
      await page.getByRole("button", { name: "Update lead", exact: true }).click();
      await expect(page.locator(".workspace-heading .badge")).toHaveText("Qualified");
      await expect(field(page, "assigned_agent_id")).toHaveValue(agentId);
    });

    await test.step("agent password validation and a real visit scheduling conflict", async () => {
      await page.goto("/workspace/staff");
      await expect(field(page, "password")).toHaveAttribute("minlength", "12");
      await page.goto("/workspace/visits");
      await page.getByRole("button", { name: "+ Schedule visit", exact: true }).click();
      let form = await selectLead(page, leadId, propertyId!, agentId);
      await expect(field(form, "status")).toHaveValue("confirmed");
      await field(form, "status").selectOption("requested");
      await field(form, "starts_at").fill(startsAt);
      await field(form, "ends_at").fill(endsAt);
      await field(form, "notes").fill("Playwright viewing.");
      await form.getByRole("button", { name: "Schedule visit", exact: true }).click();
      const card = page.locator(".workflow-card").filter({ has: page.locator(`a[href="${leadHref}"]`) });
      await expect(card).toBeVisible();
      await expect(card.locator(".badge")).toHaveText("Requested");
      await page.getByRole("button", { name: "+ Schedule visit", exact: true }).click();
      form = await selectLead(page, leadId, propertyId!, agentId);
      await expect(field(form, "status")).toHaveValue("confirmed");
      await field(form, "starts_at").fill(startsAt);
      await field(form, "ends_at").fill(endsAt);
      await form.getByRole("button", { name: "Schedule visit", exact: true }).click();
      await expect(form.getByRole("alert")).toContainText(/already has a visit|conflict|overlap/i);
      await page.getByRole("button", { name: "Close form", exact: true }).click();
      await card.getByRole("button", { name: "Update", exact: true }).click();
      await field(card, "status").selectOption("cancelled");
      await card.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(card.locator(".badge")).toHaveText("Cancelled");
    });

    await test.step("close a deal and verify linked property and lead transitions", async () => {
      await page.goto("/workspace/deals");
      await page.getByRole("button", { name: "+ Create deal", exact: true }).click();
      const form = await selectLead(page, leadId, propertyId!, agentId);
      await field(form, "stage").selectOption("offer");
      await field(form, "offer_amount").fill("14500000.00");
      await form.getByRole("button", { name: "Create deal", exact: true }).click();
      const card = page.locator(".workflow-card").filter({ has: page.locator(`a[href="${leadHref}"]`) });
      await expect(card).toBeVisible();
      for (const stage of ["negotiation", "booking", "documentation", "closed_won"]) {
        await card.getByRole("button", { name: "Update", exact: true }).click();
        await field(card, "stage").selectOption(stage);
        await card.getByRole("button", { name: "Save changes", exact: true }).click();
        await expect(card.locator(".badge")).toHaveText(stage.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));
        if (stage === "booking" || stage === "documentation") {
          await page.goto(`/workspace/properties/${propertyId}`);
          await expect(field(page, "status")).toHaveValue("reserved");
          await page.goto("/workspace/deals");
          await expect(card).toBeVisible();
        }
      }
      await card.getByRole("button", { name: "Update", exact: true }).click();
      await expect(field(card, "stage")).toBeDisabled();
      await expect(card).toContainText("cannot be reopened");
      await field(card, "notes").fill("Won deal remains final; closing notes updated.");
      await card.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(card.locator(".badge")).toHaveText("Closed Won");
      await expect(card).toContainText("Won deal remains final; closing notes updated.");
      await page.goto(leadHref);
      await expect(page.locator(".workspace-heading .badge")).toHaveText("Converted");
      await page.goto(`/workspace/properties/${propertyId}`);
      await expect(field(page, "status")).toHaveValue("sold");
      await expect(field(page, "published")).not.toBeChecked();
    });

    await test.step("mobile layouts, archive, actual server revocation, and route protection", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const path of ["/workspace", "/properties"]) {
        await page.goto(path);
        await expect(page.locator(path === "/workspace" ? ".stats-grid" : ".property-card").first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await page.goto(`/workspace/properties/${propertyId}`);
      await page.getByRole("button", { name: "Archive property", exact: true }).click();
      await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
      await expect(page).toHaveURL(/\/workspace\/properties$/);
      propertyId = undefined;
      await logout(page);
      await page.goto("/workspace");
      await expect(page.locator(".session-gate")).toBeVisible();
      await expect(page.locator(".stats-grid")).toHaveCount(0);
    });

    if (agentEmail) {
      await test.step("real agent account cannot access admin controls but can add assigned-lead notes", async () => {
        await login(page, agentEmail);
        await expect(page.locator('.sidebar a[href="/workspace/staff"]')).toHaveCount(0);
        await page.goto("/workspace/properties");
        await expect(page.locator('a[href="/workspace/properties/new"]')).toHaveCount(0);
        await page.locator("tbody tr a").first().click();
        await expect(page.locator(".spec-panel")).toBeVisible();
        await expect(page.locator("form")).toHaveCount(0);
        await expect(page.locator(".property-history h2")).toHaveText("Property activity history");
        await expect(page.locator(".property-history .loading")).toHaveCount(0);
        await expect(page.locator(".property-history .alert")).toHaveCount(0);
        await page.goto("/workspace/staff");
        await expect(page.locator(".workspace-main").getByRole("alert")).toContainText("administrators only");
        await page.goto(leadHref);
        await expect(field(page, "assigned_agent_id")).toHaveCount(0);
        await page.getByRole("button", { name: "Edit contact details", exact: true }).click();
        const contactForm = page.getByRole("form", { name: "Edit contact and inquiry", exact: true });
        await field(contactForm, "message").fill("Inquiry details updated by the assigned agent.");
        await contactForm.getByRole("button", { name: "Save contact details", exact: true }).click();
        await expect(page.locator(".contact-inquiry")).toContainText("Inquiry details updated by the assigned agent.");
        await expect(page.locator(".workspace-heading .badge")).toHaveText("Converted");
        await page.getByLabel("New note", { exact: true }).fill("Assigned agent Playwright access verification.");
        await page.getByRole("button", { name: "Add note", exact: true }).click();
        await expect(page.locator(".timeline")).toContainText("Assigned agent Playwright access verification.");
        await logout(page);
      });
    }
  } finally {
    if (adminToken && propertyId) {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const response = await page.request.get(`${apiURL}/deals`, { headers });
      if (response.ok()) {
        const deals = await response.json() as { id: string; property_id: string; stage: string }[];
        for (const deal of deals.filter((item) => item.property_id === propertyId && !["closed_won", "closed_lost"].includes(item.stage))) {
          await page.request.patch(`${apiURL}/deals/${deal.id}`, { headers, data: { stage: "closed_lost", notes: "Local E2E cleanup." } });
        }
      }
      const archived = await page.request.delete(`${apiURL}/properties/${propertyId}`, { headers });
      expect(archived.ok(), "Archive the test listing even when a UI assertion fails").toBe(true);
    }
    const activeToken = await page.evaluate(() => sessionStorage.getItem("aqarflow.access_token")).catch(() => null);
    for (const token of new Set([activeToken, adminToken].filter(Boolean))) {
      await page.request.post(`${apiURL}/auth/logout`, { headers: { Authorization: `Bearer ${token}` } });
    }
  }
});
