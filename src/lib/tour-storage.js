import { validateTour, collectAudio, toRuntimeTour } from "./tour-package.js";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("vienna-tour-library", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("tours", { keyPath: "manifest.id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Chiudi le altre schede del tour e riprova."));
  });
}
async function transaction(mode, action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tours", mode);
    let request;
    tx.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Salvataggio interrotto."));
    };
    try {
      request = action(tx.objectStore("tours"));
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}
export async function listTours() {
  const records = await transaction("readonly", (store) => store.getAll());
  return records.map(({ manifest }) => ({
    id: manifest.id,
    title: manifest.title,
  }));
}
export const getTour = (id) =>
  transaction("readonly", (store) => store.get(id));
export const deleteTour = (id) =>
  transaction("readwrite", (store) => store.delete(id));

async function measureAudio(file) {
  const url = URL.createObjectURL(file.blob);
  const audio = document.createElement("audio");
  audio.preload = "metadata";
  try {
    return await new Promise((resolve, reject) => {
      const fail = () =>
        reject(
          new Error(`Audio non leggibile: ${file.name}. Usa un MP3 valido.`),
        );
      const timeout = setTimeout(fail, 10000);
      const clear = () => clearTimeout(timeout);
      audio.onloadedmetadata = () => {
        clear();
        if (Number.isFinite(audio.duration) && audio.duration > 0)
          resolve(audio.duration);
        else fail();
      };
      audio.onerror = () => {
        clear();
        fail();
      };
      audio.src = url;
    });
  } finally {
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  }
}
export async function importTourFiles(files) {
  const json = files.filter((file) =>
    file.name.toLowerCase().endsWith(".json"),
  );
  if (json.length !== 1)
    throw new Error("Seleziona un solo JSON del percorso e tutti i suoi MP3.");
  if (json[0].size > 10 * 1024 * 1024)
    throw new Error("Il JSON supera 10 MB. Riduci i punti del tracciato.");
  let source;
  try {
    source = JSON.parse(await json[0].text());
  } catch {
    throw new Error("Il file JSON non è valido.");
  }
  const manifest = validateTour(source);
  if (await getTour(manifest.id))
    throw new Error(
      "Un percorso con questo id è già presente. Cambia id nel JSON per importarne una nuova versione.",
    );
  const audio = collectAudio(
    manifest,
    files.filter((file) => file !== json[0]),
  );
  const durations = new Map();
  for (const file of audio) durations.set(file.name, await measureAudio(file));
  manifest.legs.forEach(
    (leg) => (leg.durationSeconds = durations.get(leg.audio)),
  );
  try {
    await transaction("readwrite", (store) => store.add({ manifest, audio }));
  } catch (error) {
    if (error?.name === "QuotaExceededError")
      throw new Error(
        "Spazio sul dispositivo insufficiente. Libera spazio o importa un percorso più piccolo.",
      );
    if (error?.name === "ConstraintError")
      throw new Error("Questo percorso è già presente.");
    throw error;
  }
  return manifest.id;
}
export function materializeTour(record) {
  if (!record?.manifest || !Array.isArray(record.audio))
    throw new Error("Percorso salvato non disponibile. Importalo di nuovo.");
  const files = collectAudio(
    record.manifest,
    record.audio.map(
      ({ name, blob }) => new File([blob], name, { type: "audio/mpeg" }),
    ),
  );
  const urls = new Map(
    files.map((file) => [file.name, URL.createObjectURL(file.blob)]),
  );
  return {
    tour: toRuntimeTour(record.manifest, (name) => urls.get(name)),
    release: () => urls.forEach((url) => URL.revokeObjectURL(url)),
  };
}
export function rememberedTour() {
  try {
    return localStorage.getItem("vienna-selected-tour");
  } catch {
    return null;
  }
}
export function rememberTour(id) {
  try {
    localStorage.setItem("vienna-selected-tour", id);
  } catch {
    /* Selection persistence is optional; IndexedDB remains authoritative. */
  }
}
