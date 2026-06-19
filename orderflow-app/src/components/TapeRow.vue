<script setup>
import { computed } from 'vue'

const props = defineProps({
  tick: { type: Object, required: true },
})

const dirClass = computed(() => {
  if (props.tick.chg > 0) return 'text-teal-600'
  if (props.tick.chg < 0) return 'text-rose-600'
  return 'text-stone-500'
})

const dirSymbol = computed(() => {
  if (props.tick.chg > 0) return '▲'
  if (props.tick.chg < 0) return '▼'
  return '='
})
</script>

<template>
  <!-- tape-new-entry animation plays once when this DOM node is created (key=utc in parent) -->
  <div class="tape-row flex items-center gap-2 px-2 py-0.5 text-[10px] border-b border-slate-100 font-mono">
    <span :class="dirClass" class="w-3">{{ dirSymbol }}</span>
    <span class="w-16 text-right font-semibold">{{ tick.to_px }}</span>
    <span class="w-10 text-right">{{ tick.vol }}</span>
    <span :class="tick.delta >= 0 ? 'text-teal-600' : 'text-rose-600'" class="w-10 text-right">
      {{ tick.delta > 0 ? '+' : '' }}{{ tick.delta }}
    </span>
    <span class="text-slate-400 w-12 text-right">{{ tick.cum_vol }}</span>
  </div>
</template>

<style scoped>
.tape-row {
  animation: tapeNewEntry 0.8s ease-out;
}

@keyframes tapeNewEntry {
  from { background-color: rgba(235, 182, 23, 0.644); }
  to   { background-color: transparent; }
}
</style>
