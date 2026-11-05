<script>
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import { createRouteMap } from '../lib/route-map.js';

  let { selected = 0, position = null, simulated = false, locating = false, onlocate = () => {} } = $props();
  let container;
  let controller = $state.raw(null);
  let online = $state(true);
  let tileError = $state(false);

  onMount(() => {
    controller = createRouteMap(container, error => tileError = error !== false);
    const updateConnection = () => { online = navigator.onLine; };
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      controller.destroy();
    };
  });
  $effect(() => { controller?.select(selected); });
  $effect(() => { controller?.position(position, simulated); });
  $effect(() => { controller?.online(online); });
  function locate() {
    controller?.center();
    if (!position) onlocate();
  }
</script>

<section class="route-map" aria-label="Mappa del percorso in tram">
  <div class="map-heading"><h2>Il percorso in tram</h2><button class="text-button" onclick={() => controller?.fit()}>Intero percorso</button></div>
  <div class="map-canvas" bind:this={container}></div>
  <button class="secondary locate" onclick={locate}>{simulated ? 'Centra simulazione' : 'La mia posizione'}</button>
  {#if !position && !simulated}<p class="map-note" role="status">{locating ? 'Cerco la tua posizione GPS…' : 'Tocca «La mia posizione» e consenti l’accesso al GPS.'}</p>{/if}
  <div class="map-legend"><span><i class="red"></i>44 · Schottentor</span><span><i class="blue"></i>1 · Reumannplatz</span></div>
  {#if !online}<p class="map-note" role="status">Offline: tracciati e fermate disponibili.</p>
  {:else if tileError}<p class="map-note" role="status">Sfondo non disponibile. Tracciati e fermate restano visibili.</p>
  {:else}<p class="map-note">Tratta corrente in evidenza · sfondo stradale online</p>{/if}
</section>

<style>
  .route-map { margin: 22px 0; }
  .map-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  h2 { font-size: 18px; letter-spacing: -.3px; }
  .map-heading button { margin: 0; font-size: 12px; flex-shrink: 0; }
  .map-canvas { height: 320px; width: 100%; border-radius: 12px; background: #eaf2f6; isolation: isolate; z-index: 0; }
  .locate { margin-top: 10px; }
  .map-canvas :global(.position-label) { color: #fff; background: #007aaf; border-color: #007aaf; font-weight: 700; }
  .map-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 11px; padding-top: 10px; }
  .map-legend span { display: flex; align-items: center; gap: 6px; }
  i { width: 18px; height: 4px; border-radius: 2px; }
  .red { background: #c83732; } .blue { background: #152d40; }
  .map-note { font-size: 11px; color: #607280; margin: 5px 0 0; }
  .map-canvas :global(.tour-stop) { border-radius: 50%; background: #fff; border: 2px solid #152d40; color: #152d40; display: grid; place-items: center; font: 700 12px/1 -apple-system, sans-serif; box-shadow: 0 1px 4px #152d4030; }
  .map-canvas :global(.tour-stop.line-44) { color: #c83732; border-color: #c83732; }
  .map-canvas :global(.leaflet-control-zoom a) { width: 40px; height: 40px; line-height: 40px; }
  .map-canvas :global(.leaflet-control-attribution) { font-size: 9px; line-height: 1.4; max-width: 100%; }
  .map-canvas :global(.leaflet-popup-close-button) { min-height: 24px; }
</style>
