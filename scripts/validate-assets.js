import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
import tour from "../src/lib/tour.json" with { type: "json" };
import { paths } from "../src/lib/route-data.js";
import { readAudioAsset } from "./audio-assets.js";
assert.equal(tour.length, 8);
assert.equal(paths.length, 8);
for (const [i, leg] of tour.entries()) {
  const expected = `/audio/${String(i + 1).padStart(2, "0")}.mp3`;
  assert.equal(leg.audio, expected);
  assert.ok(leg.transcript && paths[i].length >= 2);
  assert.ok((await stat(`public${leg.audio}`)).size > 1000);
  const original = await readFile(`vienna-tram-astra/static${leg.audio}`);
  assert.ok(
    original.equals(await readFile(`public${leg.audio}`)),
    `Audio ${i + 1} differente dal kit`,
  );
}
console.log("Verificati: 8 tratte, 8 polilinee, 8 MP3 originali.");

// Both bundled tours must be usable without importing data into browser storage.
const {builtinTours} = await import('../src/lib/builtin-tour.js');
assert.equal(builtinTours.length, 2);
for (const tour of builtinTours) {
  assert.ok(tour.legs.length > 0);
  for (const leg of tour.legs) {
    assert.ok(leg.title && leg.transcript && leg.from && leg.to);
    assert.ok(leg.path.length >= 2);
    assert.ok(leg.path.every(point => point.length === 2 && point.every(Number.isFinite)));
    if (leg.audio) assert.ok((await stat(`public${leg.audio}`)).size > 1000);
  }
}
console.log('Verificati entrambi i tour inclusi: originale con MP3, Ring con testi e geometrie.');

const { validatePoiAssets } = await import('./validate-poi.js');
const poiCatalog = JSON.parse(await readFile('public/catalog.json','utf8'));
const poiManifest = JSON.parse(await readFile('public/audio/poi-manifest.json','utf8'));
const counts = await validatePoiAssets(poiCatalog, poiManifest, url => readAudioAsset(url, { published: true }));
assert.equal(counts.places, 28);
console.log(`Catalogo POI verificato: ${counts.places} luoghi, ${counts.contents} testi e ${counts.audio} audio coerenti.`);
