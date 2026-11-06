import { mp3Duration } from "./mp3-metadata.js";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULTS = {
  model: "gemini-3.1-flash-tts-preview",
  voice: "Kore",
  instruction:
    "Leggi esattamente il testo seguente in italiano naturale, con voce chiara e calma da audioguida. Non aggiungere introduzioni, commenti o altri contenuti.\n\n",
};
const sha = (value) => createHash("sha256").update(value).digest("hex");
export function fingerprint(text, options = {}) {
  return sha(JSON.stringify({ ...DEFAULTS, ...options, text }));
}
export function audioPlan(catalog, placeId, contentId, options = {}) {
  const place = catalog.places.find((p) => p.id === placeId);
  if (!place) throw new Error(`Luogo sconosciuto: ${placeId}`);
  const content = place.contents.find((c) => c.id === contentId);
  if (!content) throw new Error(`Contenuto sconosciuto: ${contentId}`);
  if (!/^[a-z0-9-]+$/.test(placeId) || !/^[a-z0-9-]+$/.test(contentId))
    throw new Error("ID non valido.");
  const config = { ...DEFAULTS, ...options };
  const hash = fingerprint(content.text, config);
  return {
    key: `${placeId}:${contentId}`,
    text: content.text,
    textHash: sha(content.text),
    fingerprint: hash,
    audio: `/audio/poi/${placeId}-${contentId}-${hash.slice(0, 16)}.wav`,
    ...config,
  };
}
export function pcmToWav(pcm, rate = 24000) {
  if (!Buffer.isBuffer(pcm) || pcm.length < 2 || pcm.length % 2)
    throw new Error("Risposta PCM audio non valida.");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
export function wavDuration(wav) {
  if (
    wav.length < 44 ||
    wav.toString("ascii", 0, 4) !== "RIFF" ||
    wav.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error("Asset WAV non valido.");
  let rate = 0,
    dataLength = 0;
  for (let offset = 12; offset + 8 <= wav.length; ) {
    const type = wav.toString("ascii", offset, offset + 4),
      length = wav.readUInt32LE(offset + 4);
    if (offset + 8 + length > wav.length)
      throw new Error("Asset WAV troncato.");
    if (type === "fmt " && length >= 16) {
      if (wav.readUInt16LE(offset + 8) !== 1)
        throw new Error("WAV PCM richiesto.");
      rate = wav.readUInt32LE(offset + 16);
    }
    if (type === "data") dataLength += length;
    offset += 8 + length + (length % 2);
  }
  const seconds = dataLength / rate;
  if (!Number.isFinite(seconds) || seconds <= 0)
    throw new Error("Durata WAV non valida.");
  return seconds;
}
async function readManifest(root) {
  try {
    const value = JSON.parse(
      await readFile(resolve(root, "public/audio/poi-manifest.json"), "utf8"),
    );
    if (value.version !== 1 || !value.entries)
      throw new Error("Manifest non valido.");
    return value;
  } catch (error) {
    if (error.code === "ENOENT") return { version: 1, entries: {} };
    throw error;
  }
}
export async function reusableAsset(root, plan, manifest) {
  const asset = manifest.entries[plan.key];
  if (asset?.fingerprint !== plan.fingerprint) return false;
  const compressed =
    /^\/audio\/poi\/[a-z0-9-]+\.mp3$/.test(asset.audio) &&
    asset.compression?.sourceFingerprint === plan.fingerprint &&
    asset.compression?.sourceAudio === plan.audio;
  if (asset.audio !== plan.audio && !compressed) return false;
  try {
    const bytes = await readFile(resolve(root, `public${asset.audio}`));
    return (
      sha(bytes) === asset.audioHash &&
      Math.abs(
        (compressed ? mp3Duration(bytes) : wavDuration(bytes)) -
          asset.durationSeconds,
      ) < (compressed ? 0.15 : 0.01)
    );
  } catch {
    return false;
  }
}
export async function generateAudio({
  catalog,
  placeId,
  contentId,
  root = ".",
  apiKey,
  fetcher = fetch,
  force = false,
  options = {},
}) {
  const plan = audioPlan(catalog, placeId, contentId, options);
  const manifest = await readManifest(root);
  if (!force && (await reusableAsset(root, plan, manifest)))
    return { ...manifest.entries[plan.key], reused: true };
  if (!apiKey)
    throw new Error(
      "Imposta GEMINI_API_KEY soltanto per la generazione locale.",
    );
  if (!/^[a-zA-Z0-9.-]+$/.test(plan.model))
    throw new Error("Modello non valido.");
  const response = await fetcher(
    `https://generativelanguage.googleapis.com/v1beta/models/${plan.model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: plan.instruction + plan.text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: plan.voice } },
          },
        },
      }),
    },
  );
  if (!response.ok)
    throw new Error(
      `Generazione non riuscita (HTTP ${response.status}). Nessun asset pubblicato.`,
    );
  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p) =>
    p.inlineData?.mimeType?.toLowerCase().startsWith("audio/"),
  )?.inlineData;
  if (!part?.data)
    throw new Error("La risposta non contiene audio. Nessun asset pubblicato.");
  const bytes = Buffer.from(part.data, "base64");
  let wav;
  if (/^audio\/(wav|x-wav)(;|$)/i.test(part.mimeType)) wav = bytes;
  else if (/^audio\/l16(;|$)/i.test(part.mimeType)) {
    const rate = Number(part.mimeType.match(/rate=(\d+)/i)?.[1] ?? 24000);
    if (rate !== 24000)
      throw new Error("Frequenza PCM non supportata. Nessun asset pubblicato.");
    wav = pcmToWav(bytes, rate);
  } else
    throw new Error("Formato audio non supportato. Nessun asset pubblicato.");
  const durationSeconds = wavDuration(wav);
  const asset = {
    audio: plan.audio,
    durationSeconds,
    textHash: plan.textHash,
    audioHash: sha(wav),
    fingerprint: plan.fingerprint,
    model: plan.model,
    voice: plan.voice,
    generatedAt: new Date().toISOString(),
  };
  const target = resolve(root, `public${plan.audio}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(`${target}.tmp`, wav);
  await rename(`${target}.tmp`, target);
  manifest.entries[plan.key] = asset;
  const manifestPath = resolve(root, "public/audio/poi-manifest.json");
  await writeFile(
    `${manifestPath}.tmp`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await rename(`${manifestPath}.tmp`, manifestPath);
  return { ...asset, reused: false };
}
async function main() {
  const args = process.argv.slice(2);
  const values = {};
  let generate = false,
    dry = false,
    force = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--generate") generate = true;
    else if (args[i] === "--dry-run") dry = true;
    else if (args[i] === "--force") force = true;
    else if (["--place", "--content", "--model", "--voice"].includes(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error(`Valore mancante: ${args[i]}`);
      values[args[i].slice(2)] = args[++i];
    } else throw new Error(`Opzione sconosciuta: ${args[i]}`);
  }
  if (!values.place || !values.content)
    throw new Error(
      "Uso: npm run tts -- --place albertina --content scopri [--dry-run | --generate] [--force]",
    );
  if (generate && dry) throw new Error("Scegli --dry-run oppure --generate.");
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  const options = {};
  if (values.model) options.model = values.model;
  if (values.voice) options.voice = values.voice;
  const plan = audioPlan(catalog, values.place, values.content, options);
  const manifest = await readManifest(".");
  const reuse = !force && (await reusableAsset(".", plan, manifest));
  console.log(
    `${generate ? "Generazione autorizzata" : "dry-run · nessuna chiamata API"} · ${plan.key}\nModello: ${plan.model}, voce: ${plan.voice}\nAsset: ${reuse ? manifest.entries[plan.key].audio : plan.audio}\n${reuse ? "File invariato: riuso disponibile." : "Asset da generare."}`,
  );
  if (!generate) return;
  const result = await generateAudio({
    catalog,
    placeId: values.place,
    contentId: values.content,
    apiKey: process.env.GEMINI_API_KEY,
    force,
    options,
  });
  console.log(
    `${result.reused ? "Riutilizzato" : "Salvato e verificato"} · ${result.durationSeconds.toFixed(1)} secondi. Esegui npm run build per includerlo nell’app.`,
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
