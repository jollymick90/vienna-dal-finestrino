# Vienna dal finestrino

PWA mobile in italiano, Svelte 5 + Vite, senza backend, con libreria di percorsi importabili. Il giro incluso contiene otto racconti (circa 3 minuti di audio su 3,7 km) per **Yppengasse → Schottentor (tram 44) → Oper, Karlsplatz (tram 1)**.

A Schottentor cambia sul **tram 1 in direzione Reumannplatz**. Scendi a **Oper, Karlsplatz**. Percorsi e destinazioni sono quelli del servizio programmato per il **5 novembre 2026** forniti nel kit; l’app non consulta variazioni del servizio in tempo reale.

## Avvio

Serve Node.js 22.12+ (verificato con 22.20.0).

```sh
npm ci
npm run dev
```

Per provare anche il service worker e l’offline, usa la build di produzione:

```sh
npm run build
npm run preview
```

Apri `http://localhost:4173`. Su telefono usa l’URL **HTTPS** pubblicato: un indirizzo HTTP della rete locale non abilita GPS e service worker. Il server di sviluppo non registra il service worker.

## Pubblicare su Vercel

Importa questo repository, usando la sua **radice** come Root Directory:

- Framework preset: **Vite**
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: **dist**
- Node.js: **22.x** o successivo compatibile

Non servono variabili d’ambiente, chiavi API o backend. Il deploy è lasciato al proprietario. La configurazione attuale presume pubblicazione alla radice del dominio.

## Prima di salire: prova rapida

1. Apri l’URL HTTPS online e attendi **Pronta offline**: sono in cache app, dati e tutti gli otto audio (circa 1 MB).
2. Premi **Simula giro**. Il tour percorre le polilinee senza chiedere la posizione; **Avanza simulazione** passa al punto seguente e ferma l’avanzamento temporizzato. Alla fermata di Schottentor il racconto della linea 1 attende la partenza. Se avanzi più velocemente dei racconti, quello in corso finisce e il successivo parte soltanto se ancora pertinente.
3. Esci dalla simulazione, attiva la modalità aereo, ricarica la pagina e prova **Ascolta**, **Pausa**, **Riascolta** e un’altra tratta. Verifica anche il volume e l’uscita audio del telefono.
4. Torna online, scegli la prima tratta e, una volta sul 44, premi **Inizia il tour** o **Risincronizza GPS da questa tratta**. Consenti la posizione. Se compare **Tocca per ascoltare**, premi il pulsante.

Per installare: usa la voce di installazione del browser su Android; in Safari su iPhone, Condividi → Aggiungi alla schermata Home. Tieni **pagina in primo piano e schermo acceso**: il browser può sospendere GPS o audio in background. La disponibilità dell’installazione dipende dal browser.

## Aggiungere nuovi percorsi e audio generati dall’AI

Il giro incluso è breve. Puoi aggiungere altri percorsi senza modificare codice o ripubblicare l’app, e selezionarli dal menu **Percorso da ascoltare**. La durata mostrata è quella effettiva degli MP3: non comprende viaggio, attese o soste.

1. Apri **Aggiungi un percorso**. Scarica **modello JSON** e **prompt per AI**. Il modello esporta le geometrie del percorso selezionato; il prompt chiede linea, direzione, fermate e durata desiderata.
2. Dai all’AI il modello e **il tracciato reale del nuovo tram**, ad esempio da GTFS/GPX/GeoJSON, con fonte e licenza. Chiedi racconti più estesi con durata compatibile con ciascuna tratta. Non basta cambiare il numero della linea sul tracciato del modello.
3. Genera un MP3 per ogni racconto, con il nome indicato nel JSON. Puoi usare il servizio AI/TTS che preferisci: l’app non richiede API o account.
4. Nel campo **File del percorso e audio MP3**, seleziona insieme il JSON e tutti gli MP3. L’app verifica geometrie, file mancanti e riproducibilità prima del salvataggio.
5. Il nuovo percorso viene selezionato automaticamente: prova **Simula giro**, ascolta un audio, attendi **Pronta offline** e prova la ricarica in modalità aereo.

