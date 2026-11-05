<script>
  import { onMount } from 'svelte';
  import RouteMap from './components/RouteMap.svelte';
  import TourLibrary from './components/TourLibrary.svelte';
  import { builtinTour } from './lib/builtin-tour.js';
  import { audioDurationLabel, lineColors } from './lib/tour-package.js';
  import { listTours, getTour, materializeTour, rememberedTour, rememberTour } from './lib/tour-storage.js';
  import { TourPlayer } from './lib/player.js';
  import { createRouteMatcher, validFix } from './lib/route.js';
  import { monitorOffline } from './lib/offline.js';

  let audio;
  let player;
  let activeTour = $state.raw(builtinTour);
  const tour = $derived(activeTour.legs);
  let matcher = createRouteMatcher(builtinTour.paths, builtinTour.groups.slice(1).map(group=>group.start));
  let library = $state.raw([{id:builtinTour.id,title:builtinTour.title}]);
  let libraryBusy = $state(true);
  let libraryError = $state('');
  let releaseAudio = () => {};
  let switchVersion = 0;
  const durationLabel = $derived(audioDurationLabel(tour.reduce((sum,leg)=>sum+(leg.durationSeconds || 0),0)));
  const distanceLabel = $derived.by(() => {const routes=createRouteMatcher(activeTour.paths);return (activeTour.paths.reduce((sum,_,index)=>sum+routes.trackLength(index),0)/1000).toLocaleString('it-IT',{maximumFractionDigits:1});});
  let state = $state({selected: 0, cursor: 0, active: null, phase: 'idle', listened: [], elapsed: 0, duration: 0});
  let mode = $state('manual');
  let mapPosition = $state(null);
  let started = $state(false);
  let locationMessage = $state('Sali sul 44, poi avvia il GPS.');
  let offline = $state({ready: false, error: false});
  let watchId = null;
  let simulationTimer;
  let simulationStep = $state(0);
  let simulationDone = $state(false);
  let lastFixTime = 0;
  const leg = $derived(tour[state.selected]);
  const audible = $derived(tour[state.active ?? state.selected]);
  const isBusy = $derived(state.phase === 'playing' || state.phase === 'loading');
  const progress = $derived(state.duration ? state.elapsed / state.duration * 100 : 0);
  const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  function stopSource() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    clearInterval(simulationTimer);
    player?.stopTracking();
    mode = 'manual';
    mapPosition = null;
  }
  function startGPS(resync = false) {
    stopSource();
    if (resync) player.reset(state.selected);
    player.prepare();
    started = true;
    if (!window.isSecureContext || !navigator.geolocation) {
      locationMessage = 'Il GPS richiede HTTPS. Puoi ascoltare a mano.';
      return;
    }
    mode = 'gps';
    lastFixTime = Date.now();
    locationMessage = 'Cerco la posizione…';
    watchId = navigator.geolocation.watchPosition(position => {
      if (mode !== 'gps') return;
      player.feed(position);
      if (!validFix(position)) {
        mapPosition = null;
        locationMessage = 'Segnale impreciso. Aspetto una posizione migliore.';
        return;
      }
      mapPosition = {latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy};
      lastFixTime = position.timestamp;
      const matched = matcher.matchLeg(position.coords, state.cursor);
      locationMessage = matched === null ? 'In attesa della partenza o del percorso.' : 'GPS agganciato al percorso';
    }, error => {
      if (mode !== 'gps') return;
      player.stopTracking();
      mapPosition = null;
      if (error.code === 1) {
        stopSource();
        locationMessage = 'Posizione non autorizzata. Puoi ascoltare a mano.';
      } else locationMessage = 'Segnale GPS assente. Puoi scegliere la tratta a mano.';
    }, {enableHighAccuracy: true, maximumAge: 0, timeout: 15000});
  }
  function selectLeg(index) {
    stopSource();
    player.reset(Number(index));
    locationMessage = 'Ascolto manuale. Riparti da qui con il GPS quando vuoi.';
  }
  function toggleAudio() {
    if (isBusy) player.pause();
    else if (state.phase === 'paused' || state.phase === 'blocked') player.resume();
    else player.play(state.selected);
  }
  function feedSimulation() {
    const index = Math.floor(simulationStep / 4);
    const fraction = [0, 0.25, 0.65, 1][simulationStep % 4];
    mapPosition = {...matcher.pointAt(index, matcher.trackLength(index) * fraction), accuracy: 5};
    player.feed({coords: mapPosition, timestamp: Date.now()});
    locationMessage = simulationStep % 4 === 0 && tour[index].transferBefore ? `Alla fermata di ${tour[index].from}` : `Simulazione · ${tour[index].segment}`;
    if (simulationStep === tour.length * 4 - 1) {
      clearInterval(simulationTimer);
      simulationDone = true;
      locationMessage = `Simulazione conclusa · ${tour.at(-1).to}`;
    }
  }
  function advanceSimulation(manual = false) {
    if (manual) clearInterval(simulationTimer);
    if (simulationStep < tour.length * 4 - 1) { simulationStep++; feedSimulation(); }
  }
  function startSimulation() {
    stopSource();
    player.reset(0, true);
    player.prepare();
    mode = 'simulation';
    simulationStep = 0;
    simulationDone = false;
    feedSimulation();
    simulationTimer = setInterval(() => advanceSimulation(), 8000);
  }
  function applyTour(next, release = () => {}) {
    stopSource();
    player?.dispose();
    audio.removeAttribute('src'); audio.load();
    releaseAudio();
    activeTour = next;
    releaseAudio = release;
    matcher = createRouteMatcher(next.paths, next.groups.slice(1).map(group=>group.start));
    player = new TourPlayer(audio, value => state = value, Date.now, {tour:next.legs,matcher});
    state = player.snapshot();
    started = false;
    locationMessage = `Sali sul ${next.legs[0].lineNumber}, poi avvia il GPS.`;
    rememberTour(next.id);
  }
  async function selectTour(id) {
    const version=++switchVersion;
    libraryBusy=true;libraryError='';
    stopSource();player?.pause();
    try {
      const loaded=id===builtinTour.id ? {tour:builtinTour,release:()=>{}} : materializeTour(await getTour(id));
      if(version!==switchVersion) {loaded.release();return;}
      applyTour(loaded.tour,loaded.release);
    } catch(error) {if(version===switchVersion) libraryError=error.message || 'Percorso non disponibile: importalo di nuovo.';}
    finally {if(version===switchVersion) libraryBusy=false;}
  }
  async function refreshLibrary(id) {
    library=[{id:builtinTour.id,title:builtinTour.title},...await listTours()];
    await selectTour(id);
  }
  onMount(() => {
    player = new TourPlayer(audio, value => state = value, Date.now, {tour:activeTour.legs,matcher});
    const remembered=rememberedTour();
    const initialVersion=switchVersion;
    listTours().then(async saved => {
      if(initialVersion!==switchVersion) return;
      library=[{id:builtinTour.id,title:builtinTour.title},...saved];
      if(remembered && saved.some(item=>item.id===remembered)) await selectTour(remembered);
      else libraryBusy=false;
    }).catch(()=>{if(initialVersion===switchVersion){libraryBusy=false;libraryError='Archivio locale non disponibile. Puoi usare il percorso incluso.';}});
    const stopOffline = monitorOffline(value => offline = value);
    const onExit = () => { stopSource(); player.pause(); };
    window.addEventListener('pagehide', onExit);
    const freshnessTimer = setInterval(() => {
      if (mode === 'gps' && Date.now() - lastFixTime > 15000) {
        mapPosition = null;
        locationMessage = 'Segnale GPS assente. Puoi scegliere la tratta a mano.';
      }
    }, 5000);
    return () => {
      ++switchVersion; stopSource(); player.dispose(); releaseAudio(); stopOffline(); clearInterval(freshnessTimer);
      window.removeEventListener('pagehide', onExit);
    };
  });
