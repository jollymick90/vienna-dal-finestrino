import { audioUrl } from "./audio-storage.js";

export async function textHash(text) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function loadCatalog() {
  const response = await fetch("/catalog.json");
  if (!response.ok)
    throw new Error("Catalogo non disponibile. Riprova con una connessione.");
  const source = await response.text();
  const catalog = JSON.parse(source);
  catalog._catalogHash = await textHash(source);
  let manifest = { entries: {} };
  try {
    const response = await fetch("/audio/poi-manifest.json");
    if (response.ok) {
      const source = await response.text();
      manifest = JSON.parse(source);
      catalog._manifestHash = await textHash(source);
    }
  } catch {
    /* Text remains available even when the optional audio manifest fails. */
  }
  await Promise.all(
    catalog.places.flatMap((p) =>
      p.contents.map(async (c) => {
        const asset = manifest.entries?.[`${p.id}:${c.id}`];
        c.audio = null;
        c.durationSeconds = null;
        if (
          asset &&
          audioUrl(asset.audio) &&
          asset.durationSeconds > 0 &&
          asset.textHash === (await textHash(c.text))
        ) {
          Object.assign(c, {
            audio: audioUrl(asset.audio),
            durationSeconds: asset.durationSeconds,
            audioHash: asset.audioHash,
          });
        }
      }),
    ),
  );
  return catalog;
}
