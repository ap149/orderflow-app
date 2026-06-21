import { onUnmounted, ref } from 'vue'
import { database } from '../firebase'
import { ref as dbRef, query, limitToLast, onChildAdded, off } from 'firebase/database'
import { useMarketStore } from '../stores/market'
import { useLadderStore } from '../stores/ladder'
import { useTapeStore } from '../stores/tape'

// How many recent ticks to load on connect — caps initial replay without needing a RTDB index
const INITIAL_LIMIT = 2000

export function useFirebaseFeed() {
  const marketStore = useMarketStore()
  const ladderStore = useLadderStore()
  const tapeStore = useTapeStore()

  const status = ref('idle') // 'idle' | 'connecting' | 'live' | 'error'
  const tickCount = ref(0)

  let listenerRef = null
  let pending = []
  let rafId = null

  function flush() {
    rafId = null
    const batch = pending
    pending = []
    for (const tick of batch) {
      ladderStore.applyTick(tick)
      tapeStore.push(tick)
      tickCount.value++
    }
    ladderStore.flushFilled()
    if (status.value !== 'live') status.value = 'live'
  }

  function subscribe(market) {
    unsubscribe()

    marketStore.setMarket(market)
    ladderStore.reset()
    tapeStore.tape.value = []
    tickCount.value = 0
    status.value = 'connecting'

    const feedPath = `priceFeed/${market.toLowerCase()}`
    listenerRef = query(dbRef(database, feedPath), limitToLast(INITIAL_LIMIT))

    onChildAdded(listenerRef, (snapshot) => {
      const raw = snapshot.val()
      const tick = normalizeTick(raw, marketStore)
      if (!tick) return
      pending.push(tick)
      rafId ??= requestAnimationFrame(flush)
    })
  }

  function unsubscribe() {
    if (listenerRef) {
      off(listenerRef)
      listenerRef = null
    }
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    pending = []
  }

  onUnmounted(unsubscribe)

  return { subscribe, unsubscribe, status, tickCount }
}

/**
 * Normalize a Firebase tick to the flat format the stores expect.
 * Supports both the new flat format and the legacy {from, to} format.
 */
export function normalizeTick(raw, marketStore) {
  if (!raw) return null

  // New flat format
  if (raw.to_px !== undefined) {
    const vol = raw.vol ?? 0
    const chg = raw.chg ?? 0
    return {
      from_px: marketStore.roundPx(raw.from_px),
      to_px: marketStore.roundPx(raw.to_px),
      vol,
      tick_delta: vol * Math.sign(chg),
      delta: raw.delta ?? 0,
      cum_vol: raw.cum_vol ?? 0,
      chg,
      utc: raw.utc ?? 0,
      from_vol: raw.from_vol ?? 0,
      from_delta: raw.from_delta ?? 0,
      from_cum_vol: raw.from_cum_vol ?? 0,
    }
  }

  // Legacy {from, to} format — translate on the fly during migration
  if (raw.from && raw.to) {
    const from_px = marketStore.roundPx(raw.from.price)
    const to_px = marketStore.roundPx(raw.to.price)
    const vol = raw.to.volume ?? 0
    const chg = raw.to.chg ?? 0
    return {
      from_px,
      to_px,
      vol,
      tick_delta: vol * Math.sign(chg),
      delta: raw.to.delta ?? 0,
      cum_vol: raw.to.total_volume ?? 0,
      chg,
      utc: Number(raw.to.utc ?? 0),
      from_vol: raw.from.volume ?? 0,
      from_delta: raw.from.delta ?? 0,
      from_cum_vol: raw.from.total_volume ?? 0,
    }
  }

  return null
}
