import { readdir, readFile, writeFile } from "node:fs/promises";
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
const files = (await walk("dist")).filter((f) => !f.endsWith("/sw.js")).sort();
const hash = createHash("sha256");
for (const file of files) hash.update(file).update(await readFile(file));
const range = (await readFile("src/lib/range.js", "utf8")).replace(
  "export async function",
  "async function",
);
const worker = await readFile("src/service-worker.js", "utf8");
hash.update(range).update(worker);
const assets = ["/", ...files.map((f) => f.slice(4))];
await writeFile(
  "dist/sw.js",
  `const CACHE_NAME = 'vienna-tour-${hash.digest("hex").slice(0, 16)}';\nconst ASSETS = ${JSON.stringify(assets)};\n${range}\n${worker}`,
);
console.log(
  `Service worker: ${assets.length} asset da precaricare, inclusi 8 MP3.`,
);
