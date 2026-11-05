# Vienna dal finestrino

PWA mobile in italiano, Svelte 5 + Vite, senza backend. Otto racconti MP3 locali per **Yppengasse → Schottentor (tram 44) → Oper, Karlsplatz (tram 1)**.

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

## Mappa del percorso

La mappa Leaflet mostra le otto polilinee GTFS: tram **44 in rosso** e **1 in blu**, con la tratta corrente più spessa. Tocca i punti numerati per leggere le fermate; il simbolo **⇄** indica il cambio a Schottentor. Il tratto tratteggiato collega le due fermate del cambio, non rappresenta un binario. Puoi spostare e ingrandire la mappa; **Intero percorso** ripristina la vista completa.

Premi **La mia posizione** sotto la mappa e consenti il GPS: il punto azzurro **Sei qui** viene mostrato sopra le fermate e la mappa si centra su di te, anche fuori dal tracciato. La vista segue i nuovi fix; trascinare la mappa o premere **Intero percorso** interrompe il centraggio automatico. **La mia posizione** lo riattiva. In simulazione il pulsante diventa **Centra simulazione** e il punto è indicato come simulato. Viene rimosso quando il GPS viene disattivato, il fix è impreciso/scaduto o si esce dalla simulazione. La mappa non apre un secondo watch GPS.

Leaflet, tracciati e fermate sono inclusi nella cache dell’app e restano utilizzabili offline. Lo **sfondo stradale OpenStreetMap richiede una connessione** ed è escluso dal precaricamento; il badge **Pronta offline** riguarda l’app, i percorsi e gli audio. Le tessere sono richieste direttamente a OpenStreetMap per l’area visualizzata, secondo la sua [policy](https://operations.osmfoundation.org/policies/tiles/); i fix GPS non vengono inviati dal codice dell’app.

## Comportamento

- `src/lib/tour.json` mantiene ordine, testi e collegamenti `/audio/01.mp3` … `/audio/08.mp3` del kit; `src/lib/route-data.js` mantiene le otto polilinee originali. La build controlla numero, associazione e identità dei file MP3 rispetto agli originali.
- Il matcher proietta solo sulla tratta attesa o immediatamente successiva: corridoio **40 m**, almeno **35 m** dopo la partenza e **18 m** prima dell’arrivo. Accetta accuratezza fino a **45 m** e fix di età massima **15 s**. Il cursore non torna indietro automaticamente.
- Un unico elemento audio è preparato nello stesso gesto che avvia il GPS. Una tratta risulta ascoltata solo dopo che `play()` è riuscito. Un rifiuto rende disponibile il pulsante esplicito; nessuna sovrapposizione o ripetizione automatica. Richieste audio ancora in attesa vengono invalidate quando cambia la posizione; i racconti già iniziati finiscono.
- A fine racconto viene rivalutata la posizione più recente e la sua età. Un fix assente, impreciso, vecchio o fuori percorso impedisce l’avvio automatico successivo.
- Scegliere una tratta disattiva il GPS e passa al manuale. **Risincronizza GPS da questa tratta** riparte dalla selezione, anche dopo un lungo buco di segnale. Disattivazione, uscita dalla pagina e smontaggio dell’app rimuovono il watch. Posizione e cronologia di ascolto rimangono in memoria nel browser; si azzerano alla ricarica.
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

- Giro simulato su tutte le otto tratte e attesa al cambio.
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
