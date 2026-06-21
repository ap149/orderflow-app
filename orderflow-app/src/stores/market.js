import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'
import { database } from '../firebase'
import { ref as dbRef, get, set } from 'firebase/database'

const DEFAULT_MARKET_PARAMS = {
  DAX: {
    step: 0.25,
    high: 25600,
    low: 24200,
    maxCell: 20,
    maxTotal: 50,
    maxVolume: 50,
    maxCumDelta: 50,
    baseChange: 1,
    sessionHour: 8,
    sessionMin: 0,
    bufferSize: 9,
  },
  ES: {
    step: 0.25,
    high: 7600,
    low: 7500,
    maxCell: 100,
    maxTotal: 50,
    maxVolume: 2000,
    maxCumDelta: 500,
    baseChange: 0.25,
    sessionHour: 8,
    sessionMin: 30,
    bufferSize: 9,
  },
  NQ: {
    step: 0.25,
    high: 31000,
    low: 30000,
    maxCell: 200,
    maxTotal: 50,
    maxVolume: 50,
    maxCumDelta: 50,
    baseChange: 1,
    sessionHour: 8,
    sessionMin: 30,
    bufferSize: 9,
  },
}

export const useMarketStore = defineStore('market', () => {
  const selectedMarket = reactive({ value: 'DAX' })

  const config = reactive({
    DAX: { ...DEFAULT_MARKET_PARAMS.DAX },
    ES: { ...DEFAULT_MARKET_PARAMS.ES },
    NQ: { ...DEFAULT_MARKET_PARAMS.NQ },
  })

  const options = reactive({ ...DEFAULT_MARKET_PARAMS.DAX })

  const params = computed(() => config[selectedMarket.value])

  async function loadConfig() {
    try {
      const snapshot = await get(dbRef(database, 'marketConfig'))
      if (!snapshot.exists()) return
      const remote = snapshot.val()
      for (const market of Object.keys(DEFAULT_MARKET_PARAMS)) {
        if (remote[market]) {
          Object.assign(config[market], remote[market])
        }
      }
      Object.assign(options, config[selectedMarket.value])
    } catch (e) {
      console.warn('Failed to load marketConfig from Firebase:', e)
    }
  }

  function setMarket(market) {
    if (!config[market] || market === selectedMarket.value) return
    selectedMarket.value = market
    Object.assign(options, config[market])
  }

  async function updateParam(market, key, value) {
    config[market][key] = value
    if (market === selectedMarket.value) options[key] = value
    try {
      await set(dbRef(database, `marketConfig/${market}/${key}`), value)
    } catch (e) {
      console.warn('Failed to write marketConfig to Firebase:', e)
    }
  }

  function getSessionStart() {
    const today = new Date()
    today.setHours(options.sessionHour, options.sessionMin, 0, 0)
    return today.getTime()
  }

  function roundPx(px) {
    return (Math.round(px / options.step) * options.step).toFixed(2)
  }

  return {
    selectedMarket,
    options,
    params,
    config,
    loadConfig,
    setMarket,
    updateParam,
    getSessionStart,
    roundPx,
    DEFAULT_MARKET_PARAMS,
  }
})
