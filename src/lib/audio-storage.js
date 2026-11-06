// Public download location only. Publisher credentials never enter the app.
export const AUDIO_STORAGE_BASE =
  "https://media-hidrospace.jm90dev.cloud/vienna-audio";

export function audioUrl(path) {
  if (typeof path !== "string" || !/^\/audio\/(?:poi\/)?[a-z0-9-]+\.(wav|mp3)$/.test(path))
    return null;
  return path.startsWith("/audio/poi/")
    ? `${AUDIO_STORAGE_BASE}${path.slice("/audio".length)}`
    : path;
}

export function isRemoteAudioUrl(url) {
  const prefix = `${AUDIO_STORAGE_BASE}/poi/`;
  return typeof url === "string" && url.startsWith(prefix) &&
    /^[a-z0-9-]+\.(wav|mp3)$/.test(url.slice(prefix.length));
}
