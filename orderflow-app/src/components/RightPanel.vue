<script setup>
import { ref, computed } from 'vue'
import { useMarketStore } from '../stores/market'
import { useLadderStore } from '../stores/ladder'

const marketStore = useMarketStore()
const ladderStore = useLadderStore()

const activeTab = ref('settings')

const market = computed(() => marketStore.selectedMarket.value)

const RANGE_PARAMS = [
  { key: 'step', label: 'Step', stepAttr: 0.25 },
  { key: 'high', label: 'High', stepAttr: 100 },
  { key: 'low',  label: 'Low',  stepAttr: 100 },
]

const THRESHOLD_PARAMS = [
  { key: 'maxCell',   label: 'Cell',   stepAttr: 10 },
  { key: 'maxTotal',  label: 'Total Delta',  stepAttr: 25 },
  { key: 'maxVolume', label: 'Total Volume', stepAttr: 100 },
]

const SESSION_PARAMS = [
  { key: 'sessionHour', label: 'Hour', stepAttr: 1 },
  { key: 'sessionMin',  label: 'Min',  stepAttr: 1 },
]

const TAPE_PARAMS = [
  { key: 'baseChange', label: 'Base Change', stepAttr: 0.25 },
]

const RESET_KEYS = new Set(['step', 'high', 'low'])

function commit(key, event) {
  const value = Number(event.target.value)
  if (isNaN(value)) return
  marketStore.updateParam(market.value, key, value)
  if (RESET_KEYS.has(key)) ladderStore.reset()
}

function onKeydown(key, event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commit(key, event)
    event.target.blur()
  }
}
</script>

<template>
  <div class="flex flex-col h-full border-l border-b border-slate-200 bg-white shrink-0 w-100">
    <!-- Tab bar -->
    <div class="flex shrink-0 border-b border-slate-200">
      <button
        v-for="tab in ['widgets', 'settings']"
        :key="tab"
        class="flex-1 py-1.5 text-xs font-semibold capitalize transition-colors"
        :class="activeTab === tab
          ? 'bg-slate-800 text-white'
          : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = tab"
      >{{ tab }}</button>
    </div>

    <!-- Widgets tab -->
    <div v-if="activeTab === 'widgets'" class="flex-1 flex items-center justify-center p-4">
      <span class="text-xs text-slate-400">Widgets coming soon</span>
    </div>

    <!-- Settings tab -->
    <div v-else class="flex-1 overflow-y-auto p-3 text-xs">

      <!-- Market label -->
      <div class="text-center font-semibold text-slate-600 mb-3">{{ market }}</div>

      <!-- Range section -->
      <div class="mb-3">
        <div class="text-slate-400 uppercase tracking-wide mb-1 text-[10px]">Range</div>
        <div v-for="p in RANGE_PARAMS" :key="p.key" class="flex items-center gap-2 mb-1">
          <div class="text-slate-500 w-28 shrink-0">{{ p.label }}</div>
          <input
            type="number"
            :step="p.stepAttr"
            :value="marketStore.config[market][p.key]"
            class="w-full text-center border border-slate-200 rounded px-1 py-0.5 text-slate-700 focus:outline-none focus:border-slate-400 tabular-nums"
            @blur="commit(p.key, $event)"
            @keydown="onKeydown(p.key, $event)"
          />
        </div>
      </div>

      <!-- Thresholds section -->
      <div class="mb-3">
        <div class="text-slate-400 uppercase tracking-wide mb-1 text-[10px]">Thresholds</div>
        <div v-for="p in THRESHOLD_PARAMS" :key="p.key" class="flex items-center gap-2 mb-1">
          <div class="text-slate-500 w-28 shrink-0 truncate">{{ p.label }}</div>
          <input
            type="number"
            :step="p.stepAttr"
            :value="marketStore.config[market][p.key]"
            class="w-full text-center border border-slate-200 rounded px-1 py-0.5 text-slate-700 focus:outline-none focus:border-slate-400 tabular-nums"
            @blur="commit(p.key, $event)"
            @keydown="onKeydown(p.key, $event)"
          />
        </div>
      </div>

      <!-- Tape section -->
      <div class="mb-3">
        <div class="text-slate-400 uppercase tracking-wide mb-1 text-[10px]">Tape</div>
        <div v-for="p in TAPE_PARAMS" :key="p.key" class="flex items-center gap-2 mb-1">
          <div class="text-slate-500 w-28 shrink-0 truncate">{{ p.label }}</div>
          <input
            type="number"
            :step="p.stepAttr"
            :value="marketStore.config[market][p.key]"
            class="w-full text-center border border-slate-200 rounded px-1 py-0.5 text-slate-700 focus:outline-none focus:border-slate-400 tabular-nums"
            @blur="commit(p.key, $event)"
            @keydown="onKeydown(p.key, $event)"
          />
        </div>
      </div>

      <!-- Session section -->
      <div>
        <div class="text-slate-400 uppercase tracking-wide mb-1 text-[10px]">Session Start</div>
        <div v-for="p in SESSION_PARAMS" :key="p.key" class="flex items-center gap-2 mb-1">
          <div class="text-slate-500 w-28 shrink-0">{{ p.label }}</div>
          <input
            type="number"
            :step="p.stepAttr"
            :value="marketStore.config[market][p.key]"
            class="w-full text-center border border-slate-200 rounded px-1 py-0.5 text-slate-700 focus:outline-none focus:border-slate-400 tabular-nums"
            @blur="commit(p.key, $event)"
            @keydown="onKeydown(p.key, $event)"
          />
        </div>
      </div>

    </div>
  </div>
</template>
