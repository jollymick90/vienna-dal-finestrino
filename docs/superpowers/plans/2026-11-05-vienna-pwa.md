# Vienna dal finestrino — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementare la specifica fornita, direttamente nel workspace autorizzato.
**Architecture:** SPA Svelte 5; matcher puro sui dati originali; controller del singolo audio con invalidazione delle richieste; service worker generato dalla build con cache completa e Range.
**Tech Stack:** Svelte, Vite, JavaScript, node:test, Playwright.
**Spec:** `vienna-tram-astra/PROMPT_ASTRA.md`.

## Global Constraints
- Italiano, otto MP3 locali e otto polilinee nello stesso ordine; nessun backend.
- GPS: accuratezza ≤45 m, fix non più vecchi di 15 s, corridoio 40 m, partenza 35 m, arrivo 18 m.
- Tram 44 verso Schottentor, cambio sul tram 1 verso Reumannplatz, discesa Oper, Karlsplatz.
- Nessun deploy; Vercel preset Vite, output dist.

## Review Focus
- Risoluzione tardiva di play dopo una selezione manuale: invalidare il tentativo precedente.
- GPS fuori percorso o vecchio alla fine dell'audio: non riprodurre la coda.
- Fermata di cambio: il punto iniziale della linea 1 non avvia audio.
- Cache parziale o cancellata: non mostrare Pronta offline.
- Rifiuto autoplay o permesso GPS: conservare controlli manuali utilizzabili.

### Task 1: Matcher e controller
- [x] Scrivere e vedere fallire tests/core.test.js per margini, accuratezza, vecchiaia, monotonia, mancati salti, fine audio e play rifiutato.
- [x] Adattare src/lib/route.js e route-data.js, importare tour.json; implementare TourPlayer con feed(position), play(index), pause(), resume(), reset(cursor), prepare(), dispose().
- [x] Eseguire node --test tests/core.test.js, tutti verdi.

### Task 2: SPA e offline
- [x] Scrivere test browser per simulazione, cambio, manuale, player unico, cache completa e reload offline.
- [x] Configurare Vite/Svelte e implementare App.svelte, stile mobile, simulazione e watchPosition con pulizia.
- [x] Generare SW da file reali della build, manifest e icone PNG. Cache solo risposte complete, Range offline 206/416.
- [x] Eseguire build, controlli Svelte e test browser.

### Task 3: Consegna
- [x] Revisione indipendente su codice e specifica, correggere problemi sostanziali con test.
- [x] README con avvio, deploy, provenienza GTFS, prove effettuate e limiti telefono.
- [x] Verifica finale npm test, npm run check, npm run build, npm run test:e2e.

## Scelte di esecuzione
Il prompt è la descrizione approvata: esecuzione inline senza ulteriore gate. Il repository disponibile è vienna-dal-finestrino (remote omonimo), non vienna-tram-guide: si lavora qui come richiesto. File iniziali non tracciati: preservare il kit sorgente e le versioni legacy in una cartella dedicata prima di sostituire l'entry point. Nessun commit automatico dei file iniziali dell'utente.

## Direzione visiva
Bianco #fff, blu inchiostro #152d40, rosso tram #c83732, azzurro #eaf2f6, grigio #607280. Sans di sistema, titoli corposi, numeri linea come insegne di tram; percorso verticale a otto fermate, scheda audio principale e cambio visibile. Una colonna mobile, allineata a sinistra, controlli almeno 48 px.


## Registro di verifica
- Matcher e player: test iniziali RED (moduli assenti), poi GREEN; test aggiuntivi RED→GREEN per fallback bloccato che deve seguire la nuova tratta, richieste play pendenti e fix scaduto durante il buffering.
- Browser: test offline inizialmente RED. La diagnosi ha individuato Vary: Origin sulle risposte Vite; cache match con ignoreVary per gli asset statici dello stesso origin risolve il caricamento offline di JS/CSS.
- Revisione indipendente completata: un problema P2 sulla tratta obsoleta nel fallback autoplay, corretto con i test sopra; nessun problema minore rimandato.
- Verifiche: 15 test unitari, 7 test browser Chromium; Svelte check senza errori o avvisi; build produzione con 16 asset precache. Audio reali riprodotti tutti offline, GPS controllato, gesto audio, cleanup watch e simulazione verificati.
- QA visiva: screenshot mobile 390px ispezionato; nessun overflow a 390px o 320px, nessun errore JavaScript durante l'apertura.
- Restano verifiche ambientali sul telefono reale (GPS in tram, Safari/iOS, installazione e background), dichiarate nel README. Deploy lasciato all'utente come richiesto.
