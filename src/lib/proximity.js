import { validFix, createRouteMatcher } from "./route.js";

export const proximityDefaults = {
  enterMeters: 100,
  exitMeters: 170,
  minIntervalMs: 45000,
  revisitMs: 15 * 60000,
};
export function distanceMeters(a, b) {
  const rad = Math.PI / 180;
  const x =
    (b.longitude - a.longitude) *
    rad *
    Math.cos(((a.latitude + b.latitude) * rad) / 2);
  const y = (b.latitude - a.latitude) * rad;
  return Math.hypot(x, y) * 6371000;
}

/** A proposal is a latch, never a playback command. GPS and simulation use feed. */
export function createProximity({
  places,
  paths = [],
  config = {},
  now = Date.now,
}) {
  const settings = { ...proximityDefaults, ...config };
  if (settings.exitMeters <= settings.enterMeters)
    throw new Error("La distanza di uscita deve superare quella di ingresso.");
  const matcher = paths.length ? createRouteMatcher(paths) : null;
  const memory = new Map();
  let active = null,
    lastAt = -Infinity,
    previous = null;
  function dismiss() {
    if (active) memory.get(active.id).until = now() + settings.revisitMs;
    active = null;
  }
  function clear() {
    active = null;
    previous = null;
  }
  function feed(fix, { routeId = null, busy = false, heard = [] } = {}) {
    if (
      previous &&
      Number.isFinite(fix?.timestamp) &&
      fix.timestamp < previous.timestamp &&
      validFix(previous, now())
    )
      return active;
    if (!validFix(fix, now())) {
      active = null;
      previous = null;
      return null;
    }
    if (previous && fix.timestamp < previous.timestamp) return active;
    const candidates = [];
    for (const place of places) {
      if (routeId && !place.routeIds.includes(routeId)) {
        if (active?.id === place.id) active = null;
        continue;
      }
      const rule = place.suggestion ?? {};
      const siteDistance = distanceMeters(
        fix.coords,
        place.entrance ?? place.location,
      );
      let distance = rule.location
        ? Math.min(siteDistance, distanceMeters(fix.coords, rule.location))
        : siteDistance;
      let directional = true;
      if (rule.tram) {
        const t = rule.tram;
        const projection = matcher?.project(fix.coords, t.pathIndex);
        const before =
          previous && matcher?.project(previous.coords, t.pathIndex);
        const elapsed = previous ? fix.timestamp - previous.timestamp : 0;
        const delta =
          projection && before ? projection.progress - before.progress : 0;
        directional =
          !!projection &&
          elapsed > 0 &&
          elapsed <= 30000 &&
          before.distance <= 45 &&
          projection.distance <= 45 &&
          delta * (t.direction ?? 1) >
            Math.max(10, fix.coords.accuracy, previous.coords.accuracy) &&
          projection.progress >= t.fromMeters &&
          projection.progress <= t.toMeters;
        distance = projection?.distance ?? Infinity;
      }
      const entry = rule.enterMeters ?? settings.enterMeters;
      const exit = Math.max(rule.exitMeters ?? settings.exitMeters, entry + 30);
      const m = memory.get(place.id) ?? { proposed: false, until: -Infinity };
      memory.set(place.id, m);
      if (distance > exit) {
        m.proposed = false;
        if (active?.id === place.id) active = null;
      }
      // Do not trigger where the accuracy circle only touches the entrance area.
      if (
        distance + fix.coords.accuracy * 0.5 > entry ||
        !directional ||
        m.proposed ||
        now() < m.until
      )
        continue;
      const listened = place.contents.every((c) =>
        heard.includes(`${place.id}:${c.id}`),
      );
      const score =
        distance -
        (routeId && place.routeIds.includes(routeId) ? 35 : 0) +
        (listened ? 70 : 0) -
        (rule.relevance ?? 0);
      candidates.push({ place, score });
    }
    if (!previous || fix.timestamp > previous.timestamp) previous = fix;
    if (busy) {
      active = null;
      return null;
    }
    if (active) return active;
    if (now() - lastAt < settings.minIntervalMs) return null;
    candidates.sort(
      (a, b) => a.score - b.score || a.place.id.localeCompare(b.place.id),
    );
    if (candidates.length) {
      active = candidates[0].place;
      memory.get(active.id).proposed = true;
      memory.get(active.id).until = now() + settings.revisitMs;
      lastAt = now();
    }
    return active;
  }
  return { feed, dismiss, clear, settings };
}
