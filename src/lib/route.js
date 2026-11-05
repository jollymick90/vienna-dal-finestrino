import { paths as defaultPaths } from "./route-data.js";

export function createRouteMatcher(paths, transferStarts = []) {
  const transfers = new Set(transferStarts);
  // The tour covers a few kilometres, so local metre coordinates are sufficient.
  const metresPerDegree = 111195;
  const latitude = paths[0][0][0];
  const longitudeScale = metresPerDegree * Math.cos((latitude * Math.PI) / 180);
  const tracks = paths.map((points) => {
    let progress = 0;
    return points.slice(1).flatMap(([lat, lon], i) => {
      const [startLat, startLon] = points[i];
      const x = (lon - startLon) * longitudeScale;
      const y = (lat - startLat) * metresPerDegree;
      const length = Math.hypot(x, y);
      if (!length) return [];
      const segment = { startLat, startLon, x, y, length, progress };
      progress += length;
      return [segment];
    });
  });

  function project(coords, track) {
    let best = { distance: Infinity, progress: 0 };
    for (const segment of track) {
      const { startLat, startLon, x, y, length, progress } = segment;
      const px = (coords.longitude - startLon) * longitudeScale;
      const py = (coords.latitude - startLat) * metresPerDegree;
      const t = Math.max(0, Math.min(1, (px * x + py * y) / (length * length)));
      const distance = Math.hypot(px - t * x, py - t * y);
      if (distance < best.distance)
        best = { distance, progress: progress + t * length };
    }
    return best;
  }

  function matchLeg(coords, cursor) {
    let best = { distance: Infinity, index: null };
    for (
      let index = cursor;
      index < Math.min(cursor + 2, tracks.length);
      index++
    ) {
      // The incoming platform can lie along the outgoing geometry. Keep both
      // platforms inside the departure exclusion zone at a change of tram.
      if (index > 0 && transfers.has(index)) {
        const [lat, lon] = paths[index - 1].at(-1);
        if (
          Math.hypot(
            (coords.latitude - lat) * metresPerDegree,
            (coords.longitude - lon) * longitudeScale,
          ) < 35
        )
          continue;
      }
      const track = tracks[index];
      const last = track.at(-1);
      const length = last.progress + last.length;
      const match = project(coords, track);
      if (
        match.distance <= 40 &&
        match.progress >= 35 &&
        match.progress <= length - 18 &&
        match.distance < best.distance
      ) {
        best = { ...match, index };
      }
    }
    return best.index;
  }

  function trackLength(index) {
    const last = tracks[index].at(-1);
    return last.progress + last.length;
  }

  // Simulation traverses the same GTFS geometry used by the real matcher.
  function pointAt(index, metres) {
    const distance = Math.max(0, Math.min(metres, trackLength(index)));
    const segment =
      tracks[index].find((s) => distance <= s.progress + s.length) ??
      tracks[index].at(-1);
    const fraction = (distance - segment.progress) / segment.length;
    return {
      latitude: segment.startLat + (segment.y * fraction) / metresPerDegree,
      longitude: segment.startLon + (segment.x * fraction) / longitudeScale,
    };
  }
  return { matchLeg, pointAt, trackLength };
}

export const defaultMatcher = createRouteMatcher(defaultPaths);
export const { matchLeg, pointAt, trackLength } = defaultMatcher;

// Freshness is also rechecked when an audio ends, not only on GPS arrival.
export function validFix(position, now = Date.now()) {
  const c = position?.coords;
  return (
    !!c &&
    Number.isFinite(c.latitude) &&
    Math.abs(c.latitude) <= 90 &&
    Number.isFinite(c.longitude) &&
    Math.abs(c.longitude) <= 180 &&
    Number.isFinite(c.accuracy) &&
    c.accuracy >= 0 &&
    c.accuracy <= 45 &&
    Number.isFinite(position.timestamp) &&
    now - position.timestamp <= 15000 &&
    now >= position.timestamp
  );
}
