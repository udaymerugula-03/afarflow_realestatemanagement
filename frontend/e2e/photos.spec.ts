import { expect, test } from "@playwright/test";

test("cloud listings and backgrounds use distinct bundled real photographs", async ({ page }) => {
  await page.route("https://images.unsplash.com/**", (route) => route.abort());
  await page.goto("/properties");
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  for (const [reference, filename] of [["AF-001", "villa.jpg"], ["AF-002", "apartment.jpg"], ["AF-003", "plot.jpg"]]) {
    const card = page.locator(".property-card").filter({ hasText: reference });
    await expect(card).toBeVisible();
    const image = card.locator(".property-image > img");
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute("src", new RegExp(`/demo-media/${filename.replace(".", "\\.")}$`));
    await image.evaluate(async (element) => {
      if (!(element instanceof HTMLImageElement)) throw new Error("Expected a photograph element");
      await element.decode();
      if (element.naturalWidth < 1200) throw new Error("Expected a full-size demo photograph");
    });
    await expect(card.locator(".property-image").getByText("Sample photo", { exact: true })).toHaveCount(0);
    await expect(card.locator(".property-price")).toContainText("PKR");
  }
  await page.locator(".property-card").filter({ hasText: "AF-001" }).click();
  await expect(page.locator(".detail-image > img")).toHaveAttribute("src", /\/demo-media\/villa\.jpg$/);
  await expect(page.getByText("Sample stock photograph for demonstration, not the actual listed property or evidence of its location.")).toBeVisible();
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Admin / Agent sign in", exact: true })).toBeVisible();
  await expect(page.locator(".login-art")).toBeVisible();
  expect(await page.locator(".login-art").evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("/demo-media/villa.jpg");
  await page.goto("/");
  const hero = page.locator(".hero-art .scene");
  const villaCard = page.locator(".property-card").filter({ hasText: "AF-001" });
  const villa = villaCard.locator(".property-image > img");
  await expect(hero).toHaveAttribute("src", /\/demo-media\/hero\.jpg$/);
  await expect(hero).toHaveAttribute("alt", /Sample stock photograph/);
  await expect(villaCard).toBeVisible();
  await expect(villa).toHaveAttribute("src", /\/demo-media\/villa\.jpg$/);
  expect(await hero.getAttribute("src")).not.toBe(await villa.getAttribute("src"));
  await expect(villaCard.locator(".property-image").getByText("Sample photo", { exact: true })).toHaveCount(0);
  for (const image of [hero, villa]) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async (element) => {
      if (!(element instanceof HTMLImageElement)) throw new Error("Expected a photograph element");
      await element.decode();
      if (element.naturalWidth < 1200) throw new Error("Expected a full-size demo photograph");
    });
  }
  expect(await page.locator(".hero").evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("/demo-media/neighborhood.jpg");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".hero-art .scene")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Admin / Agent sign in", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto("/");
  await page.getByRole("button", { name: "Find a rental", exact: true }).click();
  await page.getByLabel("Search city", { exact: true }).selectOption("Islamabad");
  await page.getByLabel("Search property type", { exact: true }).selectOption("apartment");
  await page.locator(".hero-search").getByRole("button", { name: "Find a property", exact: true }).click();
  await expect(page).toHaveURL(/\/properties\?purpose=rent&city=Islamabad&type=apartment$/);
  await expect(page.getByRole("combobox", { name: "Purpose", exact: true })).toHaveValue("rent");
  await expect(page.getByRole("combobox", { name: "Property type", exact: true })).toHaveValue("apartment");
  await expect(page.locator(".property-card").filter({ hasText: "AF-002" })).toBeVisible();
  await expect(page.locator(".property-card").filter({ hasText: "AF-001" })).toHaveCount(0);
  await page.getByRole("link", { name: "Properties for sale", exact: true }).click();
  await expect(page.locator("#main-content")).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.getByRole("combobox", { name: "Purpose", exact: true })).toHaveValue("sale");
  await expect(page.locator(".property-card").filter({ hasText: "AF-001" })).toBeVisible();
  await expect(page.locator(".property-card").filter({ hasText: "AF-002" })).toHaveCount(0);
  await page.goto("/");
  await page.locator(".category-card").filter({ hasText: "Plots & land" }).click();
  await expect(page.getByRole("combobox", { name: "Property type", exact: true })).toHaveValue("plot");
  await expect(page.locator(".property-card").filter({ hasText: "AF-003" })).toBeVisible();
  await expect(page.locator(".property-card").filter({ hasText: "AF-001" })).toHaveCount(0);
});
