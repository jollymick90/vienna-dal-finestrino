import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { isRemoteAudioUrl } from "../src/lib/audio-storage.js";
import { rangeResponse } from "../src/lib/range.js";

test("offline remote audio serves cached ranges and ignores every other remote resource", async () => {
  const handlers = {};
  const url = "https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/test.mp3";
  const sandbox = {
    self: { location: { origin: "https://guide.test" }, addEventListener: (name, handler) => handlers[name] = handler },
    CACHE_NAME: "shell", isRemoteAudioUrl, rangeResponse, URL, Response,
    caches: { open: async (name) => ({ match: async (request) => name !== "shell" && request.url === url ? new Response("0123456789", { headers: { "Content-Type": "audio/mpeg" } }) : undefined }) },
    fetch: async () => { throw new Error("offline"); },
  };
  vm.runInNewContext(await readFile("src/service-worker.js", "utf8"), sandbox);
  let result;
  handlers.fetch({ request: new Request(url, { headers: { Range: "bytes=2-5" } }), respondWith: value => result = value });
  assert.ok(result, "remote audio must be intercepted");
  const response = await result;
  assert.equal(response.status, 206);
  assert.equal(await response.text(), "2345");
  for (const other of [url.replace("vienna-audio", "carousel"), "https://tile.openstreetmap.org/1/1/1.png"]) {
    let intercepted = false;
    handlers.fetch({ request: new Request(other), respondWith: () => intercepted = true });
    assert.equal(intercepted, false);
  }
});
test("an explicit route refresh bypasses old worker cache bytes", async () => {
  const handlers = {};
  let network = 0;
  const sandbox = {
    self: {
      location: { origin: "https://guide.test" },
      addEventListener: (name, handler) => (handlers[name] = handler),
    },
    CACHE_NAME: "shell",
    caches: {
      open: async (name) => ({
        match: async () =>
          name === "shell" ? undefined : new Response("old bytes"),
      }),
    },
    fetch: async () => {
      network++;
      return new Response("new bytes");
    },
    URL,
    Response,
    rangeResponse: (r) => r,
  };
  vm.runInNewContext(await readFile("src/service-worker.js", "utf8"), sandbox);
  let result;
  handlers.fetch({
    request: new Request("https://guide.test/audio/poi/test.wav", {
      cache: "reload",
      headers: { "X-Vienna-Refresh": "1" },
    }),
    respondWith: (promise) => (result = promise),
  });
  assert.equal(await (await result).text(), "new bytes");
  assert.equal(network, 1);
});
test("normal browser reload still serves the app shell when offline", async () => {
  const handlers = {};
  const sandbox = {
    self: {
      location: { origin: "https://guide.test" },
      addEventListener: (name, handler) => (handlers[name] = handler),
    },
    CACHE_NAME: "shell",
    caches: {
      open: async () => ({ match: async () => new Response("app shell") }),
    },
    fetch: async () => {
      throw Error("offline");
    },
    URL,
    Response,
    rangeResponse: (r) => r,
  };
  vm.runInNewContext(await readFile("src/service-worker.js", "utf8"), sandbox);
  let result;
  handlers.fetch({
    request: new Request("https://guide.test/", { cache: "reload" }),
    respondWith: (promise) => (result = promise),
  });
  assert.equal(await (await result).text(), "app shell");
});
