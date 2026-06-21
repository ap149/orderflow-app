<template>
  <div class="flex items-center gap-2 shrink-0">
    <!-- Clock -->
    <div class="font-mono font-bold text-slate-700 text-3xl tabular-nums border-2 border-slate-700 rounded-lg px-2 py-1 tracking-wide">
      {{ currentTime }}
    </div>

    <!-- Countdowns -->
    <div class="flex gap-1">
      <Countdown :interval="1" />
      <Countdown :interval="5" />
      <Countdown :interval="15" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Countdown from './Countdown.vue'

const currentTime = ref('')
let timerId

function update() {
  currentTime.value = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })
}

onMounted(() => { update(); timerId = setInterval(update, 500) })
onUnmounted(() => clearInterval(timerId))
</script>
