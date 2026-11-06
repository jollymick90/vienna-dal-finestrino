import L from "leaflet";
export function createPoiMap(
  container,
  { places, paths, onselect, onTileError },
) {
  const map = L.map(container, { zoomControl: false });
  map.createPane("tourPosition").style.zIndex = "625";
  L.control
    .zoom({
      position: "bottomleft",
      zoomInTitle: "Ingrandisci",
      zoomOutTitle: "Riduci",
    })
    .addTo(map);
  map.attributionControl.addAttribution(
    "Tracciati © Stadt Wien – Wiener Linien, CC BY 4.0",
  );
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  tiles.on("tileerror", () => onTileError(true));
  tiles.on("load", () =>
    onTileError(!container.querySelector(".leaflet-tile-loaded")),
  );
  const lines = paths.map((path, i) =>
    L.polyline(path, {
      color: i < 4 ? "#c03b43" : "#164b63",
      weight: 4,
      opacity: 0.75,
      className: "route-line",
    }).addTo(map),
  );
  const markers = new Map();
  for (const p of places) {
    const marker = L.marker([p.location.latitude, p.location.longitude], {
      icon: L.divIcon({
        className: "poi-pin",
        html: '<span aria-hidden="true"></span>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
      title: `Apri ${p.name}`,
      alt: `Apri ${p.name}`,
      keyboard: true,
    });
    marker.on("add", () => {
      const element = marker.getElement();
      element?.setAttribute("aria-label", `Apri ${p.name}`);
      element?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onselect(p.id);
        }
      });
    });
    const label = document.createElement("span");
    label.textContent = p.name;
    marker.bindTooltip(label, { direction: "top", offset: [0, -15] });
    marker.on("click", () => {
      const point = map.latLngToContainerPoint(marker.getLatLng());
      const close = places.filter((other) => {
        const m = markers.get(other.id);
        return (
          m &&
          map.hasLayer(m) &&
          point.distanceTo(map.latLngToContainerPoint(m.getLatLng())) < 46
        );
      });
      if (close.length < 2) {
        onselect(p.id);
        return;
      }
      const menu = document.createElement("div");
      menu.className = "pin-choices";
      const title = document.createElement("strong");
      title.textContent = "Scegli il luogo";
      menu.append(title);
      for (const other of close) {
        const button = document.createElement("button");
        button.textContent = other.name;
        button.addEventListener("click", () => {
          map.closePopup();
          onselect(other.id);
        });
        menu.append(button);
      }
      L.popup({ maxWidth: 260, autoPan: true })
        .setLatLng(marker.getLatLng())
        .setContent(menu)
        .openOn(map);
    });
    marker.addTo(map);
    markers.set(p.id, marker);
  }
  let position,
    accuracy,
    following = false,
    selectedId = null,
    filteredRoute = null;
  const bounds = () =>
    L.latLngBounds(
      [...markers.values()]
        .filter((m) => map.hasLayer(m))
        .map((m) => m.getLatLng()),
    );
  function fit() {
    following = false;
    const b = bounds();
    if (b.isValid()) map.fitBounds(b, { padding: [36, 36], animate: false });
  }
  function center() {
    following = true;
    if (position) map.setView(position.getLatLng(), 16, { animate: false });
  }
  map.on("dragstart zoomstart", (e) => {
    if (e.originalEvent || e.type === "dragstart") following = false;
  });
  fit();
  const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  resize.observe(container);
  return {
    select(id) {
      if (selectedId) {
        markers.get(selectedId)?.getElement()?.classList.remove("selected");
        markers.get(selectedId)?.setZIndexOffset(0);
      }
      selectedId = id;
      if (id) {
        const m = markers.get(id);
        m?.getElement()?.classList.add("selected");
        m?.setZIndexOffset(500);
        following = false;
        if (m)
          map.panInside(m.getLatLng(), {
            paddingTopLeft: [45, 210],
            paddingBottomRight:
              container.clientWidth <= 700
                ? [45, container.clientHeight * 0.53 + 30]
                : [440, 60],
            animate: false,
          });
      }
    },
    filter(routeId, showTramRoute = true) {
      for (const p of places) {
        const marker = markers.get(p.id);
        if (!routeId || p.routeIds.includes(routeId)) marker.addTo(map);
        else map.removeLayer(marker);
      }
      for (const line of lines) {
        if (showTramRoute) {
          if (!map.hasLayer(line)) line.addTo(map);
          line.setStyle({ opacity: routeId ? 0.75 : 0.35 });
        } else map.removeLayer(line);
      }
      if (filteredRoute !== routeId) {
        map.closePopup();
        fit();
        filteredRoute = routeId;
      }
    },
    position(fix, simulated) {
      if (!fix) {
        if (position) map.removeLayer(position);
        if (accuracy) map.removeLayer(accuracy);
        position = accuracy = null;
        return;
      }
      const latlng = [fix.latitude, fix.longitude];
      if (!position) {
        accuracy = L.circle(latlng, {
          radius: fix.accuracy,
          stroke: false,
          fillColor: "#007aaf",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
        position = L.circleMarker(latlng, {
          pane: "tourPosition",
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: "#007aaf",
          fillOpacity: 1,
          className: "tour-position",
        }).addTo(map);
        position.bindTooltip("", {
          permanent: true,
          direction: "top",
          offset: [0, -12],
          className: "position-label",
        });
      }
      position
        .setLatLng(latlng)
        .setTooltipContent(simulated ? "Posizione simulata" : "Sei qui");
      accuracy.setLatLng(latlng).setRadius(fix.accuracy);
      if (following) center();
    },
    online(value) {
      if (value && !map.hasLayer(tiles)) tiles.addTo(map);
      if (!value && map.hasLayer(tiles)) map.removeLayer(tiles);
    },
    fit,
    center,
    destroy() {
      resize.disconnect();
      map.remove();
    },
  };
}
