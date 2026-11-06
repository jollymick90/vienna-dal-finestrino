import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));

test("changing groups immediately clears the old group's offline confirmation", async ({ page, context }) => {
  const { audioFixture } = await import("./audio-fixture.js");
  await audioFixture(context);
  await page.goto("/");
  await page.getByRole("button", { name: "Percorsi e offline" }).click();
  await expect(page.getByText(/App e testi pronti/)).toBeVisible();
  await page.getByLabel("Scegli un percorso").selectOption("naschmarkt-stadtpark");
  await page.getByRole("button", { name: "Scarica percorso offline" }).click();
  await expect(page.getByText("Percorso verificato offline · testi e 0 audio")).toBeVisible();
  await page.getByLabel("Scegli un percorso").selectOption("yppengasse-albertina");
  await expect(page.getByText(/Percorso verificato offline/)).toHaveCount(0);
  await expect(page.locator(".poi-pin")).toHaveCount(28);
  await expect(page.locator("path.route-line")).toHaveCount(8);
});

test("a slow previous-group verification cannot overwrite the current offline status", async ({ page, context }) => {
  const { audioFixture } = await import("./audio-fixture.js");
  await audioFixture(context);
  await page.goto("/");
  await page.getByRole("button", { name: "Percorsi e offline" }).click();
  await expect(page.getByText(/App e testi pronti/)).toBeVisible();
  await page.getByLabel("Scegli un percorso").selectOption("naschmarkt-stadtpark");
  await page.getByRole("button", { name: "Scarica percorso offline" }).click();
  await expect(page.getByText("Percorso verificato offline · testi e 0 audio")).toBeVisible();
  await page.evaluate(() => {
    const original = Cache.prototype.match;
    const gate = new Promise(resolve => window.releaseSlow = resolve);
    Cache.prototype.match = async function (input, ...rest) {
      if (input === "/audio/01.mp3") {
        window.slowStarted = true;
        await gate;
        const result = await original.call(this, input, ...rest);
        window.slowFinished = true;
        return result;
      }
      return original.call(this, input, ...rest);
    };
  });
  await page.getByLabel("Scegli un percorso").selectOption("yppengasse-albertina");
  await page.waitForFunction(() => window.slowStarted);
  await page.getByLabel("Scegli un percorso").selectOption("naschmarkt-stadtpark");
  await expect(page.getByText("Percorso verificato offline · testi e 0 audio")).toBeVisible();
  await page.evaluate(() => window.releaseSlow());
  await page.waitForFunction(() => window.slowFinished);
  await expect(page.getByText("Percorso verificato offline · testi e 0 audio")).toBeVisible();
});

test("walking group shows six sites, hides tram tracks, suggests a new POI and downloads twelve real audio files", async ({ page, context }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = feed => { window.feedGPS = feed; return 1; };
    navigator.geolocation.clearWatch = () => {};
  });
  await page.goto("/");
  await expect(page.locator(".poi-pin")).toHaveCount(34);
  await page.getByRole("button", { name: "Apri Albertina", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Percorsi e offline" }).click();
  await page.getByLabel("Scegli un percorso").selectOption("naschmarkt-stadtpark");
  await expect(page.locator(".place-panel")).toHaveCount(0);
  await expect(page.locator(".poi-pin")).toHaveCount(6);
  await expect(page.locator("path.route-line")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Simula percorso" })).toHaveCount(0);
  await page.getByRole("button", { name: "Scarica percorso offline" }).click();
  await expect(page.getByText("Percorso verificato offline · testi e 12 audio")).toBeVisible({ timeout: 60000 });
  const remoteCached = await page.evaluate(async () => (await (await caches.open("vienna-poi-downloads-v1")).keys()).filter(request => request.url.includes("/vienna-audio/poi/")).length);
  expect(remoteCached).toBe(12);
  await page.getByRole("button", { name: "Chiudi percorsi" }).click();
  await page.getByRole("button", { name: "Attiva GPS", exact: true }).click();
  const poi = catalog.places.find(place => place.id === "karlskirche");
  await page.evaluate(location => window.feedGPS({ coords: { ...location, accuracy: 5 }, timestamp: Date.now() }), poi.location);
  await expect(page.locator(".nearby")).toContainText("Karlskirche");
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Apri Karlskirche (Chiesa di San Carlo)", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".content-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Ascolta", exact: true }).first().click();
  await expect.poll(() => page.locator("audio").evaluate(audio => !audio.paused && audio.currentTime > 0)).toBe(true);
});
