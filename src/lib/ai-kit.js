export function exportManifest(runtime) {
  return {
    version: 1,
    id: `${runtime.id}-copia`.slice(0, 80),
    title: runtime.title,
    description: runtime.description,
    attribution: runtime.attribution,
    legs: runtime.legs.map((leg) => ({
      line: leg.lineNumber,
      direction: leg.direction,
      from: leg.from,
      to: leg.to,
      title: leg.title,
      transcript: leg.transcript,
      audio: leg.audioName || leg.audio.split("/").at(-1),
      path: leg.path,
      transferBefore: leg.transferBefore,
    })),
  };
}
export const aiPrompt = `Prepara un nuovo percorso per l'app «Vienna dal finestrino» usando il JSON allegato come modello di formato.

Prima chiedimi: linea e direzione del tram, fermate di partenza/arrivo, durata desiderata del giro (incluse soste) e minuti totali di narrazione. Il modello incluso è un giro breve, non un tour giornaliero: i suoi 3 minuti di audio non sono un obiettivo da replicare.

Usa il tracciato reale che ti fornisco (GTFS, GPX o GeoJSON) e fonti verificabili. Non inventare coordinate, fermate, cambi, orari o dati storici. Se mancano le geometrie o la direzione, chiedimele. Se usi GeoJSON converti [longitudine, latitudine] in [latitudine, longitudine]. Mantieni i punti sulla geometria reale, ordinati nel senso di marcia. Non riutilizzare il tracciato del modello per un'altra linea.

Dividi il percorso in tratte narrative consecutive. Una tratta deve superare 53 metri: il GPS esclude i primi 35 e gli ultimi 18 metri. Pianifica racconti che possano terminare prima della tratta successiva; non creare un unico audio lunghissimo per un tratto breve. Indica transferBefore: true quando si deve cambiare mezzo. Il tour può contenere molte più di otto tratte, fino a 500. Distingui sempre tempo di viaggio, soste e durata degli audio.

Restituisci JSON puro, senza commenti o blocchi Markdown, con:
version: 1; id univoco in minuscolo con trattini (non vienna-original); title; description; attribution con fonte/licenza delle geometrie; legs: array di oggetti con line (numero/nome, come stringa), direction, from, to, title, transcript (testo italiano completo), audio (solo nome file .mp3), path (array di coppie [latitudine, longitudine]), transferBefore (booleano).

Scrivi racconti legati a ciò che si vede dal finestrino lungo quella precisa tratta, con riferimenti verificati, dettagli e curiosità. Se destra/sinistra dipendono dalla direzione, verificali o evita di specificarli. Rispetta la durata concordata senza riempitivi e senza promettere che pochi minuti coprano una giornata.

Fornisci anche i testi pronti per la sintesi vocale, uno per ogni MP3, includendo annuncio della tratta e racconto. I file audio vanno generati separatamente con gli stessi nomi del JSON. Non fingere di aver creato file MP3 se non puoi produrli. Consegna il JSON e tutti gli MP3, da selezionare insieme nell'importazione dell'app.\n`;
export function downloadText(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
