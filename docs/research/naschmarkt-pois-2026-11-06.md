# Naschmarkt, Karlsplatz e Stadtpark · 6 novembre 2026

Sei POI richiesti dall’utente, dodici nuovi testi italiani nel formato dell’app: introduzione da 70–100 parole e approfondimento da 100–150 parole. Esclusi da questo intervento Madame Tussauds e le tappe di Schönbrunn.

## Coordinate e riferimenti

Centri cartografici restituiti da OpenStreetMap/Overpass, con selezione esplicita degli oggetti corretti: esclusi fermate, stazioni e accessi della metropolitana omonimi. I pin non certificano ingressi o accessibilità. Per Naschmarkt e Stadtpark il riferimento centrale non rappresenta tutta l’estensione del luogo.

| Luogo | Oggetto OSM | Latitudine | Longitudine |
| --- | --- | ---: | ---: |
| Naschmarkt | [way 29320733](https://www.openstreetmap.org/way/29320733) | 48.198347 | 16.3625791 |
| Secession | [way 25371168](https://www.openstreetmap.org/way/25371168) | 48.2004956 | 16.3657826 |
| Karlskirche | [way 8097149](https://www.openstreetmap.org/way/8097149) | 48.1982797 | 16.3717985 |
| Hochstrahlbrunnen | [way 12990452](https://www.openstreetmap.org/way/12990452) | 48.1983801 | 16.3761125 |
| Palais Schwarzenberg | [relation 5541555](https://www.openstreetmap.org/relation/5541555) | 48.1969026 | 16.3769307 |
| Stadtpark | [way 551031461](https://www.openstreetmap.org/way/551031461) | 48.2047644 | 16.379574 |

L’estratto dei riferimenti è in `osm-naschmarkt-2026-11-06.json`. La prima interrogazione ha restituito correttamente i dati; le successive richieste per uno snapshot completo hanno incontrato HTTP 502 o timeout. Il file è dichiarato come estratto, non come risposta grezza integrale.

## Verifica editoriale

- **Naschmarkt:** la [storia del Comune](https://www.wien.gv.at/en/leisure/naschmarkt-history) documenta le due ipotesi sul nome Aschenmarkt, il nome ufficiale dal 1905 e l’espansione sulla copertura del Wien. [WienTourismus](https://www.wien.info/en/dine-drink/markets/naschmarkt-353536) documenta l’offerta del mercato e la distinzione fra banchi e ristorazione. Nessun orario uniforme dei singoli esercizi è promesso.
- **Secession:** la [storia dell’edificio pubblicata dalla Secession](https://secession.at/en/building) documenta Olbrich, il completamento nel 1898, il permesso iniziale provvisorio e gli spazi espositivi. La [pagina del Fregio di Beethoven](https://secession.at/en/beethovenfries) documenta la mostra del 1902 e la conservazione dell’opera. Gli interni non vengono presentati come gratuiti.
- **Karlskirche:** la [storia ufficiale della chiesa](https://www.karlskirche.at/geschichte/) documenta voto del 1713, prima pietra nel 1716, prosecuzione dopo il 1723 e consacrazione nel 1737; rilievi delle colonne e affresco di Rottmayr. Si distingue l’osservazione esterna dalla visita con biglietto.
- **Hochstrahlbrunnen:** il [Comune](https://presse.wien.gv.at/presse/2026/02/18/wiener-hochstrahlbrunnen-wird-ab-ende-2027-saniert) e la [celebrazione dei 150 anni di Wiener Wasser](https://presse.wien.gv.at/presse/2023/10/24/150-jahre-wiener-wasser-bundespraesident-alexander-van-der-bellen-und-buergermeister-michael-ludwig-eroeffnen-jubilaeumsbrunnen) documentano il rapporto con la condotta del 1873. La [pagina sull’acqua di Vienna](https://www.wien.info/de/lebenswertes-wien/wasser-in-wien/wiener-wasser-434182) descrive la pausa invernale: il testo non promette getti attivi durante la visita di novembre. La vasca ornamentale non viene descritta come fontanella potabile.
- **Palais Schwarzenberg:** la [ricerca d’archivio TU Wien di Johannes Spitaler](https://repositum.tuwien.at/handle/20.500.12708/9139) documenta origine nel 1697, progettisti, modifiche, giardini e impianti idrici; il [comunicato dei responsabili del palazzo](https://www.ots.at/presseaussendung/OTS_20040719_OTS0050/hotel-im-palais-schwarzenberg-investitionen-in-die-zukunft) integra i danni e gli interventi novecenteschi. Non si ricavano condizioni d’accesso attuali da un comunicato del 2004: l’app propone la sola osservazione esterna dagli spazi pubblici.
- **Stadtpark:** [Stadt Wien](https://www.wien.gv.at/freizeit/stadtpark) e [WienTourismus](https://www.wien.info/en/livable-vienna/parks-green-spaces/parks-gardens-center-354980) documentano apertura nel 1862, progetto paesaggistico e carattere comunale; la [scheda del monumento a Strauss](https://www.wien.info/de/kunst-kultur/musik-buehne/strauss-denkmal-360240) conferma Hellmer e inaugurazione nel 1921. Il pin è il parco, non la stazione né la statua.

## Organizzazione nell’app

Il gruppo `naschmarkt-stadtpark` raccoglie solo questi sei luoghi. Le indicazioni descrivono un ordine possibile a piedi; non sono navigazione e non introducono segmenti pedonali inventati. Selezionando il gruppo, la mappa inquadra i sei pin e nasconde le linee del precedente giro in tram. La simulazione resta riservata al percorso originale.

La vista iniziale mostra tutti i 34 POI. “Tutti i luoghi” scarica gli audio di entrambi i gruppi; ogni gruppo scarica soltanto i propri. I suggerimenti GPS rispettano il gruppo selezionato e continuano a non avviare automaticamente il player.

I precedenti 28 oggetti POI e le 56 voci del manifest sono stati confrontati con l’istantanea precedente all’intervento: invariati. I nuovi audio usano il modello e la voce già approvati, vengono compressi e pubblicati tramite l’utente MinIO limitato al bucket Vienna. Nessun accesso amministrativo alla VPS o modifica dei dati Hidrospace è richiesto.

## Esito audio e verifiche

Generati **12 audio nuovi**, riusati i **56 precedenti**. I nuovi MP3 mono a 64 kbps occupano **4.879.452 byte** (4,88 MB) per **10,15 minuti**. Catalogo completo: **34 luoghi, 68 testi/audio**, 27.200.628 byte (27,20 MB / 25,94 MiB), 56,57 minuti. Pubblicazione MinIO: 12 caricamenti, 56 riusi verificati via hash. Tutti i nuovi file verificati anche con ffprobe per codec MP3, canale mono e durata coerente.

Verifiche finali: 64 test unitari; svelte-check con zero errori e avvisi; build produzione con controllo dei 68 file remoti; 14 test Chromium, inclusi filtro dei sei luoghi, assenza dei tracciati tram, GPS Karlskirche, download dei soli dodici file e ascolto del nuovo audio dopo reload offline. Test di regressione riproducono e verificano la correzione dei suggerimenti GPS fuori gruppo e della verifica offline asincrona superata da un cambio gruppo. Revisione indipendente eseguita; nessun rilievo importante rimasto aperto.

Queste verifiche tecniche non certificano la pronuncia di tutti i nomi propri. Restano le prove sul posto di GPS/accessi e Safari/iOS. Nessun deploy Vercel o push sul ramo condiviso effettuato.
