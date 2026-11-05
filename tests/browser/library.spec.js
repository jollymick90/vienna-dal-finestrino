import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const manifest = () => ({
  version: 1,
  id: "tram-d-test",
  title: "Una giornata sul tram D",
  description: "Dieci racconti lungo un nuovo percorso",
  attribution: "Percorso sintetico per test",
  legs: Array.from({ length: 10 }, (_, i) => ({
    line: "D",
    direction: "Nußdorf",
    from: `Fermata ${i}`,
    to: `Fermata ${i + 1}`,
    title: `Nuovo racconto ${i + 1}`,
    transcript: `Trascrizione della nuova tratta ${i + 1}.`,
    audio: `racconto-${i + 1}.mp3`,
    path: [
      [48.2 + i * 0.002, 16.36],
      [48.202 + i * 0.002, 16.36],
    ],
  })),
});
async function files(input = manifest()) {
  const audio = await readFile("public/audio/01.mp3");
  return [
    {
      name: "tour.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(input)),
    },
    ...input.legs.map((leg) => ({
      name: leg.audio,
      mimeType: "audio/mpeg",
      buffer: audio,
    })),
  ];
}
async function openImport(page) {
  await page.getByText("Aggiungi un percorso", { exact: true }).click();
}

test("imports ten legs, plays a Blob audio, persists selection and reloads offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Pronta offline", { exact: true })).toBeVisible();
  await openImport(page);
  await page
    .getByLabel("File del percorso e audio MP3")
    .setInputFiles(await files());
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "tram-d-test",
  );
  await expect(
    page.getByLabel("Scegli la tratta").locator("option"),
  ).toHaveCount(10);
  await expect(page.locator("path.tram-leg")).toHaveCount(10);
  await expect(
    page.getByText("0 di 10 ascoltate", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Scegli la tratta").selectOption("9");
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a) => !a.paused && a.currentTime > 0),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "tram-d-test",
  );
  await expect(page.getByText("Pronta offline", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a) => !a.paused && a.currentTime > 0),
    )
    .toBe(true);
  await page
    .getByLabel("Percorso da ascoltare")
    .selectOption("vienna-original");
  await expect(
    page.getByLabel("Scegli la tratta").locator("option"),
  ).toHaveCount(8);
  expect(await page.locator("audio").evaluate((a) => a.paused)).toBe(true);
  await page.getByLabel("Percorso da ascoltare").selectOption("tram-d-test");
  await page.getByRole("button", { name: "Simula giro", exact: true }).click();
  for (let i = 0; i < 39; i++)
    await page.getByRole("button", { name: "Avanza simulazione" }).click();
  await expect(page.getByLabel("Scegli la tratta")).toHaveValue("9");
  await expect(
    page.getByText("Simulazione conclusa · Fermata 10", { exact: true }),
  ).toBeVisible();
});

test("missing audio, invalid geometry and corrupt MP3 leave the existing library intact", async ({
  page,
}) => {
  await page.goto("/");
  await openImport(page);
  const upload = page.getByLabel("File del percorso e audio MP3");
  const incomplete = await files();
  incomplete.pop();
  await upload.setInputFiles(incomplete);
  await expect(page.getByRole("alert")).toContainText("racconto-10.mp3");
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "vienna-original",
  );
  const invalid = manifest();
  invalid.legs[0].path = [
    [999, 16],
    [48, 16],
  ];
  await upload.setInputFiles(await files(invalid));
  await expect(page.getByRole("alert")).toContainText("coordinate");
  const corrupt = await files();
  corrupt[1].buffer = Buffer.from("not an mp3");
  await upload.setInputFiles(corrupt);
  await expect(page.getByRole("alert")).toContainText("racconto-1.mp3");
  await expect(
    page.getByLabel("Percorso da ascoltare").locator("option"),
  ).toHaveCount(1);
});

