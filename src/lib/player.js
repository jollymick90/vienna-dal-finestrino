import tour from "./tour.json" with { type: "json" };
import { defaultMatcher, validFix } from "./route.js";

/** Owns exactly one media element, shared by preparation, GPS and manual playback. */
export class TourPlayer {
  constructor(audio, notify = () => {}, now = Date.now, options = {}) {
    this.tour = options.tour ?? tour;
    this.matcher = options.matcher ?? defaultMatcher;
    this.audio = audio;
    this.notify = notify;
    this.now = now;
    this.generation = 0;
    this.lastFix = null;
    this.automatic = false;
    this.heard = new Set();
    this.state = {
      selected: 0,
      cursor: 0,
      active: null,
      phase: "idle",
      elapsed: 0,
      duration: 0,
    };
    this.onEnded = () => {
      this.generation++;
      this.state.phase = "idle";
      this.state.active = null;
      this.emit();
      this.maybePlay();
    };
    this.onTime = () => {
      this.state.elapsed = audio.currentTime || 0;
      this.state.duration = Number.isFinite(audio.duration)
        ? audio.duration
        : 0;
      this.emit();
    };
    this.onError = () => {
      if (this.state.active === null) return;
      this.generation++;
      this.state.phase = "error";
      this.emit();
    };
    audio.addEventListener("ended", this.onEnded);
    audio.addEventListener("timeupdate", this.onTime);
    audio.addEventListener("loadedmetadata", this.onTime);
    audio.addEventListener("error", this.onError);
  }
  snapshot() {
    return { ...this.state, listened: [...this.heard] };
  }
  emit() {
    this.notify(this.snapshot());
  }
  prepare() {
    // Called synchronously inside the start gesture. No fetch/await before play().
    if (this.state.active !== null) return;
    const token = ++this.generation;
    this.audio.src = "/silence.wav";
    try {
      Promise.resolve(this.audio.play())
        .then(() => {
          if (token === this.generation) {
            this.audio.pause();
            this.audio.currentTime = 0;
          }
        })
        .catch(() => {
          /* Every actual track handles rejection with an explicit retry. */
        });
    } catch {
      /* Synchronous errors are handled again for the requested track. */
    }
  }
  feed(position) {
    this.lastFix = position;
    const index = validFix(position, this.now())
      ? this.matcher.matchLeg(position.coords, this.state.cursor)
      : null;
    // A track that has not started must not follow us into a different leg.
    if (
      this.automatic &&
      ["loading", "blocked", "error"].includes(this.state.phase) &&
      index !== this.state.active
    ) {
      this.cancelPending();
    }
    if (index === null) return;
    this.state.cursor = index;
    this.state.selected = index;
    this.emit();
    this.maybePlay();
  }
  maybePlay() {
    if (this.state.phase !== "idle" || !validFix(this.lastFix, this.now()))
      return;
    const index = this.matcher.matchLeg(this.lastFix.coords, this.state.cursor);
    if (index !== null && !this.heard.has(index))
      void this.play(index, false, true);
  }
  async play(index, resume = false, automatic = false) {
    if (!this.tour[index]) return;
    const token = ++this.generation;
    this.automatic = automatic;
    if (!resume || this.state.active !== index) {
      this.audio.pause();
      this.audio.src = this.tour[index].audio;
      this.audio.currentTime = 0;
      this.state.elapsed = 0;
      this.state.duration = 0;
    }
    this.state.active = index;
    this.state.phase = "loading";
    this.emit();
    try {
      await this.audio.play();
      if (token !== this.generation) return;
      if (
        automatic &&
        (!validFix(this.lastFix, this.now()) ||
          this.matcher.matchLeg(this.lastFix.coords, this.state.cursor) !==
            index)
      ) {
        this.cancelPending();
        return;
      }
      this.heard.add(index);
      this.state.phase = "playing";
    } catch {
      if (token !== this.generation) return;
      this.state.phase = "blocked";
    }
    this.emit();
  }
  pause() {
    ++this.generation;
    this.audio.pause();
    if (this.state.active !== null) this.state.phase = "paused";
    this.emit();
  }
  resume() {
    return this.play(this.state.active ?? this.state.selected, true);
  }
  cancelPending() {
    ++this.generation;
    this.audio.pause();
    this.state.active = null;
    this.state.phase = "idle";
    this.state.elapsed = 0;
    this.state.duration = 0;
    this.emit();
  }
  stopTracking() {
    this.lastFix = null;
    if (
      this.automatic &&
      ["loading", "blocked", "error"].includes(this.state.phase)
    )
      this.cancelPending();
  }
  reset(index, clearHistory = false) {
    ++this.generation;
    this.audio.pause();
    this.lastFix = null;
    if (clearHistory) this.heard.clear();
    this.state = {
      selected: index,
      cursor: index,
      active: null,
      phase: "idle",
      elapsed: 0,
      duration: 0,
    };
    this.emit();
  }
  dispose() {
    ++this.generation;
    this.audio.pause();
    this.lastFix = null;
    this.audio.removeEventListener("ended", this.onEnded);
    this.audio.removeEventListener("timeupdate", this.onTime);
    this.audio.removeEventListener("loadedmetadata", this.onTime);
    this.audio.removeEventListener("error", this.onError);
  }
}
