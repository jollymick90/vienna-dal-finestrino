import { test, expect } from "@playwright/test";
test("catalog and paths remain available offline after verified download, without street tiles", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.getByRole("button", { name: "Percorsi e offline" }).click();
  await page.getByRole("button", { name: "Scarica percorso offline" }).click();
  await expect(page.getByText(/Percorso verificato offline/)).toBeVisible({ timeout: 90000 });
  await expect(page.getByText(/Mappa stradale: solo online/)).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".poi-pin")).toHaveCount(34);
  await expect(page.locator("path.route-line")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .locator(".content-card")
    .first()
    .getByRole("button", { name: "Leggi testo", exact: true })
    .click();
  await expect(
    page.locator(".transcript").filter({ hasText: /L’Albertina custodisce/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Offline · sfondo stradale non disponibile"),
  ).toBeVisible();
});
test("denied storage does not block catalog or simulation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw Error();
    };
    Storage.prototype.setItem = () => {
      throw Error();
    };
  });
  await page.goto("/");
  await expect(page.locator(".poi-pin")).toHaveCount(34);
  await page
    .getByRole("button", { name: "Apri Yppenplatz", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Yppenplatz", exact: true }),
  ).toBeVisible();
});
test("downloaded audio plays and seeks after an offline reload", async ({
  page,
  context,
}) => {
  const { audioFixture } = await import("./audio-fixture.js");
  await audioFixture(context);
  await page.goto("/");
  await page.getByRole("button", { name: "Percorsi e offline" }).click();
  await expect(page.getByText(/App e testi pronti/)).toBeVisible();
  await page.getByRole("button", { name: "Scarica percorso offline" }).click();
  await expect(
    page.getByText("Percorso verificato offline · testi e 1 audio"),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a) => !a.paused && a.currentTime > 0),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Pausa", exact: true }).click();
  await page.getByLabel("Avanzamento audio").fill("12");
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a) => Math.floor(a.currentTime)),
    )
    .toBe(12);
  await page.reload();
  await page
    .getByRole("button", { name: "Apri Albertina", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Già ascoltato")).toBeVisible();
});
