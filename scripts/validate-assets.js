import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
import tour from "../src/lib/tour.json" with { type: "json" };
import { paths } from "../src/lib/route-data.js";
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
