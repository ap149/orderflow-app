<script setup>
import { computed } from 'vue'
import { getDeltaColor, getChgColor } from '../composables/useCellColor'

const props = defineProps({
  tick: { type: Object, required: true },
  maxCell: { type: Number, default: 20 },
  baseChange: { type: Number, default: 1 },
})

const timeLabel = computed(() => {
  if (!props.tick?.utc) return '--:--:--'
  const d = new Date(props.tick.utc)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
})

const volStyle = computed(() => getDeltaColor(props.tick, props.maxCell))

const priceChg = computed(() => {
  const diff = parseFloat(props.tick.to_px) - parseFloat(props.tick.from_px)
  return parseFloat(diff.toFixed(2))
})

const chgLabel = computed(() => {
  const v = priceChg.value
  if (v === 0) return '0'
  return (v > 0 ? '+' : '') + v.toFixed(2)
})

const chgStyle = computed(() => getChgColor(priceChg.value, props.baseChange))

const ltpChg = computed(() => {
  if (props.tick.ltp == null) return null
  const diff = parseFloat(props.tick.to_px) - parseFloat(props.tick.ltp)
  return parseFloat(diff.toFixed(2))
})

const ltpChgLabel = computed(() => {
  const v = ltpChg.value
  if (v == null) return '--'
  if (v === 0) return '0'
  return (v > 0 ? '+' : '') + v.toFixed(2)
})

const ltpChgStyle = computed(() => ltpChg.value != null ? getChgColor(ltpChg.value, props.baseChange) : {})
</script>

<template>
  <!-- tape-new-entry animation plays once when this DOM node is created (key=utc in parent) -->
  <div class="tape-row flex items-center gap-2 px-2 py-0.5 text-[10px] border-b border-slate-100 font-mono">
    <span class="w-14 text-left text-slate-400">{{ timeLabel }}</span>
    <span class="w-16 text-center font-semibold">{{ tick.to_px }}</span>
    <span :style="volStyle" class="w-12 text-center px-1">{{ tick.vol }}</span>
    <!-- <span :style="chgStyle" class="w-12 text-center px-1">{{ chgLabel == 0 ? " " : chgLabel}}</span> -->
    <span :style="ltpChgStyle" class="w-12 text-center px-1">{{ ltpChgLabel == 0 ? "=": ltpChgLabel}}</span>
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
