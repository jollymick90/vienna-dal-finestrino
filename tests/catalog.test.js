import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("catalog has 34 independently usable places, documented coordinates and two spoken texts", async () => {
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  assert.equal(catalog.places.length, 34);
  assert.equal(new Set(catalog.places.map((p) => p.id)).size, 34);
  for (const p of catalog.places) {
    assert.ok(p.location.latitude > 48.19 && p.location.latitude < 48.23, p.id);
    assert.ok(
      p.location.longitude > 16.32 && p.location.longitude < 16.39,
      p.id,
    );
    assert.match(p.location.source, /openstreetmap.org/);
    assert.ok(
      p.sources.length && p.access && p.summary && p.routeIds.length,
      p.id,
    );
    assert.equal(p.contents.length, 2);
    for (const [i, c] of p.contents.entries()) {
      const words = c.text.split(/\s+/).length;
      assert.ok(
        words >= (i ? 100 : 70) && words <= (i ? 150 : 100),
        `${p.id}/${c.id}: ${words} words`,
      );
      assert.ok(c.title && c.id && c.sources.length);
      assert.equal(c.audio, null);
    }
  }
});
test("Naschmarkt walking group contains exactly the requested six independent sites", async () => {
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  const group = catalog.routes.find(route => route.id === "naschmarkt-stadtpark");
  assert.equal(group?.mode, "walk");
  const places = catalog.places.filter(place => place.routeIds.includes(group.id));
  assert.deepEqual(places.map(place => place.id).sort(), ["hochstrahlbrunnen", "karlskirche", "naschmarkt", "palais-schwarzenberg", "secession", "stadtpark"]);
  for (const place of places) {
    assert.equal(place.verifiedAt, "2026-11-06");
    assert.equal(place.suggestion?.tram, undefined);
    assert.equal(place.suggestion?.location, undefined);
    assert.equal(place.routeContext, undefined);
    assert.equal(place.contents.length, 2);
  }
  assert.equal(catalog.places.filter(place => place.routeIds.includes("yppengasse-albertina")).length, 28);
});
test("build validation rejects stale text, missing files and invalid audio payloads", async () => {
  const { validatePoiAssets } = await import("../scripts/validate-poi.js");
  const { pcmToWav } = await import("../scripts/generate-poi-audio.js");
  const { createHash } = await import("node:crypto");
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  const p = catalog.places[0],
    c = p.contents[0],
    bytes = pcmToWav(Buffer.alloc(48000));
  const sha = (value) => createHash("sha256").update(value).digest("hex");
  const manifest = {
    version: 1,
    entries: {
      [`${p.id}:${c.id}`]: {
        audio: "/audio/poi/test.wav",
        durationSeconds: 1,
        textHash: sha(c.text),
        audioHash: sha(bytes),
      },
    },
  };
  await validatePoiAssets(catalog, manifest, async () => bytes);
  await assert.rejects(
    validatePoiAssets(catalog, manifest, async () =>
      Buffer.from("<html>fallback</html>"),
    ),
    /audio|hash|WAV/i,
  );
  manifest.entries[`${p.id}:${c.id}`].textHash = "old";
  await assert.rejects(
    validatePoiAssets(catalog, manifest, async () => bytes),
    /testo/i,
  );
});
