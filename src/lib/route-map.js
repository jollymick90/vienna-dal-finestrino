import L from "leaflet";
import { builtinTour } from "./builtin-tour.js";

export function createRouteMap(container, onTileError, data = builtinTour) {
  const paths = data.paths;
  const tour = data.legs;
  const textNode = (text) => {
    const node = document.createElement("span");
    node.textContent = text;
    return node;
  };
  const map = L.map(container, { scrollWheelZoom: false, zoomControl: false });
  // Above stop icons (600), below tooltips/popups (650/700).
  map.createPane("tourPosition").style.zIndex = "625";
  const bounds = L.latLngBounds(paths.flat());
  L.control
    .zoom({ zoomInTitle: "Ingrandisci", zoomOutTitle: "Riduci" })
    .addTo(map);
  map.attributionControl.addAttribution(textNode(data.attribution).innerHTML);
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
      color: tour[index].color,
      weight: 4,
      opacity: 0.85,
      className: `tram-leg tram-leg-${index}`,
    })
      .bindTooltip(textNode(`${tour[index].segment} · ${tour[index].line}`))
      .addTo(map),
  );

  tour.forEach((leg, index) => {
    if (!leg.transferBefore || !index) return;
    L.polyline([paths[index - 1].at(-1), paths[index][0]], {
      color: "#607280",
      weight: 3,
      dashArray: "4 6",
      className: "transfer-path",
    })
      .bindTooltip(textNode(`Cambio a piedi a ${leg.from}`))
      .addTo(map);
  });

  const stops = paths.map((points, index) => ({
    point: points[0],
    label: tour[index].from,
    index,
  }));
  stops.push({
    point: paths.at(-1).at(-1),
    label: tour.at(-1).to,
    index: tour.length,
  });
  for (const { point, label, index } of stops) {
    const leg = tour[Math.min(index, tour.length - 1)];
    const transfer = index < tour.length && leg.transferBefore;
    const name = transfer
      ? `Cambio a ${label}: tram ${leg.lineNumber} verso ${leg.direction}`
      : `${index + 1}. ${label}`;
    const icon = L.divIcon({
      className: "tour-stop",
      html: `<span style="color:${leg.color}">${transfer ? "⇄" : index + 1}</span>`,
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
      ? `${label}: scendi dal ${tour[index - 1].lineNumber} e prendi il tram ${leg.lineNumber} verso ${leg.direction}.`
      : `${label}${index === tour.length ? " · Scendi qui: fine del tour." : ""}`;
    marker.bindPopup(popup);
  }

  let positionMarker;
  let accuracyCircle;
  let following = true;
  let firstFix = true;
  map.on("dragstart", () => {
    following = false;
  });
  function center() {
    following = true;
    if (positionMarker)
      map.setView(positionMarker.getLatLng(), Math.max(map.getZoom(), 16), {
        animate: false,
      });
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
        positionMarker.bindTooltip("", {
          permanent: true,
          direction: "top",
          offset: [0, -12],
          className: "position-label",
        });
      }
      positionMarker
        .setLatLng(latlng)
        .setTooltipContent(simulated ? "Posizione simulata" : "Sei qui")
        .bringToFront();
      accuracyCircle.setLatLng(latlng).setRadius(position.accuracy);
      if (firstFix) {
        following = true;
        firstFix = false;
      }
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
