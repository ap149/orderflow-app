<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import TapeRow from './TapeRow.vue'
import { useTapeStore } from '../stores/tape'

const tapeStore = useTapeStore()
const { tape, filterPrice } = storeToRefs(tapeStore)

const visibleTape = computed(() => {
  if (!filterPrice.value) return tape.value
  return tape.value.filter((t) => t.to_px === filterPrice.value)
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex items-center gap-2 px-2 py-1 border-b border-slate-200 text-[10px] text-slate-500 font-mono shrink-0">
      <span class="w-3"></span>
      <span class="w-16 text-right">Price</span>
      <span class="w-10 text-right">Vol</span>
      <span class="w-10 text-right">Delta</span>
      <span class="w-12 text-right">Cum</span>
    </div>
    <div class="overflow-y-auto flex-1">
      <TapeRow v-for="(tick, i) in visibleTape" :key="tick.utc ?? i" :tick="tick" />
    </div>
  </div>
</template>
