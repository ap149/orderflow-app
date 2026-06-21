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
      vol: ref(0),
      fromVol: ref(0),
      active: ref(false),
      highlightTo: ref(false),   // newest to-cell border on this row
      highlightFrom: ref(false), // newest from-cell border on this row
    }
  }

  let currentActivePx = null
  let currentHighlightToPx = null
  let currentHighlightFromPx = null
  let currentVol = null
  const _filledSet = new Set()
  const _pendingFilled = []

  // Dynamic range: min/max of streamed to_px values ± BUFFER_POINTS
  const BUFFER_POINTS = 10
  const minStreamedPx = shallowRef(null) // numeric float
  const maxStreamedPx = shallowRef(null) // numeric float
  let _pendingMin = null // per-batch accumulator, reset in flushFilled
  let _pendingMax = null

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
    currentVol = 0
    minStreamedPx.value = null
    maxStreamedPx.value = null
    _pendingMin = null
    _pendingMax = null
  }

  function applyTick(tick) {
    const { from_px, to_px, vol, tick_delta, delta, cum_vol, chg, utc, from_vol, from_delta, from_cum_vol } =
      tick
    const map = ladder.value
    currentVol = vol

    // Track streaming price range (numeric; flushed to refs once per RAF batch)
    const toVal = parseFloat(to_px)
    if (_pendingMin === null || toVal < _pendingMin) _pendingMin = toVal
    if (_pendingMax === null || toVal > _pendingMax) _pendingMax = toVal

    // Update the "to" buffer — where price arrived
    const toRow = map.get(to_px)
    if (toRow) {
      if (vol > 0) {
        const prev = toRow.to.value
        const next = [{ vol, tick_delta, delta, cum_vol, chg, utc }, ...prev.slice(0, prev.length - 1)]
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
        { vol: from_vol, tick_delta, delta: from_delta, cum_vol: from_cum_vol, chg, utc },
      ]
      fromRow.from.value = next
      fromRow.fromVol.value = from_vol
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
  function flushFilled() {
    if (_pendingFilled.length > 0) {
      const combined = filledPrices.value.concat(_pendingFilled)
      combined.sort((a, b) => parseFloat(b) - parseFloat(a))
      filledPrices.value = combined
      _pendingFilled.length = 0
    }

    if (_pendingMin !== null) {
      const newMin = minStreamedPx.value === null ? _pendingMin : Math.min(minStreamedPx.value, _pendingMin)
      const newMax = maxStreamedPx.value === null ? _pendingMax : Math.max(maxStreamedPx.value, _pendingMax)
      if (newMin !== minStreamedPx.value) minStreamedPx.value = newMin
      if (newMax !== maxStreamedPx.value) maxStreamedPx.value = newMax
      _pendingMin = null
      _pendingMax = null
    }

    // if (currentVol > 0){
      if (currentActivePx !== null && recentPrices.value[0] !== currentActivePx ) {
        const filtered = recentPrices.value.filter((p) => p !== currentActivePx > 0)
        recentPrices.value = [currentActivePx, ...filtered].slice(0, 5)
      }
    // }
  }

  // Rows to render — continuous range from maxStreamed+10 down to minStreamed-10
  const filledRows = computed(() => {
    const minPx = minStreamedPx.value
    const maxPx = maxStreamedPx.value
    if (minPx === null || maxPx === null) return []

    const { step } = marketStore.options
    const lo = minPx - BUFFER_POINTS
    const hi = maxPx + BUFFER_POINTS
    const map = ladder.value
    const recent = recentPrices.value

    // Integer steps to avoid float drift (step=0.25 → stepsPerUnit=4)
    const stepsPerUnit = Math.round(1 / step)
    const loStep = Math.round(lo * stepsPerUnit)
    const hiStep = Math.round(hi * stepsPerUnit)

    const rows = []
    for (let s = hiStep; s >= loStep; s--) {
      const key = (s / stepsPerUnit).toFixed(2)
      const row = map.get(key)
      if (!row) continue // outside pre-built market range — skip
      rows.push({ price: key, ...row, recentRank: recent.indexOf(key) })
    }
    return rows
  })

  return { ladder, filledRows, filledPrices, recentPrices, reset, applyTick, flushFilled }
})
