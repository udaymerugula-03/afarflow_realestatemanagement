import { expect, test, type Locator, type Page } from "@playwright/test";

async function brandAppearance(brand: Locator) {
  await expect(brand).toBeVisible();
  await expect(brand.locator("small")).toBeVisible();
  return brand.evaluate((element) => {
    const mark = element.querySelector(".brand-mark")!;
    const tagline = element.querySelector("small")!;
    const word = element.querySelector("span:not(.brand-mark)")!;
    const styles = getComputedStyle(element);
    const markStyles = getComputedStyle(mark);
    const taglineStyles = getComputedStyle(tagline);
    return {
      label: element.getAttribute("aria-label"),
      text: element.textContent,
      icon: mark.querySelector("svg")?.outerHTML,
      font: styles.fontFamily,
      size: styles.fontSize,
      weight: styles.fontWeight,
      spacing: styles.letterSpacing,
      color: styles.color,
      wordColor: getComputedStyle(word).color,
      mark: {
        width: markStyles.width, height: markStyles.height,
        radius: markStyles.borderRadius, background: markStyles.backgroundColor, color: markStyles.color,
      },
      tagline: { size: taglineStyles.fontSize, spacing: taglineStyles.letterSpacing, color: taglineStyles.color },
    };
  });
}

async function primaryAppearance(button: Locator) {
  return button.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, color: styles.color, radius: styles.borderRadius, font: styles.fontFamily, weight: styles.fontWeight };
  });
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const role of ["admin", "agent"] as const) {
  test(`one AqarFlow visual identity across public, login and ${role} workspace (mocked API)`, async ({ page }) => {
    const user = { id: "brand-user", agency_id: "brand-agency", full_name: "Brand Reviewer", email: "brand-review@example.com", role };
    await page.route("**/api/v1/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith("/auth/login")) {
        await route.fulfill({ json: { access_token: "mock-brand-session", token_type: "bearer", user } });
      } else if (pathname.endsWith("/auth/me")) {
        await route.fulfill({ json: user });
      } else if (pathname.endsWith("/auth/logout")) {
        await route.fulfill({ json: { message: "Signed out" } });
      } else if (pathname.endsWith("/reports/dashboard")) {
        await route.fulfill({ json: { published_properties: 0, available_properties: 0, new_leads: 0, total_leads: 0, upcoming_visits: 0, open_deals: 0 } });
      } else if (pathname.endsWith("/public/properties")) {
        await route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 12 } });
      } else {
        throw new Error(`Unexpected API request in branding test: ${pathname}`);
      }
    });

    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      const expectedBrand = await brandAppearance(page.locator(".public-header .brand"));
      const expectedPrimary = await primaryAppearance(page.locator(".header-login"));
      const expectedSurface = await page.locator(".public-header").evaluate((element) => getComputedStyle(element).backgroundColor);
      await expectNoOverflow(page);
      await page.goto("/workspace");
      await expect(page.locator(".session-gate").getByRole("heading", { name: "Your workspace awaits." })).toBeVisible();
      expect(await brandAppearance(page.locator(".session-gate .brand"))).toEqual(expectedBrand);
      expect(await primaryAppearance(page.locator(".session-gate .button"))).toEqual(expectedPrimary);

      await page.goto("/login");
      expect(await brandAppearance(page.locator(".login-form .brand"))).toEqual(expectedBrand);
      expect(await primaryAppearance(page.getByRole("button", { name: "Sign in to workspace" }))).toEqual(expectedPrimary);
      await expectNoOverflow(page);
      await page.getByLabel("Work email", { exact: true }).fill(user.email);
      await page.getByLabel("Password", { exact: true }).fill("mock-brand-password");
      await page.getByRole("button", { name: "Sign in to workspace" }).click();
      await expect(page.locator(".stats-grid .stat-card")).toHaveCount(6);
      expect(await brandAppearance(page.locator(".sidebar .brand"))).toEqual(expectedBrand);
      expect(await primaryAppearance(page.getByRole("link", { name: "Open lead inbox" }))).toEqual(expectedPrimary);
      expect(await page.locator(".sidebar").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(expectedSurface);
      await expect(page.locator(".workspace-breadcrumb")).toContainText("AqarFlow");
      await expect(page.locator(".sidebar a[href='/workspace/staff']")).toHaveCount(role === "admin" ? 1 : 0);
      await expectNoOverflow(page);

      await page.locator(".sidebar .brand").click();
      expect(await brandAppearance(page.locator(".public-header .brand"))).toEqual(expectedBrand);
      await page.getByRole("link", { name: "Workspace", exact: true }).click();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
    }
  });
}
