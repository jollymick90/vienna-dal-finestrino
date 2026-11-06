# Vienna dal finestrino

Audioguida italiana per punti di interesse, Svelte 5 + Vite + Leaflet, senza backend. La mappa è la schermata principale: **34 luoghi e 68 testi**, divisi fra **Da Yppengasse all’Albertina** e **Naschmarkt, Karlsplatz e Stadtpark**. I luoghi si esplorano anche da lontano e senza GPS. I 68 contenuti dispongono di audio Gemini pre-generati: circa 56,6 minuti, 25,9 MiB di MP3 mono a 64 kbps. Non sono stati riutilizzati gli audio delle vecchie tratte.

## Avvio

Node.js 22.12+:

```sh
npm ci
npm run dev
```

Per GPS e offline usare HTTPS, oppure localhost sul computer. In sviluppo il service worker è disabilitato. Per provare il download reale:

```sh
npm run build
npm run preview
```

Aprire `http://localhost:4173`. Il deploy su Vercel rimane al proprietario: preset Vite, build `npm run build`, output `dist`, root del repository. L'app presume la radice del dominio. Nessuna chiave API deve essere configurata nel frontend o in Vercel per riprodurre gli asset.

I 68 MP3 POI sono serviti direttamente da MinIO sulla VPS, nel bucket dedicato `vienna-audio`, tramite `https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/`. La build verifica hash, formato e durata dei file pubblicati e richiede quindi la rete, anche quando gli MP3 sono disponibili localmente. I file POI non entrano in `dist` né nell'upload CLI di Vercel; un checkout senza MP3 locali può essere compilato. Gli otto piccoli MP3 legacy restano locali per compatibilità.

## Uso

- Toccare un pin oppure aprire **Elenco luoghi**. Nelle aree dense, un tocco propone una scelta tra i luoghi vicini; ogni pin si apre anche con Invio o Spazio.
- La scheda è inferiore e richiudibile su telefono, laterale su desktop. Il pin selezionato viene mantenuto nella parte libera della mappa. Testi lunghi, approfondimenti e fonti si aprono su richiesta.
- **Attiva GPS** avvia `watchPosition`; **Ricentra** segue la posizione. Il GPS propone una sola scheda discreta, senza avviare audio. Se il contenuto ha un asset validato, compare **Ascolta**; altrimenti rimane **Leggi**.
- Il player è indipendente dalla scheda: cambiare pin non lo interrompe. Include pausa, ripresa, avanzamento e chiusura. Durante la riproduzione non vengono presentati nuovi suggerimenti né sostituiti altri audio. Per cambiare contenuto si può chiudere il player o metterlo in pausa.
- Gli ascolti avviati con successo vengono salvati localmente con ID del luogo e del contenuto; **Riascolta** rimane disponibile. Se la memoria è negata, la cronologia resta nella sessione e il player lo segnala.
- In **Percorsi e offline → Prova senza muoverti → Simula percorso**, una posizione ogni quattro secondi attraversa avvicinamento, geometria GTFS e arrivo a piedi. **Avanza simulazione** passa al fix seguente e ferma l'avanzamento temporizzato. È lo stesso flusso del GPS, con gli stessi cooldown.

## Catalogo, percorsi e fonti

`public/catalog.json` contiene ID stabili, categoria, posizione del luogo, ingresso opzionale separato, descrizione, accesso, fonti, due contenuti e appartenenze ai percorsi. Ogni testo ha le proprie fonti. “Scopri il luogo” comprende 70–100 parole; l'approfondimento 100–150. Date e contenuti non dipendono da ciò che è visibile dal finestrino o dalla posizione di chi ascolta.

Il percorso originale riusa gli otto tracciati del repository: 44 da Yppengasse a Schottentor, poi Ring verso Oper/Karlsplatz, con arrivo a piedi all'Albertina. I tracciati rappresentano il servizio programmato del **5 novembre 2026**, non informazioni in tempo reale. Il tratto finale a piedi e le deviazioni sono descritti nelle istruzioni; la linea colorata rappresenta solo i tratti in tram. Prima di partire controllare [Wiener Linien](https://www.wienerlinien.at/fahrplaene) o WienMobil.

La vista iniziale mostra **Tutti i luoghi**. In **Percorsi e offline → Scegli un percorso** si può filtrare il gruppo **Naschmarkt, Karlsplatz e Stadtpark**: Naschmarkt, Secession, Karlskirche (Chiesa di San Carlo), Hochstrahlbrunnen, Palais Schwarzenberg e Stadtpark. Include dodici audio nuovi, circa 10,1 minuti / 4,88 MB. È un gruppo da esplorare a piedi: mostra i pin senza tracciare collegamenti pedonali inventati e nasconde tracciato e simulazione del precedente giro in tram. Coordinate, fonti e note di accesso sono nel [resoconto dei nuovi POI](docs/research/naschmarkt-pois-2026-11-06.md).

I dati dei due vecchi tour e gli otto MP3 sono conservati nei moduli originali e in `legacy/` e `vienna-tram-astra/`. Non sono collegati ai nuovi monumenti e non vengono scaricati come audio di questo percorso. I test precedenti dei matcher, del player e delle risposte Range sono conservati. I test browser sono stati adattati al nuovo comportamento con ascolto manuale.

