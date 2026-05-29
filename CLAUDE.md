# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

PhysiQ-Motion is a mobile-first inclinometer web app for measuring joint range of motion (ROM) using the phone's built-in accelerometer and magnetometer via `DeviceOrientationEvent`. It measures movements across any joint region and exports results to PhysiQ-Report.

**Deployment:** GitHub Pages — push to `main` deploys automatically.

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

## File Architecture

| File | Role |
|------|------|
| `index.html` | DOM structure + all embedded CSS |
| `app.js` | Sensor logic, state, measurement flow, UI updates, export |
| `lib/session.js` | Shared IDB session helpers (`openSessionDB`, `readSession`, `writeSession`, `clearSession`) |
| `favicon.svg` | Protractor/angle icon |

## Design System

Identical to `physiq-assessment` and `physiq-report`:

- **Fonts:** Outfit (body), DM Mono (labels/data), DM Serif Display (titles/logo)
- **Background:** `--bg: #0a0d12`, `--surface: #111620`, `--surface2: #171e2e`
- **Accent:** `--accent: #4f9cf9` (blue), `--accent2: #38d9a9` (green)
- **Header:** Fixed 64px, `backdrop-filter: blur(16px)`, `rgba(10,13,18,0.92)` bg
- **Cards:** `border-radius: 12px`, border `var(--border: #232d45)`
- **Bottom sheet:** Fixed overlay, `transform: translateY(100%) → translateY(0)` transition, same pattern as physiq-assessment's action sheet

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

7 regions defined in `REGIONS` (app.js:4). Each has `label`, `abbr`, `groups` (display grouping) and `movements` (keyed by movement ID):

| Region | Key | Movements |
|--------|-----|-----------|
| Cervical | `cervical` | flexion, extension, lat_izq, lat_der, rot_izq, rot_der |
| Hombro | `hombro` | flexion, rot_ext, rot_int |
| Codo | `codo` | flexion, extension, pronacion, supinacion |
| Muñeca | `muneca` | flexion, extension, desv_rad, desv_cub |
| Cadera | `cadera` | flex_supino, abd_supino, rot_ext_supino, rot_int_supino, rot_ext_sed, rot_int_sed |
| Rodilla | `rodilla` | extension, flexion, pkb |
| Tobillo | `tobillo` | dorsiflexion, plantarflexion |
| Lumbar | `lumbar` | flexion |

Each movement definition includes: `label`, `axis`, `phoneOrientation`, `ref` (reference value in degrees), `icon`, `instruction` (HTML), and optionally `measureType` (defaults to `'standard'`).

## Measurement Strategies

`STRATEGIES` (app.js:191) maps `measureType` to a full measurement lifecycle. Each strategy defines `steps`, `show` (which DOM elements are visible per phase), `onOpen`, `liveAngle`, and optionally `capture1`/`capture2` for two-segment types.

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
  measurements: {            // nested by region → movement → value (degrees) or null
    cervical: { flexion: null, extension: null, ... },
    hombro:   { flexion: null, rot_ext: null, rot_int: null },
    // ... all 8 regions
  },
  segmentData: {             // two-segment results: { seg1, seg2 } per movement, or null
    rodilla: { extension: null, flexion: null, pkb: null },
    lumbar:  { flexion: null },
    // ... mirrored structure for all regions
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

Reference values (`ref`) are defined per movement inside `REGIONS` (app.js:4), not as a separate table. Examples:

| Region | Movement | Reference |
|--------|----------|-----------|
| Cervical | Flexión / Extensión | 50° / 60° |
| Cervical | Lat. Izq/Der | 45° |
| Cervical | Rotación Izq/Der | 80° |
| Hombro | Flexión | 170° |
| Cadera | Flexión | 120° |
| Rodilla | Flexión | 135° |
| Tobillo | Dorsiflexión | 20° |

Deficit classification (shown in summary table and card badges):
- **Normal** (green): ≥ 90% of reference
- **Borderline** (orange): 75–89%
- **Deficit** (red): < 75%

Movements with `skipStatus: true` (rodilla extensión) show no badge — the value can be negative (hiperextensión).

## Session Persistence

IDB (`lib/session.js`) is the only persistence layer — no localStorage.

**IDB schema** — DB `'physiq'` v2, store `'session'`, key `'active'`:
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
- `openSessionDB()` — opens DB v2, creates `'session'` store on upgrade
- `readSession()` — reads `'active'`, returns null if expired (TTL 24h)
- `writeSession(patch)` — merge-writes into `'active'`, creates if absent
- `clearSession()` — deletes `'active'`

**Write triggers:**
- Patient name `input` → `scheduleIDBSync()` (debounced 800ms) → writes `{ patient, date, rom: buildROMPayload() }`
- `saveResult()` → `scheduleIDBSync()` — same patch, captures latest measurements
- `exportTo()` — also writes immediately before opening the destination app

**On startup:** `readSession()` silently fills the patient field and restores measurements from `session.rom.regions` into `state.measurements`, then re-renders the region grid. No prompt needed.

**Session chip** in the header (`#sessionChip`) shows `● patient · date [×]` when active. `[×]` triggers `promptClearSession()` which shows a `showConfirmBanner` modal, then clears IDB and resets all state and DOM.

## Export

`buildROMPayload()` — collects all regions with at least one measurement:
```js
{
  src: 'physiq-motion',
  patient: string,
  fecha: 'DD/MM/YYYY',
  regions: {
    [regionId]: { label, rom: { [movId]: { label, value, ref, deficit } } }
  }
}
```

`exportTo(destination)` — opens `physiq-assessment` or `physiq-report` and writes `{ patient, date, rom }` to IDB. The destination reads from IDB on startup. URL params (`?rom=`) are kept for backward compatibility but IDB is the primary handoff.

## Dialogs

All confirmations use `showConfirmBanner(title, text, actionLabel, onConfirm)` — never use the native `confirm()` or `alert()`.

## Sibling repos

| Repo | URL | Role |
|------|-----|------|
| physiq-assessment | https://physiodevapp.github.io/physiq-assessment/ | 5-phase clinical assessment; exports to physiq-report |
| physiq-report | https://physiodevapp.github.io/physiq-report/ | Audio transcription + Claude report generation |
