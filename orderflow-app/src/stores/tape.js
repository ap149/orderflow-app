import { defineStore } from 'pinia'
import { shallowRef, ref } from 'vue'

const MAX_TAPE = 75

export const useTapeStore = defineStore('tape', () => {
  const tape = shallowRef([])
  const filterPrice = ref(null)

  function push(tick) {
    if (!tick.vol || tick.vol === 0) return
    const next = [tick, ...tape.value]
    tape.value = next.length > MAX_TAPE ? next.slice(0, MAX_TAPE) : next
  }

  function clearFilter() {
    filterPrice.value = null
  }

  return { tape, filterPrice, push, clearFilter }
})
