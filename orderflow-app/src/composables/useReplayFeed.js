import { onUnmounted, ref } from 'vue'
import { database } from '../firebase'
import { ref as dbRef, query, limitToLast, get } from 'firebase/database'
import { useMarketStore } from '../stores/market'
import { useLadderStore } from '../stores/ladder'
import { useTapeStore } from '../stores/tape'
import { normalizeTick } from './useFirebaseFeed'

const MAX_GAP_MS = 2000

export function useReplayFeed() {
  const marketStore = useMarketStore()
  const ladderStore = useLadderStore()
  const tapeStore = useTapeStore()

  const status = ref('idle')
  const progress = ref({ current: 0, total: 0 })
  const speed = ref(1)

  let ticks = []
  let tickIndex = 0
  let timeoutId = null

  async function load(market) {
    _stop()
    status.value = 'loading'
    progress.value = { current: 0, total: 0 }
    ticks = []
    tickIndex = 0

    marketStore.setMarket(market)
    ladderStore.reset()
    tapeStore.tape.value = []

    try {
      const q = query(dbRef(database, `priceFeedReplay/${market.toLowerCase()}`), limitToLast(4000))
      const snapshot = await get(q)
      if (!snapshot.exists()) { status.value = 'error'; return }

      const raw = []
      snapshot.forEach(child => { raw.push(child.val()) })
      ticks = raw
        .map(r => normalizeTick(r, marketStore))
        .filter(Boolean)
        .sort((a, b) => a.utc - b.utc)

      progress.value = { current: 0, total: ticks.length }
      status.value = 'loaded'
    } catch {
      status.value = 'error'
    }
  }

  function play() {
    if (status.value === 'playing') return
    if (tickIndex >= ticks.length) return
    status.value = 'playing'
    _scheduleNext()
  }

  function _scheduleNext() {
    if (tickIndex >= ticks.length) { status.value = 'done'; return }

    const tick = ticks[tickIndex]
    ladderStore.applyTick(tick)
    tapeStore.push(tick)
    ladderStore.flushFilled()
    tickIndex++
    progress.value = { current: tickIndex, total: ticks.length }

    if (tickIndex >= ticks.length) { status.value = 'done'; return }

    const delay = Math.min(ticks[tickIndex].utc - tick.utc, MAX_GAP_MS) / speed.value
    timeoutId = setTimeout(_scheduleNext, delay)
  }

  function pause() {
    if (status.value !== 'playing') return
    _stop()
    status.value = 'paused'
  }

  function reset() {
    _stop()
    tickIndex = 0
    ladderStore.reset()
    tapeStore.tape.value = []
    progress.value = { current: 0, total: ticks.length }
    status.value = ticks.length > 0 ? 'loaded' : 'idle'
  }

  function setSpeed(s) { speed.value = s }

  function _stop() {
    clearTimeout(timeoutId)
    timeoutId = null
  }

  onUnmounted(_stop)

  return { load, play, pause, reset, setSpeed, status, progress, speed }
}
