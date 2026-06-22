<script setup>
import { computed } from 'vue'
import { useTooltip } from '../composables/useTooltip'

const { state } = useTooltip()

const timeLabel = computed(() => {
  const utc = state.tick?.utc
  if (!utc) return '--:--:--'
  const d = new Date(utc)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
})

const chgLabel = computed(() => {
  const t = state.tick
  if (!t?.from_px || !t?.to_px) return '—'
  const v = parseFloat((parseFloat(t.to_px) - parseFloat(t.from_px)).toFixed(2))
  if (v === 0) return '0'
  return (v > 0 ? '+' : '') + v
})

const chgPositive = computed(() => {
  const t = state.tick
  if (!t?.from_px || !t?.to_px) return null
  return parseFloat(t.to_px) > parseFloat(t.from_px)
})

const deltaLabel = computed(() => {
  const v = state.tick?.tick_delta
  if (v == null) return '—'
  return (v > 0 ? '+' : '') + v
})

const style = computed(() => ({
  position: 'fixed',
  left: state.x + 14 + 'px',
  top: state.y + 14 + 'px',
  pointerEvents: 'none',
  zIndex: 50,
}))
</script>

<template>
  <div v-if="state.visible && state.tick" :style="style"
    class="bg-slate-800 text-slate-100 text-[12px] font-mono rounded shadow-lg px-2 py-1.5 leading-relaxed whitespace-nowrap">
    <div class="text-slate-100 text-[14px] mb-0.5 font-bold">{{ timeLabel }}</div>
    <div class="flex justify-between gap-3">
      <span class="text-slate-400">from</span>
      <span>{{ state.tick.from_px ?? '—' }}</span>
    </div>
    <div class="flex justify-between gap-3">
      <span class="text-slate-400">chg</span>
      <span :class="chgPositive === true ? 'text-teal-400' : chgPositive === false ? 'text-rose-400' : ''">{{ chgLabel }}</span>
    </div>
    <div class="flex justify-between gap-3">
      <span class="text-slate-400">to</span>
      <span>{{ state.tick.to_px ?? '—' }}</span>
    </div>    
    <div class="flex justify-between gap-3">
      <span class="text-slate-400">vol</span>
      <span>{{ state.tick.vol }}</span>
    </div>
    <div class="flex justify-between gap-3">
      <span class="text-slate-400">Δ</span>
      <span :class="state.tick.tick_delta > 0 ? 'text-teal-400' : state.tick.tick_delta < 0 ? 'text-rose-400' : ''">{{ deltaLabel }}</span>
    </div>
  </div>
</template>
