import test from "node:test";
import assert from "node:assert/strict";
import {
  validateTour,
  collectAudio,
  tourGroups,
  toRuntimeTour,
} from "../src/lib/tour-package.js";
import { createRouteMatcher } from "../src/lib/route.js";
import { TourPlayer } from "../src/lib/player.js";

const manifest = () => ({
  version: 1,
  id: "tram-d",
  title: "Sul tram D",
  description: "Dal centro verso nord",
  attribution: "Dati del percorso di prova",
  legs: Array.from({ length: 10 }, (_, i) => ({
    line: "D",
    direction: "Nußdorf",
    from: `Fermata ${i}`,
    to: `Fermata ${i + 1}`,
    title: `Racconto ${i + 1}`,
    transcript: "Un racconto lungo il tracciato.",
    audio: `${i + 1}.mp3`,
    path: [
      [48.2 + i * 0.002, 16.36],
      [48.202 + i * 0.002, 16.36],
    ],
  })),
});

test("accepts more than eight legs and normalizes a new tram line", () => {
  const tour = validateTour(manifest());
  assert.equal(tour.legs.length, 10);
  assert.equal(tourGroups(tour)[0].line, "D");
  assert.equal(tourGroups(tour).length, 1);
  const runtime = toRuntimeTour(tour, (name) => `blob:${name}`);
  assert.equal(runtime.legs[9].audio, "blob:10.mp3");
  assert.equal(runtime.legs[9].segment, "Fermata 9 → Fermata 10");
  assert.equal(runtime.legs[9].line, "D · direzione Nußdorf");
});
test("rejects malformed, empty or too short geometry and external audio URLs", () => {
  for (const mutation of [
    (m) => (m.legs[0].path = []),
    (m) =>
      (m.legs[0].path = [
        [48, 16],
        [48, 16],
      ]),
    (m) =>
      (m.legs[0].path = [
        [48, 16],
        [48.00001, 16],
      ]),
    (m) =>
      (m.legs[0].path = [
        [999, 16],
        [48, 16],
      ]),
    (m) => (m.legs[0].audio = "https://host/audio.mp3"),
    (m) => (m.legs[0].audio = "../track.mp3"),
    (m) => (m.legs = []),
    (m) => (m.version = 2),
    (m) => (m.title = ""),
  ]) {
    const input = manifest();
    mutation(input);
    assert.throws(() => validateTour(input));
  }
});
test("groups explicit transfers even when the tram line is unchanged", () => {
  const input = manifest();
  input.legs[5].transferBefore = true;
  assert.equal(tourGroups(validateTour(input)).length, 2);
});
test("requires all referenced audio files and rejects ambiguous duplicate names", () => {
  const tour = validateTour(manifest());
  const files = tour.legs.map(
    (leg) => new File(["fake mp3 bytes"], leg.audio, { type: "audio/mpeg" }),
  );
  assert.equal(collectAudio(tour, files).length, 10);
  assert.throws(() => collectAudio(tour, files.slice(1)), /1.mp3/);
  assert.throws(() => collectAudio(tour, [...files, files[0]]), /duplicato/i);
});
test("custom matcher and player use the tenth imported leg without builtin data", async () => {
  const source = validateTour(manifest());
  const runtime = toRuntimeTour(source, (name) => `blob:${name}`);
  const matcher = createRouteMatcher(source.legs.map((l) => l.path));
  assert.equal(matcher.matchLeg({ latitude: 48.219, longitude: 16.36 }, 8), 9);
  assert.equal(
    matcher.matchLeg({ latitude: 48.201, longitude: 16.36 }, 8),
    null,
  );
  class Media extends EventTarget {
    currentTime = 0;
    duration = 20;
    pause() {}
    play() {
      return Promise.resolve();
    }
  }
  const media = new Media();
  const player = new TourPlayer(
    media,
    () => {},
    () => 100000,
    { tour: runtime.legs, matcher },
  );
  player.reset(8);
  player.feed({
    coords: { latitude: 48.219, longitude: 16.36, accuracy: 5 },
    timestamp: 100000,
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(media.src, "blob:10.mp3");
  assert.deepEqual(player.snapshot().listened, [9]);
  player.dispose();
});

test("duration distinguishes seconds from minutes instead of inflating short tracks", async () => {
  const { audioDurationLabel } = await import("../src/lib/tour-package.js");
  assert.equal(audioDurationLabel(22), "22 s");
  assert.equal(audioDurationLabel(180), "3 min");
  assert.equal(audioDurationLabel(200), "3 min 20 s");
  assert.equal(audioDurationLabel(3660), "1 h 1 min");
});

test("a transfer does not trigger at the incoming terminal when outgoing geometry overlaps it", () => {
  const paths = [
    [
      [48.2, 16.3],
      [48.201, 16.3],
    ],
    [
      [48.2005, 16.3],
      [48.202, 16.3],
    ],
  ];
  const matcher = createRouteMatcher(paths, [1]);
  assert.equal(
    matcher.matchLeg({ latitude: 48.201, longitude: 16.3 }, 0),
    null,
  );
  assert.equal(matcher.matchLeg({ latitude: 48.2014, longitude: 16.3 }, 0), 1);
});

test('Ring source becomes the second bundled tour with faithful chapters and transfers', async()=>{
  const {builtinTours,ringTour}=await import('../src/lib/builtin-tour.js');
  assert.deepEqual(builtinTours.map(t=>t.id),['vienna-original','vienna-ring-1-2']);
  assert.equal(ringTour.legs.length,8);
  assert.deepEqual(ringTour.groups.map(g=>g.line),['1','2','1']);
  assert.deepEqual(ringTour.groups.map(g=>g.start),[0,3,6]);
  assert.equal(ringTour.legs.at(-1).to,'Schottentor');
  assert.equal(ringTour.scheduledMinutesOnBoard,26);
  assert.ok(ringTour.legs.every(l=>l.audio===null&&l.transcript&&l.path.length>1));
});
