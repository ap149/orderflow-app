# Orderflow Visualizer V2

## Goal
Rebuild a legacy orderflow/footprint ladder trading tool from scratch.
The legacy app is in `_legacy/` — read it for business logic only, do not copy code.
Data is streamed from a Python backend in `_backend/` via Firebase RTDB.

Primary constraint: stay responsive during fast NQ markets (legacy froze at high tick rates).

## Tech Stack
- Vue 3 — Composition API, `<script setup>` always
- Tailwind CSS v4 — utility classes where sensible; use inline styles for dynamic data-driven colours
- Firebase Realtime Database (RTDB) v11 — NOT Firestore
- Pinia — global state; `storeToRefs` when destructuring in components
- vue-virtual-scroller — `RecycleScroller` for the ladder

## What Has Been Built

### Stores (`src/stores/`)
- `market.js` — `useMarketStore`: market selection, per-market params (DAX/ES/NQ), `options` reactive object, `getSessionStart()`, `roundPx()`
- `ladder.js` — `useLadderStore`: price ladder as `shallowRef(new Map())`, `applyTick()`, `reset()`, `flushFilled()`, `filledRows` computed
- `tape.js` — `useTapeStore`: rolling 75-entry tape of non-zero-volume prints

### Composables (`src/composables/`)
- `useFirebaseFeed.js` — Firebase subscription with `limitToLast(2000)`, RAF-batch flush (decouples Firebase event rate from Vue render rate), legacy format normaliser. Calls `ladderStore.flushFilled()` after each batch. `normalizeTick()` is a named export so it can be shared.
- `useReplayFeed.js` — Replay mode: one-shot `get()` snapshot from `priceFeed/{market}`, normalises and sorts ticks by UTC, then replays via `setTimeout` chain at real-time pace (speed 1×/2×/5×/10×, max inter-tick gap capped at 2000ms). Exports: `load(market)`, `play()`, `pause()`, `reset()`, `setSpeed(s)`, `status`, `progress`, `speed`.
- `useCellColor.js` — pure colour derivation functions returning inline style objects: `getDeltaColor` → `{ backgroundColor, color }`, `getBarColor` → `{ backgroundColor }`, `cellLabel` → string

### Components (`src/components/`)
- `LadderPanel.vue` — `RecycleScroller` over `filledRows`, 20px item height
- `LadderRow.vue` — one price level: vol bar | from cells | from delta bar | price | to delta bar | to cells
- `LadderCell.vue` — single tick cell; uses `:style` (not `:class`) for colour; `border-slate-200` between cells; supports `flash` and `highlight` props (see Flash/Highlight section below)
- `DeltaBar.vue` — horizontal progress bar, `mode: 'delta'|'volume'`; single `barStyle` computed merges colour + width
- `TapePanel.vue` — scrollable tape list with optional price filter; uses `storeToRefs`; keyed by `tick.utc` so new entries get fresh DOM nodes
- `TapeRow.vue` — one tape entry; CSS `tapeNewEntry` animation plays once on DOM creation (amber flash, 0.8s)
- `MarketSelector.vue` — DAX / ES / NQ switcher

### Views & routing
- `src/views/OrderflowView.vue` — layout: header | tape (LHS, 56px) | ladder (flex-1); hosts both live and replay feeds with mode toggle
- `src/router/index.js` — `/` → `/orderflow`

## Key Architecture Decisions

### shallowRef(new Map()) for the ladder
`ref(new Map())` makes Vue proxy into Map values and auto-unwrap nested refs — breaks `row.active.value`. Use `shallowRef` so Vue tracks only the Map reference, leaving row-level refs intact.

### RAF batching in useFirebaseFeed
All Firebase `onChildAdded` events push to a plain JS array. A single `requestAnimationFrame` flushes the batch to stores. At 200+ ticks/sec (NQ), this caps Vue renders at ~60fps instead of triggering on every event.

### flushFilled() — single sort per RAF batch
`_markFilled` inside `applyTick` uses a `Set` (`_filledSet`) for O(1) dedup and pushes new prices to `_pendingFilled`. At the end of each RAF `flush()`, `flushFilled()` does one `.sort()` and one `filledPrices.value =` assignment. This drops initial load from O(n² log n) to O(n log n).

### LadderRow is independently reactive
LadderRow reads `from.value`, `to.value`, `active.value` (ShallowRef/Ref) directly in its template. Vue tracks these per-component — only the 1–2 rows that received a tick re-render per frame. No `v-memo` needed (and would be harmful).

### Inline styles for data-driven colours
`useCellColor.js` returns style objects (`{ backgroundColor: 'rgba(...)', color }`) rather than Tailwind class strings. Tailwind v4 JIT cannot detect dynamically constructed class names. Alpha range: `0.2 + grade * 0.08` (grade 0 = 20%, grade 10 = 100%).

### Active price tracking
`currentActivePx` (store-level variable) tracks the single highlighted row. `reset()` clears it to `null` to prevent stale cross-market highlights. Only `to_px` ever gets `active = true`; the previous price is cleared before setting the new one.

### Consistent Map key format
All price keys in the ladder Map use `.toFixed(2)` strings. `normalizeTick()` uses `marketStore.roundPx()` for both legacy and flat formats — prevents lookup failures on whole-number prices (e.g. `"7540"` vs `"7540.00"`).

