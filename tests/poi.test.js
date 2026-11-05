import test from "node:test";
import assert from "node:assert/strict";
import { createProximity } from "../src/lib/proximity.js";
import { PoiPlayer } from "../src/lib/poi-player.js";
const place = (id, lon = 16.36, routes = ["a"]) => ({
  id,
  name: id,
  location: { latitude: 48.21, longitude: lon },
  routeIds: routes,
  contents: [
    { id: "scopri", title: "Scopri", text: "Testo", audio: "/audio/01.mp3" },
  ],
});
const fix = (now, lon = 16.36, accuracy = 5) => ({
  timestamp: now,
  coords: { latitude: 48.21, longitude: lon, accuracy },
});
test("one nearby proposal, dismissal cooldown and hysteresis prevent edge repeats", () => {
  let now = 100000;
  const p = createProximity({
    places: [place("a"), place("b", 16.3601)],
    now: () => now,
    config: {
      enterMeters: 100,
      exitMeters: 160,
      minIntervalMs: 1000,
      revisitMs: 10000,
    },
  });
  assert.equal(p.feed(fix(now)).id, "a");
  p.dismiss();
  assert.equal(p.feed(fix(now)), null);
  now += 2000;
  assert.equal(p.feed(fix(now, 16.3615)), null);
  now += 11000;
  assert.equal(p.feed(fix(now, 16.3613))?.id, "b"); // a stays inside its exit boundary
  p.dismiss();
  now += 11000;
  p.feed(fix(now, 16.37));
  now += 11000;
  assert.equal(p.feed(fix(now))?.id, "a");
});
test("bad, stale, future and out-of-order fixes never create a proposal", () => {
  let now = 100000;
  const p = createProximity({ places: [place("a")], now: () => now });
  for (const f of [fix(now - 16000), fix(now + 1), fix(now, 16.36, 80)])
    assert.equal(p.feed(f), null);
  assert.equal(p.feed(fix(now)).id, "a");
  p.dismiss();
  now += 1000;
  assert.equal(p.feed(fix(now - 2000)), null);
});
test("ranking considers selected route, heard and relevance; busy never interrupts", () => {
  const now = 100000;
  const p = createProximity({
    places: [place("other", 16.36, ["b"]), place("route", 16.3601)],
    now: () => now,
  });
  assert.equal(p.feed(fix(now), { routeId: "a", busy: true }), null);
  assert.equal(p.feed(fix(now), { routeId: "a" }).id, "route");
  const q = createProximity({
    places: [place("heard"), place("fresh", 16.3601)],
    now: () => now,
  });
  assert.equal(q.feed(fix(now), { heard: ["heard:scopri"] }).id, "fresh");
});
test("tram rules require forward progress on track, not stationary or reverse fixes", () => {
  let now = 100000;
  const a = place("a");
  a.suggestion = {
    tram: { pathIndex: 0, fromMeters: 20, toMeters: 300, direction: 1 },
  };
  const p = createProximity({
    places: [a],
    paths: [
      [
        [48.21, 16.36],
        [48.21, 16.37],
      ],
    ],
    now: () => now,
  });
  assert.equal(p.feed(fix(now, 16.3605)), null);
  now += 5000;
  assert.equal(p.feed(fix(now, 16.3605)), null);
  now += 5000;
  assert.equal(p.feed(fix(now, 16.361))?.id, "a");
  const q = createProximity({
    places: [a],
    paths: [
      [
        [48.21, 16.36],
        [48.21, 16.37],
      ],
    ],
    now: () => now,
  });
  q.feed(fix(now, 16.361));
  now += 5000;
  assert.equal(q.feed(fix(now, 16.3605)), null);
});
class Audio extends EventTarget {
  src = "";
  currentTime = 0;
  duration = 30;
  paused = true;
  calls = 0;
  reject = false;
  play() {
    this.calls++;
    if (this.reject) return Promise.reject(new Error());
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
test("manual player persists history, seeks, retries failure and never plays missing audio", async () => {
  const a = place("a"),
    b = place("b");
  b.contents[0].audio = null;
  const media = new Audio();
  const saved = new Map();
  const storage = {
    getItem: (k) => saved.get(k),
    setItem: (k, v) => saved.set(k, v),
  };
  const p = new PoiPlayer(media, [a, b], () => {}, storage);
  await p.playContent(b, b.contents[0]);
  assert.equal(media.calls, 0);
  media.reject = true;
  await p.playContent(a, a.contents[0]);
  assert.equal(p.snapshot().phase, "blocked");
  assert.equal(p.snapshot().heardIds.length, 0);
  media.reject = false;
  await p.resume();
  assert.deepEqual(p.snapshot().heardIds, ["a:scopri"]);
  p.seek(12);
  assert.equal(media.currentTime, 12);
  p.pause();
  assert.equal(media.paused, true);
  await p.resume();
  assert.equal(media.paused, false);
  p.close();
  assert.equal(p.snapshot().active, null);
  const q = new PoiPlayer(new Audio(), [a], () => {}, storage);
  assert.deepEqual(q.snapshot().heardIds, ["a:scopri"]);
  q.dispose();
  p.dispose();
});
test("denied local storage keeps manual player usable", async () => {
  const a = place("a");
  const storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  const p = new PoiPlayer(new Audio(), [a], () => {}, storage);
  await p.playContent(a, a.contents[0]);
  assert.equal(p.snapshot().phase, "playing");
  assert.equal(p.snapshot().storageError, true);
  p.dispose();
});
test("directional suggestions reject a current fix outside the tram corridor", () => {
  let now = 100000;
  const a = place("a");
  a.suggestion = {
    tram: { pathIndex: 0, fromMeters: 20, toMeters: 300, direction: 1 },
  };
  const p = createProximity({
    places: [a],
    paths: [
      [
        [48.21, 16.36],
        [48.21, 16.37],
      ],
    ],
    now: () => now,
  });
  p.feed(fix(now, 16.3605));
  now += 5000;
  assert.equal(
    p.feed({
      timestamp: now,
      coords: { latitude: 48.21072, longitude: 16.361, accuracy: 5 },
    }),
    null,
  );
});
test("a route suggestion anchor supplements on-site proximity for walkers", () => {
  const now = 100000,
    a = place("courtyard", 16.363);
  a.suggestion = {
    location: { latitude: 48.21, longitude: 16.36 },
    enterMeters: 75,
    exitMeters: 150,
  };
  const atSite = createProximity({ places: [a], now: () => now });
  assert.equal(atSite.feed(fix(now, 16.363))?.id, "courtyard");
  const atRoute = createProximity({ places: [a], now: () => now });
  assert.equal(atRoute.feed(fix(now))?.id, "courtyard");
});
test("a delayed obsolete fix does not clear a fresh active proposal", () => {
  const now = 100000,
    p = createProximity({ places: [place("a")], now: () => now });
  assert.equal(p.feed(fix(now))?.id, "a");
  assert.equal(p.feed(fix(now - 20000))?.id, "a");
});
test('unavailable storage is explicitly reported after playback',async()=>{
 const p=new PoiPlayer(new Audio(),[place('a')],()=>{},null);await p.playContent(place('a'),place('a').contents[0]);assert.equal(p.snapshot().storageError,true);p.dispose();
});
