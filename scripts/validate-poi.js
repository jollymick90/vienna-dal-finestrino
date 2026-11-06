import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mp3Duration } from "./mp3-metadata.js";
import { wavDuration } from "./generate-poi-audio.js";
const sha = (value) => createHash("sha256").update(value).digest("hex");
export async function validatePoiAssets(catalog, manifest, readAsset) {
  assert.equal(catalog.version, 1);
  assert.equal(manifest.version, 1);
  const ids = new Set(),
    keys = new Map();
  for (const place of catalog.places) {
    assert.match(place.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(place.id), "ID luogo duplicato");
    ids.add(place.id);
    assert.ok(
      place.name &&
        place.summary &&
        place.category &&
        place.access &&
        place.routeIds.length &&
        place.sources.length,
    );
    for (const id of place.routeIds)
      assert.ok(
        catalog.routes.some((r) => r.id === id),
        `Percorso ignoto: ${id}`,
      );
    for (const p of [
      place.location,
      place.entrance,
      place.suggestion?.location,
    ].filter(Boolean)) {
      assert.ok(
        Number.isFinite(p.latitude) &&
          Math.abs(p.latitude) <= 90 &&
          Number.isFinite(p.longitude) &&
          Math.abs(p.longitude) <= 180,
      );
      assert.match(p.source, /^https:\/\//);
    }
    assert.equal(place.contents.length, 2);
    for (const [i, content] of place.contents.entries()) {
      const key = `${place.id}:${content.id}`;
      assert.ok(!keys.has(key), "ID contenuto duplicato");
      keys.set(key, content);
      assert.match(content.id, /^[a-z0-9-]+$/);
      const words = content.text.trim().split(/\s+/).length;
      assert.ok(
        words >= (i ? 100 : 70) && words <= (i ? 150 : 100),
        `${key}: lunghezza testo ${words}`,
      );
      assert.ok(content.title && content.sources.length);
      assert.equal(
        content.audio,
        null,
        "Dichiarare gli audio solo nel manifest, separato dai testi.",
      );
      for (const source of content.sources)
        assert.ok(place.sources.some((s) => s.url === source));
    }
  }
  for (const [key, asset] of Object.entries(manifest.entries)) {
    const content = keys.get(key);
    assert.ok(content, `Audio senza contenuto: ${key}`);
    assert.equal(
      asset.textHash,
      sha(content.text),
      `Audio non coerente con il testo: ${key}`,
    );
    assert.match(asset.audio, /^\/audio\/poi\/[a-z0-9-]+\.(wav|mp3)$/);
    const bytes = await readAsset(asset.audio);
    assert.ok(bytes.length > 1000, `Asset audio vuoto: ${key}`);
    assert.equal(sha(bytes), asset.audioHash, `Hash audio errato: ${key}`);
    assert.ok(
      Math.abs(
        (asset.audio.endsWith(".mp3")
          ? mp3Duration(bytes)
          : wavDuration(bytes)) - asset.durationSeconds,
      ) < (asset.audio.endsWith(".mp3") ? 0.15 : 0.01),
      `Durata audio errata: ${key}`,
    );
  }
  return {
    places: ids.size,
    contents: keys.size,
    audio: Object.keys(manifest.entries).length,
  };
}
