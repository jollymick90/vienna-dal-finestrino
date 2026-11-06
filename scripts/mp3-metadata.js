// Validate complete MPEG Layer III frames without requiring FFmpeg in the build.
// Frame sizes follow MPEG header fields (see FFmpeg mpegaudiodecheader.c).
// Frame duration includes encoder delay/padding; allow 150 ms for gapless metadata.
export function mp3Duration(bytes) {
  const invalid = () => {
    throw new Error("Asset MP3 non valido o troncato.");
  };
  let offset = 0,
    seconds = 0,
    frames = 0;
  if (bytes.length >= 10 && bytes.toString("ascii", 0, 3) === "ID3") {
    if ([...bytes.subarray(6, 10)].some((b) => b & 128)) invalid();
    const size = [...bytes.subarray(6, 10)].reduce(
      (sum, b) => sum * 128 + b,
      0,
    );
    offset = 10 + size + (bytes[5] & 16 ? 10 : 0);
  }
  while (offset < bytes.length) {
    if (
      bytes.length - offset === 128 &&
      bytes.toString("ascii", offset, offset + 3) === "TAG"
    ) {
      offset = bytes.length;
      break;
    }
    if (offset + 4 > bytes.length) invalid();
    const header = bytes.readUInt32BE(offset);
    const version = (header >>> 19) & 3,
      layer = (header >>> 17) & 3;
    const bitrateIndex = (header >>> 12) & 15,
      rateIndex = (header >>> 10) & 3;
    if (
      header >>> 21 !== 2047 ||
      version === 1 ||
      layer !== 1 ||
      !bitrateIndex ||
      bitrateIndex === 15 ||
      rateIndex === 3
    )
      invalid();
    const rates =
      version === 3
        ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
        : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const sampleRate =
      [44100, 48000, 32000][rateIndex] /
      (version === 3 ? 1 : version === 2 ? 2 : 4);
    const length =
      Math.floor(
        ((version === 3 ? 144000 : 72000) * rates[bitrateIndex]) / sampleRate,
      ) +
      ((header >>> 9) & 1);
    if (length < 4 || offset + length > bytes.length) invalid();
    seconds += (version === 3 ? 1152 : 576) / sampleRate;
    offset += length;
    frames++;
  }
  if (frames < 2 || !Number.isFinite(seconds)) invalid();
  return seconds;
}
