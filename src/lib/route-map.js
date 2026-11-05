import L from "leaflet";
import { paths } from "./route-data.js";
import tour from "./tour.json";

const colors = ["#c83732", "#152d40"];

export function createRouteMap(container, onTileError) {
  const map = L.map(container, { scrollWheelZoom: false, zoomControl: false });
  // Above stop icons (600), below tooltips/popups (650/700).
  map.createPane("tourPosition").style.zIndex = "625";
  const bounds = L.latLngBounds(paths.flat());
  L.control
    .zoom({ zoomInTitle: "Ingrandisci", zoomOutTitle: "Riduci" })
    .addTo(map);
  map.attributionControl.addAttribution(
    "Tracciati © Stadt Wien – Wiener Linien, CC BY 4.0",
  );
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  tiles.on("tileerror", onTileError);
  tiles.on("load", () => {
    // A failed tile also ends a load cycle: don't clear the warning on load alone.
    const loaded = container.querySelector(".leaflet-tile-loaded");
    if (loaded) onTileError(false);
  });

  const legs = paths.map((points, index) =>
    L.polyline(points, {
      color: colors[index < 4 ? 0 : 1],
      weight: 4,
      opacity: 0.85,
      className: `tram-leg tram-leg-${index}`,
    })
      .bindTooltip(`${tour[index].segment} · ${tour[index].line}`)
      .addTo(map),
  );

  // The two tram stops at Schottentor are distinct; don't join them as tram track.
  L.polyline([paths[3].at(-1), paths[4][0]], {
    color: "#607280",
    weight: 3,
    dashArray: "4 6",
    className: "transfer-path",
  })
    .bindTooltip("Cambio a piedi a Schottentor")
    .addTo(map);

  const stops = paths.map((points, index) => ({
    point: points[0],
    label: tour[index].segment.split(" → ")[0],
    index,
  }));
  stops.push({ point: paths[7].at(-1), label: "Oper, Karlsplatz", index: 8 });
  for (const { point, label, index } of stops) {
    const transfer = index === 4;
    const name = transfer
      ? "Cambio a Schottentor: tram 1 verso Reumannplatz"
      : `${index + 1}. ${label}`;
    const icon = L.divIcon({
      className: `tour-stop ${index < 4 ? "line-44" : "line-1"}`,
      html: `<span>${transfer ? "⇄" : index + 1}</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const marker = L.marker(point, {
      icon,
      title: name,
      alt: name,
      keyboard: true,
    });
    marker.on("add", () =>
      marker.getElement()?.setAttribute("aria-label", name),
    );
    marker.addTo(map);
    const popup = document.createElement("div");
    popup.textContent = transfer
      ? "Schottentor: scendi dal 44 e prendi il tram 1 verso Reumannplatz."
      : `${label}${index === 8 ? " · Scendi qui: fine del tour." : ""}`;
    marker.bindPopup(popup);
  }

  let positionMarker;
  let accuracyCircle;
  let following = true;
  let firstFix = true;
  map.on("dragstart", () => { following = false; });
  function center() {
    following = true;
    if (positionMarker) map.setView(positionMarker.getLatLng(), Math.max(map.getZoom(), 16), {animate: false});
  }
  function fit() {
    following = false;
    map.fitBounds(bounds, { padding: [28, 28], animate: false });
  }
  fit();
  const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  resize.observe(container);
  return {
    select(index) {
      legs.forEach((leg, i) =>
        leg.setStyle({
          weight: i === index ? 8 : 4,
          opacity: i === index ? 1 : 0.7,
        }),
      );
      legs[index]?.bringToFront();
      positionMarker?.bringToFront();
    },
    position(position, simulated) {
      if (!position) {
        if (positionMarker) map.removeLayer(positionMarker);
        if (accuracyCircle) map.removeLayer(accuracyCircle);
        positionMarker = accuracyCircle = null;
        return;
      }
      const latlng = [position.latitude, position.longitude];
      if (!positionMarker) {
        accuracyCircle = L.circle(latlng, {
          radius: position.accuracy,
          stroke: false,
          fillColor: "#007aaf",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
        positionMarker = L.circleMarker(latlng, {
          radius: 10,
          pane: "tourPosition",
          color: "#fff",
          weight: 3,
          fillColor: "#007aaf",
          fillOpacity: 1,
          className: "tour-position",
        }).addTo(map);
        positionMarker.bindTooltip("", {permanent: true, direction: "top", offset: [0, -12], className: "position-label"});
      }
      positionMarker
        .setLatLng(latlng)
        .setTooltipContent(
          simulated ? "Posizione simulata" : "Sei qui",
        )
        .bringToFront();
      accuracyCircle.setLatLng(latlng).setRadius(position.accuracy);
      if (firstFix) { following = true; firstFix = false; }
      if (following) center();
    },
    online(online) {
      if (online && !map.hasLayer(tiles)) tiles.addTo(map);
      if (!online && map.hasLayer(tiles)) map.removeLayer(tiles);
    },
    fit,
    center,
    destroy() {
      resize.disconnect();
      map.remove();
    },
  };
}
