<script setup>
import { computed } from 'vue'
import LadderCell from './LadderCell.vue'
import DeltaBar from './DeltaBar.vue'
import { useMarketStore } from '../stores/market'

const props = defineProps({
  price: { type: String, required: true },
  from: { type: Object, required: true },       // shallowRef<Tick[]>
  to: { type: Object, required: true },         // shallowRef<Tick[]>
  vol: {type: Object, required: true},
  active: { type: Object, required: true },     // ref<boolean>
  highlightTo: { type: Object, required: true },   // ref<boolean> — newest to-cell border
  highlightFrom: { type: Object, required: true }, // ref<boolean> — newest from-cell border
  recentRank: { type: Number, default: -1 },
})

const marketStore = useMarketStore()

// Latest tick in each buffer — used for session-cumulative volume bars
const latestFrom = computed(() => props.from.value?.[props.from.value.length - 1] ?? null)
const latestTo   = computed(() => props.to.value?.[0] ?? null)

// Buffer sums of tick_delta — matches what's visible in the 9 cells on each side
const fromDelta = computed(() => props.from.value.reduce((s, t) => s + (t?.tick_delta ?? 0), 0))
const toDelta   = computed(() => props.to.value.reduce((s, t) => s + (t?.tick_delta ?? 0), 0))

// Session-cumulative volume as % of maxVolume (grows beyond 9 visible cells)
const fromVolumePct = computed(() => Math.min(100, ((latestFrom.value?.cum_vol ?? 0) / marketStore.options.maxVolume) * 100))
const toVolumePct   = computed(() => Math.min(100, ((latestTo.value?.cum_vol ?? 0) / marketStore.options.maxVolume) * 100))

// Subtle background tint for recent price trail (ranks 1–4 only; rank 0 = active row)
// const TRAIL_ALPHA = [0, 0.22, 0.11, 0.055, 0.025]
const TRAIL_ALPHA = [0, 0.55, 0.4, 0.3, 0.2]
const trailStyle = computed(() => {

  if (props.active.value) return { backgroundColor: 'rgb(49, 65, 88)', color: 'white'} // = bg-slate-100 rgb(49, 65, 88)
  const rank = props.recentRank
  if (rank > 0 && rank <= 4) return { backgroundColor: `rgba(100, 116, 139, ${TRAIL_ALPHA[rank]})` }
  return {}
})

</script>

<template>
  <div
    class="flex items-stretch border-b border-slate-200 h-5"
    
  >
    <!-- Total volume bar (at current price, using to side) -->
    <!-- <div class="w-24 shrink-0 h-full">
      <DeltaBar
        :value="latestTo?.cum_vol ?? 0"
        :max="marketStore.options.maxVolume"
        mode="volume"
      />
    </div> -->
   

    
    <!-- From cells (oldest→newest, left→right) — border on rightmost (newest) when highlighted -->
    <LadderCell
    v-for="(tick, i) in from.value"
    :key="i"
    :tick="tick"
    :maxCell="marketStore.options.maxCell"
    :price="price"
    :flash="i === from.value.length - 1"
    :highlight="i === from.value.length - 1 && highlightFrom.value"
    />
    
    <!-- From aggregate delta bar -->
    <div class="w-18 shrink-0 h-full py-[2px] mx-1">
      <DeltaBar :value="fromDelta" :max="marketStore.options.maxTotal" mode="delta" />
    </div>

    <!-- From delta value -->
    <div
      class="w-10 shrink-0 flex items-center justify-end text-[10px] font-mono pr-3"
      :class="fromDelta > 0 ? 'text-teal-500' : fromDelta < 0 ? 'text-rose-500' : 'text-slate-500'"
    >{{ fromDelta || '' }}</div>

    <!-- From cumulative volume value -->
    <div class="w-10 shrink-0 flex items-center text-[10px] font-mono text-slate-500 pl-2">
      {{ latestFrom?.cum_vol ?? '' }}
    </div>

    <!-- From cumulative volume bar (session total, fills right-to-left toward price) -->
    <div class="w-16 shrink-0 h-full flex py-[2px] mx-2 items-stretch justify-end">
      <div class="h-full bg-slate-300 transition-[width] duration-75" :style="{ width: fromVolumePct + '%' }" />
    </div>

    <!-- Price label -->
    <div
      class="w-14 shrink-0 flex items-center justify-center text-[10px] font-semibold select-none"
      :class="active.value ? 'bg-slate-700 text-white' : 'text-slate-700'"
      :style="trailStyle"
    >
      {{ price }}
    </div>

    <!-- To cumulative volume bar (session total, fills left-to-right toward to-cells) -->
    <div class="w-16 shrink-0 h-full flex py-[2px] mx-2 items-stretch">
      <div class="h-full bg-slate-300 transition-[width] duration-75" :style="{ width: toVolumePct + '%' }" />
    </div>

    <!-- To cumulative volume value -->
    <div class="w-12 shrink-0 flex items-center justify-end text-[10px] font-mono text-slate-500 pr-2">
      {{ latestTo?.cum_vol ?? '' }}
    </div>

    <!-- To delta value -->
    <div
      class="w-10 shrink-0 flex items-end justify-start pl-2 text-[10px] font-mono "
      :class="toDelta > 0 ? 'text-teal-500' : toDelta < 0 ? 'text-rose-500' : 'text-slate-500'"
    >{{toDelta > 0 ? '&nbsp':''}}{{ toDelta || '' }}</div>

    <!-- To aggregate delta bar -->
    <div class="w-18 shrink-0 h-full py-[2px] mx-1">
      <DeltaBar :value="toDelta" :max="marketStore.options.maxTotal" mode="delta" />
    </div>

    <!-- To cells (newest→oldest, left→right) — border on leftmost (newest) when highlighted -->
    <LadderCell
      v-for="(tick, i) in to.value"
      :key="i"
      :tick="tick"
      :maxCell="marketStore.options.maxCell"
      :price="price"
      :flash="i === 0"
      :highlight="i === 0 && highlightTo.value"
    />

  </div>
</template>
