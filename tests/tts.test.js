import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  audioPlan,
  generateAudio,
  pcmToWav,
  wavDuration,
  fingerprint,
} from "../scripts/generate-poi-audio.js";
const catalog = {
  places: [
    {
      id: "place",
      contents: [{ id: "scopri", text: "Un racconto italiano.", audio: null }],
    },
  ],
};
test("selection rejects unknown IDs; dry-run needs no API key or network", async () => {
  assert.throws(() => audioPlan(catalog, "missing", "scopri"), /Luogo/);
  assert.throws(() => audioPlan(catalog, "place", "missing"), /Contenuto/);
  const result = spawnSync(
    process.execPath,
    [
      "scripts/generate-poi-audio.js",
      "--place",
      "albertina",
      "--content",
      "scopri",
      "--dry-run",
    ],
    { encoding: "utf8", env: { ...process.env, GEMINI_API_KEY: "" } },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /dry-run/);
  assert.match(result.stdout, /albertina:scopri/);
});
test("fingerprint changes with text, voice or model, WAV has a real duration", () => {
  const a = fingerprint("test");
  assert.notEqual(a, fingerprint("new"));
  assert.notEqual(a, fingerprint("test", { voice: "Aoede" }));
  const wav = pcmToWav(Buffer.alloc(48000));
  assert.equal(wavDuration(wav), 1);
  assert.throws(() => wavDuration(Buffer.from("HTML")), /WAV/);
});
test("unchanged generated asset is reused; malformed responses never publish assets", async () => {
  const root = await mkdtemp(join(tmpdir(), "vienna-tts-"));
  await mkdir(join(root, "public/audio"), { recursive: true });
  await writeFile(
    join(root, "public/audio/poi-manifest.json"),
    JSON.stringify({ version: 1, entries: {} }),
  );
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "audio/L16;codec=pcm;rate=24000",
                    data: Buffer.alloc(48000).toString("base64"),
                  },
                },
              ],
            },
          },
        ],
      }),
    };
  };
  try {
    const a = await generateAudio({
      catalog,
      placeId: "place",
      contentId: "scopri",
      root,
      apiKey: "test",
      fetcher,
    });
    assert.equal(a.reused, false);
    const b = await generateAudio({
      catalog,
      placeId: "place",
      contentId: "scopri",
      root,
      apiKey: "test",
      fetcher,
    });
    assert.equal(b.reused, true);
    assert.equal(calls, 1);
    const manifest = JSON.parse(
      await readFile(join(root, "public/audio/poi-manifest.json")),
    );
    assert.equal(manifest.entries["place:scopri"].durationSeconds, 1);
    await assert.rejects(
      generateAudio({
        catalog,
        placeId: "place",
        contentId: "scopri",
        root,
        apiKey: "test",
        force: true,
        fetcher: async () => ({
          ok: true,
          json: async () => ({ candidates: [] }),
        }),
      }),
      /audio/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
