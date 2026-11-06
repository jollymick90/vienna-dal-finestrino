import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  audioPlan,
  reusableAsset,
  generateAudio,
} from "./generate-poi-audio.js";

/** Serial writes preserve the shared manifest; each completed asset is a checkpoint. */
export async function generateBatch({
  catalog,
  root = ".",
  generate = false,
  apiKey,
  fetcher = fetch,
  options = {},
  notify = () => {},
}) {
  const manifest = JSON.parse(
    await readFile(resolve(root, "public/audio/poi-manifest.json"), "utf8"),
  );
  const items = [];
  for (const place of catalog.places)
    for (const content of place.contents) {
      const plan = audioPlan(catalog, place.id, content.id, options);
      items.push({
        placeId: place.id,
        contentId: content.id,
        plan,
        reusable: await reusableAsset(root, plan, manifest),
      });
    }
  const result = {
    total: items.length,
    reused: 0,
    generated: 0,
    toGenerate: items.filter((item) => !item.reusable).length,
  };
  if (!generate) return { ...result, reused: items.length - result.toGenerate };
  if (result.toGenerate && !apiKey)
    throw Error(
      "GEMINI_API_KEY non disponibile. Usa la shell in cui è esportata oppure node --env-file=.env.local.",
    );
  for (const [index, item] of items.entries()) {
    notify({
      index: index + 1,
      total: items.length,
      key: item.plan.key,
      phase: item.reusable ? "reuse" : "generating",
    });
    try {
      const asset = await generateAudio({
        catalog,
        root,
        placeId: item.placeId,
        contentId: item.contentId,
        apiKey,
        fetcher,
        options,
      });
      result[asset.reused ? "reused" : "generated"]++;
      notify({
        index: index + 1,
        total: items.length,
        key: item.plan.key,
        phase: "done",
        reused: asset.reused,
        durationSeconds: asset.durationSeconds,
      });
    } catch (error) {
      throw Error(
        `${item.plan.key}: ${error.message} I file completati sono conservati; riesegui il comando per riprendere.`,
      );
    }
  }
  return result;
}
async function main() {
  const args = process.argv.slice(2),
    options = {};
  let generate = false,
    dry = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--generate") generate = true;
    else if (args[i] === "--dry-run") dry = true;
    else if (["--model", "--voice"].includes(args[i])) {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw Error(`Valore mancante: ${args[i]}`);
      options[args[i].slice(2)] = args[++i];
    } else throw Error(`Opzione sconosciuta: ${args[i]}`);
  }
  if (generate && dry) throw Error("Scegli --generate oppure --dry-run.");
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  const result = await generateBatch({
    catalog,
    generate,
    apiKey: generate ? process.env.GEMINI_API_KEY : undefined,
    options,
    notify: (value) => {
      if (value.phase === "generating")
        console.log(
          `[${value.index}/${value.total}] Generazione ${value.key}…`,
        );
      if (value.phase === "done")
        console.log(
          `[${value.index}/${value.total}] ${value.reused ? "Riusato" : "Salvato"} ${value.key} · ${value.durationSeconds.toFixed(1)} s`,
        );
    },
  });
  console.log(
    `${generate ? "Generazione conclusa" : "dry-run · nessuna chiamata API"}: ${result.total} contenuti, ${result.reused} riusati, ${generate ? result.generated : result.toGenerate} ${generate ? "generati" : "da generare"}.`,
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
