<script>
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import { createPoiMap } from '../lib/poi-map.js';
  let { places, paths, selected, routeId, showTramRoute = true, position, simulated, online, centerRequest, onselect, onTileError } = $props();
  let container;
  let controller = $state.raw(null);
  onMount(() => {
    controller = createPoiMap(container, { places, paths, onselect, onTileError });
    return () => controller.destroy();
  });
  $effect(() => controller?.select(selected));
  $effect(() => controller?.filter(routeId, showTramRoute));
  $effect(() => controller?.position(position, simulated));
  $effect(() => controller?.online(online));
  $effect(() => { if (centerRequest) controller?.center(); });
</script>
<section class="poi-map" aria-label="Mappa dei luoghi di Vienna"><div bind:this={container} class="map-canvas"></div></section>