Copie del kit sono disponibili anche nel repository: [modello JSON](docs/modello-percorso.json) e [prompt per l’AI](docs/PROMPT_NUOVO_PERCORSO.txt). Il modello usa le geometrie reali del giro incluso come esempio di formato, non costituisce un nuovo itinerario giornaliero.

### Formato dei percorsi

Il JSON contiene `version: 1`, `id` univoco (minuscole, numeri, trattini), `title`, `description`, `attribution` (fonte/licenza dei tracciati), e `legs` in ordine di viaggio. Ogni tratta contiene:

- `line`: numero o nome del tram, come stringa; `direction`: destinazione esposta dal tram.
- `from`, `to`: fermate iniziale e finale; `title`, `transcript`: racconto completo in italiano.
- `audio`: nome locale del file, ad esempio `ring-01.mp3`; nessun URL o percorso di cartelle.
- `path`: punti `[latitudine, longitudine]` nel senso di marcia. GeoJSON usa invece l’ordine inverso: convertirlo prima dell’importazione.
- `transferBefore: true`: se si deve cambiare mezzo prima della tratta. Anche un cambio di linea/direzione viene evidenziato automaticamente. Ai cambi il GPS esclude inoltre i 35 metri attorno alla fermata d’arrivo del tram precedente, per non anticipare il nuovo racconto quando i tracciati si sovrappongono.

Sono supportate da 1 a 500 tratte, non solo otto. Ogni geometria deve essere più lunga di 53 metri per consentire i margini del matcher. Limiti per importazione: 250 MB di audio, JSON di 10 MB, massimo 100.000 punti totali. Un identificativo già presente viene rifiutato: usa un nuovo `id` per una nuova versione. Il contenuto importato viene visualizzato come testo, mai HTML.

### Salvataggio e offline

I percorsi importati e gli MP3 sono salvati insieme in **IndexedDB sul dispositivo**, separatamente dalla cache versionata dell’app. Non vengono caricati su server e non si sincronizzano con altri telefoni o browser. L’ultima selezione viene ripristinata alla riapertura. La riproduzione usa Blob locali, disponibili offline.

Un’importazione fallita lascia intatta la libreria. **Elimina questo percorso** richiede conferma e rimuove solo il tour selezionato e i suoi audio; il giro incluso rimane sempre disponibile. Conserva i JSON e gli MP3 originali: cancellazione dei dati del sito, navigazione privata o pulizia dello spazio del browser possono eliminare l’archivio. Per usare il giro su un altro telefono, importa lì gli stessi file.

## Mappa del percorso

La mappa Leaflet mostra le polilinee del percorso selezionato e i cambi di mezzo, con la tratta corrente più spessa. Nel giro incluso: tram **44 in rosso** e **1 in blu**. Tocca i punti numerati per leggere le fermate; il simbolo **⇄** indica il cambio a Schottentor. Il tratto tratteggiato collega le due fermate del cambio, non rappresenta un binario. Puoi spostare e ingrandire la mappa; **Intero percorso** ripristina la vista completa.

Premi **La mia posizione** sotto la mappa e consenti il GPS: il punto azzurro **Sei qui** viene mostrato sopra le fermate e la mappa si centra su di te, anche fuori dal tracciato. La vista segue i nuovi fix; trascinare la mappa o premere **Intero percorso** interrompe il centraggio automatico. **La mia posizione** lo riattiva. In simulazione il pulsante diventa **Centra simulazione** e il punto è indicato come simulato. Viene rimosso quando il GPS viene disattivato, il fix è impreciso/scaduto o si esce dalla simulazione. La mappa non apre un secondo watch GPS.

