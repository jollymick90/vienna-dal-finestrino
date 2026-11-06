import { readdir, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
// POI media is served directly by MinIO; keep local sources out of deployments.
await rm("dist/audio/poi", { recursive: true, force: true });
const files = (await walk("dist")).filter((f) => !f.endsWith("/sw.js")).sort();
const hash = createHash("sha256");
for (const file of files) hash.update(file).update(await readFile(file));
const range = (await readFile("src/lib/range.js", "utf8")).replace(
  "export async function",
  "async function",
);
const worker = await readFile("src/service-worker.js", "utf8");
const audioStorage = (await readFile("src/lib/audio-storage.js", "utf8")).replace(/^export /gm, "");
hash.update(range).update(worker).update(audioStorage);
const assets = ["/", ...files.filter(f => !f.startsWith("dist/audio/") || f.endsWith("/poi-manifest.json")).map((f) => f.slice(4))];
await writeFile(
  "dist/sw.js",
  `const CACHE_NAME = 'vienna-tour-${hash.digest("hex").slice(0, 16)}';\nconst ASSETS = ${JSON.stringify(assets)};\n${audioStorage}\n${range}\n${worker}`,
);
console.log(
  `Service worker: ${assets.length} asset per app e testi; audio scaricabili su richiesta.`,
);
