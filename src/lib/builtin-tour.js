import ringSource from "../../vienna-tram-astra/vienna-ring-tour.json" with { type: "json" };
import stories from "./tour.json" with { type: "json" };
import { paths } from "./route-data.js";
import { toRuntimeTour } from "./tour-package.js";
const durations = [
  22.92, 20.568, 20.784, 24.096, 21.192, 22.728, 24.552, 23.592,
];
export const builtinPackage = {
  version: 1,
  id: "vienna-original",
  title: "Dal mercato all’Opera",
  description: "Il giro breve sui tram 44 e 1.",
  attribution:
    "Stadt Wien – Wiener Linien, CC BY 4.0. Servizio programmato per il 5 novembre 2026.",
  legs: stories.map((story, index) => ({
    line: index < 4 ? "44" : "1",
    direction: index < 4 ? "Schottentor" : "Reumannplatz",
    from: story.segment.split(" → ")[0],
    to: story.segment.split(" → ")[1],
    title: story.title,
    transcript: story.transcript,
    audio: story.audio.split("/").at(-1),
    path: paths[index],
    transferBefore: index === 4,
    durationSeconds: durations[index],
  })),
};
export const builtinTour = toRuntimeTour(
  builtinPackage,
  (name) => `/audio/${name}`,
);

// Keep the supplied source intact. Chapters become GPS/audio guide legs.
export const ringPackage = {
  version: 1,
  id: ringSource.id,
  title: "Vienna Ring Tour",
  description: ringSource.title,
  serviceDate: ringSource.serviceDate,
  scheduledMinutesOnBoard: ringSource.scheduledMinutesOnBoard,
  approach: ringSource.approach,
  attribution: `${ringSource.source.name}, ${ringSource.source.license}.`,
  legs: ringSource.legs.flatMap((section, sectionIndex) => section.chapters.map((chapter, chapterIndex) => ({
    line: section.line,
    direction: section.direction,
    from: chapter.fromStop,
    to: chapter.toStop,
    title: chapter.title,
    transcript: chapter.transcript,
    path: chapter.path,
    transferBefore: sectionIndex > 0 && chapterIndex === 0,
    audio: null,
  }))),
};
export const ringTour = toRuntimeTour(ringPackage, () => null);
export const builtinTours = [builtinTour, ringTour];
