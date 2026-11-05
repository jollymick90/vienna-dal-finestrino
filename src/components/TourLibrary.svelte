<script>
  import {importTourFiles, deleteTour} from '../lib/tour-storage.js';
  import {exportManifest, aiPrompt, downloadText} from '../lib/ai-kit.js';
  let { tours = [], active, busy = false, error = '', onselect, onimport, onremove } = $props();
  let importing = $state(false);
  let importError = $state('');
  let notice = $state('');
  const locked = $derived(busy || importing);
  async function importFiles(event) {
    const input=event.currentTarget;
    const files=Array.from(input.files ?? []);
    if(!files.length) return;
    importing=true; importError=''; notice='';
    try {
      const id=await importTourFiles(files);
      await onimport(id);
      notice='Percorso salvato su questo dispositivo, con tutti gli audio.';
    } catch(error) {importError=error.message || 'Importazione non riuscita. Nessun percorso è stato sostituito.';}
    finally {importing=false;input.value='';}
  }
  async function remove() {
    if(!confirm(`Eliminare «${active.title}» e i suoi audio da questo dispositivo? Conserva i file originali per reimportarlo.`)) return;
    importing=true;importError='';notice='';
    try {await deleteTour(active.id);await onremove();notice='Percorso eliminato dal dispositivo.';}
    catch(error) {importError=error.message || 'Eliminazione non riuscita.';}
    finally {importing=false;}
  }
</script>

<section class="library" aria-label="Libreria dei percorsi">
  <label for="tour-choice">Percorso da ascoltare</label>
  <select id="tour-choice" value={active.id} disabled={locked} onchange={event => {notice='';importError='';onselect(event.currentTarget.value);}}>
    {#each tours as tour}<option value={tour.id}>{tour.title}</option>{/each}
  </select>
  <details>
    <summary>Aggiungi un percorso</summary>
    <p>Nuove linee, nuove storie. Genera i racconti con la tua AI, poi importa il percorso e i suoi audio.</p>
    <ol>
      <li>Scarica il modello del percorso selezionato e il prompt per l’AI.</li>
      <li>Fornisci all’AI il tracciato reale del nuovo tram e la durata desiderata. Fai generare JSON, testi e MP3.</li>
      <li>Seleziona insieme il JSON e tutti gli MP3. Li conserveremo su questo dispositivo.</li>
    </ol>
    <div class="kit-actions">
      <button class="secondary" disabled={locked} onclick={() => downloadText('modello-percorso.json',JSON.stringify(exportManifest(active),null,2),'application/json')}>Scarica modello JSON</button>
      <button class="secondary" onclick={() => downloadText('prompt-per-ai.txt',aiPrompt,'text/plain')}>Scarica prompt per AI</button>
    </div>
    <label class="file-label" for="tour-files">File del percorso e audio MP3</label>
    <input id="tour-files" type="file" accept=".json,.mp3,application/json,audio/mpeg" multiple disabled={locked} onchange={importFiles} />
    <p class="hint">Fino a 250 MB per percorso. Nessun account o caricamento su server. Conserva una copia dei file: il browser può liberare lo spazio locale.</p>
    {#if active.id !== 'vienna-original'}<button class="text-button remove" disabled={locked} onclick={remove}>Elimina questo percorso</button>{/if}
  </details>
  {#if importing}<p role="status">Controllo e salvo il percorso e gli audio…</p>{/if}
  {#if importError || error}<p class="error" role="alert">{importError || error}</p>{/if}
  {#if notice}<p class="notice" role="status">{notice}</p>{/if}
</section>

<style>
  .library {padding-bottom:22px;}
  label {display:block;font-size:13px;font-weight:650;margin-bottom:8px;}
  details {border-color:#dce5eb;margin-top:12px;}
  summary {color:#152d40;font-size:14px;font-weight:650;}
  p,li {font-size:13px;line-height:1.6;}
  ol {padding-left:20px;}
  li+li {margin-top:6px;}
  .kit-actions {display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .file-label {margin-top:18px;}
  input {width:100%;max-width:100%;font:inherit;font-size:13px;}
  input::file-selector-button {min-height:48px;margin-right:8px;border:0;border-radius:8px;background:#152d40;color:#fff;padding:8px 12px;font:inherit;cursor:pointer;}
  .hint {color:#607280;font-size:11px;}
  .error {color:#a62424;}
  .notice {color:#286948;}
  .remove {color:#a62424;}
</style>
