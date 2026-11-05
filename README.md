# Vienna dal finestrino

PWA mobile in italiano, Svelte 5 + Vite, senza backend. **Due tour inclusi nella build**, selezionabili da «Percorso da ascoltare». Non ci sono importazione, download di pacchetti, eliminazione di tour o archivio personale nel browser.

| Tour | Percorso | Contenuti |
| --- | --- | --- |
| Dal mercato all’Opera | 44 da Yppengasse a Schottentor, poi 1 verso Reumannplatz fino a Oper, Karlsplatz | 8 racconti, circa 3 minuti di MP3, mappa e GPS |
| Vienna Ring Tour | Schottentor → Oper/Karlsplatz (1), → Schwedenplatz (2 verso Friedrich-Engels-Platz), → Schottentor (1 verso Reumannplatz) | 8 racconti in testo, mappa e GPS; **MP3 non forniti** |

Il Ring conserva geometrie e testi del file `vienna-tram-astra/vienna-ring-tour.json`. Il file indica **26 minuti a bordo**, esclusi attese e cambi, per il servizio del 5 novembre 2026. L’avvicinamento da Yppengasse sul 44 è mostrato come indicazione separata; non viene aggiunto alla geometria dell’anello. Non è una verifica del servizio in tempo reale né una durata giornaliera.

## Avvio e pubblicazione

Node.js 22.12+ (verificato con 22.20.0):

```sh
npm ci
npm run dev
```

Per provare il service worker e l’offline:

```sh
npm run build
npm run preview
```

Apri `http://localhost:4173`. Su telefono usa un URL HTTPS: HTTP su rete locale non abilita GPS e service worker. In sviluppo il service worker non viene registrato.

Vercel: Root Directory alla radice del repository, preset **Vite**, installazione `npm ci`, build `npm run build`, output **dist**, Node.js 22.x o successivo compatibile. Nessuna variabile d’ambiente o chiave API. La pubblicazione presume la radice del dominio; il deploy è lasciato al proprietario.

## Uso

1. Scegli uno dei due tour. Entrambi sono già disponibili, senza caricare file.
2. Tocca **Inizia il tour** a bordo, oppure **La mia posizione** sotto la mappa, e consenti il GPS.
3. Il punto azzurro **Sei qui** appare sopra le fermate; la mappa si centra sulla posizione. Trascinare la mappa o premere **Intero percorso** interrompe il centraggio; **La mia posizione** lo riattiva.
4. Il GPS aggiorna la tratta. Nel tour originale avvia l’MP3; nel Ring mostra il racconto in testo, con trascrizione già aperta e avviso che gli audio non sono ancora disponibili.
5. Puoi scegliere una tratta manualmente. **Risincronizza GPS da questa tratta** riparte dalla selezione dopo un buco di segnale.

Il cambio tour ferma GPS, simulazione e audio, poi riparte dalla prima tratta. La selezione e il progresso restano solo in memoria: alla ricarica si torna al tour originale. Il catalogo non dipende da IndexedDB o localStorage. Eventuali vecchi dati importati da una versione precedente non vengono letti né cancellati.

Tieni **pagina in primo piano e schermo acceso**. Installazione: menu del browser su Android; Condividi → Aggiungi alla schermata Home in Safari su iPhone.

## Mappa, GPS e audio

- Leaflet mostra le geometrie del tour selezionato, con tratta corrente più spessa, fermate cliccabili e cambi tratteggiati. Nel Ring le sezioni sono 1 → 2 → 1.
- Il matcher considera solo la tratta attesa e quella successiva. Margini: corridoio 40 m, almeno 35 m dalla partenza e 18 m prima dell’arrivo; fix fino a 45 m di accuratezza e 15 s di età. Ai cambi vengono esclusi anche i 35 m attorno alla fermata d’arrivo precedente.
- La posizione non viene trasmessa dall’app. Il punto viene rimosso quando il GPS è spento, il fix scade o è impreciso. Il watch viene cancellato anche all’uscita dalla pagina.
- Il tour originale usa un unico player. La tappa viene segnata come ascoltata solo dopo l’avvio riuscito; `play()` rifiutato mostra **Tocca per ascoltare**. Un audio già iniziato finisce prima di avviare quello successivo, se la posizione è ancora pertinente.
- Il Ring ha `audio: null`: nessuna richiesta verso MP3 inesistenti, nessun ascolto fittizio e nessun audio del tour originale riutilizzato per testi diversi.

## Offline e prova prima di salire

Il service worker precarica app, entrambi i tour (dati nel bundle), icone e gli otto MP3 originali. **Pronta offline** appare solo dopo la verifica di tutti gli asset in cache. Le richieste Range degli MP3 ricevono risposte 206 o 416 dai file completi.

Lo sfondo OpenStreetMap richiede connessione ed è escluso dal precaricamento: offline restano geometrie, fermate e racconti. Le tessere vengono richieste direttamente per l’area visualizzata, secondo la [policy OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

Prova rapida:

1. Apri online e attendi **Pronta offline**.
2. Scegli **Vienna Ring Tour** e prova **Simula giro**. **Avanza simulazione** passa al punto seguente e interrompe l’avanzamento temporizzato. Il giro termina a Schottentor.
3. Attiva modalità aereo, ricarica e seleziona di nuovo il Ring: mappa del percorso e testi devono funzionare.
4. Scegli il tour originale e prova un MP3, pausa e riascolto anche offline.

La cache offline non è un archivio personale: se il browser cancella i dati del sito occorre riaprire online. Restano da verificare sul telefono reale accuratezza GPS nel tram, politiche audio Safari/iOS, installazione e sospensione in background.

## Modificare i tour nel repository

`src/lib/builtin-tour.js` definisce il catalogo:

- Il tour originale usa `src/lib/tour.json`, `src/lib/route-data.js` e `public/audio/01.mp3` … `08.mp3`.
- Il Ring legge direttamente `vienna-tram-astra/vienna-ring-tour.json`, convertendo i capitoli delle tre sezioni in otto tratte GPS e conservando i due cambi di mezzo.

Per aggiungere gli audio del Ring, inserire gli MP3 nel repository, assegnare i relativi percorsi e durate al Ring in `builtin-tour.js`, quindi ricostruire e pubblicare l’app. Non associare gli otto MP3 originali ai testi del Ring: sono racconti diversi.

La build controlla entrambi i tour e l’esistenza degli audio dichiarati. Il kit originale è conservato in `vienna-tram-astra/`; la precedente versione statica è in `legacy/`.

## Verifiche

```sh
npm test
npm run check
npm run build
npx playwright install chromium
PLAYWRIGHT_PORT=4174 npm run test:e2e
```

La porta alternativa evita conflitti con un’anteprima già aperta sulla 4173. I test browser verificano entrambi i tour anche con IndexedDB/localStorage disabilitati, assenza dei controlli di importazione/download, mappa e simulazione Ring, testi e MP3 offline, GPS e cleanup, fallback audio e selezione manuale. I test unitari coprono matcher, player, Range, conversione del file Ring e nessuna riproduzione per racconti senza audio.

## Dati e attribuzione

**Stadt Wien – Wiener Linien, CC BY 4.0**. Geometrie e indicazioni di servizio sono quelle fornite nei file del progetto per il 5 novembre 2026.

- [Feed GTFS ufficiale](https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip)
- [Licenza CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- [Fermata iniziale Yppengasse](https://maps.app.goo.gl/Nv9JNx2GC2qAgXto8)
