const COLORS = {
  teal:  '20,184,166',
  rose:  '244,63,94',
  stone: '120,113,108',
}

function intensityToGrade(absVal, max) {
  const ratio = absVal >= max ? 1 : absVal / max
  return Math.round(ratio * 10)
}

function gradeToStyle(color, grade) {
  const alpha = Math.min(1, 0.15 + grade * 0.08).toFixed(2)
  return {
    backgroundColor: `rgba(${COLORS[color]},${alpha})`,
    color: grade > 4 ? '#fff' : 'inherit',
  }
}

/**
 * Returns an inline style object { backgroundColor, color } for a ladder cell.
 */
export function getDeltaColor(tick, maxCell) {
  if (!tick || tick.vol === undefined || tick.vol === 0) return {}
  const { vol, chg } = tick
  if (chg === 0) return gradeToStyle('stone', intensityToGrade(vol, maxCell))
  const signedDelta = chg > 0 ? vol : -vol
  const grade = intensityToGrade(Math.abs(signedDelta), maxCell)
  return gradeToStyle(signedDelta > 0 ? 'teal' : 'rose', grade)
}

/**
 * Returns an inline style object { backgroundColor } for a delta/volume bar fill.
 */
export function getBarColor(value, max) {
  if (value === 0) return {}
  const grade = intensityToGrade(Math.abs(value), max)
  const color = value > 0 ? 'teal' : 'rose'
  return { backgroundColor: `rgba(${COLORS[color]},${(grade * 0.09).toFixed(2)})` }
}

/**
 * Returns an inline style object for tape Chg column, scaled in multiples of baseChange (max 8×).
 */
export function getChgColor(priceChg, baseChange) {
  if (!priceChg || !baseChange) return {}
  const multiples = Math.abs(priceChg) / baseChange
  const grade = intensityToGrade(multiples, 10)
  return gradeToStyle(priceChg > 0 ? 'teal' : 'rose', grade)
}

/**
 * Formatted display value for a cell: "=vol" flat, "vol" buy, "-vol" sell, "" empty
 */
export function cellLabel(tick) {
  if (!tick || tick.vol === undefined || tick.vol === 0) return ''
  const { vol, chg } = tick
  if (chg === 0) return `=${vol}`
  return chg > 0 ? `${vol}` : `-${vol}`
}
