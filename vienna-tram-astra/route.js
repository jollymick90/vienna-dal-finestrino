// The tour covers a few kilometres, so local metre coordinates are sufficient.
const metresPerDegree = 111195;
const longitudeScale = metresPerDegree * Math.cos(48.21 * Math.PI / 180);
const tracks = paths.map(points => {
  let progress = 0;
  return points.slice(1).flatMap(([lat, lon], i) => {
    const [startLat, startLon] = points[i];
    const x = (lon - startLon) * longitudeScale;
    const y = (lat - startLat) * metresPerDegree;
    const length = Math.hypot(x, y);
    if (!length) return [];
    const segment = {startLat, startLon, x, y, length, progress};
    progress += length;
    return [segment];
  });
});

function project(coords, track) {
  let best = {distance: Infinity, progress: 0};
  for (const segment of track) {
    const {startLat, startLon, x, y, length, progress} = segment;
    const px = (coords.longitude - startLon) * longitudeScale;
    const py = (coords.latitude - startLat) * metresPerDegree;
    const t = Math.max(0, Math.min(1, (px * x + py * y) / (length * length)));
    const distance = Math.hypot(px - t * x, py - t * y);
    if (distance < best.distance) best = {distance, progress: progress + t * length};
  }
  return best;
}

function matchLeg(coords, cursor) {
  let best = {distance: Infinity, index: null};
  for (let index = cursor; index < Math.min(cursor + 2, tracks.length); index++) {
    const track = tracks[index];
    const last = track.at(-1);
    const length = last.progress + last.length;
    const match = project(coords, track);
    if (match.distance <= 40 && match.progress >= 35 &&
        match.progress <= length - 18 && match.distance < best.distance) {
      best = {...match, index};
    }
  }
  return best.index;
}
