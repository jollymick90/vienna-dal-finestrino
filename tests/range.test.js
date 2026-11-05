import test from "node:test";
import assert from "node:assert/strict";
import { rangeResponse } from "../src/lib/range.js";

test("cached audio supports bounded, open and suffix byte ranges", async () => {
  for (const [range, expected, contentRange] of [
    ["bytes=2-4", "cde", "bytes 2-4/6"],
    ["bytes=3-", "def", "bytes 3-5/6"],
    ["bytes=-2", "ef", "bytes 4-5/6"],
    ["bytes=0-100", "abcdef", "bytes 0-5/6"],
  ]) {
    const result = await rangeResponse(
      new Response("abcdef", { headers: { "Content-Type": "audio/mpeg" } }),
      range,
    );
    assert.equal(result.status, 206);
    assert.equal(await result.text(), expected);
    assert.equal(result.headers.get("Content-Range"), contentRange);
    assert.equal(result.headers.get("Content-Length"), String(expected.length));
    assert.equal(result.headers.get("Content-Type"), "audio/mpeg");
  }
});
test("invalid and unsatisfiable byte ranges return 416", async () => {
  for (const range of [
    "bytes=9-",
    "bytes=3-1",
    "bytes=-0",
    "garbage",
    "bytes=0-1,3-4",
  ]) {
    const result = await rangeResponse(new Response("abcdef"), range);
    assert.equal(result.status, 416);
    assert.equal(result.headers.get("Content-Range"), "bytes */6");
  }
});
