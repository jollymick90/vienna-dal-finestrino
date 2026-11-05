export const ROUTE_CACHE = "vienna-poi-downloads-v1";
const MANIFEST = "/audio/poi-manifest.json";
export function routeAssets(catalog, routeId) {
  return [
    "/catalog.json",
    MANIFEST,
    ...new Set(
      catalog.places
        .filter((p) => p.routeIds.includes(routeId))
        .flatMap((p) => p.contents.filter((c) => c.audio).map((c) => c.audio)),
    ),
  ];
}
export async function validResponse(response, url) {
  if (!response || response.status !== 200) return false;
  const type = response.headers.get("Content-Type") || "";
  if (url.endsWith(".json")) {
    if (!type.includes("json")) return false;
    try {
      const data = await response.clone().json();
      return url === MANIFEST
        ? data.version === 1 && !!data.entries
        : data.version === 1 &&
            Array.isArray(data.places) &&
            data.places.length > 0;
    } catch {
      return false;
    }
  }
  if (!type.startsWith("audio/")) return false;
  const bytes = new Uint8Array(await response.clone().arrayBuffer());
  const start = String.fromCharCode(...bytes.slice(0, 4));
  return (
    bytes.length > 1000 &&
    (start === "RIFF" ||
      start.startsWith("ID3") ||
      (bytes[0] === 255 && (bytes[1] & 224) === 224))
  );
}
async function matchesAudio(response, url, catalog) {
  const expected =
    url === "/catalog.json"
      ? catalog._catalogHash
      : url === MANIFEST
        ? catalog._manifestHash
        : null;
  if (expected) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await response.clone().arrayBuffer(),
    );
    return (
      [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("") === expected
    );
  }
  const content = catalog.places
    .flatMap((p) => p.contents)
    .find((c) => c.audio === url);
  if (!content?.audioHash) return true;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    await response.clone().arrayBuffer(),
  );
  return (
    [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("") === content.audioHash
  );
}
export async function verifyRoute(catalog, routeId) {
  if (!("caches" in globalThis)) return { ready: false, complete: 0, total: 0 };
  const cache = await caches.open(ROUTE_CACHE);
  const urls = routeAssets(catalog, routeId);
  let complete = 0;
  for (const url of urls) {
    const response = await cache.match(url);
    if (
      (await validResponse(response, url)) &&
      (await matchesAudio(response, url, catalog))
    )
      complete++;
  }
  return {
    ready: complete === urls.length,
    complete,
    total: urls.length,
    audioCount: urls.length - 2,
  };
}
export async function downloadRoute(catalog, routeId, notify = () => {}) {
  if (!("caches" in globalThis))
    throw new Error(
      "Download non disponibile in questo browser. Usa una connessione HTTPS.",
    );
  if (!navigator.serviceWorker?.controller)
    throw new Error(
      "Preparazione offline in corso. Attendi qualche secondo e riprova.",
    );
  const cache = await caches.open(ROUTE_CACHE);
  const urls = routeAssets(catalog, routeId);
  for (const [index, url] of urls.entries()) {
    notify({ complete: index, total: urls.length, current: url });
    const cached = await cache.match(url);
    if (
      !(await validResponse(cached, url)) ||
      !(await matchesAudio(cached, url, catalog))
    ) {
      const response = await fetch(url, {
        cache: "reload",
        headers: { "X-Vienna-Refresh": "1" },
      });
      if (
        !(await validResponse(response, url)) ||
        !(await matchesAudio(response, url, catalog))
      )
        throw new Error(
          "Un contenuto non è stato scaricato. Controlla la rete e riprova.",
        );
      await cache.put(url, response);
    }
    notify({ complete: index + 1, total: urls.length, current: url });
  }
  const result = await verifyRoute(catalog, routeId);
  if (!result.ready)
    throw new Error("Verifica offline incompleta. Riprova il download.");
  return result;
}
