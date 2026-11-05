# Vienna dal finestrino

Audioguida mobile per Yppengasse → Schottentor (44) → Oper, Karlsplatz (1).
Per il servizio del 5 novembre 2026 il tram 1 espone Reumannplatz.

## Pubblicare su Vercel

1. Estrai lo ZIP e carica il contenuto di questa cartella in un repository Git.
2. In Vercel scegli Add New → Project e importa il repository.
3. Usa il preset Other, lascia vuoti i comandi e usa la radice del repository come output. Premi Deploy.
4. Apri direttamente il link HTTPS in Safari o Chrome e premi Attiva GPS quando sei sul tram. Accetta il permesso e tieni la pagina in primo piano con lo schermo acceso.

Per provare in locale, esegui `python3 -m http.server 8000` e apri `http://localhost:8000`. Dal telefono, usa il link HTTPS di Vercel.

## Come funziona

- `stories.js` contiene le otto tratte e i testi in italiano, nello stesso ordine di `route-data.js`.
- `route-data.js` contiene le polilinee ritagliate dal feed GTFS ufficiale di Wiener Linien aggiornato al 2 novembre 2026, usando il servizio programmato per il 5 novembre.
- `route.js` proietta la posizione sulla tratta attesa o su quella subito successiva. Il punto deve cadere entro 40 metri dal tracciato, almeno 35 metri dopo la partenza e almeno 18 metri prima dell’arrivo.
- `index.html` usa `navigator.geolocation.watchPosition` e ignora posizioni con accuratezza dichiarata oltre 45 metri. La riproduzione usa la voce italiana disponibile sul dispositivo. La guida non trasmette le coordinate e non richiede chiavi API o server.
- La guida evita ripetizioni e sovrapposizioni automatiche. Se perdi più tratte, seleziona quella corrente dal menu e riattiva il GPS. I pulsanti manuali e le trascrizioni restano disponibili.
- Il GPS individua la posizione lungo i binari, senza identificare il tram. Attivalo una volta a bordo. Il browser può sospendere posizione e voce in background. La riproduzione automatica dipende dal supporto del browser per la sintesi vocale dopo il primo tocco.

Dati dei tracciati: Stadt Wien – Wiener Linien, CC BY 4.0.
Fonte: https://www.wienerlinien.at/ogd_realtime/doku/ogd/gtfs/gtfs.zip
Licenza: https://creativecommons.org/licenses/by/4.0/
