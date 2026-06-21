# Todo

## Frontend volume accumulation (deferred)

Currently `cum_vol` / `from_cum_vol` come from the backend (`igstream.py`), which accumulates them from 0 since the script started. The vol bars in `LadderRow.vue` read these directly.

If the backend is ever refactored to stop computing running totals, the frontend approach is:

- `ladder.js buildRow()` — add `cumulativeToVol: ref(0)` and `cumulativeFromVol: ref(0)` to each row
- `ladder.js applyTick()` — on each tick: `toRow.cumulativeToVol.value += vol` and `fromRow.cumulativeFromVol.value += from_vol`
- `LadderRow.vue` — replace `latestTo.value?.cum_vol` / `latestFrom.value?.cum_vol` with the row-level ref values passed as props
- Auto-resets to 0 on feed reconnect because `ladderStore.reset()` calls `buildRow()` which reinitialises the refs
