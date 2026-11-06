import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { publishAudio, signedStorageRequest } from "../scripts/publish-audio.js";
const bytes = await readFile("public/audio/01.mp3");
const hash = createHash("sha256").update(bytes).digest("hex");
const manifest = { version: 1, entries: { "a:scopri": { audio: "/audio/poi/a.mp3", audioHash: hash } } };

test("publisher rejects corruption and unrelated paths before performing any request", async () => {
  let calls = 0;
  const options = { manifest, readAsset: async () => Buffer.from("bad"), request: async () => { calls++; } };
  await assert.rejects(publishAudio(options), /hash/i);
  for (const audio of ["/audio/carousel/a.mp3", "/audio/poi/../a.mp3", "https://evil.test/a.mp3", "/audio/poi/a.wav"])
    await assert.rejects(publishAudio({ ...options, manifest: { version: 1, entries: { a: { audio, audioHash: hash } } } }), /MP3|percorso/i);
  assert.equal(calls, 0);
});

test("publisher uploads only to Vienna, verifies bytes and reuses an identical remote object", async () => {
  const methods = [];
  let stored = false;
  const request = async (url, options) => {
    assert.equal(url, "https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/a.mp3");
    methods.push(options.method);
    if (options.method === "HEAD") return new Response(null, { status: stored ? 200 : 404 });
    if (options.method === "PUT") {
      stored = true;
      assert.deepEqual(options.body, bytes);
      assert.equal(options.headers["Content-Type"], "audio/mpeg");
      assert.match(options.headers["Cache-Control"], /immutable/);
      return new Response(null);
    }
    assert.equal(options.method, "GET");
    return new Response(bytes, { headers: { "Content-Type": "audio/mpeg" } });
  };
  const first = await publishAudio({ manifest, readAsset: async () => bytes, request });
  assert.equal(first.uploaded, 1);
  assert.deepEqual(methods, ["HEAD", "PUT", "GET"]);
  methods.length = 0;
  assert.equal((await publishAudio({ manifest, readAsset: async () => bytes, request })).reused, 1);
  assert.deepEqual(methods, ["HEAD", "GET"]);
  await assert.rejects(publishAudio({ manifest, readAsset: async () => bytes, request: async (_, o) => o.method === "HEAD" ? new Response(null) : new Response("corrupt") }), /hash/i);
});

test("S3 signer refuses writes outside the dedicated bucket and unsupported methods", async () => {
  let calls = 0;
  const credentials = { accessKey: "test", secretKey: "secret" };
  const options = { credentials, fetcher: async () => { calls++; return new Response(null); }, now: new Date("2026-11-06T07:00:00Z") };
  await assert.rejects(signedStorageRequest("https://media-hidrospace.jm90dev.cloud/carousel/a.mp3", { method: "PUT" }, options), /percorso|Vienna/i);
  await assert.rejects(signedStorageRequest("https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/a.mp3", { method: "DELETE" }, options), /metodo/i);
  assert.equal(calls, 0);
  await signedStorageRequest("https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/a.mp3", { method: "HEAD" }, { ...options, fetcher: async (_, init) => {
    assert.match(init.headers.Authorization, /^AWS4-HMAC-SHA256 Credential=test\/20261106\/us-east-1\/s3\/aws4_request/);
    assert.equal(init.headers["x-amz-date"], "20261106T070000Z");
    return new Response(null);
  } });
});
