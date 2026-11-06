# Naschmarkt POI implementation plan

> **For agentic workers:** Use superpowers:executing-plans to execute inline.

**Goal:** Add six requested places and twelve Italian audio stories, publishing only new Vienna assets and preserving the original tour.

**Architecture:** Existing catalog/manifest/player/MinIO pipeline. Add walking-area group `naschmarkt-stadtpark`; default to all 34 places. Walking-group filtering hides the original tram geometry and offers only its own twelve audio files offline. The original tram simulation remains available with its original group.

**Tech Stack:** Svelte 5, Leaflet, Node.js, existing Gemini TTS Kore and MinIO publisher.

**Spec:** User explicitly asked to implement only Naschmarkt, Karlskirche, Hochstrahlbrunnen, Palais Schwarzenberg, Secession, Stadtpark; exclude Madame Tussauds and Schönbrunn for now.

## Global Constraints

- Six POIs only, each with documented OSM coordinates and official/primary editorial sources.
- Keep all original 28 POIs, 56 stories and audio fingerprints unchanged.
- Use the existing 70–100 word introduction and 100–150 word deeper story format.
- Access information must not promise palace access, running winter fountains, or an unverified pedestrian route.
- Reuse existing model/voice and valid assets; generate twelve missing contents only, compress and publish to `vienna-audio`.
- Preserve Hidrospace data/configuration; use only the existing restricted publisher.
- No Vercel deployment or shared-branch push is required for this task.

## Review Focus

- All-places offline selection includes both groups; individual selection downloads only its group.
- Walking group never displays the original tram polylines or runs the tram simulation.
- Changing groups clears a selected hidden place and refits the visible map.
- New GPS suggestions use actual site coordinates, not copied tram anchors.
- Historical dates, spatial references and seasonal access notes are sourced; interior access is not assumed.

### Task 1: Catalog and grouping

**Files:** `public/catalog.json`, `docs/research/naschmarkt-pois-2026-11-06.md`, OSM snapshot; tests `tests/catalog.test.js`, `tests/offline.test.js`, new browser group test.

- [x] Write/run failing tests for six IDs, 34 places, walking membership and all-groups offline behavior.
- [x] Add six places and twelve texts with sources and dated verification.
- [x] Update build catalog count to 34; leave original content/audio unchanged.

### Task 2: Map and route UI

**Files:** `src/App.svelte`, `src/components/PoiMap.svelte`, `src/lib/poi-map.js`, `src/lib/route-offline.js`, browser tests.

- [x] Default to all places; expose walking group, scoped offline download and correct route information.
- [x] Hide tram lines for walking group, disable its simulation and refit group markers.
- [x] Verify selection, list, GPS suggestion and original tram simulation in browser.

### Task 3: Generate, publish and verify

**Files:** existing manifest/audio pipeline, README, research report.

- [x] Generate twelve missing audio assets without regenerating the existing 56.
- [x] Compress, publish and verify the new MP3 hashes using the restricted publisher.
- [x] Run full unit/check/build/browser verification and independent review.
- [x] Record totals, source checks and any remaining real-device limits.

## Esito e decisioni

- 12 audio generati/compressi/pubblicati, 56 riusati e invariati; 34 POI/68 audio complessivi.
- Test: 64 unitari, 14 Chromium, check e build passati; tutti i nuovi MP3 verificati con ffprobe.
- Revisione indipendente: GPS fuori gruppo e race delle verifiche offline riprodotti con test fallenti, corretti e riverificati. Aggiornato anche il messaggio dopo uscita dalla simulazione per cambio gruppo.
- Decisione: vista iniziale di tutti i luoghi, gruppo a piedi separato, nessuna geometria pedonale inventata. Il tragitto originale rimane identico.
- Decisione: dopo HTTP 502/timeout nelle richieste successive a Overpass, conservato un estratto dichiarato dei sei oggetti verificati nella prima risposta, anziché una falsa risposta grezza.
- Branch locale `feat/naschmarkt-pois`; pubblicazione audio autorizzata e completata, distribuzione Vercel separata.