test("duplicate ids do not overwrite saved tours; removal restores the original", async ({
  page,
}) => {
  await page.goto("/");
  await openImport(page);
  await page
    .getByLabel("File del percorso e audio MP3")
    .setInputFiles(await files());
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "tram-d-test",
  );
  await page
    .getByLabel("File del percorso e audio MP3")
    .setInputFiles(await files());
  await expect(page.getByRole("alert")).toContainText("già presente");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Elimina questo percorso" }).click();
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "vienna-original",
  );
  await page.reload();
  await expect(
    page.getByLabel("Percorso da ascoltare").locator("option"),
  ).toHaveCount(1);
});

test("AI kit downloads a portable tour and an explicit generation prompt", async ({
  page,
}) => {
  await page.goto("/");
  await openImport(page);
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica modello JSON" }).click();
  const model = JSON.parse(
    await readFile(await (await jsonDownload).path(), "utf8"),
  );
  expect(model.version).toBe(1);
  expect(model.legs[0].audio).toBe("01.mp3");
  expect(model.legs[0].path.length).toBeGreaterThan(1);
  const promptDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica prompt per AI" }).click();
  const prompt = await readFile(await (await promptDownload).path(), "utf8");
  expect(prompt).toContain("durata desiderata");
  expect(prompt).toContain("Non inventare coordinate");
});

test("imported map labels render as text, not executable markup", async ({
  page,
}) => {
  await page.goto("/");
  await openImport(page);
  const input = manifest();
  input.id = "escaped-labels";
  input.legs[0].from = '<img src=x onerror="window.injected=true">';
  input.attribution = input.legs[0].from;
  await page
    .getByLabel("File del percorso e audio MP3")
    .setInputFiles(await files(input));
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "escaped-labels",
  );
  await page
    .getByRole("button", { name: `1. ${input.legs[0].from}`, exact: true })
    .click();
  await expect(page.locator(".leaflet-popup")).toContainText("<img");
  expect(await page.locator(".leaflet-popup img").count()).toBe(0);
  expect(await page.locator(".leaflet-control-attribution img").count()).toBe(
    0,
  );
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

test("storage quota failure does not add a partial tour", async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === "tours")
        throw new DOMException("Full", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  await openImport(page);
  await page
    .getByLabel("File del percorso e audio MP3")
    .setInputFiles(await files());
  await expect(page.getByRole("alert")).toContainText(
    "Spazio sul dispositivo insufficiente",
  );
  await expect(
    page.getByLabel("Percorso da ascoltare").locator("option"),
  ).toHaveCount(1);
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "vienna-original",
  );
});

test("imported transfer waits at the arriving platform on overlapping geometry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = (feed) => {
      window.feedImportedGPS = feed;
      return 1;
    };
    navigator.geolocation.clearWatch = () => {};
  });
  const source = manifest();
  source.legs = source.legs.slice(0, 2);
  source.legs[0].path = [
    [48.2, 16.3],
    [48.201, 16.3],
  ];
  source.legs[1].path = [
    [48.2005, 16.3],
    [48.202, 16.3],
  ];
  source.legs[1].line = "2";
  source.legs[1].transferBefore = true;
  await page.goto("/");
  await openImport(page);
  await page
    .getByLabel("File del percorso e audio MP3")
    .setInputFiles(await files(source));
  await expect(page.getByLabel("Percorso da ascoltare")).toHaveValue(
    "tram-d-test",
  );
  await page.getByRole("button", { name: "Inizia il tour" }).click();
  await page.evaluate(() =>
    window.feedImportedGPS({
      coords: { latitude: 48.201, longitude: 16.3, accuracy: 5 },
      timestamp: Date.now(),
    }),
  );
  await expect(
    page.getByText("0 di 2 ascoltate", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Scegli la tratta")).toHaveValue("0");
  await page.evaluate(() =>
    window.feedImportedGPS({
      coords: { latitude: 48.2014, longitude: 16.3, accuracy: 5 },
      timestamp: Date.now(),
    }),
  );
  await expect(
    page.getByText("1 di 2 ascoltate", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Scegli la tratta")).toHaveValue("1");
});
