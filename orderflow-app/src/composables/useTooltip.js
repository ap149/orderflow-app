import { reactive } from 'vue'

const state = reactive({ visible: false, x: 0, y: 0, tick: null })
let hideTimer = null

export function useTooltip() {
  function show(event, tick) {
    clearTimeout(hideTimer)
    state.tick = tick
    state.x = event.clientX
    state.y = event.clientY
    state.visible = true
  }

  function move(event) {
    if (state.visible) {
      state.x = event.clientX
      state.y = event.clientY
    }
  }

  function hide() {
    hideTimer = setTimeout(() => { state.visible = false }, 50)
  }

  return { state, show, move, hide }
}
