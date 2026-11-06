import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { audioUrl } from "../../src/lib/audio-storage.js";

test("real MinIO MP3 streams, downloads and plays/seeks after offline reload", async ({ page, context }) => {
  test.setTimeout(90000);
  const source = JSON.parse(await readFile("public/audio/poi-manifest.json", "utf8"));
  const asset = source.entries["albertina:scopri"];
  await context.route("**/audio/poi-manifest.json", route => route.fulfill({ json: {
    version: 1, entries: { "albertina:scopri": asset },
  } }));
  await page.goto("/");
  const openAlbertina = async () => {
    await page.getByRole("button", { name: "Apri Albertina", exact: true }).focus();
    await page.keyboard.press("Enter");
  };
  await openAlbertina();
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect(page.locator("audio")).toHaveAttribute("src", audioUrl(asset.audio));
  await expect.poll(() => page.locator("audio").evaluate(audio => !audio.paused && audio.currentTime > 0), { timeout: 15000 }).toBe(true);
  await page.getByRole("button", { name: "Chiudi player" }).click();
  await page.getByRole("button", { name: "Chiudi scheda" }).click();
  await page.getByRole("button", { name: "Percorsi e offline" }).click();
  await expect(page.getByText(/App e testi pronti/)).toBeVisible();
  await page.getByRole("button", { name: "Scarica percorso offline" }).click();
  await expect(page.getByText("Percorso verificato offline · testi e 1 audio")).toBeVisible({ timeout: 30000 });
  await context.setOffline(true);
  await page.reload();
  // Force the app to use Cache Storage, rather than the browser's HTTP media cache.
  const range = await page.evaluate(async url => {
    const response = await fetch(url, { headers: { Range: "bytes=0-31" }, cache: "no-store" });
    return { status: response.status, bytes: (await response.arrayBuffer()).byteLength };
  }, audioUrl(asset.audio));
  expect(range).toEqual({ status: 206, bytes: 32 });
  await openAlbertina();
  await page.getByRole("button", { name: "Riascolta", exact: true }).click();
  await expect.poll(() => page.locator("audio").evaluate(audio => !audio.paused && audio.currentTime > 0), { timeout: 10000 }).toBe(true);
  await page.getByRole("button", { name: "Pausa", exact: true }).click();
  await page.getByLabel("Avanzamento audio").fill("12");
  await expect.poll(() => page.locator("audio").evaluate(audio => Math.floor(audio.currentTime))).toBe(12);
  await page.getByRole("button", { name: "Riprendi", exact: true }).click();
  await expect.poll(() => page.locator("audio").evaluate(audio => !audio.paused && audio.currentTime > 12)).toBe(true);
});
