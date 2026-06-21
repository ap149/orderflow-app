import { ref } from 'vue'
import { database } from '../firebase'
import { ref as dbRef, query, limitToLast, get, set } from 'firebase/database'

const MARKETS = ['dax', 'es', 'nq']
const LIMIT = 4000

export function usePriceFeedCapture() {
  const status = ref('idle') // idle | capturing | done | error

  async function captureAll() {
    status.value = 'capturing'
    try {
      await Promise.all(MARKETS.map(captureMarket))
      status.value = 'done'
    } catch {
      status.value = 'error'
    }
  }

  async function captureMarket(market) {
    const q = query(dbRef(database, `priceFeed/${market}`), limitToLast(LIMIT))
    const snapshot = await get(q)
    if (!snapshot.exists()) return
    await set(dbRef(database, `priceFeedReplay/${market}`), snapshot.val())
  }

  return { captureAll, status }
}