### No startAt() time filter
The legacy `orderByChild('utc').startAt(sessionStart)` fails because `utc` is nested inside `from`/`to`, not at the root of each RTDB record. We use `limitToLast(2000)` instead — no index required, works with legacy and new data formats.

### Flash & highlight on cells and tape (added session 2)

#### LadderCell flash
`LadderCell` accepts `flash: Boolean` and `highlight: Boolean` props.
- `flash` — only set to `true` on the newest cell of each buffer: `to[0]` (leftmost to-cell) and `from[bufferSize-1]` (rightmost from-cell). On each tick update, a white overlay `<div>` is remounted via `:key="flashCount"` which replays the CSS keyframe. Watch guards: `newUtc > oldUtc` — prevents RecycleScroller recycled cells (which get older data) from flashing falsely.
- `highlight` — renders a `box-shadow: inset 0 0 0 1.5px rgba(51,65,85,0.65)` ring on the cell. Controlled by `highlightTo.value` / `highlightFrom.value` refs on the row (see below).

#### Row-level highlight refs (same pattern as `active`)
Each ladder row object now has two extra refs:
```js
{ from, to, active, highlightTo: ref(false), highlightFrom: ref(false) }
```
`applyTick` clears the previous row's ref and sets the new one — exactly like `active`. This means:
- `highlightTo` is `true` on the row whose `to[0]` cell last received a non-zero-vol tick (the current `to_px`)
- `highlightFrom` is `true` on the row whose `from[bufferSize-1]` cell last received `from_vol > 0` data (the last `from_px`)

Do NOT use `recentRank` to infer which row gets the border — in fast markets multiple price moves happen per RAF batch, so `recentPrices[1]` diverges from the actual `from_px` of the last tick. The ref approach is always accurate.

`currentHighlightToPx` and `currentHighlightFromPx` are store-level variables (plain JS, not reactive), cleared in `reset()`.

#### Recent price trail
`recentPrices: shallowRef([])` tracks the last 5 active `to_px` values (newest first). Updated once per RAF batch in `flushFilled()` when `currentActivePx` changes. `filledRows` computed adds `recentRank` (0=current, 1=1 tick ago, …, -1=not recent). `LadderRow` applies a fading `rgba(100,116,139, α)` background for ranks 1–4 (alphas: 0.22 / 0.11 / 0.055 / 0.025) to create a subtle price trail. The active row (rank 0) uses the existing `bg-slate-100` class.

#### Tape row flash
`TapePanel` keys by `tick.utc ?? i` instead of `i`. A new tick → new DOM node → CSS `tapeNewEntry` animation plays once on mount (amber, 0.8s, no JS involved). Existing rows are never re-animated as their keys (utc values) are stable.

## Data Contract (Firebase RTDB)

### New flat format (target — requires backend change)
```js
{
  from_px: 30592.25,   // price level moved FROM
  to_px:   30592.0,    // price level moved TO (current)
  vol:     13,         // volume at this tick
  delta:   8,          // net directional (+ = buying, - = selling)
  cum_vol: 213,        // cumulative volume at to_px this session
  chg:    -0.25,       // price change (to_px - from_px)
  utc:     1781870421116,
  from_vol:     0,     // volume at from_px when it was current
  from_delta:  -1,
  from_cum_vol: 1
}
```

### Legacy format (currently live — normalised in useFirebaseFeed)
```js
{ from: { price, volume, total_volume, delta, utc, chg },
  to:   { price, volume, total_volume, delta, utc, chg } }
```
`normalizeTick()` in `useFirebaseFeed.js` handles both formats transparently.

## Market Params (`src/stores/market.js`)
Update `high`/`low` ranges when markets move significantly outside them.
Current config: DAX 24200–25600, ES 7500–7600, NQ 30000–31000, all at 0.25 step.

## Replay Mode (added session 3)

App defaults to **replay mode** on launch. A `[REPLAY] [LIVE]` toggle in the header switches feeds.

### Architecture
- `mode` ref (`'replay' | 'live'`) in `OrderflowView.vue` controls which feed is active
- Switching modes: pauses/unsubscribes the outgoing feed, then calls `load()` or `subscribe()` for the new one
- Market selector calls `replayFeed.load(market)` in replay mode, `liveFeed.subscribe(market)` in live mode

### Replay controls (header, visible in replay mode)
- `▶ Play` — enabled when status is `loaded` or `paused`
- `⏸ Pause` — enabled when status is `playing`
- `↺ Reset` — re-applies `ladderStore.reset()` and rewinds to tick 0
- Speed: `1× 2× 5× 10×` — changes `setTimeout` delay in real time (no restart needed)
- Progress: `N / total ticks` counter

### Key implementation note
`DataSnapshot.forEach(callback)` cancels iteration if the callback returns a truthy value. `Array.push` returns the new array length (truthy), so always use a block body: `snapshot.forEach(child => { raw.push(child.val()) })` — NOT `snapshot.forEach(child => raw.push(child.val()))`.

### Data source
Replay reads from the same `priceFeed/{market}` Firebase paths as the live feed, using a one-shot `get()` with `limitToLast(2000)`. The Python backend writes each tick under `priceFeed/{market}/{utm}` (UTM = millisecond timestamp from IG). Records accumulate across a session; `limitToLast(2000)` caps at the most recent 2000.

## Known Issues / WIP (as of session 3)
- Flash on `LadderCell` still has some edge cases to revisit
- Border highlight appeared briefly on initial load then disappeared — may need further investigation when revisiting
