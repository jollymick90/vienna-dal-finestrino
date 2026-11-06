import test from "node:test";
import assert from "node:assert/strict";
import { audioUrl, isRemoteAudioUrl } from "../src/lib/audio-storage.js";
import { readAudioAsset } from "../scripts/audio-assets.js";
import { loadCatalog, textHash } from "../src/lib/catalog.js";
import { readFile } from "node:fs/promises";

const remote = "https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/test.mp3";
test("POI audio maps only to the dedicated bucket; legacy fixtures stay local", () => {
  assert.equal(audioUrl("/audio/poi/test.mp3"), remote);
  assert.equal(audioUrl("/audio/01.mp3"), "/audio/01.mp3");
  assert.equal(isRemoteAudioUrl(remote), true);
  for (const path of ["/audio/poi/../secret.mp3", "/audio/poi/%2e%2e.mp3", "https://evil.test/test.mp3", "/audio/poi/test.mp3?x", "//evil.test/test.mp3"])
    assert.equal(audioUrl(path), null, path);
  for (const url of [remote + "?x", remote.replace("vienna-audio", "carousel"), remote.replace("https:", "http:"), remote.replace("test.mp3", "../test.mp3"), remote.replace(".cloud/", ".cloud.evil.test/")])
    assert.equal(isRemoteAudioUrl(url), false, url);
});

test("build falls back to verified remote audio only when a local POI is absent", async () => {
  let calls = 0;
  const options = {
    readLocal: async () => { throw Object.assign(new Error("missing"), { code: "ENOENT" }); },
    fetcher: async (url) => {
      calls++;
      assert.equal(url, remote);
      return new Response("audio bytes", { headers: { "Content-Type": "audio/mpeg" } });
    },
  };
  assert.equal((await readAudioAsset("/audio/poi/test.mp3", options)).toString(), "audio bytes");
  assert.equal(calls, 1);
  await assert.rejects(readAudioAsset("/audio/poi/test.mp3", { ...options, readLocal: async () => { throw new Error("disk failure"); } }), /disk failure/);
  await assert.rejects(readAudioAsset("/audio/01.mp3", options), /missing/);
  await assert.rejects(readAudioAsset("/audio/poi/test.mp3", { ...options, fetcher: async () => new Response("<html>") }), /audio/i);
});

test("catalog exposes remote POI URLs only for text-matched, valid manifest paths", async () => {
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  const place = catalog.places[0];
  const entry = { audio: "/audio/poi/test.mp3", durationSeconds: 40, textHash: await textHash(place.contents[0].text), audioHash: "hash" };
  const original = globalThis.fetch;
  try {
    for (const [audio, expected] of [[entry.audio, remote], ["/audio/poi/../test.mp3", null], [remote, null]]) {
      globalThis.fetch = async url => new Response(JSON.stringify(url === "/catalog.json" ? catalog : { version: 1, entries: { [`${place.id}:${place.contents[0].id}`]: { ...entry, audio } } }));
      assert.equal((await loadCatalog()).places[0].contents[0].audio, expected);
    }
  } finally { globalThis.fetch = original; }
});

test("production build requires publication even when an MP3 exists locally", async () => {
  let localReads = 0;
  const options = {
    published: true,
    readLocal: async () => { localReads++; return Buffer.from("local only"); },
    fetcher: async () => new Response(null, { status: 404 }),
  };
  await assert.rejects(readAudioAsset("/audio/poi/test.mp3", options), /404/);
  assert.equal(localReads, 0);
});
