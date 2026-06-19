<script setup>
import { computed } from 'vue'
import LadderCell from './LadderCell.vue'
import DeltaBar from './DeltaBar.vue'
import { useMarketStore } from '../stores/market'

const props = defineProps({
  price: { type: String, required: true },
  from: { type: Object, required: true },       // shallowRef<Tick[]>
  to: { type: Object, required: true },         // shallowRef<Tick[]>
  active: { type: Object, required: true },     // ref<boolean>
  highlightTo: { type: Object, required: true },   // ref<boolean> — newest to-cell border
  highlightFrom: { type: Object, required: true }, // ref<boolean> — newest from-cell border
  recentRank: { type: Number, default: -1 },
})

const marketStore = useMarketStore()

// Latest (most recent) from/to stats for the delta bars
const latestTo = computed(() => props.to.value?.[0] ?? null)
const latestFrom = computed(() => props.from.value?.[props.from.value.length - 1] ?? null)

// Subtle background tint for recent price trail (ranks 1–4 only; rank 0 = active row)
const TRAIL_ALPHA = [0, 0.22, 0.11, 0.055, 0.025]
const trailStyle = computed(() => {
  const rank = props.recentRank
  if (rank <= 0 || rank > 4) return {}
  return { backgroundColor: `rgba(100, 116, 139, ${TRAIL_ALPHA[rank]})` }
})
</script>

<template>
  <div
    class="flex items-stretch border-b border-slate-100 h-5"
    :class="active.value ? 'bg-slate-100' : ''"
    :style="active.value ? {} : trailStyle"
  >
    <!-- Total volume bar (at current price, using to side) -->
    <div class="w-16 shrink-0 h-full">
      <DeltaBar
        :value="latestTo?.cum_vol ?? 0"
        :max="marketStore.options.maxVolume"
        mode="volume"
      />
    </div>

    <!-- From cells (oldest→newest, left→right) — border on rightmost (newest) when highlighted -->
    <LadderCell
      v-for="(tick, i) in from.value"
      :key="i"
      :tick="tick"
      :maxCell="marketStore.options.maxCell"
      :flash="i === from.value.length - 1"
      :highlight="i === from.value.length - 1 && highlightFrom.value"
    />

    <!-- From aggregate delta bar -->
    <div class="w-16 shrink-0 h-full mx-1">
      <DeltaBar :value="latestFrom?.delta ?? 0" :max="marketStore.options.maxTotal" mode="delta" />
    </div>

    <!-- Price label -->
    <div
      class="w-14 shrink-0 flex items-center justify-center text-[10px] font-semibold select-none"
      :class="active.value ? 'bg-slate-700 text-white' : 'text-slate-700'"
    >
      {{ price }}
    </div>

    <!-- To aggregate delta bar -->
    <div class="w-16 shrink-0 h-full mx-1">
      <DeltaBar :value="latestTo?.delta ?? 0" :max="marketStore.options.maxTotal" mode="delta" />
    </div>

    <!-- To cells (newest→oldest, left→right) — border on leftmost (newest) when highlighted -->
    <LadderCell
      v-for="(tick, i) in to.value"
      :key="i"
      :tick="tick"
      :maxCell="marketStore.options.maxCell"
      :flash="i === 0"
      :highlight="i === 0 && highlightTo.value"
    />
  </div>
</template>
