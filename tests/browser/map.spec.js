import { test, expect } from "@playwright/test";
test("simulation uses GPS flow and keeps map attribution visible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Percorsi e offline" }).click();
  await page.getByText("Prova senza muoverti", { exact: true }).click();
  await page.getByRole("button", { name: "Simula percorso" }).click();
  await expect(page.getByText("Simulazione attiva")).toBeVisible();
  await expect(page.locator(".tour-position")).toHaveCount(1);
  await expect(page.locator(".nearby")).toHaveCount(1);
  await page.getByRole("button", { name: "Avanza simulazione" }).click();
  await expect(page.locator(".tour-position")).toHaveCount(1);
  await page.getByRole("button", { name: "Esci dalla simulazione" }).click();
  await expect(page.locator(".tour-position")).toHaveCount(0);
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "OpenStreetMap",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("desktop has a side panel and GPS denial never blocks manual exploration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Apri Yppenplatz", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const box = await page.locator(".place-panel").boundingBox();
  expect(box.x).toBeGreaterThan(800);
  expect(box.width).toBeLessThan(500);
  await page.getByRole("button", { name: "Chiudi scheda" }).click();
  await expect(page.locator(".poi-pin")).toHaveCount(28);
});
test("overlapping map pins offer a touch choice of nearby places", async ({
  page,
}) => {
  await page.goto("/");
  const pin = page.getByRole("button", {
    name: "Apri Opera di Stato",
    exact: true,
  });
  await pin.click();
  await expect(
    page.getByText("Scegli il luogo", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".pin-choices")
    .getByRole("button", { name: "Albertina", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Albertina", exact: true }),
  ).toBeVisible();
  const attribution = page.locator(".leaflet-control-attribution");
  await expect(attribution).toBeVisible();
  expect(
    await attribution.evaluate((e) => {
      const b = e.getBoundingClientRect();
      return (
        document
          .elementFromPoint(b.x + 5, b.y + 5)
          ?.closest(".leaflet-control-attribution") !== null
      );
    }),
  ).toBe(true);
});
