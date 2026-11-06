# Compressione audio · 6 novembre 2026

Tutti i 56 contenuti sono ora distribuiti in MP3 mono a 64 kbps, 24 kHz, codificati localmente con FFmpeg/libmp3lame. Nessuna chiamata Gemini o altro servizio a pagamento.

- Prima: **127.5 MiB** di WAV PCM.
- Dopo: **21.3 MiB** di MP3.
- Riduzione: **83.3%**.
- Voci, testi e durata del contenuto conservati; MP3 è una compressione con perdita.

I WAV originali, verificati tramite SHA-256, sono conservati in `audio-masters/poi/`. In `audio-masters/` sono conservati anche snapshot del manifest. La cartella è esclusa da Git e si trova fuori da `public`: gli originali non entrano nella build o nel download offline.

Il manifest usa URL con hash dei file MP3 e registra i parametri di compressione e l'hash del master. Il generatore riconosce come riusabili i 56 asset compressi: non richiede nuove chiamate TTS. La build verifica hash, struttura dei frame MP3 e durata senza richiedere FFmpeg sul server. FFmpeg serve solo per la conversione locale.

Verifica indipendente di tutti i 56 file con ffprobe: MP3, mono, 24 kHz, bitrate 64000 bit/s. Scarto massimo della durata rispetto ai master: 0.000000 secondi.

Dopo un download verificato del percorso, la cache elimina i vecchi file POI non più referenziati dal catalogo, mantenendo quelli correnti anche degli altri percorsi.

Per convertire eventuali nuovi WAV, riutilizzando gli MP3 già validi:

```sh
npm run audio:compress
npm run build
```

| Contenuto | WAV master | MP3 distribuito |
| --- | --- | --- |
| albertina:approfondimento | 2.85 MiB | 0.48 MiB |
| albertina:scopri | 1.74 MiB | 0.29 MiB |
| altes-akh:approfondimento | 2.57 MiB | 0.43 MiB |
| altes-akh:scopri | 1.81 MiB | 0.30 MiB |
| augustinerkirche:approfondimento | 2.50 MiB | 0.42 MiB |
| augustinerkirche:scopri | 1.82 MiB | 0.30 MiB |
| breitenfelder-kirche:approfondimento | 2.59 MiB | 0.43 MiB |
| breitenfelder-kirche:scopri | 1.83 MiB | 0.31 MiB |
| brunnenmarkt:approfondimento | 2.45 MiB | 0.41 MiB |
| brunnenmarkt:scopri | 1.68 MiB | 0.28 MiB |
| brunnenpassage:approfondimento | 2.63 MiB | 0.44 MiB |
| brunnenpassage:scopri | 1.88 MiB | 0.31 MiB |
| burggarten:approfondimento | 2.52 MiB | 0.42 MiB |
| burggarten:scopri | 2.02 MiB | 0.34 MiB |
| burgtheater:approfondimento | 2.76 MiB | 0.46 MiB |
| burgtheater:scopri | 1.85 MiB | 0.31 MiB |
| guertel:approfondimento | 2.65 MiB | 0.44 MiB |
| guertel:scopri | 1.79 MiB | 0.30 MiB |
| hofburg:approfondimento | 2.80 MiB | 0.47 MiB |
| hofburg:scopri | 1.98 MiB | 0.33 MiB |
| josephinum:approfondimento | 2.91 MiB | 0.49 MiB |
| josephinum:scopri | 1.99 MiB | 0.33 MiB |
| kunsthistorisches-museum:approfondimento | 2.64 MiB | 0.44 MiB |
| kunsthistorisches-museum:scopri | 1.89 MiB | 0.31 MiB |
| memoriale:approfondimento | 3.00 MiB | 0.50 MiB |
| memoriale:scopri | 1.96 MiB | 0.33 MiB |
| mozart:approfondimento | 2.50 MiB | 0.42 MiB |
| mozart:scopri | 1.93 MiB | 0.32 MiB |
| museumsquartier:approfondimento | 2.94 MiB | 0.49 MiB |
| museumsquartier:scopri | 1.84 MiB | 0.31 MiB |
| narrenturm:approfondimento | 2.63 MiB | 0.44 MiB |
| narrenturm:scopri | 1.89 MiB | 0.32 MiB |
| naturhistorisches-museum:approfondimento | 2.61 MiB | 0.43 MiB |
| naturhistorisches-museum:scopri | 1.87 MiB | 0.31 MiB |
| opera:approfondimento | 2.93 MiB | 0.49 MiB |
| opera:scopri | 2.02 MiB | 0.34 MiB |
| palais-epstein:approfondimento | 2.72 MiB | 0.45 MiB |
| palais-epstein:scopri | 1.98 MiB | 0.33 MiB |
| palmenhaus:approfondimento | 2.87 MiB | 0.48 MiB |
| palmenhaus:scopri | 1.83 MiB | 0.31 MiB |
| parlamento:approfondimento | 2.59 MiB | 0.43 MiB |
| parlamento:scopri | 1.93 MiB | 0.32 MiB |
| rathaus:approfondimento | 2.73 MiB | 0.46 MiB |
| rathaus:scopri | 1.78 MiB | 0.30 MiB |
| sisi:approfondimento | 2.69 MiB | 0.45 MiB |
| sisi:scopri | 1.87 MiB | 0.31 MiB |
| theseustempel:approfondimento | 2.45 MiB | 0.41 MiB |
| theseustempel:scopri | 1.85 MiB | 0.31 MiB |
| universita-vienna:approfondimento | 2.85 MiB | 0.48 MiB |
| universita-vienna:scopri | 2.08 MiB | 0.35 MiB |
| volksgarten:approfondimento | 2.83 MiB | 0.47 MiB |
| volksgarten:scopri | 1.80 MiB | 0.30 MiB |
| votivkirche:approfondimento | 2.64 MiB | 0.44 MiB |
| votivkirche:scopri | 1.88 MiB | 0.31 MiB |
| yppenplatz:approfondimento | 2.28 MiB | 0.38 MiB |
| yppenplatz:scopri | 1.58 MiB | 0.26 MiB |

## Verifiche finali

- 52 test unitari superati; controllo Svelte senza errori o avvisi.
- Build completata con 56 MP3 coerenti.
- 10 test browser superati.
- Prova aggiuntiva: download completo dei 56 MP3, rimozione di un vecchio WAV in cache, ricarica offline, riproduzione e avanzamento a 20 secondi dell’approfondimento Augustinerkirche.
- Riesecuzione della compressione: zero conversioni, 56 asset riusati.
- Dry-run TTS: 56 riusati, zero da generare; nessuna chiamata API.
- Revisione indipendente: nessun problema importante residuo. Deploy non eseguito.
