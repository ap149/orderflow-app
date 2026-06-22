<script setup>
import { computed, ref, watch } from 'vue'
import { getDeltaColor, cellLabel } from '../composables/useCellColor'
import { useTooltip } from '../composables/useTooltip'

const tooltip = useTooltip()

const props = defineProps({
  tick: { type: Object, default: null }, // { vol, delta, cum_vol, chg, utc } or null
  maxCell: { type: Number, required: true },
  price: { type: String, default: '' }, // row's price key — used to detect RecycleScroller recycling
  flash: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false },
})

const label = computed(() => cellLabel(props.tick))

const cellStyle = computed(() => ({
  ...getDeltaColor(props.tick, props.maxCell),
  ...(props.highlight && props.tick != null
    ? { boxShadow: 'inset 0 0 0 1.5px rgba(51, 65, 85, 0.65)' }
    : {}),
}))

// Flash only when a genuinely newer tick arrives on the same price row.
// Guards against RecycleScroller recycling this cell to a different row (price changes)
// or replaying older data (newUtc < oldUtc).
const flashCount = ref(0)
watch(
  () => [props.price, props.tick?.utc],
  ([newPrice, newUtc], [oldPrice, oldUtc]) => {
    if (props.flash && newPrice === oldPrice && newUtc != null && oldUtc != null && newUtc > oldUtc) {
      flashCount.value++
    }
  },
)
</script>

<template>
  <div
    class="relative w-10 shrink-0 h-full flex items-center justify-end pr-1 text-[10px] leading-none border-l border-slate-200 select-none overflow-hidden"
    :style="cellStyle"
    @mouseenter="tick && tooltip.show($event, tick)"
    @mousemove="tooltip.move($event)"
    @mouseleave="tooltip.hide()"
  >
    {{ label }}
    <div v-if="flash && flashCount > 0" :key="flashCount" class="cell-flash" />
  </div>
</template>

<style scoped>
.cell-flash {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.75);
  animation: cellFlashFade 0.45s ease-out forwards;
  pointer-events: none;
}

@keyframes cellFlashFade {
  from { opacity: 1; }
  to   { opacity: 0; }
}
</style>
