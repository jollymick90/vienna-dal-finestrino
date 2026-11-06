import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  access,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { compressAudioAssets } from "../scripts/compress-poi-audio.js";
import { mp3Duration } from "../scripts/mp3-metadata.js";
import {
  audioPlan,
  generateAudio,
  pcmToWav,
} from "../scripts/generate-poi-audio.js";
import { validatePoiAssets } from "../scripts/validate-poi.js";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const ffmpegAvailable =
  spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
test("MP3 metadata counts complete frames and rejects HTML and truncated audio", () => {
  const frame = Buffer.alloc(192);
  Buffer.from([0xff, 0xf3, 0x84, 0xc0]).copy(frame);
  assert.ok(
    Math.abs(
      mp3Duration(Buffer.concat(Array.from({ length: 10 }, () => frame))) -
        0.24,
    ) < 0.0001,
  );
  assert.throws(() => mp3Duration(Buffer.from("<html>fallback</html>")), /MP3/);
  assert.throws(
    () => mp3Duration(Buffer.concat([frame, frame.subarray(0, 40)])),
    /MP3/,
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "vienna-compress-"));
  await mkdir(join(root, "public/audio/poi"), { recursive: true });
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  const place = catalog.places[0],
    content = place.contents[0];
  const plan = audioPlan(catalog, place.id, content.id);
  const pcm = Buffer.alloc(48000 * 2);
  for (let i = 0; i < pcm.length / 2; i++)
    pcm.writeInt16LE(
      Math.round(8000 * Math.sin((i * 2 * Math.PI * 440) / 24000)),
      i * 2,
    );
  const wav = pcmToWav(pcm);
  await writeFile(join(root, "public" + plan.audio), wav);
  const asset = {
    audio: plan.audio,
    audioHash: sha(wav),
    durationSeconds: 2,
    textHash: plan.textHash,
    fingerprint: plan.fingerprint,
    model: plan.model,
    voice: plan.voice,
  };
  await writeFile(
    join(root, "public/audio/poi-manifest.json"),
    JSON.stringify({ version: 1, entries: { [plan.key]: asset } }),
  );
  return { root, catalog, place, content, plan, wav };
}
test(
  "compression shrinks audio, archives the source, updates a valid manifest and is idempotent",
  { skip: !ffmpegAvailable },
  async () => {
    const f = await fixture();
    try {
      const result = await compressAudioAssets({ root: f.root });
      assert.equal(result.converted, 1);
      assert.ok(result.afterBytes < result.beforeBytes * 0.3);
      const m = JSON.parse(
        await readFile(join(f.root, "public/audio/poi-manifest.json"), "utf8"),
      );
      const a = m.entries[f.plan.key];
      assert.match(a.audio, /\.mp3$/);
      assert.equal(a.fingerprint, f.plan.fingerprint);
      assert.equal(a.compression.sourceAudioHash, sha(f.wav));
      await assert.rejects(access(join(f.root, "public" + f.plan.audio)));
      const archive = await readFile(join(f.root, a.compression.archive));
      assert.deepEqual(archive, f.wav);
      await validatePoiAssets(f.catalog, m, (url) =>
        readFile(join(f.root, "public" + url)),
      );
      const again = await compressAudioAssets({ root: f.root });
      assert.equal(again.converted, 0);
      assert.equal(again.reused, 1);
      let calls = 0;
      const reused = await generateAudio({
        catalog: f.catalog,
        root: f.root,
        placeId: f.place.id,
        contentId: f.content.id,
        fetcher: async () => {
          calls++;
          throw Error("No paid regeneration");
        },
      });
      assert.equal(reused.reused, true);
      assert.equal(calls, 0);
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  },
);
test(
  "failed encoding preserves original asset and manifest",
  { skip: !ffmpegAvailable },
  async () => {
    const f = await fixture();
    const before = await readFile(
      join(f.root, "public/audio/poi-manifest.json"),
      "utf8",
    );
    try {
      await assert.rejects(
        compressAudioAssets({ root: f.root, ffmpeg: "missing-vienna-ffmpeg" }),
      );
      assert.deepEqual(
        await readFile(join(f.root, "public" + f.plan.audio)),
        f.wav,
      );
      assert.equal(
        await readFile(join(f.root, "public/audio/poi-manifest.json"), "utf8"),
        before,
      );
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  },
);
