> Piano storico: importazione e archivio locale successivamente rimossi su richiesta dell’utente. Il catalogo attuale comprende due tour inclusi nella build.

# Libreria di percorsi e audio

> Esecuzione inline con superpowers:executing-plans; descrizione richiesta dall'utente: aggiungere nuovi percorsi di tram e relativi audio generati esternamente con AI.

## Obiettivo e formato
Importazione locale da interfaccia di un JSON e degli MP3 referenziati. JSON version=1, id, title, description, attribution, legs[] con line (numero), direction, from, to, title, transcript, audio (solo nome file), path (array latitudine/longitudine), transferBefore facoltativo. Nessuna generazione AI integrata o backend. Template e prompt esportabili dall'app. Coordinate reali fornite dall'utente/AI tramite fonti verificabili, mai inventate dall'app.

## Implementazione
- [x] Schema normalizzato, validazione geometrie/audio e test RED→GREEN. Mantiene il tour incluso; dati e limiti non vincolati a otto tracce.
- [x] Matcher e player ricevono percorsi e racconti; mappa e simulazione usano il tour scelto. Reset atomico di GPS, audio, selezione e URL Blob al cambio.
- [x] Archivio IndexedDB transazionale con Blob, importazione JSON+MP3 validata, selettore libreria, durata audio reale e distanza, rimozione esplicita, ripristino ultima selezione.
- [x] Offline: archivi locali separati dal SW versionato; tour e audio importati riaperti da IndexedDB anche dopo reload offline. Badge pronto solo se app cache pronta e tour caricato.
- [x] Modello JSON e prompt per AI, README, test browser su importazione, errori, persistenza offline, tour >8 tratte, selezione e riproduzione.
- [x] Revisione indipendente e suite completa.

## Casi da verificare
MP3 mancante/corrotto, coordinate non valide o tratte più corte dei margini GPS, ID duplicato, quota storage, testo importato come testo e mai HTML, cambio tour mentre un audio è attivo, nessuna ripetizione o sovrapposizione automatica, conservazione del tour esistente dopo import fallito.


## Verifica finale
- 23 test unitari, 21 test browser Chromium, controllo Svelte (0 errori/avvisi), build di produzione riuscita.
- Import reale di 10 MP3 e percorso da 10 tratte, lettura Blob, selezione persistente e reload offline verificati; nessuna dipendenza dal numero otto.
- Verificati import rifiutati per geometria/audio non validi, duplicati, quota; kit AI scaricabile; markup importato reso come testo.
- Revisione indipendente: un P2 sul cambio tram con geometrie sovrapposte. Riprodotto con test RED, corretto con esclusione dei 35m attorno alla fermata di arrivo precedente, test unitario e browser GREEN. Nessun altro rilievo materiale.
- QA visuale mobile 390px; nessun overflow a 320px e nessun errore JS rilevato.
- Nessun nuovo itinerario reale inventato o audio generato: la funzione richiesta permette di importare nuovi percorsi e audio preparati esternamente con l'AI. Coordinate e attribuzioni rimangono responsabilità del pacchetto importato; le verifiche sintattiche non attestano veridicità del tracciato.
