import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
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