</script>

<svelte:head><title>Vienna dal finestrino</title></svelte:head>
<a class="skip" href="#player">Vai al player</a>
<main>
  <header>
    <div class="topline">
      <span class="city-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a2 2 0 0 1 2 2v12H5V6a2 2 0 0 1 2-2ZM8 1h8M12 1v3M8 18l-2 4m10-4 2 4M5 12h14M9 4v8"/><path d="M8 15h1m6 0h1"/></svg> Una città, tanti racconti</span>
      <span class:ready={offline.ready && !libraryBusy} class="offline" role="status"><span class="dot"></span>{offline.ready && !libraryBusy ? 'Pronta offline' : offline.error ? 'Offline non disponibile' : 'Preparo l’offline…'}</span>
    </div>
    <h1>Vienna dal<br />finestrino</h1>
    <p class="intro">{tour.length} racconti · {durationLabel} di audio · {distanceLabel} km</p>
  </header>

  <TourLibrary tours={library} active={activeTour} busy={libraryBusy} error={libraryError} onselect={selectTour} onimport={refreshLibrary} onremove={() => refreshLibrary(builtinTour.id)} />

  <section class="journey" aria-label="Itinerario">
    {#each activeTour.groups as group, index}
      {#if index > 0}<div class="interchange"><span aria-hidden="true">⇄</span> A {group.from} cambia tram</div>{/if}
      <div><span class="line-badge" style:background={lineColors[index % lineColors.length]}>{group.line}</span><span>Da {group.from}<strong>verso {group.direction}</strong><strong>Scendi a {group.to}</strong></span></div>
    {/each}
  </section>

  <section class="start-area" aria-label="Posizione e avvio">
    {#if mode === 'gps'}
      <button class="primary" onclick={() => {stopSource(); locationMessage = 'GPS disattivato. I controlli manuali sono pronti.';}}>Disattiva GPS</button>
    {:else if mode === 'simulation'}
      <div class="simulation-controls">
        <strong>Simulazione attiva</strong>
        <button class="secondary" onclick={() => {stopSource(); player.reset(state.selected); locationMessage = 'Simulazione terminata. Scegli una tratta o avvia il GPS.';}}>Esci dalla simulazione</button>
        <button class="primary" disabled={simulationDone} onclick={() => advanceSimulation(true)}>Avanza simulazione</button>
      </div>
    {:else}
      <button class="primary start" disabled={libraryBusy} onclick={() => startGPS()}><span aria-hidden="true">⌖</span>{started ? 'Attiva GPS' : 'Inizia il tour'}</button>
    {/if}
    <p class="location" role="status">{locationMessage}</p>
  </section>

  <section id="player" class="player" aria-label="Player audio">
    <div class="player-top"><span class="line-label">{leg.line}</span><span class="count">{state.selected + 1} / {tour.length}</span></div>
    <p class="segment">{leg.segment}</p>
    <h2>{leg.title}</h2>
    {#if state.active !== null && state.active !== state.selected}
      <p class="audio-note">Finisce prima: {audible.title}</p>
    {/if}
    {#if state.phase === 'blocked'}
      <p class="audio-note" role="status">Il browser aspetta un tuo tocco.</p>
    {:else if state.phase === 'error'}
      <p class="audio-note" role="alert">Audio non disponibile. Riprova quando sei online; la trascrizione è qui sotto.</p>
    {/if}
    <div class="audio-progress"><progress max="100" value={progress} aria-label="Progresso audio"></progress><span>{clock(state.elapsed)} / {clock(state.duration)}</span></div>
    <div class="playback-controls">
      <button class="play" disabled={libraryBusy} onclick={toggleAudio}><span aria-hidden="true">{isBusy ? 'Ⅱ' : '▶'}</span>{state.phase === 'blocked' ? 'Tocca per ascoltare' : isBusy ? 'Pausa' : state.phase === 'paused' ? 'Riprendi' : 'Ascolta'}</button>
      <button class="replay" disabled={libraryBusy} onclick={() => player.play(state.selected)}><span aria-hidden="true">↺</span>Riascolta</button>
    </div>
    <details><summary>Leggi la trascrizione</summary><p class="transcript">{leg.transcript}</p></details>
  </section>

  {#key activeTour.id}
  <RouteMap tour={activeTour} selected={state.selected} position={mapPosition} simulated={mode === 'simulation'} locating={mode === 'gps'} onlocate={() => {if(!libraryBusy) startGPS();}} />
  {/key}

  <section class="manual" aria-label="Controlli manuali">
    <label for="leg">Scegli la tratta</label>
    <select id="leg" disabled={libraryBusy} value={state.selected} onchange={event => selectLeg(event.currentTarget.value)}>
      {#each tour as item, index}<option value={index}>{index + 1}. {item.segment}</option>{/each}
    </select>
    <button class="secondary resync" disabled={libraryBusy} onclick={() => startGPS(true)}>Risincronizza GPS da questa tratta</button>
  </section>

  <section class="tour-progress" aria-label="Progresso tour">
    <div class="progress-label"><span>Il vostro giro</span><span>{state.listened.length} di {tour.length} ascoltate</span></div>
    <div class="stops" aria-hidden="true">
      {#each tour as _, index}<span class:heard={state.listened.includes(index)} class:current={state.selected === index}>{index + 1}</span>{/each}
    </div>
  </section>

  <footer>
    <p>Tieni la pagina in primo piano<br />e lo schermo acceso.</p>
    <p class="privacy">La posizione resta nel tuo browser.</p>
    {#if mode !== 'simulation'}<button class="text-button" disabled={libraryBusy} onclick={startSimulation}>Simula giro</button>{/if}
    <small>{activeTour.title}</small>
  </footer>
  <audio bind:this={audio} preload="auto" aria-label="Audio del tour"></audio>
</main>
