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
