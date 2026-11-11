import { expect, test } from "@playwright/test";

test("demo listings and backgrounds use locally served real photographs", async ({ page }) => {
  await page.route("https://images.unsplash.com/**", (route) => route.abort());
  await page.goto("/properties");
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
    await expect(card.locator(".sample-photo-tag")).toHaveText("Sample photo");
    await expect(card.locator(".property-price")).toContainText("PKR");
  }
  await page.locator(".property-card").filter({ hasText: "AF-001" }).click();
  await expect(page.locator(".detail-image > img")).toHaveAttribute("src", /\/demo-media\/villa\.jpg$/);
  await expect(page.getByText("Sample stock photograph for demonstration, not the actual listed property or evidence of its location.")).toBeVisible();
  await page.goto("/login");
  await expect(page.locator(".login-art")).toBeVisible();
  expect(await page.locator(".login-art").evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("/demo-media/villa.jpg");
  await page.goto("/");
  await expect(page.locator(".hero-art .scene")).toHaveAttribute("src", /\/demo-media\/villa\.jpg$/);
  expect(await page.locator(".hero").evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("/demo-media/neighborhood.jpg");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".hero-art .scene")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
