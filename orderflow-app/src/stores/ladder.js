import { defineStore } from 'pinia'
import { shallowRef, ref, computed } from 'vue'
import { useMarketStore } from './market'

export const useLadderStore = defineStore('ladder', () => {
  const marketStore = useMarketStore()

  // shallowRef — Vue tracks the Map reference but does NOT proxy into its contents.
  // This prevents auto-unwrapping of the refs stored inside each row object.
  const ladder = shallowRef(new Map())
  const filledPrices = shallowRef([])
  const recentPrices = shallowRef([]) // last 5 active to_px values, newest first

  function buildRow() {
    const { bufferSize } = marketStore.options
    return {
      from: shallowRef(Array(bufferSize).fill(null)),
      to: shallowRef(Array(bufferSize).fill(null)),
      active: ref(false),
      highlightTo: ref(false),   // newest to-cell border on this row
      highlightFrom: ref(false), // newest from-cell border on this row
    }
  }

  let currentActivePx = null
  let currentHighlightToPx = null
  let currentHighlightFromPx = null
  const _filledSet = new Set()
  const _pendingFilled = []

  function reset() {
    const { high, low, step } = marketStore.options
    const newMap = new Map()
    for (let px = high; px >= low - step / 2; px -= step) {
      newMap.set(px.toFixed(2), buildRow())
    }
    ladder.value = newMap
    filledPrices.value = []
    recentPrices.value = []
    _filledSet.clear()
    _pendingFilled.length = 0
    currentActivePx = null
    currentHighlightToPx = null
    currentHighlightFromPx = null
  }

  function applyTick(tick) {
    const { from_px, to_px, vol, delta, cum_vol, chg, utc, from_vol, from_delta, from_cum_vol } =
      tick
    const map = ladder.value

    // Update the "to" buffer — where price arrived
    const toRow = map.get(to_px)
    if (toRow) {
      if (vol > 0) {
        const prev = toRow.to.value
        const next = [{ vol, delta, cum_vol, chg, utc }, ...prev.slice(0, prev.length - 1)]
        toRow.to.value = next

        // Move to-highlight to this row
        if (currentHighlightToPx !== to_px) {
          if (currentHighlightToPx) {
            const prev = map.get(currentHighlightToPx)
            if (prev) prev.highlightTo.value = false
          }
          toRow.highlightTo.value = true
          currentHighlightToPx = to_px
        }
      }
      _markFilled(to_px)
      // Track the single live price — clear old, set new
      if (currentActivePx !== to_px) {
        if (currentActivePx) {
          const prev = map.get(currentActivePx)
          if (prev) prev.active.value = false
        }
        toRow.active.value = true
        currentActivePx = to_px
      }
    }

    // Update the "from" buffer — where price came from
    const fromRow = map.get(from_px)
    if (fromRow && from_vol > 0) {
      const prev = fromRow.from.value
      const next = [
        ...prev.slice(1),
        { vol: from_vol, delta: from_delta, cum_vol: from_cum_vol, chg, utc },
      ]
      fromRow.from.value = next
      _markFilled(from_px)

      // Move from-highlight to this row
      if (currentHighlightFromPx !== from_px) {
        if (currentHighlightFromPx) {
          const prev = map.get(currentHighlightFromPx)
          if (prev) prev.highlightFrom.value = false
        }
        fromRow.highlightFrom.value = true
        currentHighlightFromPx = from_px
      }
    }
  }

  function _markFilled(px) {
    if (_filledSet.has(px)) return
    _filledSet.add(px)
    _pendingFilled.push(px)
  }

  // Call once after a batch of applyTick calls (end of each RAF flush).
  // Collects all new prices, sorts once, and triggers a single Vue update.
  function flushFilled() {
    if (_pendingFilled.length === 0) return
    const combined = filledPrices.value.concat(_pendingFilled)
    combined.sort((a, b) => parseFloat(b) - parseFloat(a))
    filledPrices.value = combined
    _pendingFilled.length = 0
    if (currentActivePx !== null && recentPrices.value[0] !== currentActivePx) {
      const filtered = recentPrices.value.filter((p) => p !== currentActivePx)
      recentPrices.value = [currentActivePx, ...filtered].slice(0, 5)
    }
  }

  // Rows to render — only filled prices, as objects with price + row data
  const filledRows = computed(() => {
    const recent = recentPrices.value
    return filledPrices.value.map((px) => ({
      price: px,
      ...ladder.value.get(px),
      recentRank: recent.indexOf(px), // 0=current active, 1=1 tick ago, -1=not recent
    }))
  })

  return { ladder, filledRows, filledPrices, recentPrices, reset, applyTick, flushFilled }
})
