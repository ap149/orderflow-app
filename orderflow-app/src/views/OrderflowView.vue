<script setup>
import { computed, onMounted, ref } from 'vue'
import MarketSelector from '../components/MarketSelector.vue'
import LadderPanel from '../components/LadderPanel.vue'
import TapePanel from '../components/TapePanel.vue'
import { useFirebaseFeed } from '../composables/useFirebaseFeed'
import { useReplayFeed } from '../composables/useReplayFeed'
import { useMarketStore } from '../stores/market'

const marketStore = useMarketStore()
const liveFeed = useFirebaseFeed()
const replayFeed = useReplayFeed()

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

onMounted(() => {
  replayFeed.load(marketStore.selectedMarket.value)
})
</script>

<template>
  <div class="flex flex-col h-screen bg-white overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-2 border-b border-slate-200 shrink-0 flex-wrap">
      <span class="text-sm font-bold text-slate-700">Orderflow</span>
      <MarketSelector @select="onMarketSelect" />

      <!-- Mode toggle -->
      <div class="flex ml-2">
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
        class="text-xs ml-auto"
        :class="['live', 'playing'].includes(statusText) ? 'text-teal-600' : 'text-slate-400'"
      >
        {{ statusText }}{{ statusText === 'done' ? ' — complete' : '' }}
        <template v-if="mode === 'live' && liveFeed.tickCount.value > 0">
          · {{ liveFeed.tickCount.value }} ticks
        </template>
      </span>
    </div>

    <!-- Main content: tape | ladder side by side -->
    <div class="flex flex-1 overflow-hidden">
      <div class="w-56 border-r border-slate-200 shrink-0">
        <TapePanel />
      </div>
      <div class="flex-1 overflow-hidden">
        <LadderPanel />
      </div>
    </div>
  </div>
</template>
