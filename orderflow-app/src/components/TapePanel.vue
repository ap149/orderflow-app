<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import TapeRow from './TapeRow.vue'
import { useTapeStore } from '../stores/tape'
import { useMarketStore } from '../stores/market'

const tapeStore = useTapeStore()
const { tape, filterPrice } = storeToRefs(tapeStore)

const marketStore = useMarketStore()
const { options } = storeToRefs(marketStore)

const visibleTape = computed(() => {
  if (!filterPrice.value) return tape.value
  return tape.value.filter((t) => t.to_px === filterPrice.value)
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden select-none">
    <!-- Column header -->
    <div class="flex items-center gap-2 px-2 py-1 border-b border-slate-200 text-[10px] bg-slate-800 text-white font-mono shrink-0">
      <span class="w-16 text-left">Time</span>
      <span class="w-16 text-center">Price</span>
      <span class="w-14 text-center">Vol</span>
      <!-- <span class="w-14 text-center">&Delta; Px</span> -->
      <span class="w-14 text-center">&Delta; LTP</span>
    </div>

    <!-- Scrollable tape (non-zero vol ticks only) -->
    <div class="overflow-y-auto no-scrollbar flex-1">
      <TapeRow
        v-for="(tick, i) in visibleTape"
        :key="tick.utc ?? i"
        :tick="tick"
        :max-cell="options.maxCell"
        :base-change="options.baseChange"
      />
    </div>
  </div>
</template>


<style scoped>
/* Hide scrollbar in Chrome, Safari, and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar in IE, Edge, and Firefox */
.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>