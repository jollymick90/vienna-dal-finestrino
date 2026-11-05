# POI Audioguide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audioguida italiana con mappa principale e 28 luoghi autonomi.
**Architecture:** Catalogo JSON e manifest audio separati; motore prossimità puro; player manuale unico; componenti Svelte 5 e Leaflet; cache verificata per percorso.
**Tech Stack:** Svelte 5, Vite, Leaflet, Node test, Playwright.
**Spec:** docs/superpowers/specs/2026-11-05-poi-audioguide-design.md

## Global Constraints
- Nessuna chiamata TTS a pagamento né deploy.
- Fonti conservate; coordinate non inventate; nessun lato finestrino non verificato.
- Riutilizzare tracciati, validazione fix, Leaflet, gestione Range e asset esistenti coerenti.
- Testi funzionanti senza GPS/audio/rete dopo download.

## Review Focus
- Fix fuori ordine, scaduti, imprecisi e oscillazioni: nessuna proposta ripetuta.
- Cambio filtro o scheda durante audio: player continuo.
- Storage negato e rete assente: messaggi utili, app esplorabile.
- Risposte HTML al posto di audio: download e build non attestano disponibilità.
- Regole direzionali: niente inferenze quando fermo o lontano dal tracciato.

### Task 1: Catalogo e ricerca
**Files:** public/catalog.json, src/lib/catalog.js, docs/research/*, tests/catalog.test.js.
**Interfaces:** catalog {version,routes,places}; place {id,location,entrance?,routeIds,contents,sources,access}; content {id,title,text,audio,durationSeconds}.
- [x] Testare 28 ID unici, due contenuti, conteggi parole e fonti/coordinate documentate; osservare fallimento.
- [x] Raccogliere fonti ufficiali e OSM, scrivere testi, validare catalogo e asset.

### Task 2: Prossimità e player
**Files:** src/lib/proximity.js, src/lib/poi-player.js, tests/poi.test.js.
**Interfaces:** createProximity({places,paths,config,now}), feed(fix,{routeId,busy,heard}), dismiss(); PoiPlayer(audio,notify,storage), play(place,content), pause,resume,seek,close,dispose.
- [x] Testare fix, ranking, isteresi, cooldown, direzione e player/storia/errori; osservare fallimento.
- [x] Implementare con riuso validFix e geometrie.

### Task 3: UI e offline
**Files:** src/App.svelte, src/components/PoiMap.svelte, src/lib/poi-map.js, src/style.css, src/lib/route-offline.js, src/service-worker.js, scripts/build-sw.js, tests/browser/*.
**Interfaces:** UI usa catalogo/runtime manifest, feed condiviso GPS/simulazione e player; downloadRoute verifica cache shell/catalogo/audio.
- [x] Scrivere test browser per esplorazione senza GPS, proposta singola, testi senza audio, player persistente e offline; osservare fallimento.
- [x] Implementare mappa e scheda responsive, GPS, simulazione, download verificabile e stati errore.

### Task 4: TTS e consegna
**Files:** scripts/generate-poi-audio.js, scripts/validate-assets.js, README.md, tests/tts.test.js.
- [x] Testare selezione per ID, dry-run senza rete, hash/riuso e asset invalidi; osservare fallimento.
- [x] Implementare CLI separata e documentare fonti, limiti sul posto e comando singolo.
- [x] Eseguire npm test, npm run check, npm run build e Playwright; revisione completa e correzioni.

## Esito

Implementazione eseguita direttamente nel checkout esistente, come richiesto. Nessuna chiamata TTS a pagamento, commit o pubblicazione. Verifica finale: 45 test unitari e 10 test browser superati, Svelte senza errori/avvisi, build e git diff --check riusciti. Revisione indipendente eseguita; corretti riparazione della cache, corridoio direzionale, prossimità al luogo oltre al punto di proposta e gestione fix ritardati.
