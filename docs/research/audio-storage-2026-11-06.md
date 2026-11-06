# Storage audio Vienna · 6 novembre 2026

56 MP3 POI pubblicati nel bucket MinIO dedicato `vienna-audio`: **22.321.176 byte**, 22,32 MB / 21,29 MiB. URL base: `https://media-hidrospace.jm90dev.cloud/vienna-audio/poi/`. Ogni oggetto è stato riletto e confrontato con lo SHA-256 del manifest locale.

La VPS usa MinIO Community `RELEASE.2025-09-07T16-13-09Z` e Caddy già esistenti; Supabase Auth gestisce separatamente i login Hidrospace. Per questo intervento non sono stati installati servizi, aggiornati container, modificati proxy, database o regole CORS globali. HTTPS, CORS e richieste Range sono già funzionanti.

## Isolamento e credenziali

- Bucket nuovo `vienna-audio`: accesso anonimo esclusivamente `s3:GetObject`, senza elenco pubblico.
- Utente/policy nuovi `vienna-audio-publisher`: `ListBucket` e `GetBucketLocation` soltanto sul bucket Vienna; `GetObject`, `PutObject` e operazioni di upload multipart soltanto sui suoi oggetti. Nessun permesso di eliminazione e nessun permesso di modifica sui bucket Hidrospace.
- Credenziali publisher: `.env.storage` locale, modalità 0600, ignorato; copia privata VPS in `~/.config/vienna-audio/publisher.env`, modalità 0600. Nessuna credenziale amministrativa trasferita dal server o inserita nel progetto.
- Il client amministrativo è stato riusato dal container init già esistente; copia temporanea rimossa dopo il provisioning. Nessun container è stato avviato o riavviato.

## Integrità Hidrospace

Inventario acquisito prima e dopo il provisioning/caricamento: chiavi, dimensioni, ETag e date di modifica di tutti gli oggetti, policy bucket, lifecycle e versioning. Confronto JSON profondo: **identico**.

| Bucket | Oggetti | Byte |
| --- | ---: | ---: |
| `carousel` | 1.974 | 193.339.530 |
| `hidrospace-originals` | 456 | 876.943.240 |

Snapshot privati e riepilogo sulla VPS in `~/.config/vienna-audio/`. SHA-256 dello snapshot finale: `3e5a95d81dc5dd3d0558760cc4e87068984a266380dbd29f56fe9230b10fa63e`.

## App e distribuzione

- Il manifest sorgente conserva percorsi locali, fingerprint di generazione e hash degli MP3.
- L'app risolve soltanto i percorsi POI validati verso l'URL MinIO prestabilito. URL arbitrari, query e traversal vengono rifiutati.
- Il service worker intercetta gli audio di quel solo bucket; cache verificata per SHA-256, gestione Range e pulizia degli asset superati rispettano gli URL completi e gli altri percorsi.
- La build verifica i file pubblicati anche quando i sorgenti sono locali; fallisce se un nuovo audio manca o non coincide. Il checkout di produzione non richiede gli MP3 locali.
- `.gitignore` e `.vercelignore` escludono gli MP3 POI; `scripts/build-sw.js` li rimuove da `dist` prima di generare il worker. I WAV master restano locali. Gli 8 MP3 legacy, circa 1 MB, restano nel progetto.
- Build prodotta: circa **1,51 MB** totali, esclusi gli audio POI che il browser scarica direttamente dalla VPS.

## Verifiche

Prove browser Chromium riuscite contro i file reali MinIO: streaming, download verificato, reload offline, risposta Range 206 dalla Cache Storage, riproduzione e seek offline. Resta da provare su dispositivo reale Safari/iOS, come già previsto per l'app.

Comandi ricorrenti: `npm run audio:compress`, `npm run audio:publish`, `npm run build`. Il deploy Vercel dell'app resta separato dalla pubblicazione audio.
