<script>
  let { tours = [], active, onselect } = $props();
</script>

<section class="library" aria-label="Tour inclusi">
  <label for="tour-choice">Percorso da ascoltare</label>
  <select id="tour-choice" value={active.id} onchange={event => onselect(event.currentTarget.value)}>
    {#each tours as tour}<option value={tour.id}>{tour.title}</option>{/each}
  </select>
</section>

<style>
  .library {padding-bottom:22px;}
  label {display:block;font-size:13px;font-weight:650;margin-bottom:8px;}
</style>
