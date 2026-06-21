# Orderflow Visualizer V2

Rebuild of a legacy orderflow/footprint ladder tool. Legacy code in `_legacy/` — business logic reference only, never copy code.  
**Primary constraint:** stay responsive during fast NQ markets (legacy froze at high tick rates).

## Stack
- Vue 3 — Composition API, `<script setup>` always
- Tailwind CSS v4 — utility classes where sensible; `:style` for data-driven colours (JIT can't detect dynamic class names)
- Firebase RTDB v11 — NOT Firestore; live data at `priceFeed/{market}`, replay snapshots at `priceFeedReplay/{market}`
- Pinia — `storeToRefs` when destructuring reactive state in components
- vue-virtual-scroller — `RecycleScroller` for the ladder (20px item height)

## Architecture Invariants

**`shallowRef(new Map())` for the ladder** — `ref(new Map())` makes Vue proxy into Map values and break `row.active.value`. Never change this to `ref`.

**RAF batching** — Firebase `onChildAdded` events queue to a plain JS array; one `requestAnimationFrame` flushes to stores. Never trigger store updates directly from Firebase callbacks — this caps renders at ~60fps at 200+ ticks/sec.

**Inline styles, not classes, for colours** — Mixing `:class` background with `:style` background on the same element means `:style` always wins. If colour is data-driven, use `:style` for all backgrounds on that element; don't mix.

**Map keys always `.toFixed(2)`** — All price keys use `roundPx().toFixed(2)`. Prevents lookup failures on whole-number prices (`"7540"` vs `"7540.00"`).

**Row-level refs (`active`, `highlightTo`, `highlightFrom`)** — `applyTick` clears the previous row's ref and sets the new one. Do not infer these from `recentRank` — in fast markets multiple price moves per RAF batch mean `recentPrices[1]` diverges from the actual `from_px` of the last tick.

**`flushFilled()` must run unconditionally** — No early return when `_pendingFilled` is empty. `recentPrices` and `minStreamedPx`/`maxStreamedPx` also live there and must run every batch.

**`DataSnapshot.forEach` gotcha** — `Array.push` returns array length (truthy), which cancels iteration early. Always use a block body:
```js
snapshot.forEach(child => { raw.push(child.val()) })  // ✓
snapshot.forEach(child => raw.push(child.val()))       // ✗ stops after first item
```

**No `startAt()` on Firebase** — `orderByChild('utc').startAt(sessionStart)` fails because `utc` is nested inside `from`/`to`, not at record root. Use `limitToLast(2000)`.

**`LadderCell` flash guard** — Flash watch is on `[props.price, props.tick?.utc]`. Guard requires `newPrice === oldPrice && newUtc > oldUtc`. Without the price guard, RecycleScroller recycled cells flash falsely when assigned to a new price level.

**From-buffer entries rename fields** — `applyTick()` stores from-buffer ticks as `{ vol: from_vol, delta: from_delta, cum_vol: from_cum_vol, ... }`. Fields are renamed, not prefixed. Accessing `tick.from_cum_vol` on a from-buffer entry returns `undefined`; use `tick.cum_vol` instead.

## Data Contract

**Flat format** (produced by `normalizeTick()` in `useFirebaseFeed.js`):
```js
{
  from_px, to_px,
  vol,          // per-tick volume (to side)
  tick_delta,   // per-tick signed volume: vol × sign(chg) — same value for from and to
  delta,        // cumulative session delta at to_price (grows over session)
  cum_vol,      // cumulative session volume at to_price
  chg, utc,
  from_vol,     // per-tick volume (from side — same LTV as vol)
  from_delta,   // cumulative session delta at from_price
  from_cum_vol, // cumulative session volume at from_price
}
```
`normalizeTick()` handles both this format and the legacy `{ from: {...}, to: {...} }` format transparently.

**Delta bar scaling:** ladder from/to bars compute `tick_delta` buffer sums (sum of `vol×sign(chg)` across all 9 visible cells) scaled against `maxTotal`. `maxCumDelta` is reserved for potential future session-cumulative views.

## Market Params
`src/stores/market.js` — params are now runtime-configurable and persisted in Firebase.

**Structure:**
- `DEFAULT_MARKET_PARAMS` — hardcoded fallback values (never written to)
- `config` — reactive per-market object, loaded from Firebase on startup and updated on save
- `options` — reactive current-market view (synced from `config` on market switch and param update)

**Firebase path:** `marketConfig/{MARKET}/{key}` (e.g. `marketConfig/DAX/high`)  
Written per-field on commit; read once at startup via `loadConfig()` in `OrderflowView.onMounted`.

**`updateParam(market, key, value)`** — updates `config`, `options` (if current market), and writes to Firebase.  
**`loadConfig()`** — one-time `get()` from `marketConfig/`, deep-merges into `config` over defaults.

**Params exposed in UI:** `step`, `high`, `low`, `maxCell`, `maxTotal`, `maxVolume`, `baseChange`, `sessionHour`, `sessionMin`  
(`maxCumDelta` exists in store/data but is not surfaced in the settings panel.)  
`bufferSize` stays hardcoded — changing it affects the rendering pipeline structure.

`baseChange` — minimum meaningful price move per market (DAX=1, ES=0.25, NQ=1). Used to colour-grade the tape Δ Px and Δ LTP columns in multiples; exposed in the **Tape** section of RightPanel.

**Params that require `ladderStore.reset()` after change:** `step`, `high`, `low` (RightPanel handles this automatically).

## App Mode
Defaults to **replay mode** on launch. `[REPLAY] [LIVE]` toggle in header switches feeds.  
Replay: one-shot `get()` from `priceFeedReplay/{market}`, `limitToLast(2000)`, replays via `setTimeout` chain at 1×/2×/5×/10× speed.

## Right Panel (`src/components/RightPanel.vue`)
Always-visible panel on the far right of the main content area (beside the ladder). Two tabs:

- **Widgets** — placeholder for future ladder-derived widgets (empty)
- **Settings** — editable params for the currently selected market only

Settings tab layout: label + number input, grouped into Range / Thresholds / Session Start sections.  
Inputs commit on blur or Enter. Range params (`step`, `high`, `low`) automatically call `ladderStore.reset()` for the active market after commit.  
Panel reacts to market switches automatically via `computed(() => marketStore.selectedMarket.value)`.

**Firebase paths in use:**
- `priceFeed/{market}` — live tick stream (read-only)
- `priceFeedReplay/{market}` — replay snapshots (write via Capture button)
- `marketConfig/{MARKET}` — persistent market params (read on startup, write on param change)

## LadderRow Column Layout

Left → right across a row:

| Section | Element | Notes |
|---|---|---|
| FROM | 9× `LadderCell` | oldest→newest, left→right |
| FROM | Delta bar (`w-18`) | buffer sum of `tick_delta`, scaled vs `maxTotal` |
| FROM | Delta value label (`w-10`) | `fromDelta` text, teal-500 / rose-500, right-aligned |
| FROM | Volume value label (`w-10`) | `latestFrom.cum_vol` text, slate-500, left-aligned |
| FROM | Volume bar (`w-16`) | `fromVolumePct`, fills right-to-left toward price |
| — | Price label (`w-14`) | active row highlighted slate-700 |
| TO | Volume bar (`w-16`) | `toVolumePct`, fills left-to-right |
| TO | Volume value label (`w-12`) | `latestTo.cum_vol` text, slate-500, right-aligned |
| TO | Delta value label (`w-10`) | `toDelta` text, teal-500 / rose-500, left-aligned |
| TO | Delta bar (`w-18`) | buffer sum of `tick_delta`, scaled vs `maxTotal` |
| TO | 9× `LadderCell` | newest→oldest, left→right |

Delta labels show empty string when value is 0. Colour is flat (no gradient) — `text-teal-500`/`text-rose-500` only, not `useCellColor` intensity grades.

## Tape Panel (`src/components/TapePanel.vue` / `TapeRow.vue`)

Shows non-zero volume ticks, newest first, in a scrollable list. Column layout:

| Column | Width | Notes |
|---|---|---|
| Time | w-16 | HH:MM:SS |
| Price | w-16 | `to_px` |
| Vol | w-12 | volume, bg-colour coded via `getDeltaColor(tick, maxCell)` — same scale/colours as ladder cells |
| Δ Px | w-12 (commented out) | `to_px − from_px`, bg-colour coded via `getChgColor(priceChg, baseChange)` — currently hidden |
| Δ LTP | w-12 | `to_px − lastTradedPx`, same `getChgColor` colouring |

**`getChgColor(value, baseChange)`** in `src/composables/useCellColor.js` — grades intensity in multiples of `baseChange` up to 10×, same teal/rose palette as cells.

**Last Traded Price (LTP)** — tracked in `src/stores/tape.js`:
- `lastTradedPx = shallowRef(null)` — always holds the most recent `to_px` where `vol > 0`
- Each tape entry is enriched at push time: `{ ...tick, ltp: lastTradedPx.value }` (captured *before* updating `lastTradedPx`)
- Zero-vol ticks never update `lastTradedPx`; first tape entry has `ltp: null` (displays as `--`)
- `lastTradedPx` is exported from the store for use anywhere in the app

## WIP

See `todo.md` for upcoming work items.

## Snapshot Capture (`usePriceFeedCapture.js`)
Header has a **⬇ Capture** button that reads DAX/ES/NQ from `priceFeed/{market}` in parallel and writes each to `priceFeedReplay/{market}` using `set()`. Run this to update the replay dataset.  
**RTDB rules required:** `priceFeedReplay` must have `.write: true` in the Firebase console security rules; `priceFeed` should remain `.write: false`.

