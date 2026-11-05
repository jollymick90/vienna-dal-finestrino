# Prompt per GPT Astra / Codex

Lavora direttamente nel repo pubblico `vienna-tram-guide`. Costruisci e verifica una PWA SPA in Svelte per un giro in tram a Vienna con la mia ragazza. È un progetto piccolo da usare oggi, 5 novembre 2026. Usa Svelte + Vite, senza backend. Lascia a me il deploy su Vercel.

## Input

Ti fornisco `tour.json`, `route-data.js`, `route.js` e otto MP3 in `static/audio/`. Se il kit è ancora compresso, estrailo. Usa questi MP3 come asset locali: spostali in `public/audio/` per Vite e usa i percorsi `/audio/01.mp3` … `/audio/08.mp3`. Importa i dati e adatta la logica esistente a moduli Svelte leggibili. Ogni traccia contiene già l’annuncio della tratta e il racconto. Conserva l’abbinamento per indice con le otto polilinee e verifica che tutti i riferimenti agli asset esistano. Mantieni l’attribuzione GTFS nel README.

Il giro parte da [Yppengasse](https://maps.app.goo.gl/Nv9JNx2GC2qAgXto8). Tram 44 verso Schottentor, cambio a Schottentor sul tram 1 verso Reumannplatz, discesa a Oper, Karlsplatz. Mostra chiaramente il cambio e la destinazione del tram. I tracciati forniti sono quelli programmati per il 5 novembre 2026.

## Esperienza

- UI mobile in italiano, titolo «Vienna dal finestrino», poche scritte. Mostra linea, tratta corrente, progresso e controlli grandi.
- Un tap su «Inizia il tour» prepara l’audio nello stesso gesto e richiede la posizione con `navigator.geolocation.watchPosition`. Su HTTPS, usa i fix validi per riconoscere la tratta attesa o quella successiva lungo il tracciato. Ignora fix vecchi o con accuratezza oltre 45 m. Usa i margini di partenza e arrivo già presenti nel matcher. Evita salti all’indietro, ripetizioni automatiche e sovrapposizioni.
- Usa un unico player per gli MP3, riutilizzato tra le tappe. Gestisci esplicitamente il rifiuto di `play()` con un pulsante «Tocca per ascoltare». Segna la tappa come ascoltata solo dopo l’avvio effettivo. Se il GPS cambia tratta mentre un audio è in corso, fallo finire e avvia il successivo solo se è ancora pertinente alla posizione. Al cambio non far partire il racconto del tram 1 mentre siamo ancora alla fermata.
- Manuale sempre disponibile con scelta della tratta, play/pausa, riascolto e trascrizione. Permetti di risincronizzare il GPS dalla tappa selezionata dopo un buco di segnale. Interrompi il watch quando l’utente disattiva il GPS o esce. Le coordinate restano nel browser.
- PWA installabile con manifest e icone. Precarica app, dati e otto MP3 nel service worker dopo la prima apertura online. Mostra «Pronta offline» solo quando gli asset sono davvero disponibili. Gestisci le richieste Range degli MP3 anche offline, oppure riproduci Blob ricavati dagli asset completi in cache. Indica di tenere la pagina in primo piano e lo schermo acceso.
- Aggiungi una modalità «Simula giro» che alimenta lo stesso matcher con punti sui tracciati, senza richiedere la posizione reale.

## Verifica e consegna

Implementa nel repo, esegui la build e verifica almeno il giro simulato, il cambio, la riproduzione singola, il fallback manuale e la ricarica offline con gli audio. Se una verifica richiede il telefono reale, dichiaralo. Scrivi nel README come avviare il progetto e pubblicarlo con preset Vite e output `dist`. Concludi con i comandi eseguiti e una prova rapida che posso fare prima di salire. Evita funzionalità extra.
