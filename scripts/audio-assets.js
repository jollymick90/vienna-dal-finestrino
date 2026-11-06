import { readFile } from "node:fs/promises";
import { audioUrl, isRemoteAudioUrl } from "../src/lib/audio-storage.js";

export async function readAudioAsset(path, {
  readLocal = (path) => readFile(`public${path}`),
  fetcher = fetch,
  published = false,
} = {}) {
  const remote = audioUrl(path);
  if (!remote) throw new Error("Percorso audio non valido.");
  if (!published || !isRemoteAudioUrl(remote)) {
    try {
      return await readLocal(path);
    } catch (error) {
      if (error.code !== "ENOENT" || !isRemoteAudioUrl(remote)) throw error;
    }
  }
  const response = await fetcher(remote, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get("Content-Type")?.startsWith("audio/"))
    throw new Error(`Asset audio remoto non disponibile: ${path} (HTTP ${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}
