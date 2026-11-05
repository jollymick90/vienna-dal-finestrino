# Resoconto editoriale e geografico

Verifica da fonti pubbliche: 5 novembre 2026. Il catalogo comprende tutti i 28 luoghi richiesti, con 56 testi italiani originali (70–100 e 100–150 parole) e fonti puntuali associate ai contenuti. Non sono stati generati audio a pagamento né eseguiti deploy.

## Provenienza

Le coordinate sono tratte da oggetti OpenStreetMap: nodi quando disponibili, centro del rettangolo cartografico per way e relation. Un centro cartografico non certifica una porta o un punto pedonale. Gli URL sono nel campo `location.source`. La risposta Overpass usata per l'inventario è conservata in `osm-pois.json`; `sisi-osm.xml` documenta il nodo del monumento e `alser-osm.xml` la stazione scelta come riferimento del Gürtel.

Per il Josephinum e il Theseustempel, i nodi `entrance=main` sono conservati in `entrances.json` e nel catalogo come posizione separata. Questi dati sono documentati cartograficamente, non verificati fisicamente. Per gli altri luoghi l'ingresso preciso rimane non certificato: la scheda lo dichiara, senza creare coordinate ipotetiche.

La posizione di un suggerimento non viene spacciata per posizione del monumento. Le proiezioni sul GTFS sono calcolate geometricamente e conservano fonte e metodo. La tabella [route-distances.md](route-distances.md) indica tutte le distanze minime dal tracciato: non sono lunghezze di cammino. Le proposte dei luoghi interni entro 250 m possono apparire sia sul tratto vicino sia quando ci si avvicina effettivamente al luogo, con un'unica memoria di chiusura e isteresi.

## Scelte per aree estese e deviazioni

- **Gürtel:** riferimento alla stazione Alser Straße, circa 177 m dal tracciato del 44 conservato. La stazione consente di raccontare la Stadtbahn con un punto riconoscibile; non rappresenta tutta la cintura né una veduta verificata dal tram.
- **Hofburg:** riferimento a Heldenplatz davanti alla Neue Burg, circa 180 m dal tracciato. La scheda distingue l'intero complesso dalla piazza e dagli ingressi dei musei.
- **Brunnenmarkt:** riferimento all'area mappata su Brunnengasse, circa 392 m dal tracciato. L'estensione del mercato non coincide con un unico pin; visita prima della salita, a piedi.
- **Yppenplatz e Brunnenpassage:** esplorazione a piedi prima del 44, non fermate del tram.
- **Breitenfelder Kirche (333 m), Narrenturm (414 m), Josephinum (515 m), MuseumsQuartier (333 m):** deviazioni a piedi esplicite; nessuna promessa di vista diretta dal 44/Ring.
- **Altes AKH, Volksgarten, Theseustempel, Sisi, Hofburg, Burggarten, Mozart e Palmenhaus:** accessi interni, cortili o parchi; proposta «Qui vicino», con spiegazione del tratto a piedi.
- **Opera → memoriale → Albertina → Augustinerkirche:** arrivo e deviazione finale a piedi. Nessuna linea disegnata come itinerario pedonale certificato.

## Fonti dei fatti

Ogni scheda contiene gli URL completi; il catalogo è la lista delle fonti per luogo e per testo. Sono state privilegiate fonti del Comune e di WienTourismus, gestori dei monumenti, musei, università, Parlamento austriaco, Bundesgärten e Burghauptmannschaft. Per il memoriale è usata anche la rete Memorial Museums.

Date, opere e personaggi nei testi sono limitati agli elementi documentati da queste fonti. Le riflessioni sull'uso degli spazi sono letture editoriali, non nuove affermazioni storiche. Non sono proposti orari o prezzi destinati a cambiare. Non è attribuito alcun lato del finestrino; non sono attivate regole di passaggio direzionale prive di verifica.

## Verifiche ancora necessarie

1. Percorrere il tragitto reale, controllando servizio del 44, cambio a Schottentor e Ring verso Oper/Karlsplatz. La geometria del repository descrive un servizio programmato, non una verifica live.
2. Verificare sul posto i cancelli dei parchi/campus e gli ingressi, inclusa accessibilità. Mancano coordinate d'ingresso certificate per 26 luoghi: non sono state inventate.
3. Controllare percorsi pedonali e attraversamenti, in particolare accesso al campus, deviazione verso Breitenfeld/Josephinum e arrivo all'Albertina.
4. Tarare le soglie con GPS reale, soprattutto nel tram e vicino a edifici alti. Provare Safari/iOS, permessi, schermo bloccato e gestione della memoria offline.
5. Ascoltare ogni voce dopo la generazione: durata misurata e hash non certificano fedeltà verbale o pronuncia. Non essendo autorizzate chiamate a pagamento, questo controllo rimane al proprietario.

## Audio preesistenti

Gli otto MP3 originali narrano tratte, non i nuovi contenuti dei singoli luoghi. Sono preservati nel repository ma esclusi dal manifest POI e dal download del percorso. Nessuna associazione automatica è stata fatta.

## Esito tecnico della verifica

- `npm test`: 45 test unitari superati.
- `npm run check`: zero errori e zero avvisi Svelte.
- `npm run build`: 28 luoghi, 56 testi, zero audio POI dichiarati; build completata.
- `PLAYWRIGHT_PORT=4185 npm run test:e2e -- --workers=2`: 10 test browser superati, incluso audio scaricato con pausa/seek dopo ricarica offline.
- `npm run tts -- --place albertina --content scopri --dry-run`: nessuna chiamata API; selezione e asset pianificati correttamente.
- Revisione indipendente e controllo visivo dei layout mobile/desktop completati; nessun problema importante residuo segnalato.

Le prove browser di audio usano una fixture isolata; non certificano qualità o pronuncia di voci Gemini non ancora generate.
