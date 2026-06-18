# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

PhysiQ-Motion is a mobile-first inclinometer web app for measuring joint range of motion (ROM) using the phone's built-in accelerometer and magnetometer via `DeviceOrientationEvent`. It measures movements across any joint region and shares results with the PhysiQ ecosystem via a shared IDB session.

**Deployment:** GitHub Pages — push to `main` deploys automatically. The hub (`physiodevapp.github.io/physiq/`) is the primary entry point; this app is also accessible standalone at its own Pages URL.

## Development

No build step, no package manager, no dependencies. Static HTML/CSS/JS.

Run locally:
```
npx serve .
```

No unit tests yet.

## Commit format

Always use this format when committing:

```
git commit -m "short imperative title" -m "description when needed"
```

- First `-m` is the title (max ~72 characters)
- Second `-m` is only included when there is relevant context to add
- Never use `git commit` without flags or interactive editors
- **Never add co-authorship** (`Co-authored-by`) under any circumstance

## Pull request format

- PR body: plain description only — no `🤖 Generated with Claude Code` line, no session URLs, no co-authorship footers

## File Architecture

| File | Role |
|------|------|
| `index.html` | DOM structure + all embedded CSS |
| `app.js` | Sensor logic, state, measurement flow, UI updates |
| `lib/session.js` | Shared IDB session helpers (`openSessionDB`, `readSession`, `writeSession`, `updateSession`, `clearSession`) |
| `favicon.svg` | Protractor/angle icon |

## Design System

Identical to `physiq-assessment` and `physiq-report`:

- **Fonts:** Outfit (body), DM Mono (labels/data), DM Serif Display (titles/logo)
- **Background:** `--bg: #0a0d12`, `--surface: #111620`, `--surface2: #171e2e`
- **Accent:** `--accent: #4f9cf9` (blue), `--accent2: #38d9a9` (green)
- **Header:** Fixed 64px, `backdrop-filter: blur(16px)`, `rgba(10,13,18,0.92)` bg
- **Cards:** `border-radius: 12px`, border `var(--border: #232d45)`
- **Bottom sheet:** Fixed overlay, `transform: translateY(100%) → translateY(0)` transition

## Sensor Architecture

Uses `DeviceOrientationEvent` + `DeviceMotionEvent`. Raw gravity vector (`grav.x/y/z`) comes from `accelerationIncludingGravity`; `sensor.beta` and `sensor.gamma` are **derived from the gravity vector** (not taken directly from `e.beta`/`e.gamma`). `sensor.alpha` is the raw compass heading from `DeviceOrientationEvent`.

**iOS 13+** requires `DeviceOrientationEvent.requestPermission()` triggered by a user gesture (button tap). Android grants automatically.

**Alpha wrap-around** — compass heading is 0–360°, so angular difference needs special handling:
```js
function angularDiff(a, b) {
  let d = a - b;
  while (d >  180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
```

**Magnetic interference warning** — alpha (compass) is sensitive to metal surfaces and equipment. Instructions prompt the examiner to calibrate from neutral and avoid magnetic sources nearby.

### Sensor-to-Anatomy Mapping (General Framework)

**Axis selection rule**
- Movement in a **sagittal or frontal** plane (vertical) → `axis: 'gravity'` or `axis: 'beta'` (gravity-based, reliable indoors)
- Movement in the **transverse** plane (axial rotation) → `axis: 'alpha'` (compass-based, requires `angularDiff()`, sensitive to magnetic interference)

**Phone placement → anatomical plane**

| Phone position | Screen direction | Active axis | Anatomical plane |
|----------------|-----------------|-------------|-----------------|
| Vertical on segment, portrait | Toward examiner | `gravity` / `beta` | Sagittal or Frontal |
| Flat on horizontal segment | Facing up | `alpha` | Transverse (axial rotation) |

**When adding a new body region:** always confirm with the user — patient position, which segment the phone is placed on, placement surface, and screen direction — then derive the axis from first principles. Do not assume from existing mappings.

## Regions

8 regions defined in `REGIONS` (app.js:4). Each has `label`, `abbr`, `groups` (display grouping) and `movements` (keyed by movement ID):

| Region | Key | Movements |
|--------|-----|-----------|
| Cervical | `cervical` | flexion, extension, lat *(bilateral)*, rot *(bilateral)* |
| Hombro | `hombro` | flexion, rot_ext, rot_int *(all bilateral)* |
| Codo | `codo` | flexion, extension, pronacion, supinacion *(all bilateral)* |
| Muñeca | `muneca` | flexion, extension, desv_rad, desv_cub *(all bilateral, solo activa)* |
| Cadera | `cadera` | flex_supino, abd_supino, rot_ext_supino, rot_int_supino, rot_ext_sed, rot_int_sed *(all bilateral)* |
| Rodilla | `rodilla` | extension, flexion, pkb *(all bilateral)* |
| Tobillo | `tobillo` | dorsiflexion, plantarflexion *(both bilateral)* |
| Lumbar | `lumbar` | flexion *(unilateral)* |