Coordinate da OpenStreetMap, con URL del singolo oggetto e snapshot di ricerca in `docs/research/`. Per aree estese è indicato un riferimento motivato: Alser Straße per il Gürtel, Heldenplatz per la Hofburg, centro cartografico per i parchi. Ingressi principali distinti documentati per **Josephinum e Theseustempel**; negli altri casi la scheda dichiara che il pin non certifica un ingresso.

`routeContext` conserva distanza minima in linea d'aria e proiezione sul GTFS, calcolate dalle coordinate documentate. Per luoghi interni entro 250 m dal tracciato, `suggestion.location` è un punto calcolato sul percorso: serve a proporre **Qui vicino**, insieme alla prossimità effettiva al luogo. Non è un ingresso né una dichiarazione di visibilità. Distanze e metodo sono raccolti in [docs/research/route-distances.md](docs/research/route-distances.md).

Le fonti editoriali sono enti e istituzioni: Comune e turismo di Vienna, università, musei, Parlamento, Bundesgärten, Burghauptmannschaft, parrocchie e gestori. Il dettaglio della verifica e ciò che resta da controllare sono in [docs/research/editorial-report.md](docs/research/editorial-report.md).

Attribuzione: **coordinate © OpenStreetMap contributors, ODbL; tracciati © Stadt Wien – Wiener Linien, CC BY 4.0**. L'attribuzione cartografica rimane visibile sulla mappa anche con la scheda aperta.

## Prossimità

`src/lib/proximity.js` è separato dal player. Configurazione tramite `proximityDefaults` o parametro `config` di `createProximity`:

| Regola | Valore iniziale |
| --- | --- |
| Ingresso | 100 m |
| Uscita | 170 m |
| Intervallo minimo globale | 45 s |
| Intervallo individuale dopo proposta/chiusura | 15 min, con uscita dall'area prima di una nuova proposta |
| Fix valido | accuratezza ≤45 m; età ≤15 s; timestamp non futuro |

I punti vicino al tracciato possono avere soglie proprie: 75/150 m. L'accuratezza riduce l'area utile di ingresso. Un nuovo avviso richiede l'uscita dalla soglia più ampia; un fix ritardato non fa arretrare quello corrente. La graduatoria considera distanza, percorso selezionato, pertinenza e contenuti già ascoltati. Le posizioni non sono inviate dall'app a un server; il provider della mappa riceve le richieste delle tessere visualizzate.

Il modello supporta regole `suggestion.tram` con `pathIndex`, `fromMeters`, `toMeters`, `direction`. Usano proiezione e avanzamento sul tracciato, richiedono due fix recenti entro il corridoio di 45 m e uno spostamento maggiore dell'incertezza. Fermo, retromarcia, direzione incerta o GPS fuori corridoio non attivano queste regole. **Nessuna finestra direzionale o indicazione di lato è stata inventata nel primo catalogo**: le proposte iniziali sono geografiche e i luoghi restano autonomi.

## Audio Gemini TTS

Nel repository esplorato non era presente un generatore Gemini locale riutilizzabile. È stato aggiunto `scripts/generate-poi-audio.js`, separato completamente dal runtime e senza nuove dipendenze. Usa l'[API Gemini TTS](https://ai.google.dev/gemini-api/docs/speech-generation).

Il dry-run è predefinito e **non legge la chiave né fa chiamate API**:

```sh
npm run tts -- --place albertina --content scopri --dry-run
```

Per generare **un solo audio di prova**, impostare `GEMINI_API_KEY` nel proprio terminale ed eseguire personalmente:

```sh
npm run tts -- --place albertina --content scopri --generate
```

Per generare tutti i contenuti mancanti, mantenendo la stessa voce e riutilizzando i file validi:

```sh
npm run tts:all -- --dry-run
npm run tts:all -- --generate
```

Se la chiave è salvata nel file locale `.env.local` (`GEMINI_API_KEY=...`), il comando completo è:

```sh
node --env-file=.env.local scripts/generate-all-poi-audio.js --generate
```

Il file `.env.local` è escluso da Git. La generazione procede in sequenza e salva ogni audio completato: dopo un'interruzione basta ripetere il comando per riprendere. Non si rigenerano i contenuti già validi.

Sono obbligatori entrambi gli ID. `--content approfondimento` seleziona il secondo testo. Modello e voce si cambiano con `--model` e `--voice`; il default è `gemini-3.1-flash-tts-preview`, voce `Kore`. L'accesso al modello dipende dall'account Gemini. `--generate` autorizza la chiamata potenzialmente a pagamento. I 68 audio attuali sono stati generati su autorizzazione del proprietario.

Il comando crea WAV PCM, misura la durata e aggiorna `public/audio/poi-manifest.json` con hash del testo, dei byte e della configurazione. Un file invariato e integro viene riusato; modificare testo, voce o modello cambia il nome del file. `--force` richiede di rigenerare anche a parità di configurazione. Scritture di file e manifest avvengono tramite file temporanei; una risposta priva di audio non viene pubblicata.

