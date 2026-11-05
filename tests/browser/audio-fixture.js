import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
// Test-only media: production never associates an old route story to a POI.
export async function audioFixture(target) {
  const catalog = JSON.parse(await readFile("public/catalog.json", "utf8"));
  const bytes = await readFile("public/audio/01.mp3");
  const manifest = {
    version: 1,
    entries: {
      "albertina:scopri": {
        audio: "/audio/01.mp3",
        durationSeconds: 22.92,
        audioHash: createHash("sha256").update(bytes).digest("hex"),
        textHash: createHash("sha256")
          .update(
            catalog.places.find((p) => p.id === "albertina").contents[0].text,
          )
          .digest("hex"),
      },
    },
  };
  await target.route("**/audio/poi-manifest.json", (r) =>
    r.fulfill({ json: manifest }),
  );
}
