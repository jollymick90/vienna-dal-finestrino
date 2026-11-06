import {
  readFile,
  writeFile,
  mkdir,
  rename,
  unlink,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { resolve, basename, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { wavDuration } from "./generate-poi-audio.js";
import { mp3Duration } from "./mp3-metadata.js";
const run = promisify(execFile);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const audioPath = /^\/audio\/poi\/[a-z0-9-]+\.(wav|mp3)$/;

/** Local-only conversion. WAV masters are archived outside public before removal. */
export async function compressAudioAssets({
  root = ".",
  ffmpeg = "ffmpeg",
  notify = () => {},
} = {}) {
  const manifestPath = resolve(root, "public/audio/poi-manifest.json");
  let snapshot = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(snapshot);
  if (manifest.version !== 1 || !manifest.entries)
    throw Error("Manifest audio non valido.");
  const archiveDir = resolve(root, "audio-masters/poi");
  await mkdir(archiveDir, { recursive: true });
  const archiveManifest = resolve(
    root,
    `audio-masters/manifest-${sha(snapshot).slice(0, 16)}.json`,
  );
  await writeFile(archiveManifest, snapshot, { flag: "wx" }).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });
  const temp = await mkdtemp(join(tmpdir(), "vienna-mp3-"));
  const result = { converted: 0, reused: 0, beforeBytes: 0, afterBytes: 0 };
  try {
    for (const [key, asset] of Object.entries(manifest.entries)) {
      if (!audioPath.test(asset.audio))
        throw Error(`Percorso audio non valido: ${key}`);
      const source = resolve(root, `public${asset.audio}`);
      const bytes = await readFile(source);
      if (sha(bytes) !== asset.audioHash)
        throw Error(`Hash audio errato: ${key}`);
      result.beforeBytes += bytes.length;
      if (asset.audio.endsWith(".mp3")) {
        if (Math.abs(mp3Duration(bytes) - asset.durationSeconds) > 0.15)
          throw Error(`Durata MP3 errata: ${key}`);
        result.reused++;
        result.afterBytes += bytes.length;
        continue;
      }
      if (Math.abs(wavDuration(bytes) - asset.durationSeconds) > 0.01)
        throw Error(`Durata WAV errata: ${key}`);
      const stem = basename(asset.audio, ".wav");
      const archive = `audio-masters/poi/${stem}-${asset.audioHash.slice(0, 16)}.wav`;
      const archivePath = resolve(root, archive);
      try {
        const saved = await readFile(archivePath);
        if (sha(saved) !== asset.audioHash)
          throw Error(`Archivio originale differente: ${key}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await writeFile(archivePath, bytes, { flag: "wx" });
      }
      const output = join(temp, "encoded.mp3");
      await run(ffmpeg, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        source,
        "-map_metadata",
        "-1",
        "-ac",
        "1",
        "-ar",
        "24000",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        output,
      ]);
      const compressed = await readFile(output);
      if (
        compressed.length >= bytes.length ||
        Math.abs(mp3Duration(compressed) - asset.durationSeconds) > 0.15
      )
        throw Error(`Compressione non valida: ${key}`);
      const hash = sha(compressed);
      const audio = `/audio/poi/${stem}-64k-${hash.slice(0, 16)}.mp3`;
      await writeFile(resolve(root, `public${audio}`), compressed);
      manifest.entries[key] = {
        ...asset,
        audio,
        audioHash: hash,
        compression: {
          format: "mp3",
          bitrate: 64000,
          channels: 1,
          sampleRate: 24000,
          sourceAudio: asset.audio,
          sourceAudioHash: asset.audioHash,
          sourceFingerprint: asset.fingerprint,
          archive,
        },
      };
      if ((await readFile(manifestPath, "utf8")) !== snapshot)
        throw Error(
          "Il manifest è stato modificato durante la conversione. Riprova dopo la generazione.",
        );
      snapshot = JSON.stringify(manifest, null, 2) + "\n";
      await writeFile(`${manifestPath}.tmp`, snapshot);
      await rename(`${manifestPath}.tmp`, manifestPath);
      result.converted++;
      result.afterBytes += compressed.length;
      notify({
        key,
        converted: result.converted,
        total: Object.keys(manifest.entries).length,
        beforeBytes: bytes.length,
        afterBytes: compressed.length,
      });
    }
    // Delete only backed-up WAVs no longer referenced by the published manifest.
    const references = new Set(
      Object.values(manifest.entries).map((a) => a.audio),
    );
    for (const asset of Object.values(manifest.entries)) {
      const c = asset.compression;
      if (
        !c ||
        !audioPath.test(c.sourceAudio) ||
        !c.sourceAudio.endsWith(".wav") ||
        references.has(c.sourceAudio)
      )
        continue;
      if (!/^audio-masters\/poi\/[a-z0-9-]+\.wav$/.test(c.archive))
        throw Error("Percorso archivio non valido.");
      const archived = await readFile(resolve(root, c.archive));
      if (sha(archived) !== c.sourceAudioHash)
        throw Error("Archivio originale non integro.");
      const source = resolve(root, `public${c.sourceAudio}`);
      try {
        const original = await readFile(source);
        if (sha(original) !== c.sourceAudioHash)
          throw Error("Originale modificato durante la conversione.");
        await unlink(source);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    return result;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
async function main() {
  if (process.argv.length > 2) throw Error("Uso: npm run audio:compress");
  const result = await compressAudioAssets({
    notify: (value) =>
      console.log(`[${value.converted}/${value.total}] Compresso ${value.key}`),
  });
  const mib = (bytes) => (bytes / 1048576).toFixed(1);
  console.log(
    `Compressione completata: ${result.converted} convertiti, ${result.reused} riusati. ${mib(result.beforeBytes)} → ${mib(result.afterBytes)} MiB.`,
  );
  console.log(
    "Originali conservati in audio-masters/. Esegui npm run build per aggiornare l’app.",
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
