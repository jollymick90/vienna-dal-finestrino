import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { audioUrl, isRemoteAudioUrl } from "../src/lib/audio-storage.js";
import { mp3Duration } from "./mp3-metadata.js";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();

export async function signedStorageRequest(url, init, {
  credentials,
  fetcher = fetch,
  now = new Date(),
} = {}) {
  if (!isRemoteAudioUrl(url)) throw new Error("Percorso esterno allo storage Vienna.");
  if (!["HEAD", "GET", "PUT"].includes(init.method)) throw new Error("Metodo storage non consentito.");
  if (!credentials?.accessKey || !credentials?.secretKey)
    throw new Error("Credenziali del publisher Vienna mancanti.");
  const parsed = new URL(url);
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = timestamp.slice(0, 8);
  const payloadHash = sha(init.body || "");
  const canonicalHeaders = {
    host: parsed.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": timestamp,
  };
  for (const [name, value] of Object.entries(init.headers || {}))
    canonicalHeaders[name.toLowerCase()] = String(value).trim();
  const names = Object.keys(canonicalHeaders).sort();
  const signedHeaders = names.join(";");
  const canonical = [init.method, parsed.pathname, "", names.map(name => `${name}:${canonicalHeaders[name]}\n`).join(""), signedHeaders, payloadHash].join("\n");
  const scope = `${day}/us-east-1/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${scope}\n${sha(canonical)}`;
  const key = hmac(hmac(hmac(hmac(`AWS4${credentials.secretKey}`, day), "us-east-1"), "s3"), "aws4_request");
  const signature = hmac(key, stringToSign).toString("hex");
  const headers = { ...init.headers, "x-amz-content-sha256": payloadHash, "x-amz-date": timestamp,
    Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` };
  return fetcher(url, { ...init, headers, redirect: "error", signal: AbortSignal.timeout(60000) });
}

export async function publishAudio({ manifest, readAsset, request, notify = () => {} }) {
  if (manifest.version !== 1 || !manifest.entries) throw new Error("Manifest non valido.");
  // Validate the entire batch before making the first remote request.
  const files = [];
  for (const asset of Object.values(manifest.entries)) {
    if (!/^\/audio\/poi\/[a-z0-9-]+\.mp3$/.test(asset.audio))
      throw new Error("Pubblicazione consentita soltanto per un percorso MP3 POI.");
    const bytes = await readAsset(asset.audio);
    if (sha(bytes) !== asset.audioHash) throw new Error(`Hash locale errato: ${asset.audio}`);
    mp3Duration(bytes);
    files.push({ ...asset, bytes, url: audioUrl(asset.audio) });
  }
  const result = { uploaded: 0, reused: 0, bytes: 0 };
  for (const file of files) {
    const head = await request(file.url, { method: "HEAD" });
    if (head.status === 404) {
      const response = await request(file.url, { method: "PUT", body: file.bytes, headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-amz-meta-sha256": file.audioHash,
      } });
      if (!response.ok) throw new Error(`Upload non riuscito (HTTP ${response.status}): ${file.audio}`);
      result.uploaded++;
    } else if (head.status === 200) result.reused++;
    else throw new Error(`Verifica storage non riuscita (HTTP ${head.status}): ${file.audio}`);
    const response = await request(file.url, { method: "GET" });
    if (!response.ok || sha(Buffer.from(await response.arrayBuffer())) !== file.audioHash)
      throw new Error(`Hash remoto errato: ${file.audio}`);
    result.bytes += file.bytes.length;
    notify({ ...result, path: file.audio, total: files.length });
  }
  return result;
}

async function main() {
  const manifest = JSON.parse(await readFile("public/audio/poi-manifest.json", "utf8"));
  const credentials = { accessKey: process.env.VIENNA_STORAGE_ACCESS_KEY, secretKey: process.env.VIENNA_STORAGE_SECRET_KEY };
  const result = await publishAudio({
    manifest,
    readAsset: path => readFile(`public${path}`),
    request: (url, init) => signedStorageRequest(url, init, { credentials }),
    notify: ({ uploaded, reused, total }) => console.log(`Verificati ${uploaded + reused}/${total}`),
  });
  console.log(JSON.stringify(result));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
