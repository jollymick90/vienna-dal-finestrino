# Audioguida per punti di interesse

Richiesta di riferimento: trasformazione diretta dell'app esistente autorizzata dal brief dell'utente del 5 novembre 2026.

La mappa Leaflet occupa lo schermo. Pin e lista accessibile aprono la stessa scheda. Un pannello laterale su desktop e un foglio inferiore richiudibile su telefono mostrano descrizione, accesso, distanza indicativa, due contenuti espandibili e fonti. Palette: blu tram #164b63, bianco #fff, inchiostro #142b38, verde #176147, fondo mappa #e8eff0; titoli Georgia e comandi di sistema. Contrasto e comandi da almeno 44 px; niente finestre obbligatorie all'avvio.

Catalogo JSON versionato con ID stabili, coordinate documentate, ingresso opzionale solo se verificato, accesso e deviazioni esplicite, fonti per luogo e testi. Percorso iniziale: 44, Schottentor, Ring verso Opera, arrivo a piedi all'Albertina. I percorsi filtrano, non vincolano l'ascolto. Nessuna indicazione di lato non verificata.

Prossimità separata dal player: fix watchPosition validati con accuratezza e timestamp, isteresi ingresso/uscita, cooldown globale e individuale, graduatoria per distanza/pertinenza/percorso/storia. Regole opzionali su proiezione del tracciato e avanzamento; fermo/direzione incerta non danno suggerimenti direzionali. Una proposta alla volta; niente autoplay o interruzioni del player. La simulazione alimenta il medesimo feed del GPS.

Un solo elemento audio persistente; storia locale robusta a storage negato. Testi immediati; audio solo se dichiarato e verificato in build. Gli MP3 delle vecchie tratte non sono associati ai monumenti. Generazione CLI selettiva Gemini, dry-run predefinito e consenso esplicito via flag per chiamate pagate, hash testo/configurazione, manifest e durata WAV. Nessun segreto nel browser.

Cache shell tramite service worker esistente e download esplicito per percorso con avanzamento e verifica delle risposte. Mappa OSM online, nessun download di tessere. Esito offline distingue testi/audio da cartografia. Deploy escluso.
