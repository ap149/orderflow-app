<template>
  <div
    class="rounded-lg w-13 h-12 flex flex-col items-center justify-center font-mono font-bold transition-colors duration-500"
    :class="{ 'animate-pulse': isUrgent }"
    :style="{ background: bgColor, color: textColor }"
  >
    <span class="text-md leading-none">{{ displayTime }}</span>
    <span class="text-[12px] leading-none opacity-70 mt-0.5">{{ label }}</span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  interval: { type: Number, required: true }
})

const remainingSeconds = ref(0)
let timerId

function update() {
  const now = new Date()
  const total = now.getMinutes() * 60 + now.getSeconds()
  const intervalSecs = props.interval * 60
  const next = Math.ceil((total + 1) / intervalSecs) * intervalSecs
  remainingSeconds.value = next - total
}

onMounted(() => { update(); timerId = setInterval(update, 1000) })
onUnmounted(() => clearInterval(timerId))

const label = computed(() => `${props.interval}m`)

const displayTime = computed(() => {
  const s = remainingSeconds.value
  return s > 60 ? `${Math.floor(s / 60)}m` : `${s}s`
})

// Thresholds (seconds) at which color transition begins
const fadeWindow = { 1: 30, 5: 120, 15: 180, 30: 300, 60: 600 }

function hex2rgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 0, 0]
}

function lerp(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t))
}

const IDLE   = hex2rgb('#ffffff') // white (invisible on white bg)
const WARM   = hex2rgb('#ffb900') // yellow
const URGENT = hex2rgb('#ff2056') // red-pink

const bgColor = computed(() => {
  const window = fadeWindow[props.interval] ?? 60
  const t = Math.max(0, Math.min(1, 1 - remainingSeconds.value / window))
  const [r, g, b] = t < 0.5 ? lerp(IDLE, WARM, t * 2) : lerp(WARM, URGENT, (t - 0.5) * 2)
  return `rgb(${r},${g},${b})`
})

const textColor = computed(() => '#ffffff')

const isUrgent = computed(() => {
  const thresh = { 1: 10, 5: 30, 15: 60, 30: 120, 60: 120 }
  return remainingSeconds.value <= (thresh[props.interval] ?? 10)
})
</script>
