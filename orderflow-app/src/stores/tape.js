import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'

const MAX_TAPE = 75

export const useTapeStore = defineStore('tape', () => {
  const tape = shallowRef([])
  const filterPrice = ref(null)
  const latestTick = shallowRef(null)
  const lastTradedPx = shallowRef(null)

  function push(tick) {
    latestTick.value = tick
    if (!tick.vol || tick.vol === 0) return
    const enriched = { ...tick, ltp: lastTradedPx.value }
    lastTradedPx.value = tick.to_px
    const next = [enriched, ...tape.value]
    tape.value = next.length > MAX_TAPE ? next.slice(0, MAX_TAPE) : next
  }

  function clearFilter() {
    filterPrice.value = null
  }

  return { tape, filterPrice, latestTick, lastTradedPx, push, clearFilter }
})
