<script>
  import { onMount, tick } from 'svelte';
  import PoiMap from './components/PoiMap.svelte';
  import { loadCatalog } from './lib/catalog.js';
  import { paths } from './lib/route-data.js';
  import { createRouteMatcher, validFix } from './lib/route.js';
  import { createProximity, distanceMeters } from './lib/proximity.js';
  import { PoiPlayer } from './lib/poi-player.js';
  import { monitorOffline } from './lib/offline.js';
  import { downloadRoute, verifyRoute } from './lib/route-offline.js';

  let catalog = $state.raw(null);
  let loadError = $state('');
  let selectedId = $state(null);
  let routeId = $state('');
  let showRoutes = $state(false);
  let showList = $state(false);
  let query = $state('');
  let proposal = $state.raw(null);
  let position = $state(null);
  let mode = $state('manual');
  let locationMessage = $state('Esplora i luoghi sulla mappa. Il GPS è facoltativo.');
  let online = $state(true);
  let tileError = $state(false);
  let centerRequest = $state(0);
  let offline = $state({ ready: false, error: false });
  let downloaded = $state(null);
  let downloading = $state(false);
  let downloadProgress = $state({ complete: 0, total: 0 });
  let downloadError = $state('');
  let reader = $state('');
  let sheetBody = $state();
  let audio;
  let player;
  let proximity;
  let state = $state({ active: null, phase: 'idle', track: null, heardIds: [], elapsed: 0, duration: 0, storageError: false });
  let watchId = null, sourceGeneration = 0, lastFix = null, lastAccepted = 0, simulationTimer;
  let simulationPoints = $state.raw([]);
  let simulationIndex = $state(0);
  let alive = false;
  let downloadCheck = 0;
  const selected = $derived(catalog?.places.find(p => p.id === selectedId));
  const route = $derived(catalog?.routes.find(r => r.id === routeId) ?? null);
  const visiblePlaces = $derived(catalog?.places.filter(p => (!routeId || p.routeIds.includes(routeId)) && p.name.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it'))) ?? []);
  const busy = $derived(['playing', 'loading'].includes(state.phase));
  const duration = $derived(state.duration || state.track?.durationSeconds || 0);
  const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  function distance(place) {
    if (!position) return 'Distanza non disponibile';
    const metres = distanceMeters(position, place.location);
    return `Circa ${metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toLocaleString('it-IT', {maximumFractionDigits: 1})} km`} in linea d’aria`;
  }
  function dismiss() { proximity?.dismiss(); proposal = null; }
  function openPlace(id, read = false) {
    dismiss(); selectedId = id; showList = showRoutes = false; reader = read ? 'scopri' : '';
    tick().then(() => { if (sheetBody) sheetBody.scrollTop = 0; });
  }
  function acceptFix(fix) {
    if (Number.isFinite(fix?.timestamp) && fix.timestamp < lastAccepted && validFix(lastFix)) return;
    if (!validFix(fix)) {
      proximity?.clear();
      position = null; proposal = null;
      locationMessage = 'Posizione imprecisa o scaduta. Attendi un segnale migliore; puoi esplorare la mappa.';
      return;
    }
    lastAccepted = fix.timestamp; lastFix = fix;
    position = { ...fix.coords };
    proposal = proximity.feed(fix, { routeId, busy, heard: state.heardIds });
    locationMessage = mode === 'simulation' ? 'Simulazione attiva' : `GPS attivo · precisione circa ${Math.round(fix.coords.accuracy)} m`;
  }
  function stopSource() {
    sourceGeneration++;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null; clearInterval(simulationTimer); simulationTimer = null;
    lastFix = null; lastAccepted = 0; position = null; proposal = null; proximity?.clear(); mode = 'manual';
  }
  function startGPS() {
    stopSource();
    if (!navigator.geolocation || !window.isSecureContext) { locationMessage = 'GPS non disponibile. Apri l’app in HTTPS o esplora i pin.'; return; }
    mode = 'gps'; locationMessage = 'Cerco la tua posizione…'; const generation = sourceGeneration;
    watchId = navigator.geolocation.watchPosition(fix => { if (generation === sourceGeneration) acceptFix(fix); }, error => {
      if (generation !== sourceGeneration) return;
      stopSource(); locationMessage = error.code === 1 ? 'GPS negato. Puoi riattivarlo nelle impostazioni del browser o esplorare i pin.' : 'GPS non disponibile. Riprova o esplora i pin.';
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    centerRequest++;
  }
  function recenter() { centerRequest++; if (mode === 'manual') startGPS(); }
  function simulate() {
    routeId = 'yppengasse-albertina';
    selectedId = null;
    stopSource(); mode = 'simulation'; showRoutes = false;
    const matcher = createRouteMatcher(paths);
    simulationPoints = [catalog.places[0].location, ...paths.flatMap((_, i) => Array.from({length: Math.ceil(matcher.trackLength(i) / 100)}, (_, j) => matcher.pointAt(i, j * 100))), ...catalog.places.filter(p => ['memoriale','albertina','augustinerkirche'].includes(p.id)).map(p => p.location)];
    simulationIndex = 0; centerRequest++; simulationFeed();
    simulationTimer = setInterval(() => advanceSimulation(false), 4000);
  }
  function simulationFeed() { acceptFix({ coords: { ...simulationPoints[simulationIndex], accuracy: 5 }, timestamp: Date.now() }); }
  function advanceSimulation(manual = true) {
    if (manual) { clearInterval(simulationTimer); simulationTimer = null; }
    if (simulationIndex < simulationPoints.length - 1) { simulationIndex++; simulationFeed(); }
    else { clearInterval(simulationTimer); locationMessage = 'Simulazione conclusa. Puoi ripartire o esplorare i pin.'; }
  }
  function changeRoute() {
    if (mode === 'simulation') {
      stopSource();
      locationMessage = 'Esplora i luoghi sulla mappa. Il GPS è facoltativo.';
    }
    dismiss(); selectedId = null; reader = ''; downloaded = null; downloadError = ''; void checkDownload();
  }
  async function checkDownload() {
    if (!catalog || downloading) return;
    const check = ++downloadCheck;
    const checkedRoute = routeId;
    try {
      const result = await verifyRoute(catalog, checkedRoute);
      if (check === downloadCheck && routeId === checkedRoute) downloaded = result;
    } catch {
      if (check === downloadCheck && routeId === checkedRoute) downloaded = null;
    }
  }
  async function download() {
    downloadCheck++;
    downloading = true; downloadError = ''; downloaded = null;
    try {
      if (!offline.ready) throw new Error('L’app si sta preparando per l’offline. Attendi e riprova.');
      downloaded = await downloadRoute(catalog, routeId, progress => downloadProgress = progress);
    } catch (error) { downloadError = error.message || 'Download non riuscito. Riprova con una connessione.'; }
    finally { downloading = false; }
  }
  function listen(place, content) {
    dismiss(); void player?.playContent(place, content);
  }
  async function initialize() {
    loadError = '';
    try {
      const data = await loadCatalog();
      if (!alive) return;
      catalog = data;
      proximity = createProximity({ places: data.places, paths });
      let storage = null; try { storage = window.localStorage; } catch { /* Browser can disable storage entirely. */ }
      player = new PoiPlayer(audio, data.places, value => { state = value; }, storage);
      state = player.snapshot();
      void checkDownload();
    } catch (error) { if (alive) loadError = error.message; }
  }
  onMount(() => {
    alive = true;
    const connection = () => { online = navigator.onLine; void checkDownload(); };
    connection(); window.addEventListener('online', connection); window.addEventListener('offline', connection);
    const stopOffline = monitorOffline(value => { offline = value; });
    void initialize();
    const expiry = setInterval(() => {
      if (lastFix && !validFix(lastFix)) { position = null; proposal = null; locationMessage = 'Segnale GPS scaduto. Attendi un nuovo rilevamento o esplora i pin.'; }
    }, 1000);
    return () => { alive = false; stopSource(); player?.dispose(); stopOffline(); clearInterval(expiry); window.removeEventListener('online', connection); window.removeEventListener('offline', connection); };
  });
</script>

<svelte:head><title>Vienna dal finestrino · Audioguida</title><meta name="description" content="Luoghi di Vienna da scoprire sulla mappa, a piedi o in tram. Testi, fonti e audio da ascoltare quando vuoi." /></svelte:head>
<a class="skip-link" href="#luoghi">Vai all’elenco dei luoghi</a>
<audio bind:this={audio} preload="metadata"></audio>
{#if catalog}
  <main class:has-player={state.active !== null} class:has-overlay={Boolean(selected) || showRoutes || showList}>
    <PoiMap places={catalog.places} {paths} selected={selectedId} {routeId} showTramRoute={route?.mode !== 'walk'} {position} simulated={mode === 'simulation'} {online} {centerRequest} onselect={openPlace} onTileError={value => tileError = value} />
    <header class="app-header">
      <div class="brand"><span class="brand-symbol" aria-hidden="true">V</span><div><h1>Vienna dal finestrino</h1><p>La città, un luogo alla volta</p></div></div>
      <button class:active={showRoutes} class="route-button" aria-expanded={showRoutes} onclick={() => { showRoutes = !showRoutes; showList = false; }}>Percorsi e offline</button>
    </header>
    <nav class="map-controls" aria-label="Comandi mappa">
      <button class="control" onclick={recenter} aria-label="Ricentra sulla mia posizione"><span aria-hidden="true">◎</span> Ricentra</button>
      <button class:enabled={mode === 'gps'} class="control" onclick={() => { if (mode === 'gps') { stopSource(); locationMessage = 'GPS disattivato. Esplora i luoghi sulla mappa.'; } else startGPS(); }}>{mode === 'gps' ? 'Disattiva GPS' : 'Attiva GPS'}</button>
      <button class="control" onclick={() => { showList = !showList; showRoutes = false; }} aria-expanded={showList}>Elenco luoghi <span class="count">{visiblePlaces.length}</span></button>
    </nav>
    <div class="map-status" aria-live="polite"><span class:live={mode === 'gps'} class="status-dot"></span>{locationMessage}</div>
    {#if !online || tileError}<div class="network-note" role="status">{!online ? 'Offline · sfondo stradale non disponibile' : 'Sfondo stradale non disponibile. Pin e tracciato restano utilizzabili.'}</div>{/if}
    {#if mode === 'simulation'}<div class="simulation-bar"><span>Simulazione · {simulationIndex + 1}/{simulationPoints.length}</span><button onclick={() => advanceSimulation()}>Avanza simulazione</button><button onclick={() => { stopSource(); locationMessage = 'Simulazione terminata. Esplora i pin o attiva il GPS.'; }}>Esci dalla simulazione</button></div>{/if}
    {#if proposal}
      <aside class="nearby" aria-label="Proposta di prossimità" aria-live="polite">
        <div><p>{proposal.nearbyLabel ? 'Qui vicino' : 'Vicino a te'}</p><strong>{proposal.name}</strong></div>
        <div class="nearby-actions">{#if proposal.contents.some(c => c.audio)}<button class="primary" disabled={busy} onclick={() => listen(proposal, proposal.contents.find(c => c.audio))}>Ascolta</button>{/if}<button class="secondary" onclick={() => { const id = proposal.id; dismiss(); openPlace(id, true); }}>Leggi</button><button class="icon-button" aria-label="Chiudi proposta" onclick={dismiss}>×</button></div>
      </aside>
    {/if}
    {#if showRoutes}
      <section class="utility-panel" aria-label="Percorsi e offline">
        <div class="panel-top"><h2>Il tuo percorso</h2><button class="icon-button" aria-label="Chiudi percorsi" onclick={() => showRoutes = false}>×</button></div>
        <label for="route">Scegli un percorso</label><select id="route" bind:value={routeId} onchange={changeRoute} disabled={downloading}><option value="">Tutti i luoghi</option>{#each catalog.routes as r}<option value={r.id}>{r.title}</option>{/each}</select>
        <h3>{route?.title ?? 'Tutti i luoghi'}</h3><p>{route?.description ?? 'Esplora tutti i punti sulla mappa oppure scegli un gruppo. Il download comprende gli audio dei luoghi selezionati.'}</p>
        {#if route}<details><summary>Come seguire il tragitto</summary><ol>{#each route.directions as direction}<li>{direction}</li>{/each}</ol><p class="small">{route.geometryNote}</p>{#if route.transportSource}<a href={route.transportSource} target="_blank" rel="noreferrer">Controlla il servizio su Wiener Linien</a>{/if}</details>{/if}
        <div class="offline-section"><h3>Porta i racconti con te</h3><p>Scarica testi e audio disponibili. Le nuove voci saranno incluse dopo la loro preparazione.</p>
          <button class="primary" disabled={downloading} onclick={download}>{downloading ? 'Download in corso…' : 'Scarica percorso offline'}</button>
          {#if downloading}<progress max={downloadProgress.total || 1} value={downloadProgress.complete}></progress><p role="status">{downloadProgress.complete} di {downloadProgress.total} file verificati</p>{/if}
          {#if downloaded?.ready && offline.ready}<p class="success" role="status">Percorso verificato offline · testi e {downloaded.audioCount} audio</p>{:else}<p class="small">{offline.ready ? 'App e testi pronti. Scarica il percorso per verificarne tutti i contenuti.' : offline.error ? 'Offline non disponibile. Riprova in HTTPS con una connessione.' : 'Preparazione dell’app per l’offline…'}</p>{/if}
          {#if downloadError}<p class="error" role="alert">{downloadError}</p>{/if}
          <p class="small">Mappa stradale: solo online. Offline restano pin, tracciato e contenuti scaricati. La memoria del browser può essere liberata dal dispositivo.</p>
        </div>
        {#if route?.mode !== 'walk'}<details><summary>Prova senza muoverti</summary><p>La simulazione segue il percorso in tram da Yppengasse all’Albertina. Invia una posizione ogni 4 secondi allo stesso sistema del GPS e rispetta gli stessi intervalli tra proposte.</p><button class="secondary" onclick={simulate}>Simula percorso</button></details>{/if}
      </section>
    {/if}
    {#if showList}
      <section class="utility-panel places-list" id="luoghi" aria-label="Elenco dei luoghi">
        <div class="panel-top"><h2>Esplora Vienna</h2><button class="icon-button" aria-label="Chiudi elenco" onclick={() => showList = false}>×</button></div>
        <label for="search">Cerca un luogo</label><input id="search" type="search" bind:value={query} placeholder="Nome del luogo" />
        <ul>{#each visiblePlaces as place}<li><button onclick={() => openPlace(place.id)}><span>{place.name}<small>{place.category}{place.nearbyLabel ? ' · visita a piedi' : ''}</small></span><span aria-hidden="true">›</span></button></li>{/each}</ul>
        {#if !visiblePlaces.length}<p>Nessun luogo trovato. Prova un altro nome.</p>{/if}
      </section>
    {:else}<a id="luoghi" class="accessible-list-link" href="#luoghi" onclick={() => showList = true}>Apri elenco dei luoghi</a>{/if}
    {#if selected}
      <aside class="place-panel" aria-label={`Scheda ${selected.name}`}>
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="panel-top"><span class="category">{selected.category}</span><button class="icon-button" aria-label="Chiudi scheda" onclick={() => { selectedId = null; reader = ''; }}>×</button></div>
        <div class="sheet-body" bind:this={sheetBody}>
          <h2>{selected.name}</h2><p class="distance">{distance(selected)}</p><p class="intro">{selected.summary}</p>
          <p class="access">{selected.nearbyLabel ? 'Qui vicino. ' : ''}{selected.access}</p>
          <div class="content-list">
            {#each selected.contents as content}
              <article class="content-card">
                <h3>{content.title}</h3>
                <p class="content-meta">{content.audio ? `Audio · ${clock(content.durationSeconds)}` : 'Testo disponibile · audio da preparare'}</p>
                {#if state.heardIds.includes(`${selected.id}:${content.id}`)}<p class="heard">Già ascoltato</p>{/if}
                <div class="content-actions">{#if content.audio}<button class="primary" disabled={busy && state.track?.key !== `${selected.id}:${content.id}`} onclick={() => listen(selected, content)}>{state.heardIds.includes(`${selected.id}:${content.id}`) ? 'Riascolta' : 'Ascolta'}</button>{/if}<button class="secondary" aria-expanded={reader === content.id} onclick={() => reader = reader === content.id ? '' : content.id}>{reader === content.id ? 'Chiudi testo' : 'Leggi testo'}</button></div>
                {#if reader === content.id}<p class="transcript">{content.text}</p>{/if}
              </article>
            {/each}
          </div>
          <details class="sources"><summary>Fonti e posizione del pin</summary><p class="small">Verifica editoriale: {new Date(selected.verifiedAt ?? catalog.verifiedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}. {selected.referenceNote ?? selected.location.kind}. {selected.entranceStatus}</p><ul>{#each selected.sources as source}<li><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>{/each}<li><a href={selected.location.source} target="_blank" rel="noreferrer">Posizione del luogo · OpenStreetMap</a></li>{#if selected.entrance}<li><a href={selected.entrance.source} target="_blank" rel="noreferrer">Ingresso mappato separatamente · OpenStreetMap</a></li>{/if}</ul></details>
        </div>
      </aside>
    {/if}
    {#if state.active !== null}
      <section class="player" aria-label="Player audio">
        <div class="player-heading"><div><strong>{state.track?.placeName}</strong><p>{state.track?.title}</p></div><button class="icon-button" aria-label="Chiudi player" onclick={() => player.close()}>×</button></div>
        {#if ['error','blocked'].includes(state.phase)}<p class="error" role="alert">{state.phase === 'blocked' ? 'Audio non avviato. Tocca Riprova audio o leggi il testo.' : 'Audio non disponibile. Controlla rete o download e riprova.'}</p>{/if}
        <div class="player-controls"><button class="primary" onclick={() => { if (state.phase === 'playing') player.pause(); else void player.resume(); }}>{state.phase === 'playing' ? 'Pausa' : ['error','blocked'].includes(state.phase) ? 'Riprova audio' : state.phase === 'loading' ? 'Caricamento…' : 'Riprendi'}</button><label class="seek"><span class="sr-only">Avanzamento audio</span><input type="range" min="0" max={duration || 1} step="1" value={Math.min(state.elapsed, duration)} oninput={event => player.seek(Number(event.currentTarget.value))} /></label><span class="time">{clock(state.elapsed)} / {clock(duration)}</span></div>
        {#if state.storageError}<p class="small">Cronologia disponibile solo in questa sessione: memoria locale non accessibile.</p>{/if}
      </section>
    {/if}
  </main>
{:else}
  <main class="loading"><h1>Vienna dal finestrino</h1>{#if loadError}<p role="alert">{loadError}</p><button class="primary" onclick={initialize}>Riprova catalogo</button>{:else}<p>Preparo la mappa e i racconti…</p>{/if}</main>
{/if}
