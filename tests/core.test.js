import test from "node:test";
import assert from "node:assert/strict";
import { matchLeg, pointAt, validFix } from "../src/lib/route.js";
import { TourPlayer } from "../src/lib/player.js";

const fix = (index, metres = 80, timestamp = 100000) => ({
  coords: { ...pointAt(index, metres), accuracy: 10 },
  timestamp,
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
class AudioDouble extends EventTarget {
  src = "";
  currentTime = 0;
  duration = 25;
  paused = true;
  reject = false;
  play() {
    if (this.reject) return Promise.reject(new Error("NotAllowedError"));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  load() {}
  end() {
    this.paused = true;
    this.dispatchEvent(new Event("ended"));
  }
}
function setup() {
  const audio = new AudioDouble();
  let now = 100000;
  const player = new TourPlayer(
    audio,
    () => {},
    () => now,
  );
  return { audio, player, advance: (ms) => (now += ms) };
}

test("matcher accepts each supplied track, departure and arrival margins exclude stops", () => {
  for (let i = 0; i < 8; i++) {
    assert.equal(matchLeg(pointAt(i, 80), i), i);
    assert.equal(matchLeg(pointAt(i, 0), i), null);
    assert.equal(matchLeg(pointAt(i, 20), i), null);
  }
  assert.equal(matchLeg(pointAt(7, Infinity), 7), null);
  assert.equal(matchLeg({ latitude: 0, longitude: 0 }, 0), null);
});
test("matcher only accepts expected or next leg and never goes back", () => {
  assert.equal(matchLeg(pointAt(1, 80), 0), 1);
  assert.equal(matchLeg(pointAt(2, 80), 0), null);
  assert.equal(matchLeg(pointAt(0, 80), 1), null);
});
test("fix quality rejects old, future, inaccurate and malformed coordinates", () => {
  assert.equal(validFix(fix(0), 100000), true);
  assert.equal(validFix(fix(0, 80, 84000), 100000), false);
  assert.equal(validFix(fix(0, 80, 110000), 100000), false);
  for (const accuracy of [46, NaN, -1, Infinity])
    assert.equal(
      validFix({ ...fix(0), coords: { ...fix(0).coords, accuracy } }, 100000),
      false,
    );
  assert.equal(
    validFix(
      {
        coords: { latitude: NaN, longitude: 1, accuracy: 1 },
        timestamp: 100000,
      },
      100000,
    ),
    false,
  );
});
test("transfer stop does not start line 1, departure does", async () => {
  const { audio, player } = setup();
  player.reset(3);
  await player.play(3);
  audio.end();
  player.feed(fix(4, 0));
  await flush();
  assert.equal(player.snapshot().active, null);
  player.feed(fix(4, 80));
  await flush();
  assert.equal(player.snapshot().active, 4);
});
test("audio finishes before latest relevant leg plays; intermediate leg is skipped", async () => {
  const { audio, player } = setup();
  player.feed(fix(0));
  await flush();
  player.feed(fix(1));
  player.feed(fix(2));
  assert.equal(player.snapshot().active, 0);
  audio.end();
  await flush();
  assert.equal(player.snapshot().active, 2);
  assert.deepEqual(player.snapshot().listened, [0, 2]);
  audio.end();
  player.feed(fix(2));
  await flush();
  assert.equal(player.snapshot().phase, "idle");
});
test("out-of-route, inaccurate, or stale latest position cancels queued auto audio", async () => {
  for (const kind of ["outside", "inaccurate", "stale"]) {
    const { audio, player, advance } = setup();
    player.feed(fix(0));
    await flush();
    player.feed(fix(1));
    if (kind === "outside")
      player.feed({
        coords: { latitude: 0, longitude: 0, accuracy: 2 },
        timestamp: 100000,
      });
    if (kind === "inaccurate")
      player.feed({ ...fix(1), coords: { ...fix(1).coords, accuracy: 60 } });
    if (kind === "stale") advance(16000);
    audio.end();
    await flush();
    assert.equal(player.snapshot().phase, "idle");
    assert.deepEqual(player.snapshot().listened, [0]);
  }
});
test("rejected play is not marked heard, retry starts and records exactly once", async () => {
  const { audio, player } = setup();
  audio.reject = true;
  player.feed(fix(0));
  await flush();
  assert.equal(player.snapshot().phase, "blocked");
  assert.deepEqual(player.snapshot().listened, []);
  audio.reject = false;
  await player.play(0);
  assert.equal(player.snapshot().phase, "playing");
  assert.deepEqual(player.snapshot().listened, [0]);
  player.pause();
  assert.equal(player.snapshot().phase, "paused");
  await player.resume();
  assert.deepEqual(player.snapshot().listened, [0]);
});
test("late play completion cannot mark a cancelled leg as heard", async () => {
  const { audio, player } = setup();
  let resolve;
  audio.play = () => new Promise((r) => (resolve = r));
  const attempt = player.play(0);
  player.reset(3);
  resolve();
  await attempt;
  assert.deepEqual(player.snapshot().listened, []);
  assert.equal(player.snapshot().active, null);
});
test("manual resync allows explicit backward selection and retains heard history", async () => {
  const { player } = setup();
  await player.play(5);
  player.reset(1);
  player.feed(fix(1));
  await flush();
  assert.equal(player.snapshot().cursor, 1);
  assert.equal(player.snapshot().active, 1);
  assert.deepEqual(player.snapshot().listened, [5, 1]);
});

test("blocked automatic audio follows the current leg before gesture retry", async () => {
  const { audio, player } = setup();
  audio.reject = true;
  player.feed(fix(0));
  await flush();
  player.feed(fix(1));
  await flush();
  audio.reject = false;
  await player.resume();
  assert.equal(audio.src, "/audio/02.mp3");
  assert.deepEqual(player.snapshot().listened, [1]);
});
test("pending automatic audio is replaced when GPS advances before audio starts", async () => {
  const { audio, player } = setup();
  const attempts = [];
  audio.play = () => new Promise((resolve) => attempts.push(resolve));
  player.feed(fix(0));
  player.feed(fix(1));
  assert.equal(audio.src, "/audio/02.mp3");
  attempts.forEach((resolve) => resolve());
  await flush();
  assert.deepEqual(player.snapshot().listened, [1]);
});
test("pending automatic audio is cancelled when latest fix is no longer relevant", async () => {
  const { audio, player } = setup();
  let resolve;
  audio.play = () => new Promise((r) => (resolve = r));
  player.feed(fix(0));
  player.feed({
    coords: { latitude: 0, longitude: 0, accuracy: 5 },
    timestamp: 100000,
  });
  resolve();
  await flush();
  assert.deepEqual(player.snapshot().listened, []);
  assert.equal(player.snapshot().phase, "idle");
});

test("buffered automatic start is abandoned if the last fix expires before play resolves", async () => {
  const { audio, player, advance } = setup();
  let resolve;
  audio.play = () => new Promise((r) => (resolve = r));
  player.feed(fix(0));
  advance(16000);
  resolve();
  await flush();
  assert.deepEqual(player.snapshot().listened, []);
  assert.equal(player.snapshot().phase, "idle");
});

test('text-only tour never attempts playback or marks a story heard', async () => {
  const audio = new AudioDouble();
  const player = new TourPlayer(audio,()=>{},()=>100000,{tour:[{audio:null}]});
  player.feed(fix(0));await flush();await player.play(0);
  assert.equal(audio.src,'');assert.equal(audio.paused,true);
  assert.deepEqual(player.snapshot().listened,[]);
  assert.equal(player.snapshot().phase,'idle');
});
