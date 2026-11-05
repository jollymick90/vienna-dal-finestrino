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
