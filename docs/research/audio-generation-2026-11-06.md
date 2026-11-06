# Generazione audio · 6 novembre 2026

Generazione completata e autorizzata dall'utente con Gemini 3.1 Flash TTS Preview, voce Kore, impostazioni del campione approvato.

**56/56 audio disponibili** per i 28 luoghi: 55 nuovi file e campione Albertina riutilizzato. L'ultima esecuzione ha generato i 33 contenuti mancanti e riusato i 23 già validi. Durata complessiva: **46.4 minuti**. Dimensione totale degli asset WAV: **127.5 MiB**.

Dopo i precedenti blocchi HTTP 429 sulla quota gratuita, l'utente ha confermato l'aggiornamento della chiave e l'attivazione della fatturazione. La generazione residua è terminata con codice 0, senza rigenerare gli audio già verificati. Non è stato eseguito alcun deploy.

Tutti i 56 contenuti hanno un asset presente. Verifiche indipendenti con ffprobe: WAV PCM mono, 24 kHz, durata coerente con il manifest. Sono stati controllati anche hash testo/byte e presenza di campioni non silenziosi. Queste verifiche tecniche non certificano pronuncia o corrispondenza verbale integrale, da controllare all'ascolto.

Per una verifica senza nuove chiamate API:

```sh
npm run tts:all -- --dry-run
```

| Contenuto | Durata | Dimensione |
| --- | --- | --- |
| albertina:approfondimento | 62.36 s | 2.85 MiB |
| albertina:scopri | 38.04 s | 1.74 MiB |
| altes-akh:approfondimento | 56.04 s | 2.57 MiB |
| altes-akh:scopri | 39.44 s | 1.81 MiB |
| augustinerkirche:approfondimento | 54.52 s | 2.50 MiB |
| augustinerkirche:scopri | 39.76 s | 1.82 MiB |
| breitenfelder-kirche:approfondimento | 56.60 s | 2.59 MiB |
| breitenfelder-kirche:scopri | 40.04 s | 1.83 MiB |
| brunnenmarkt:approfondimento | 53.44 s | 2.45 MiB |
| brunnenmarkt:scopri | 36.80 s | 1.68 MiB |
| brunnenpassage:approfondimento | 57.48 s | 2.63 MiB |
| brunnenpassage:scopri | 41.08 s | 1.88 MiB |
| burggarten:approfondimento | 54.96 s | 2.52 MiB |
| burggarten:scopri | 44.08 s | 2.02 MiB |
| burgtheater:approfondimento | 60.36 s | 2.76 MiB |
| burgtheater:scopri | 40.40 s | 1.85 MiB |
| guertel:approfondimento | 57.84 s | 2.65 MiB |
| guertel:scopri | 39.20 s | 1.79 MiB |
| hofburg:approfondimento | 61.24 s | 2.80 MiB |
| hofburg:scopri | 43.36 s | 1.98 MiB |
| josephinum:approfondimento | 63.60 s | 2.91 MiB |
| josephinum:scopri | 43.52 s | 1.99 MiB |
| kunsthistorisches-museum:approfondimento | 57.64 s | 2.64 MiB |
| kunsthistorisches-museum:scopri | 41.20 s | 1.89 MiB |
| memoriale:approfondimento | 65.64 s | 3.00 MiB |
| memoriale:scopri | 42.84 s | 1.96 MiB |
| mozart:approfondimento | 54.52 s | 2.50 MiB |
| mozart:scopri | 42.08 s | 1.93 MiB |
| museumsquartier:approfondimento | 64.16 s | 2.94 MiB |
| museumsquartier:scopri | 40.24 s | 1.84 MiB |
| narrenturm:approfondimento | 57.52 s | 2.63 MiB |
| narrenturm:scopri | 41.32 s | 1.89 MiB |
| naturhistorisches-museum:approfondimento | 56.92 s | 2.61 MiB |
| naturhistorisches-museum:scopri | 40.84 s | 1.87 MiB |
| opera:approfondimento | 64.08 s | 2.93 MiB |
| opera:scopri | 44.20 s | 2.02 MiB |
| palais-epstein:approfondimento | 59.48 s | 2.72 MiB |
| palais-epstein:scopri | 43.32 s | 1.98 MiB |
| palmenhaus:approfondimento | 62.60 s | 2.87 MiB |
| palmenhaus:scopri | 40.04 s | 1.83 MiB |
| parlamento:approfondimento | 56.48 s | 2.59 MiB |
| parlamento:scopri | 42.12 s | 1.93 MiB |
| rathaus:approfondimento | 59.56 s | 2.73 MiB |
| rathaus:scopri | 38.96 s | 1.78 MiB |
| sisi:approfondimento | 58.72 s | 2.69 MiB |
| sisi:scopri | 40.92 s | 1.87 MiB |
| theseustempel:approfondimento | 53.56 s | 2.45 MiB |
| theseustempel:scopri | 40.40 s | 1.85 MiB |
| universita-vienna:approfondimento | 62.32 s | 2.85 MiB |
| universita-vienna:scopri | 45.36 s | 2.08 MiB |
| volksgarten:approfondimento | 61.92 s | 2.83 MiB |
| volksgarten:scopri | 39.24 s | 1.80 MiB |
| votivkirche:approfondimento | 57.72 s | 2.64 MiB |
| votivkirche:scopri | 41.08 s | 1.88 MiB |
| yppenplatz:approfondimento | 49.72 s | 2.28 MiB |
| yppenplatz:scopri | 34.48 s | 1.58 MiB |

## Verifiche finali

- `npm run tts:all -- --dry-run`: 56 contenuti, 56 riusati, zero da generare; nessuna chiamata API.
- `npm test`: 48 test superati.
- `npm run check`: zero errori e zero avvisi Svelte.
- `npm run build`: 28 luoghi, 56 testi, 56 audio coerenti; build completata.
- Playwright: 10 prove browser superate.
- Prova aggiuntiva sul catalogo completo: download di tutti i 56 WAV, ricarica senza rete, riproduzione dell'approfondimento Augustinerkirche e avanzamento a 20 secondi riusciti.
- Nessun deploy eseguito.

## Compressione successiva

I dati WAV di questo resoconto descrivono i master originali, ora archiviati localmente in `audio-masters/`. L’app distribuisce 56 MP3 mono a 64 kbps, per circa 21,3 MiB. Dettagli nel [resoconto di compressione](audio-compression-2026-11-06.md).
