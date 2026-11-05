# Vienna dal finestrino

Audioguida italiana per punti di interesse, Svelte 5 + Vite + Leaflet, senza backend. La mappa è la schermata principale: **28 luoghi e 56 testi** per il percorso **Da Yppengasse all’Albertina**. I luoghi si esplorano anche da lontano e senza GPS. Le voci dei nuovi contenuti vanno generate separatamente: non sono stati riutilizzati gli audio delle vecchie tratte.

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

## Uso

- Toccare un pin oppure aprire **Elenco luoghi**. Nelle aree dense, un tocco propone una scelta tra i luoghi vicini; ogni pin si apre anche con Invio o Spazio.
- La scheda è inferiore e richiudibile su telefono, laterale su desktop. Il pin selezionato viene mantenuto nella parte libera della mappa. Testi lunghi, approfondimenti e fonti si aprono su richiesta.
- **Attiva GPS** avvia `watchPosition`; **Ricentra** segue la posizione. Il GPS propone una sola scheda discreta, senza avviare audio. Se il contenuto ha un asset validato, compare **Ascolta**; altrimenti rimane **Leggi**.
- Il player è indipendente dalla scheda: cambiare pin non lo interrompe. Include pausa, ripresa, avanzamento e chiusura. Durante la riproduzione non vengono presentati nuovi suggerimenti né sostituiti altri audio. Per cambiare contenuto si può chiudere il player o metterlo in pausa.
- Gli ascolti avviati con successo vengono salvati localmente con ID del luogo e del contenuto; **Riascolta** rimane disponibile. Se la memoria è negata, la cronologia resta nella sessione e il player lo segnala.
- In **Percorsi e offline → Prova senza muoverti → Simula percorso**, una posizione ogni quattro secondi attraversa avvicinamento, geometria GTFS e arrivo a piedi. **Avanza simulazione** passa al fix seguente e ferma l'avanzamento temporizzato. È lo stesso flusso del GPS, con gli stessi cooldown.

## Catalogo, percorso e fonti

`public/catalog.json` contiene ID stabili, categoria, posizione del luogo, ingresso opzionale separato, descrizione, accesso, fonti, due contenuti e appartenenze ai percorsi. Ogni testo ha le proprie fonti. “Scopri il luogo” comprende 70–100 parole; l'approfondimento 100–150. Date e contenuti non dipendono da ciò che è visibile dal finestrino o dalla posizione di chi ascolta.

Il tragitto riusa gli otto tracciati del repository: 44 da Yppengasse a Schottentor, poi Ring verso Oper/Karlsplatz, con arrivo a piedi all'Albertina. I tracciati rappresentano il servizio programmato del **5 novembre 2026**, non informazioni in tempo reale. Il tratto finale a piedi e le deviazioni sono descritti nelle istruzioni; la linea colorata rappresenta solo i tratti in tram. Prima di partire controllare [Wiener Linien](https://www.wienerlinien.at/fahrplaene) o WienMobil.

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

Sono obbligatori entrambi gli ID. `--content approfondimento` seleziona il secondo testo. Modello e voce si cambiano con `--model` e `--voice`; il default è `gemini-3.1-flash-tts-preview`, voce `Kore`. L'accesso al modello dipende dall'account Gemini. `--generate` autorizza la chiamata potenzialmente a pagamento; non è stato eseguito in questa modifica.

Il comando crea WAV PCM, misura la durata e aggiorna `public/audio/poi-manifest.json` con hash del testo, dei byte e della configurazione. Un file invariato e integro viene riusato; modificare testo, voce o modello cambia il nome del file. `--force` richiede di rigenerare anche a parità di configurazione. Scritture di file e manifest avvengono tramite file temporanei; una risposta priva di audio non viene pubblicata.

Dopo la generazione, ascoltare il campione per pronuncia e fedeltà, poi eseguire `npm run build`. La build controlla esistenza, hash, formato WAV e durata degli asset; il runtime espone **Ascolta** soltanto se il manifest corrisponde al testo. Nessun MP3 di una vecchia tratta è associato automaticamente a un POI.

## Offline

Il service worker precarica app, catalogo e manifest. Il pulsante **Scarica percorso offline** memorizza e verifica catalogo, manifest e soltanto gli audio dichiarati per il percorso. Mostra progresso, conteggio audio ed eventuale errore. La verifica confronta i byte tramite SHA-256 e rifiuta risposte HTML di fallback. Un nuovo download può riparare file vecchi o incompleti; la cache supporta richieste Range per avanzamento audio.

**Percorso verificato offline** compare dopo la verifica del percorso e della shell. Con il catalogo iniziale segnala correttamente **0 audio**: i testi sono pronti, le voci devono essere generate. I file invariati già verificati vengono riusati anche senza rete. Se il browser libera la memoria, occorre scaricare di nuovo.

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

Da verificare sul posto: cancelli e itinerari pedonali, ingressi accessibili, precisione GPS nel tram, soglie di prossimità, servizio effettivo e cambi, Safari/iOS, sospensione in background e qualità delle voci che verranno generate. Nessuna posizione del finestrino è stata certificata. Tenere la pagina in primo piano durante l'uso GPS.
