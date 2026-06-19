<script setup>
import { useMarketStore } from '../stores/market'

const emit = defineEmits(['select'])

const marketStore = useMarketStore()
const markets = ['DAX', 'ES', 'NQ']
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="m in markets"
      :key="m"
      class="px-3 py-1 text-xs font-semibold rounded border transition-colors"
      :class="
        marketStore.selectedMarket.value === m
          ? 'bg-slate-800 text-white border-slate-800'
          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
      "
      @click="emit('select', m)"
    >
      {{ m }}
    </button>
  </div>
</template>
