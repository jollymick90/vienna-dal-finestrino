import { test, expect } from "@playwright/test";

test("Leaflet shows both tram lines, all route legs and transfer, and follows selection", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByRole("region", { name: "Mappa del percorso in tram" });
  await expect(map.locator(".leaflet-container")).toBeVisible();
  await expect(map.locator("path.tram-leg")).toHaveCount(8);
  await expect(map.locator("path.tram-leg-0")).toHaveAttribute(
    "stroke",
    "#c83732",
  );
  await expect(map.locator("path.tram-leg-4")).toHaveAttribute(
    "stroke",
    "#152d40",
  );
  await expect(map.locator("path.transfer-path")).toHaveCount(1);
  await expect(
    map.getByRole("button", {
      name: "Cambio a Schottentor: tram 1 verso Reumannplatz",
    }),
  ).toBeVisible();
  await page.getByLabel("Scegli la tratta").selectOption("5");
  await expect(map.locator("path.tram-leg-5")).toHaveAttribute(
    "stroke-width",
    "8",
  );
  await expect(map.locator("path.tram-leg-0")).toHaveAttribute(
    "stroke-width",
    "4",
  );
  await map
    .getByRole("button", {
      name: "Cambio a Schottentor: tram 1 verso Reumannplatz",
    })
    .click();
  await expect(map.locator(".leaflet-popup")).toContainText("Reumannplatz");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("simulation moves the map marker and exiting removes it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Simula giro", exact: true }).click();
  const marker = page.locator("path.tour-position");
  await expect(marker).toHaveCount(1);
  const before = await marker.getAttribute("d");
  await page.getByRole("button", { name: "Avanza simulazione" }).click();
  await expect(marker).not.toHaveAttribute("d", before);
  await page.getByRole("button", { name: "Esci dalla simulazione" }).click();
  await expect(marker).toHaveCount(0);
});

test("offline reload keeps the Leaflet map, routes and stop popups without street tiles", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Pronta offline", { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("path.tram-leg")).toHaveCount(8);
  await expect(
    page.getByText("Offline: tracciati e fermate disponibili."),
  ).toBeVisible();
  await page.getByRole("button", { name: "9. Oper, Karlsplatz" }).click();
  await expect(page.locator(".leaflet-popup")).toContainText(
    "Oper, Karlsplatz",
  );
});

test("GPS map marker rejects inaccurate fixes and expires from fix timestamp", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = (feed) => {
      window.feedMapGPS = feed;
      return 1;
    };
    navigator.geolocation.clearWatch = () => {};
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Inizia il tour" }).click();
  const marker = page.locator("path.tour-position");
  const feed = (age, accuracy = 5) =>
    page.evaluate(
      ({ age, accuracy }) => {
        window.feedMapGPS({
          coords: { latitude: 48.21496008, longitude: 16.33749478, accuracy },
          timestamp: Date.now() - age,
        });
      },
      { age, accuracy },
    );
  await feed(0);
  await expect(marker).toHaveCount(1);
  await feed(0, 46);
  await expect(marker).toHaveCount(0);
  await feed(14000);
  await expect(marker).toHaveCount(1);
  await page.clock.runFor(6000);
  await expect(marker).toHaveCount(0);
  await feed(0);
  await expect(marker).toHaveCount(1);
  await page.getByRole("button", { name: "Disattiva GPS" }).click();
  await expect(marker).toHaveCount(0);
});