Each movement definition includes: `label`, `bilateral` (bool), `modes` (`['activa']` or `['activa','pasiva']`), `axis`, `phoneOrientation`, `ref` (reference value in degrees), `icon`, `instruction` (HTML), and optionally `measureType` (defaults to `'standard'`).

## Measurement Strategies

`STRATEGIES` (app.js) maps `measureType` to a full measurement lifecycle. Each strategy defines `steps`, `show` (which DOM elements are visible per phase), `onOpen`, `liveAngle`, and optionally `capture1`/`capture2` for two-segment types.

| `measureType` | Description | Used by |
|--------------|-------------|---------|
| `standard` | Calibrate neutral → measure peak delta | most movements |
| `gravity-vertical` | Auto-starts; measures angle from vertical | tobillo, rodilla PKB, codo prono/supinación |
| `beta-zero` | Auto-starts from a fixed `neutralAngle` | hombro, cadera rotaciones en sedestación |
| `two-segment-signed` | Capture thigh then leg; result = seg1 − seg2 (signed) | rodilla extensión |
| `two-segment-beta` | Capture thigh then leg via beta; result = 180 − seg1 − seg2 | rodilla flexión |
| `two-segment-vertical-signed` | Capture S1 then T12; result = T12 − S1 (signed) | lumbar flexión |

## State Schema

```js
const state = {
  regionId: null,            // string key in REGIONS, or null
  context: {
    side: 'izquierda',       // 'izquierda' | 'derecha'
    mode: 'activa'           // 'activa' | 'pasiva'
  },
  measurements: {            // nested by region → movement → bilateral/mode slots
    cervical: {
      flexion:   { centro:    { activa: null, pasiva: null } },
      lat:       { izquierda: { activa: null, pasiva: null }, derecha: { activa: null, pasiva: null } },
      // ...
    },
    // ... all 8 regions, each slot matches { bilateral, modes } from REGIONS definition
  },
  segmentData: {             // same slot structure as measurements; values are { seg1, seg2 } or null
    rodilla: { extension: { ... }, flexion: { ... }, pkb: { ... } },
    lumbar:  { flexion: { centro: { activa: null, pasiva: null } } },
  },
  active: {
    movementId: null,        // string key in current region's movements, or null
    phase: 'idle',           // 'idle' | 'measuring' | 'seg1' | 'done'
    neutralRef: null,        // sensor[axis] value at calibrated neutral
    gravRef: null,           // normalized gravity vector at neutral (for axis:'gravity')
    peakDelta: 0,            // maximum angular delta seen during measurement
    result: null,            // final result in degrees
    seg1Value: null          // first segment capture (two-segment types only)
  }
};

const sensor = { alpha: 0, beta: 0, gamma: 0 }; // beta/gamma derived from grav vector
const grav   = { x: 0, y: 0, z: 0 };            // raw accelerationIncludingGravity
```

**Slot helpers:**
- `effectiveSide(def)` → `def.bilateral ? state.context.side : 'centro'`
- `effectiveMode(def)` → mode from context, falling back to `def.modes[0]`
- `countSlots(regionId)` → `{ done, total }` counting all non-null slots
- `hasAnySlot(regionId)` → true if any slot ≠ null

## Measurement State Machine

**Standard / gravity-vertical / beta-zero strategies:**
```
idle ──[calibrateNeutral() or auto-start]──► measuring ──[stopMeasurement()]──► done
  ▲                                                                               │
  └─────────────────────────[redoMeasurement()]──────────────────────────────────┘
                                                                done ──[saveResult()]──► card updated, overlay closes
```

**Two-segment strategies (two-segment-*):**
```
idle ──[captureSegment1()]──► seg1 ──[captureSegment2()]──► done
  ▲                                                           │
  └──────────────[redoMeasurement()]─────────────────────────┘
                                          done ──[saveResult()]──► card updated, overlay closes
```

## Reference Values

Reference values (`ref`) are defined per movement inside `REGIONS`. Deficit classification:
- **Normal** (green): ≥ 90% of reference
- **Borderline** (orange): 75–89%
- **Deficit** (red): < 75%

Movements with `skipStatus: true` (rodilla extensión) show no badge — the value can be negative (hiperextensión).

## Session Persistence

IDB (`lib/session.js`) is the only persistence layer — no localStorage.

**IDB schema** — DB `'physiq'` v3, store `'session'`, key `'active'`:
```js
{
  sessionId:  timestamp,
  patient:    string,
  date:       string,
  createdAt:  timestamp,
  updatedAt:  timestamp,
  rom:        payload | null,       // ROM payload (all measured regions)
  assessment: payload | null,       // written by physiq-assessment on export
}
```

