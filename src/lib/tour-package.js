import { createRouteMatcher } from "./route.js";

const text = (value, label, max = 300) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`${label}: testo mancante o troppo lungo.`);
  return value.trim();
};

export function validateTour(input) {
  if (!input || input.version !== 1)
    throw new Error("Formato non supportato: serve version: 1.");
  const id = text(input.id, "Identificativo", 80);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || id === "vienna-original")
    throw new Error(
      "Scegli un id nuovo: lettere minuscole, numeri e trattini.",
    );
  if (
    !Array.isArray(input.legs) ||
    input.legs.length < 1 ||
    input.legs.length > 500
  )
    throw new Error("Il tour deve contenere da 1 a 500 tratte.");
  let points = 0;
  const legs = input.legs.map((leg, i) => {
    const label = `Tratta ${i + 1}`;
    if (
      !leg ||
      !Array.isArray(leg.path) ||
      leg.path.length < 2 ||
      leg.path.length > 10000
    )
      throw new Error(`${label}: servono almeno due punti del percorso.`);
    points += leg.path.length;
    if (points > 100000) throw new Error("Il tracciato contiene troppi punti.");
    const path = leg.path.map((point) => {
      if (
        !Array.isArray(point) ||
        point.length !== 2 ||
        !point.every(Number.isFinite) ||
        Math.abs(point[0]) >= 85 ||
        Math.abs(point[1]) > 180
      )
        throw new Error(
          `${label}: coordinate non valide, usa [latitudine, longitudine].`,
        );
      return [...point];
    });
    if (
      !path.some(
        (point) => point[0] !== path[0][0] || point[1] !== path[0][1],
      ) ||
      createRouteMatcher([path]).trackLength(0) <= 53
    )
      throw new Error(
        `${label}: percorso troppo corto per il GPS (oltre 53 metri richiesti).`,
      );
    const audio = text(leg.audio, `${label}, audio`, 180);
    if (!/^[^/\\:*?"<>|]+\.mp3$/i.test(audio) || audio.includes(".."))
      throw new Error(
        `${label}: indica solo il nome del file MP3, senza URL o cartelle.`,
      );
    return {
      line: text(leg.line, `${label}, linea`, 30),
      direction: text(leg.direction, `${label}, direzione`, 160),
      from: text(leg.from, `${label}, partenza`, 160),
      to: text(leg.to, `${label}, arrivo`, 160),
      title: text(leg.title, `${label}, titolo`, 160),
      transcript: text(leg.transcript, `${label}, trascrizione`, 100000),
      audio,
      path,
      transferBefore: leg.transferBefore === true,
    };
  });
  return {
    version: 1,
    id,
    title: text(input.title, "Titolo", 160),
    description:
      typeof input.description === "string"
        ? input.description.slice(0, 1000)
        : "",
    attribution: text(
      input.attribution,
      "Fonte e attribuzione del tracciato",
      1000,
    ),
    legs,
  };
}

export function collectAudio(tour, files) {
  const byName = new Map();
  for (const file of files) {
    if (byName.has(file.name))
      throw new Error(`Nome file duplicato: ${file.name}`);
    byName.set(file.name, file);
  }
  const audio = [];
  for (const name of new Set(tour.legs.map((leg) => leg.audio))) {
    const blob = byName.get(name);
    if (!blob || !blob.size) throw new Error(`Manca il file audio: ${name}`);
    audio.push({ name, blob });
  }
  if (audio.reduce((sum, file) => sum + file.blob.size, 0) > 250 * 1024 * 1024)
    throw new Error("Questo tour supera 250 MB. Dividilo in più percorsi.");
  return audio;
}

export function tourGroups(tour) {
  const groups = [];
  tour.legs.forEach((leg, index) => {
    const previous = tour.legs[index - 1];
    if (
      !previous ||
      leg.transferBefore ||
      previous.line !== leg.line ||
      previous.direction !== leg.direction
    )
      groups.push({
        line: leg.line,
        direction: leg.direction,
        from: leg.from,
        to: leg.to,
        start: index,
        end: index,
      });
    else Object.assign(groups.at(-1), { to: leg.to, end: index });
  });
  return groups;
}
export const lineColors = [
  "#c83732",
  "#152d40",
  "#226b50",
  "#775799",
  "#9b5717",
];
export function toRuntimeTour(tour, resolveAudio) {
  const groups = tourGroups(tour);
  return {
    ...tour,
    groups,
    paths: tour.legs.map((leg) => leg.path),
    legs: tour.legs.map((leg, index) => {
      const groupIndex = groups.findIndex(
        (group) => index >= group.start && index <= group.end,
      );
      return {
        ...leg,
        audioName: leg.audio,
        lineNumber: leg.line,
        line: `${leg.line} · direzione ${leg.direction}`,
        segment: `${leg.from} → ${leg.to}`,
        audio: resolveAudio(leg.audio),
        color: lineColors[groupIndex % lineColors.length],
        transferBefore: index > 0 && groups[groupIndex].start === index,
      };
    }),
  };
}
export function audioDurationLabel(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  if (!minutes) return `${total} s`;
  return `${minutes} min${total % 60 ? ` ${total % 60} s` : ""}`;
}
