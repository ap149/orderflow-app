<script setup>
import { computed } from 'vue'
import { getBarColor } from '../composables/useCellColor'

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, required: true },
  // 'delta' (bi-directional, centred) or 'volume' (uni-directional, left→right)
  mode: { type: String, default: 'delta' },
})

const pct = computed(() => {
  if (props.max === 0) return 0
  if (props.mode === 'volume') return Math.min(100, (props.value / props.max) * 100)
  return Math.min(100, (Math.abs(props.value) / props.max) * 100)
})

const colorStyle = computed(() => getBarColor(props.value, props.max))
const barStyle = computed(() => ({ ...colorStyle.value, width: pct.value + '%' }))
const isNeg = computed(() => props.value < 0)
</script>

<template>
  <div class="relative w-full h-full flex items-center overflow-hidden">
    <!-- volume bar: fills from left -->
    <template v-if="mode === 'volume'">
      <div class="h-full transition-[width] duration-75" :style="barStyle" />
    </template>
    <!-- delta bar: fills from centre, direction indicates sign -->
    <template v-else>
      <div class="absolute inset-0 flex items-center">
        <div class="w-1/2 flex justify-end">
          <div
            v-if="isNeg"
            class="h-full transition-[width] duration-75"
            :style="barStyle"
          />
        </div>
        <div class="w-px h-full bg-slate-300" />
        <div class="w-1/2">
          <div
            v-if="!isNeg"
            class="h-full transition-[width] duration-75"
            :style="barStyle"
          />
        </div>
      </div>
    </template>
  </div>
</template>
