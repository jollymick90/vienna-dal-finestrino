import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  routeAssets,
  validResponse,
  verifyRoute,
  ROUTE_CACHE,
} from "../src/lib/route-offline.js";
import { pcmToWav } from "../scripts/generate-poi-audio.js";
const sha = (b) => createHash("sha256").update(b).digest("hex");

test("remote pruning keeps other routes and foreign origins while removing obsolete Vienna audio", async () => {
  const { downloadRoute } = await import("../src/lib/route-offline.js");
  const prefix = "https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/";
  const foreign = "https://other.test/audio/poi/foreign.wav";
  const bytes = pcmToWav(Buffer.alloc(48000));
  const current = { version: 1, places: [
    { id: "a", routeIds: ["route"], contents: [{ audio: prefix + "current.wav", audioHash: sha(bytes) }] },
    { id: "b", routeIds: ["other"], contents: [{ audio: prefix + "other.wav", audioHash: sha(bytes) }] },
  ] };
  const canonical = value => new URL(value, "https://guide.test/").href;
  const items = new Map([
    [canonical("/catalog.json"), new Response(JSON.stringify(current), { headers: { "Content-Type": "application/json" } })],
    [canonical("/audio/poi-manifest.json"), new Response('{"version":1,"entries":{}}', { headers: { "Content-Type": "application/json" } })],
    ...["current.wav", "other.wav"].map(name => [prefix + name, new Response(bytes, { headers: { "Content-Type": "audio/wav" } })]),
    [prefix + "obsolete.wav", new Response("old")],
    [canonical("/audio/poi/obsolete.wav"), new Response("old local")],
    [foreign, new Response("unrelated")],
  ]);
  const original = globalThis.caches;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.caches = { open: async () => ({
    match: async value => items.get(canonical(value))?.clone(),
    keys: async () => [...items.keys()].map(url => new Request(url)),
    delete: async request => items.delete(request.url),
  }) };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { serviceWorker: { controller: {} } } });
  try {
    assert.equal((await downloadRoute(current, "route")).ready, true);
    assert.equal(items.has(prefix + "current.wav"), true);
    assert.equal(items.has(prefix + "other.wav"), true);
    assert.equal(items.has(prefix + "obsolete.wav"), false);
    assert.equal(items.has(canonical("/audio/poi/obsolete.wav")), false);
    assert.equal(items.has(foreign), true);
  } finally {
    globalThis.caches = original;
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
    else delete globalThis.navigator;
  }
});

const catalog = {
  places: [
    {
      id: "a",
      routeIds: ["route"],
      contents: [
        {
          audio: "/audio/test.wav",
          audioHash: sha(pcmToWav(Buffer.alloc(48000))),
        },
      ],
    },
    { id: "b", routeIds: ["other"], contents: [{ audio: "/audio/other.wav" }] },
  ],
};
test("route download includes catalog, manifest and only selected route audio", () =>
  assert.deepEqual(routeAssets(catalog, "route"), [
    "/catalog.json",
    "/audio/poi-manifest.json",
    "/audio/test.wav",
  ]));
test("offline validation rejects successful HTML fallback and truncated or missing media", async () => {
  assert.equal(
    await validResponse(
      new Response("<html>fallback</html>", {
        headers: { "Content-Type": "text/html" },
      }),
      "/audio/test.wav",
    ),
    false,
  );
  assert.equal(
    await validResponse(
      new Response("{}", { headers: { "Content-Type": "application/json" } }),
      "/catalog.json",
    ),
    false,
  );
  assert.equal(
    await validResponse(
      new Response(pcmToWav(Buffer.alloc(48000)), {
        headers: { "Content-Type": "audio/wav" },
      }),
      "/audio/test.wav",
    ),
    true,
  );
});
test("verification checks every cached file and the expected byte hash", async () => {
  const items = new Map([
    [
      "/catalog.json",
      new Response(JSON.stringify({ ...catalog, version: 1 }), {
        headers: { "Content-Type": "application/json" },
      }),
    ],
    [
      "/audio/poi-manifest.json",
      new Response('{"version":1,"entries":{}}', {
        headers: { "Content-Type": "application/json" },
      }),
    ],
    [
      "/audio/test.wav",
      new Response(pcmToWav(Buffer.alloc(48000)), {
        headers: { "Content-Type": "audio/wav" },
      }),
    ],
  ]);
  const old = globalThis.caches;
  globalThis.caches = {
    open: async (name) => {
      assert.equal(name, ROUTE_CACHE);
      return { match: async (url) => items.get(url)?.clone() };
    },
  };
  try {
    assert.equal((await verifyRoute(catalog, "route")).ready, true);
    items.set(
      "/audio/test.wav",
      new Response(pcmToWav(Buffer.alloc(48000, 1)), {
        headers: { "Content-Type": "audio/wav" },
      }),
    );
    assert.equal((await verifyRoute(catalog, "route")).ready, false);
  } finally {
    globalThis.caches = old;
  }
});
test("a previous catalog version is not reported as the downloaded current version", async () => {
  const current = { ...catalog, _catalogHash: sha("current catalog") };
  const old = globalThis.caches;
  globalThis.caches = {
    open: async () => ({
      match: async (url) =>
        url === "/catalog.json"
          ? new Response(JSON.stringify({ ...catalog, version: 1 }), {
              headers: { "Content-Type": "application/json" },
            })
          : null,
    }),
  };
  try {
    assert.equal((await verifyRoute(current, "route")).complete, 0);
  } finally {
    globalThis.caches = old;
  }
});

test("successful download removes obsolete POI audio while preserving current assets from other routes", async () => {
  const { downloadRoute } = await import("../src/lib/route-offline.js");
  const bytes = pcmToWav(Buffer.alloc(48000));
  const current = {
    version: 1,
    places: [
      {
        id: "a",
        routeIds: ["route"],
        contents: [{ audio: "/audio/poi/current.wav", audioHash: sha(bytes) }],
      },
      {
        id: "b",
        routeIds: ["other"],
        contents: [{ audio: "/audio/poi/other.wav", audioHash: sha(bytes) }],
      },
    ],
  };
  const items = new Map([
    [
      "/catalog.json",
      new Response(JSON.stringify(current), {
        headers: { "Content-Type": "application/json" },
      }),
    ],
    [
      "/audio/poi-manifest.json",
      new Response('{"version":1,"entries":{}}', {
        headers: { "Content-Type": "application/json" },
      }),
    ],
    [
      "/audio/poi/current.wav",
      new Response(bytes, { headers: { "Content-Type": "audio/wav" } }),
    ],
    [
      "/audio/poi/other.wav",
      new Response(bytes, { headers: { "Content-Type": "audio/wav" } }),
    ],
    ["/audio/poi/old.wav", new Response("old WAV")],
  ]);
  const originalCaches = globalThis.caches,
    descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globalThis.caches = {
    open: async () => ({
      match: async (url) => items.get(url)?.clone(),
      keys: async () =>
        [...items.keys()].map((p) => new Request("https://guide.test" + p)),
      delete: async (request) => items.delete(new URL(request.url).pathname),
    }),
  };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serviceWorker: { controller: {} } },
  });
  try {
    assert.equal((await downloadRoute(current, "route")).ready, true);
    assert.equal(items.has("/audio/poi/old.wav"), false);
    assert.equal(items.has("/audio/poi/current.wav"), true);
    assert.equal(items.has("/audio/poi/other.wav"), true);
  } finally {
    globalThis.caches = originalCaches;
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
    else delete globalThis.navigator;
  }
});