Leaflet, tracciati e fermate sono inclusi nella cache dell’app e restano utilizzabili offline. Lo **sfondo stradale OpenStreetMap richiede una connessione** ed è escluso dal precaricamento; il badge **Pronta offline** riguarda l’app, i percorsi e gli audio. Le tessere sono richieste direttamente a OpenStreetMap per l’area visualizzata, secondo la sua [policy](https://operations.osmfoundation.org/policies/tiles/); i fix GPS non vengono inviati dal codice dell’app.

## Comportamento

- `src/lib/tour.json` mantiene ordine, testi e collegamenti `/audio/01.mp3` … `/audio/08.mp3` del kit; `src/lib/route-data.js` mantiene le otto polilinee originali. La build controlla numero, associazione e identità dei file MP3 rispetto agli originali.
- Il matcher proietta solo sulla tratta attesa o immediatamente successiva: corridoio **40 m**, almeno **35 m** dopo la partenza e **18 m** prima dell’arrivo. Accetta accuratezza fino a **45 m** e fix di età massima **15 s**. Il cursore non torna indietro automaticamente.
- Un unico elemento audio è preparato nello stesso gesto che avvia il GPS. Una tratta risulta ascoltata solo dopo che `play()` è riuscito. Un rifiuto rende disponibile il pulsante esplicito; nessuna sovrapposizione o ripetizione automatica. Richieste audio ancora in attesa vengono invalidate quando cambia la posizione; i racconti già iniziati finiscono.
- A fine racconto viene rivalutata la posizione più recente e la sua età. Un fix assente, impreciso, vecchio o fuori percorso impedisce l’avvio automatico successivo.
- Scegliere una tratta disattiva il GPS e passa al manuale. **Risincronizza GPS da questa tratta** riparte dalla selezione, anche dopo un lungo buco di segnale. Disattivazione, uscita dalla pagina e smontaggio dell’app rimuovono il watch. Posizione e cronologia di ascolto rimangono in memoria nel browser; si azzerano alla ricarica. Percorsi importati e ultima selezione vengono invece conservati localmente.
- Il service worker viene generato dalla build con tutti i file effettivi di `dist`, inclusi i dati incorporati nel bundle. **Pronta offline** compare solo dopo una verifica di presenza di ogni asset nella cache attiva; la verifica si ripete al ritorno sulla pagina e periodicamente. Le richieste Range ricevono risposte **206**, oppure **416** se non valide, dai file MP3 completi in cache. Se il browser elimina la cache, l’offline non è più garantito.

Il kit originale resta in `vienna-tram-astra/`; la versione precedente è conservata in `legacy/`. I file JavaScript originali nella radice non vengono caricati dalla SPA.

## Verifiche

```sh
npm test
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

Verificati in Chromium desktop con viewport mobile:

- Giro simulato su tutte le otto tratte incluse e attesa al cambio.
- Importazione di un percorso da dieci tratte, riproduzione degli MP3 importati, selezione persistente e ricarica offline; cambio e rimozione del percorso.
- Errori di importazione (audio mancante, MP3 corrotto, coordinate non valide, ID duplicato), download del kit AI e testo importato non eseguibile.
- Mappa Leaflet con le due linee, selezione evidenziata, popup delle fermate, indicatore della simulazione e percorsi accessibili dopo ricarica offline.
- Preparazione audio nel gesto utente; GPS controllato per qualità, risincronizzazione e cancellazione del watch.
- Riproduzione degli MP3 reali, player unico, pausa, riascolto e trascrizione.
- Rifiuto del permesso GPS e di `play()`, con fallback manuale.
- Ricarica con rete disattivata, Range per tutti gli MP3 e riproduzione reale di tutte le otto tracce offline.
- Rimozione di un audio dalla cache: il badge **Pronta offline** scompare.

Se la porta 4173 è già occupata, esegui `PLAYWRIGHT_PORT=4174 npm run test:e2e`.

I test unitari coprono inoltre margini e monotonia del matcher, coda pertinente, fine audio, fix scaduti e risoluzioni tardive di `play()`. Per i casi di rifiuto e ritardo usano un doppio del media element; i test browser usano audio reali, sostituendo soltanto gli errori e i fix GPS da simulare.

**Da verificare sul telefono reale:** accuratezza GPS dentro il tram, politiche audio di Safari/iOS, installazione sulla schermata Home e comportamento a schermo bloccato. Il test browser non sostituisce queste prove.

## Dati e attribuzione

Geometrie: **Stadt Wien – Wiener Linien, CC BY 4.0**. Il kit indica il feed aggiornato al 2 novembre 2026 con servizio programmato per il 5 novembre 2026; questa implementazione conserva le geometrie fornite.

- [Feed GTFS ufficiale](https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip)
- [Licenza CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- [Fermata iniziale Yppengasse](https://maps.app.goo.gl/Nv9JNx2GC2qAgXto8)

Riferimenti tecnici: [Svelte](https://svelte.dev/docs), [Service Worker e cache](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [gestione di play()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play).
