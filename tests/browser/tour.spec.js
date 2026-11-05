import { test, expect } from "@playwright/test";

test("manual controls, transcript and a single real MP3 player", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Vienna dal finestrino" }),
  ).toBeVisible();
  await page.getByLabel("Scegli la tratta").selectOption("5");
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a) => !a.paused && a.currentTime > 0),
    )
    .toBe(true);
  await expect(page.locator("audio")).toHaveCount(1);
  await expect(page.locator("audio")).toHaveAttribute("src", "/audio/06.mp3");
  await page.getByRole("button", { name: "Pausa", exact: true }).click();
  await expect
    .poll(() => page.locator("audio").evaluate((a) => a.paused))
    .toBe(true);
  await page.getByText("Leggi la trascrizione").click();
  await expect(page.getByText(/Cercate un colonnato/)).toBeVisible();
  await page.getByRole("button", { name: "Riascolta" }).click();
  await expect
    .poll(() => page.locator("audio").evaluate((a) => !a.paused))
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("simulation visits all legs and waits at the transfer before line 1", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Simula giro", exact: true }).click();
  await expect(
    page.getByText("Simulazione attiva", { exact: true }),
  ).toBeVisible();
  // Step by points, not by bypassing the application matcher.
  for (let step = 1; step <= 31; step++) {
    await page.getByRole("button", { name: "Avanza simulazione" }).click();
    if (step === 16) {
      await expect(
        page.getByText("Alla fermata di Schottentor", { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Scegli la tratta")).toHaveValue("3");
    }
    if (step === 17)
      await expect(page.getByLabel("Scegli la tratta")).toHaveValue("4");
  }
  await expect(page.getByLabel("Scegli la tratta")).toHaveValue("7");
  await expect(page.locator("audio")).toHaveCount(1);
  await expect(page.getByText(/Simulazione conclusa/)).toBeVisible();
});

test("permission refusal leaves manual playback available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = (_ok, fail) => {
      setTimeout(() => fail({ code: 1 }), 0);
      return 7;
    };
    navigator.geolocation.clearWatch = () => {};
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Inizia il tour" }).click();
  await expect(page.getByText(/Posizione non autorizzata/)).toBeVisible();
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect
    .poll(() => page.locator("audio").evaluate((a) => !a.paused))
    .toBe(true);
});

test("autoplay rejection has an explicit gesture fallback without false heard state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    window.rejectAudio = true;
    HTMLMediaElement.prototype.play = function () {
      if (window.rejectAudio)
        return Promise.reject(new DOMException("blocked", "NotAllowedError"));
      return original.call(this);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tocca per ascoltare" }),
  ).toBeVisible();
  await expect(
    page.getByText("0 di 8 ascoltate", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (window.rejectAudio = false));
  await page.getByRole("button", { name: "Tocca per ascoltare" }).click();
  await expect(
    page.getByText("1 di 8 ascoltate", { exact: true }),
  ).toBeVisible();
});

test("complete cache supports offline reload, all MP3s and byte ranges", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Pronta offline", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Pronta offline", { exact: true })).toBeVisible();
  for (let i = 1; i <= 8; i++) {
    const result = await page.evaluate(async (n) => {
      const response = await fetch(`/audio/0${n}.mp3`, {
        headers: { Range: "bytes=0-99" },
      });
      return {
        status: response.status,
        length: (await response.arrayBuffer()).byteLength,
        range: response.headers.get("Content-Range"),
      };
    }, i);
    expect(result.status).toBe(206);
    expect(result.length).toBe(100);
    expect(result.range).toMatch(/^bytes 0-99\//);
  }
  for (let i = 0; i < 8; i++) {
    await page.getByLabel("Scegli la tratta").selectOption(String(i));
    await page.getByRole("button", { name: "Ascolta", exact: true }).click();
    await expect
      .poll(() =>
        page.locator("audio").evaluate((a) => !a.paused && a.currentTime > 0),
      )
      .toBe(true);
  }
});

test("GPS gesture preparation, quality filtering, serial audio and watch cleanup", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.gps = { cleared: [], preparedInGesture: false };
    navigator.geolocation.watchPosition = (callback) => {
      window.gps.feed = callback;
      return 42;
    };
    navigator.geolocation.clearWatch = (id) => window.gps.cleared.push(id);
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.endsWith("/silence.wav"))
        window.gps.preparedInGesture = navigator.userActivation.isActive;
      return play.call(this);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Inizia il tour" }).click();
  expect(await page.evaluate(() => window.gps.preparedInGesture)).toBe(true);
  const feed = (latitude, longitude, accuracy = 5, age = 0) =>
    page.evaluate(
      ({ latitude, longitude, accuracy, age }) => {
        window.gps.feed({
          coords: { latitude, longitude, accuracy },
          timestamp: Date.now() - age,
        });
      },
      { latitude, longitude, accuracy, age },
    );
  await feed(48.21496008, 16.33749478, 46);
  await feed(48.21496008, 16.33749478, 5, 16000);
  await expect(
    page.getByText("0 di 8 ascoltate", { exact: true }),
  ).toBeVisible();
  await feed(48.21496008, 16.33749478);
  await expect(
    page.getByText("1 di 8 ascoltate", { exact: true }),
  ).toBeVisible();
  await feed(48.21523309, 16.34272558);
  await expect(page.getByLabel("Scegli la tratta")).toHaveValue("1");
  await expect(page.locator("audio")).toHaveAttribute("src", "/audio/01.mp3");
  await page
    .locator("audio")
    .evaluate((a) => (a.currentTime = a.duration - 0.05));
  await expect(page.locator("audio")).toHaveAttribute("src", "/audio/02.mp3");
  await expect(
    page.getByText("2 di 8 ascoltate", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Disattiva GPS" }).click();
  expect(await page.evaluate(() => window.gps.cleared)).toEqual([42]);
  await page.getByLabel("Scegli la tratta").selectOption("4");
  await page
    .getByRole("button", { name: "Risincronizza GPS da questa tratta" })
    .click();
  await feed(48.21375495, 16.36178882);
  await expect(
    page.getByText("2 di 8 ascoltate", { exact: true }),
  ).toBeVisible();
  await feed(48.21120408, 16.36079888);
  await expect(page.locator("audio")).toHaveAttribute("src", "/audio/05.mp3");
  await expect(
    page.getByText("3 di 8 ascoltate", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  expect(await page.evaluate(() => window.gps.cleared)).toEqual([42, 42]);
  expect(await page.locator("audio").evaluate((a) => a.paused)).toBe(true);
});

test("offline status is withdrawn when an audio is missing from cache", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Pronta offline", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const name = (await caches.keys()).find((key) =>
      key.startsWith("vienna-tour-"),
    );
    await (await caches.open(name)).delete("/audio/03.mp3");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByText("Pronta offline", { exact: true }),
  ).not.toBeVisible();
});
