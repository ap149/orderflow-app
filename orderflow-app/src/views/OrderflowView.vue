<script setup>
import { computed, onMounted, ref } from 'vue'
import MarketSelector from '../components/MarketSelector.vue'
import LadderPanel from '../components/LadderPanel.vue'
import TapePanel from '../components/TapePanel.vue'
import TimeWidget from '../components/TimeWidget.vue'
import RightPanel from '../components/RightPanel.vue'
import { useFirebaseFeed } from '../composables/useFirebaseFeed'
import { useReplayFeed } from '../composables/useReplayFeed'
import { usePriceFeedCapture } from '../composables/usePriceFeedCapture'
import { useMarketStore } from '../stores/market'

const marketStore = useMarketStore()
const liveFeed = useFirebaseFeed()
const replayFeed = useReplayFeed()
const capture = usePriceFeedCapture()

const mode = ref('replay')

const statusText = computed(() =>
  mode.value === 'live' ? liveFeed.status.value : replayFeed.status.value
)

function setMode(newMode) {
  if (newMode === mode.value) return
  mode.value = newMode
  const market = marketStore.selectedMarket.value
  if (newMode === 'live') {
    replayFeed.pause()
    liveFeed.subscribe(market)
  } else {
    liveFeed.unsubscribe()
    replayFeed.load(market)
  }
}

function onMarketSelect(market) {
  if (mode.value === 'live') liveFeed.subscribe(market)
  else replayFeed.load(market)
}

onMounted(async () => {
  await marketStore.loadConfig()
  replayFeed.load(marketStore.selectedMarket.value)
})
</script>

<template>
  <div class="flex flex-col h-screen bg-white overflow-hidden">
    <!-- Header -->
    <div class="flex items-center px-4 py-2 border-b border-slate-200 shrink-0 gap-4">
      <!-- Left: clock + countdowns -->
      <TimeWidget />

      <!-- Right: market controls -->
      <div class="flex items-center gap-3 ml-auto flex-wrap">
        <!-- <span class="text-sm font-bold text-slate-700">Orderflow</span> -->
        <MarketSelector @select="onMarketSelect" />

        <!-- Capture snapshot -->
        <button
          :disabled="capture.status.value === 'capturing'"
          @click="capture.captureAll()"
          class="px-2 py-1 text-xs font-semibold rounded border transition-colors disabled:opacity-30"
          :class="capture.status.value === 'done' ? 'border-teal-500 text-teal-600' : capture.status.value === 'error' ? 'border-red-400 text-red-500' : 'border-slate-300 text-slate-500 hover:enabled:border-slate-500'"
        >{{ capture.status.value === 'capturing' ? '⏳ Capturing…' : capture.status.value === 'done' ? '✓ Captured' : capture.status.value === 'error' ? '✗ Error' : '⬇ Capture' }}</button>

        <!-- Mode toggle -->
        <div class="flex">
          <button
            class="px-2 py-1 text-xs font-semibold rounded-l border transition-colors"
            :class="mode === 'replay' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-500'"
            @click="setMode('replay')"
          >REPLAY</button>
          <button
            class="px-2 py-1 text-xs font-semibold rounded-r border-t border-r border-b transition-colors"
            :class="mode === 'live' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-500'"
            @click="setMode('live')"
          >LIVE</button>
        </div>

        <!-- Replay controls -->
        <template v-if="mode === 'replay'">
          <div class="flex gap-1">
            <button
              :disabled="!['loaded', 'paused'].includes(replayFeed.status.value)"
              @click="replayFeed.play()"
              class="px-2 py-1 text-xs font-semibold rounded border border-slate-300 disabled:opacity-30 hover:enabled:border-slate-500 transition-colors"
            >▶ Play</button>
            <button
              :disabled="replayFeed.status.value !== 'playing'"
              @click="replayFeed.pause()"
              class="px-2 py-1 text-xs font-semibold rounded border border-slate-300 disabled:opacity-30 hover:enabled:border-slate-500 transition-colors"
            >⏸ Pause</button>
            <button
              :disabled="['idle', 'loading', 'error'].includes(replayFeed.status.value)"
              @click="replayFeed.reset()"
              class="px-2 py-1 text-xs font-semibold rounded border border-slate-300 disabled:opacity-30 hover:enabled:border-slate-500 transition-colors"
            >↺ Reset</button>
          </div>

          <div class="flex">
            <button
              v-for="s in [1, 2, 5, 10]"
              :key="s"
              @click="replayFeed.setSpeed(s)"
              class="px-2 py-1 text-xs font-semibold border transition-colors first:rounded-l last:rounded-r"
              :class="replayFeed.speed.value === s
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-300 hover:border-slate-500'"
            >{{ s }}x</button>
          </div>

          <span class="text-xs text-slate-400 font-mono tabular-nums">
            {{ replayFeed.progress.value.current }} / {{ replayFeed.progress.value.total }}
          </span>
        </template>

        <!-- Status badge -->
        <span
          class="text-xs"
          :class="['live', 'playing'].includes(statusText) ? 'text-teal-600' : 'text-slate-400'"
        >
          {{ statusText }}{{ statusText === 'done' ? ' — complete' : '' }}
          <template v-if="mode === 'live' && liveFeed.tickCount.value > 0">
            · {{ liveFeed.tickCount.value }} ticks
          </template>
        </span>

      </div>
    </div>

    <!-- Main content: tape | ladder | right panel -->
    <div class="flex flex-1 overflow-hidden">
      <div class="w-56 border-r border-slate-200 shrink-0">
        <TapePanel />
      </div>
      <div class="flex-1 overflow-hidden">
        <LadderPanel />
      </div>
      <RightPanel />
    </div>
  </div>
</template>
