import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateBatch } from "../scripts/generate-all-poi-audio.js";
import { generateAudio } from "../scripts/generate-poi-audio.js";
const catalog = {
  places: [
    {
      id: "first",
      contents: [
        { id: "scopri", text: "Primo racconto." },
        { id: "approfondimento", text: "Un approfondimento." },
      ],
    },
    { id: "second", contents: [{ id: "scopri", text: "Secondo luogo." }] },
  ],
};
const response = () => ({
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
});
async function setup() {
  const root = await mkdtemp(join(tmpdir(), "vienna-batch-"));
  await mkdir(join(root, "public/audio"), { recursive: true });
  await writeFile(
    join(root, "public/audio/poi-manifest.json"),
    '{"version":1,"entries":{}}',
  );
  return root;
}
test("batch dry-run plans every content without an API request or manifest write", async () => {
  const root = await setup();
  let calls = 0;
  try {
    const result = await generateBatch({
      catalog,
      root,
      fetcher: async () => {
        calls++;
        throw Error("network forbidden");
      },
    });
    assert.equal(result.total, 3);
    assert.equal(result.toGenerate, 3);
    assert.equal(calls, 0);
    assert.deepEqual(
      JSON.parse(
        await readFile(join(root, "public/audio/poi-manifest.json"), "utf8"),
      ).entries,
      {},
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("batch generates only missing content and reuses valid files on subsequent runs", async () => {
  const root = await setup();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return response();
  };
  try {
    await generateAudio({
      catalog,
      root,
      placeId: "first",
      contentId: "scopri",
      apiKey: "test",
      fetcher,
    });
    calls = 0;
    const result = await generateBatch({
      catalog,
      root,
      generate: true,
      apiKey: "test",
      fetcher,
    });
    assert.equal(result.generated, 2);
    assert.equal(result.reused, 1);
    assert.equal(calls, 2);
    const again = await generateBatch({
      catalog,
      root,
      generate: true,
      apiKey: "test",
      fetcher,
    });
    assert.equal(again.generated, 0);
    assert.equal(again.reused, 3);
    assert.equal(calls, 2);
    assert.equal(
      Object.keys(
        JSON.parse(
          await readFile(join(root, "public/audio/poi-manifest.json"), "utf8"),
        ).entries,
      ).length,
      3,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("interrupted batch retains completed files and resumes from the first missing asset", async () => {
  const root = await setup();
  let calls = 0;
  try {
    await assert.rejects(
      generateBatch({
        catalog,
        root,
        generate: true,
        apiKey: "test",
        fetcher: async () => {
          if (++calls === 2) throw Error("Network interrupted");
          return response();
        },
      }),
      /first:approfondimento/,
    );
    assert.equal(
      Object.keys(
        JSON.parse(
          await readFile(join(root, "public/audio/poi-manifest.json"), "utf8"),
        ).entries,
      ).length,
      1,
    );
    const result = await generateBatch({
      catalog,
      root,
      generate: true,
      apiKey: "test",
      fetcher: async () => response(),
    });
    assert.equal(result.reused, 1);
    assert.equal(result.generated, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