Dopo la generazione, ascoltare il campione per pronuncia e fedeltà, poi eseguire `npm run build`. La build controlla esistenza, hash, formato WAV/MP3 e durata degli asset; il runtime espone **Ascolta** soltanto se il manifest corrisponde al testo. Nessun MP3 di una vecchia tratta è associato automaticamente a un POI.

## Compressione locale

Gli audio distribuiti sono MP3 mono a 64 kbps: circa 83% in meno rispetto ai WAV. I master originali restano in `audio-masters/`, cartella locale esclusa da Git e dalla build. Manifest, durate e hash sono aggiornati; il generatore TTS riutilizza anche gli MP3 invariati.

Per comprimere eventuali nuovi WAV dopo la generazione (richiede FFmpeg locale, nessuna chiamata API):

```sh
npm run audio:compress
npm run audio:publish
npm run build
```

Gli MP3 già validi vengono riusati. La build controlla entrambi i formati senza richiedere FFmpeg sul server. Dettagli e dimensioni nel [resoconto di compressione](docs/research/audio-compression-2026-11-06.md).

## Pubblicazione audio sulla VPS

`npm run audio:publish` legge le credenziali dedicate da `.env.storage`, file locale ignorato da Git e Vercel (modello: `.env.storage.example`). Una copia privata è conservata sulla VPS in `~/.config/vienna-audio/publisher.env`. Non usare le credenziali root MinIO e non configurare chiavi nel frontend o su Vercel.

Il publisher verifica tutti gli MP3 locali prima di iniziare; carica soltanto nel bucket Vienna e verifica ogni file remoto tramite SHA-256. I file già presenti e identici vengono riusati. Non elimina oggetti e non sostituisce file remoti che hanno un hash diverso. I nomi includono l'hash dei byte e vengono serviti come `audio/mpeg` con cache immutabile per un anno.

Dopo generazione e compressione, pubblicare gli MP3 **prima** di distribuire il nuovo manifest. Il manifest sorgente conserva i percorsi locali per permettere il riuso TTS; l'app li risolve verso MinIO e il service worker gestisce esclusivamente quel percorso remoto, mantenendo download, verifica e avanzamento offline. Gli originali WAV restano in `audio-masters/` sul computer che li ha generati.

Il nuovo bucket condivide processo MinIO e disco con Hidrospace; nomi e permessi sono separati. Nessuna configurazione Docker, Caddy o dei bucket Hidrospace è stata modificata. Misure e verifica nel [resoconto storage](docs/research/audio-storage-2026-11-06.md).

## Offline

Il service worker precarica app, catalogo e manifest. Il pulsante **Scarica percorso offline** memorizza e verifica catalogo, manifest e soltanto gli audio dichiarati per il percorso. Con **Tutti i luoghi** selezionato scarica entrambi i gruppi; con un gruppo selezionato scarica soltanto i suoi audio. Mostra progresso, conteggio audio ed eventuale errore. La verifica confronta i byte tramite SHA-256 e rifiuta risposte HTML di fallback. Un nuovo download può riparare file vecchi o incompleti; la cache supporta richieste Range per avanzamento audio. Dopo il download verificato, rimuove i vecchi audio POI non più usati dal catalogo, compresi i WAV precedenti.

**Percorso verificato offline** compare dopo la verifica del percorso e della shell. Il catalogo attuale comprende **68 audio** (circa 25,9 MiB), tutti generati e verificati. I file invariati già verificati vengono riusati anche senza rete. Se il browser libera la memoria, occorre scaricare di nuovo.

Lo sfondo `tile.openstreetmap.org` è **solo online**, secondo la [policy del provider](https://operations.osmfoundation.org/policies/tiles/). Non sono implementati download o prefetch di tessere. Senza rete restano pin, geometrie, testi e audio scaricati. Lo stato dello sfondo è distinto dall'esito del download dei racconti.

## Verifiche e prove sul posto

```sh
npm test
npm run check
npm run build
PLAYWRIGHT_PORT=4185 npm run test:e2e -- --workers=2
```

I test coprono schema e lunghezza dei testi, coerenza degli asset, fix obsoleti/imprecisi, ranking, isteresi, cooldown, direzione e corridoio, proposte ai luoghi e ai riferimenti sul tragitto, mancato autoplay, storia locale, riuso TTS e assenza di rete nel dry-run. Nel browser: esplorazione senza GPS, scelta dei pin sovrapposti, schede senza audio, permesso negato, simulazione, player continuo, errore di riproduzione, pausa/seek/riascolto, testi e audio scaricati dopo ricarica offline.

La fixture audio dei test usa un MP3 esistente **soltanto nel contesto di test**, per verificare il player e la cache senza generare una voce a pagamento. Il catalogo di produzione resta privo di quell'associazione.

Da verificare sul posto: cancelli e itinerari pedonali, ingressi accessibili, precisione GPS nel tram, soglie di prossimità, servizio effettivo e cambi, Safari/iOS, sospensione in background e qualità e pronuncia delle voci generate. Nessuna posizione del finestrino è stata certificata. Tenere la pagina in primo piano durante l'uso GPS.
