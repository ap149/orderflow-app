import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

const MARKET_PARAMS = {
  DAX: {
    step: 0.25,
    high: 25600,
    low: 24200,
    maxCell: 20,
    maxTotal: 50,
    maxVolume: 100,
    maxCumDelta: 200,
    sessionHour: 8,
    sessionMin: 0,
    bufferSize: 9,
  },
  ES: {
    step: 0.25,
    high: 7600,
    low: 7500,
    maxCell: 200,
    maxTotal: 400,
    maxVolume: 4000,
    maxCumDelta: 5000,
    sessionHour: 8,
    sessionMin: 30,
    bufferSize: 9,
  },
  NQ: {
    step: 0.25,
    high: 31000,
    low: 30000,
    maxCell: 200,
    maxTotal: 400,
    maxVolume: 4000,
    maxCumDelta: 5000,
    sessionHour: 8,
    sessionMin: 30,
    bufferSize: 9,
  },
}

export const useMarketStore = defineStore('market', () => {
  const selectedMarket = reactive({ value: 'DAX' })
  const options = reactive({ ...MARKET_PARAMS.DAX })

  const params = computed(() => MARKET_PARAMS[selectedMarket.value])

  function setMarket(market) {
    if (!MARKET_PARAMS[market] || market === selectedMarket.value) return
    selectedMarket.value = market
    Object.assign(options, MARKET_PARAMS[market])
  }

  function getSessionStart() {
    const today = new Date()
    today.setHours(options.sessionHour, options.sessionMin, 0, 0)
    return today.getTime()
  }

  function roundPx(px) {
    return (Math.round(px / options.step) * options.step).toFixed(2)
  }

  return { selectedMarket, options, params, setMarket, getSessionStart, roundPx, MARKET_PARAMS }
})
