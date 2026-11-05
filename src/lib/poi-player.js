import { TourPlayer } from "./player.js";
const HISTORY_KEY = "vienna-poi-heard-v1";

/** Reuses the single-media player; only explicit gestures can start POI tracks. */
export class PoiPlayer extends TourPlayer {
  constructor(audio, places, notify = () => {}, storage = null) {
    const tracks = places.flatMap((p) =>
      p.contents.map((c) => ({
        ...c,
        key: `${p.id}:${c.id}`,
        placeId: p.id,
        placeName: p.name,
      })),
    );
    super(audio, notify, Date.now, {
      tour: tracks,
      matcher: { matchLeg: () => null },
    });
    this.history = new Set();
    this.storage = storage;
    this.storageError = !storage;
    try {
      const saved = JSON.parse(storage?.getItem(HISTORY_KEY) ?? "[]");
      if (Array.isArray(saved))
        for (const key of saved)
          if (typeof key === "string") this.history.add(key);
    } catch {
      this.storageError = true;
    }
  }
  snapshot() {
    const state = super.snapshot();
    return {
      ...state,
      track: this.tour[state.active] ?? null,
      heardIds: [...(this.history ?? [])],
      storageError: this.storageError ?? false,
    };
  }
  emit() {
    if (this.state.phase === "playing") {
      this.history.add(this.tour[this.state.active].key);
      try {
        this.storage?.setItem(HISTORY_KEY, JSON.stringify([...this.history]));
      } catch {
        this.storageError = true;
      }
    }
    super.emit();
  }
  playContent(place, content) {
    const index = this.tour.findIndex(
      (t) => t.key === `${place.id}:${content.id}`,
    );
    if (index < 0 || !this.tour[index].audio) return;
    return super.play(index);
  }
  seek(seconds) {
    if (this.state.active === null || !Number.isFinite(seconds)) return;
    const duration = Number.isFinite(this.audio.duration)
      ? this.audio.duration
      : this.tour[this.state.active].durationSeconds || 0;
    this.audio.currentTime = Math.max(0, Math.min(seconds, duration));
    this.onTime();
  }
  close() {
    this.cancelPending();
  }
}
