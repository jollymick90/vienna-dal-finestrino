import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { audioFixture } from "./audio-fixture.js";
const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
async function gpsMock(page) {
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = (feed, error) => {
      window.feedGPS = feed;
      window.errorGPS = error;
      return 1;
    };
    navigator.geolocation.clearWatch = () => {
      window.gpsCleared = true;
    };
  });
}
const feed = (page, p, accuracy = 5, age = 0) =>
  page.evaluate(
    ({ p, accuracy, age }) =>
      window.feedGPS({
        coords: { ...p, accuracy },
        timestamp: Date.now() - age,
      }),
    { p, accuracy, age },
  );

test("map pins explore all places without requesting GPS; text-only cards have no listen action", async ({
  page,
}) => {
  await page.route("**/audio/poi-manifest.json", route => route.fulfill({json: {version: 1, entries: {}}}));
  let gps = 0;
  await page.exposeFunction("requestedGPS", () => gps++);
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = () => {
      window.requestedGPS();
      return 1;
    };
  });
  await page.goto("/");
  await expect(page.locator(".poi-pin")).toHaveCount(28);
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Albertina", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Testo disponibile · audio da preparare").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ascolta", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".content-card")
    .first()
    .getByRole("button", { name: "Leggi testo", exact: true })
    .click();
  await expect(
    page.locator(".transcript").filter({ hasText: /L’Albertina custodisce/ }),
  ).toBeVisible();
  expect(gps).toBe(0);
  await page.getByRole("button", { name: "Chiudi scheda" }).click();
  await expect(page.locator(".place-panel")).toHaveCount(0);
});

test("shared GPS feed proposes one place, dismissal survives jitter, fixes expire and permission errors recover", async ({
  page,
}) => {
  await gpsMock(page);
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Attiva GPS", exact: true }).click();
  await feed(page, catalog.places[0].location);
  await expect(page.locator(".nearby")).toHaveCount(1);
  await expect(page.locator(".nearby")).toContainText("Yppenplatz");
  expect(await page.locator("audio").getAttribute("src")).toBeNull();
  await page.getByRole("button", { name: "Chiudi proposta" }).click();
  await feed(page, catalog.places[0].location);
  await expect(page.locator(".nearby")).toHaveCount(0);
  await feed(page, catalog.places[0].location, 100);
  await expect(page.locator(".tour-position")).toHaveCount(0);
  await feed(page, catalog.places[0].location, 5, 16000);
  await expect(page.locator(".nearby")).toHaveCount(0);
  await feed(page, catalog.places[0].location);
  await expect(page.locator(".tour-position")).toHaveCount(1);
  await page.clock.runFor(17000);
  await expect(page.locator(".tour-position")).toHaveCount(0);
  await page.evaluate(() => window.errorGPS({ code: 1 }));
  await expect(page.getByText(/GPS negato/)).toBeVisible();
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Albertina", exact: true }),
  ).toBeVisible();
});

test("one persistent player continues through map selection and offers pause, seek, close and manual replay", async ({
  page,
}) => {
  await audioFixture(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect
    .poll(() => page.locator("audio").evaluate((a) => !a.paused))
    .toBe(true);
  await page
    .getByRole("button", { name: "Apri Opera di Stato", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".player")).toContainText("Albertina");
  await page.getByRole("button", { name: "Pausa", exact: true }).click();
  await expect
    .poll(() => page.locator("audio").evaluate((a) => a.paused))
    .toBe(true);
  await page.getByLabel("Avanzamento audio").fill("10");
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a) => Math.floor(a.currentTime)),
    )
    .toBe(10);
  await page.getByRole("button", { name: "Riprendi", exact: true }).click();
  await expect
    .poll(() => page.locator("audio").evaluate((a) => !a.paused))
    .toBe(true);
  await page.getByRole("button", { name: "Chiudi player" }).click();
  await expect(page.locator(".player")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Già ascoltato")).toBeVisible();
  await page.getByRole("button", { name: "Riascolta", exact: true }).click();
  await expect(page.locator(".player")).toBeVisible();
});

test("playback failure gives retry and readable text", async ({ page }) => {
  await audioFixture(page);
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () =>
      Promise.reject(new Error("blocked"));
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect(page.getByText(/Audio non avviato/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Riprova audio" }),
  ).toBeVisible();
  await page
    .locator(".content-card")
    .first()
    .getByRole("button", { name: "Leggi testo", exact: true })
    .click();
  await expect(
    page.locator(".transcript").filter({ hasText: /L’Albertina custodisce/ }),
  ).toBeVisible();
});