**Session helpers** (`lib/session.js` — same contract in every physiq repo):
- `openSessionDB()` — opens DB v3, creates `'session'` store on upgrade
- `readSession()` — reads `'active'`, returns null if expired (TTL 24h)
- `writeSession(patch)` — merge-writes into `'active'`, **creates if absent**
- `updateSession(patch)` — atomic read-modify-write; **returns null if no session exists** (never creates one)
- `clearSession()` — deletes `'active'`

**Write triggers:**
- Patient name `input` → `scheduleIDBSync()` (debounced 800ms) → writes `{ patient, date, rom: buildROMPayload() }`
- `saveResult()` → `scheduleIDBSync()` — same patch
- Optimistic UI update: `saveResult()` also calls `updateSessionChip()` immediately (before the debounced IDB write) using in-memory data

**Ghost-write protection** — `scheduleIDBSync` uses two guards to prevent a stale `writeSession` from recreating a deleted session:
- `_sessionGen` (integer) — incremented on every clear. The gen value is captured before the async `writeSession` call; if `_sessionGen !== gen` when the promise resolves, `clearSession()` is called to undo the stale write.
- `_sessionCleared` (boolean) — set `true` synchronously on clear; blocks new writes from starting until genuine new session data appears (patient name or measurements), at which point it resets to `false`.

**On startup:** `readSession()` silently fills the patient field and restores measurements from `session.rom` into `state.measurements`, then re-renders the region grid.

**Session button** in the header (`#sessionBtn`) is a person-silhouette SVG icon, shown with `.active` class when a session is active. Clicking it calls `promptClearSession()` → `showConfirmBanner` → clears IDB and resets all state and DOM.

## BroadcastChannel protocol

All satellites use `const _sessionCh = new BroadcastChannel('physiq-session')`.

Messages emitted by physiq-motion:

| Type | When | Payload |
|------|------|---------|
| `SESSION_PATIENT` | after each IDB write or reset | `{ patient: string }` |
| `SESSION_ROM` | after each IDB write (`scheduleIDBSync`) or `resetAll()` | `{ rom: object \| null }` |
| `SESSION_CLEAR` | after `promptClearSession()` full clear | — |

## ROM Payload schema

`buildROMPayload()` — collects all regions with at least one measured slot:
```js
{
  src: 'physiq-motion',
  patient: string,
  fecha: 'DD/MM/YYYY',
  regions: {
    [regionId]: {
      label,
      rom: {
        [movId]: {
          label, ref,
          bilateral: boolean,
          modes: string[],
          slots: {
            izquierda: { activa: { value, deficit } | null, pasiva: ... },
            derecha:   { ... },
            // or: centro: { activa: ..., pasiva: ... }  (for unilateral movements)
          }
        }
      }
    }
  }
}
```

In physiq-report, always access `mov.slots[side][mode]`. Check `mov.bilateral` before iterating sides.

## Resets

- **`resetAll()`** — clears only the active region's measurements; emits `SESSION_ROM: null`. Does not touch patient or full session.
- **`promptSoftResetMotion()`** — clears all measurements and patient name; emits `SESSION_ROM: null` + `SESSION_PATIENT: ''`. Leaves IDB intact for other satellites.
- **`promptClearSession()`** — full clear: `clearSession()` + emits `SESSION_ROM: null` + `SESSION_CLEAR`.

## Hub integration

physiq-motion runs inside an iframe in the PhysiQ hub (`physiodevapp.github.io/physiq/`). On load:

```js
if (window.self !== window.top) {
  document.body.classList.add('in-hub');
  document.querySelector('.logo-main').addEventListener('click', () => {
    window.parent.postMessage({ type: 'PHYSIQ_GO_HOME' }, '*');
  });
}
```

CSS `.in-hub .logo-main` adds a `‹` back-arrow hint. When running in-hub, clicking the logo navigates back to the hub home.

`showConfirmBanner` sends `{ type: 'PHYSIQ_WIDGET_HIDE' }` to the parent when opening and `{ type: 'PHYSIQ_WIDGET_SHOW' }` when closing, so the hub recorder widget is hidden during modals.

Navigation between satellites is the hub's responsibility — physiq-motion does not call `window.open` to launch other satellites.

## Dialogs

All confirmations use `showConfirmBanner(title, text, actionLabel, onConfirm)` — never use the native `confirm()` or `alert()`.

## Sibling repos

The hub at `physiodevapp.github.io/physiq/` is the primary entry point for the ecosystem.

| Repo | Hub path | Role |
|------|----------|------|
| physiq-assessment | /physiq/assessment/ | 5-phase clinical assessment |
| physiq-report | /physiq/report/ | Audio transcription + Claude report generation |
