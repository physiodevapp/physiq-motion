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

Uses `DeviceOrientationEvent` (browser-fused accelerometer + magnetometer — no raw sensor access needed):

| Axis | Movement | Phone placement |
|------|-------------------|-----------------|
| `beta` | Flexion / Extension | Vertical, screen facing examiner, against forehead |
| `gamma` | Lateral flexion L/R | Vertical, screen facing examiner, against temple |
| `alpha` | Rotation L/R | **Flat on top of head, screen facing up** |

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

## State Schema

```js
const state = {
  measurements: {
    flexion:   null,  // number (degrees) or null
    extension: null,
    lat_izq:   null,
    lat_der:   null,
    rot_izq:   null,
    rot_der:   null
  },
  active: {
    movementId: null,     // string key in MOVEMENTS, or null
    phase: 'idle',        // 'idle' | 'calibrated' | 'measuring' | 'done'
    neutralRef: null,     // sensor[axis] value at neutral position
    peakDelta: 0,         // maximum angular delta seen during measurement
    result: null          // Math.round(peakDelta) saved when phase → 'done'
  }
};

const sensor = { alpha: 0, beta: 0, gamma: 0 }; // live readings from deviceorientation
```

## Measurement State Machine

```
idle ──[calibrateNeutral()]──► calibrated ──[startMeasurement()]──► measuring
  ▲                                │                                     │
  └──────────[redoMeasurement()]───┘           [stopMeasurement()]       │
                                                        ▼                │
                                                       done ─────────────┘
                                                        │
                                               [saveResult()] → card updated, overlay closes
```

## Reference Values (cervical ROM norms — current defaults)

| Movement | Reference |
|----------|-----------|
| Flexion | 50° |
| Extension | 60° |
| Lateral flexion L/R | 45° |
| Rotation L/R | 80° |

Deficit classification (shown in summary table and card badges):
- **Normal** (green): ≥ 90% of reference
- **Borderline** (orange): 75–89%
- **Deficit** (red): < 75%

## Export — Option A (implemented)

`exportToPhysiQReport()` encodes a payload as Base64 and opens PhysiQ-Report with `?rom=<base64>`:

```js
{
  src: 'physiq-motion',
  patient: string,
  fecha: 'DD/MM/YYYY',
  rom: {
    [movementId]: { label, value, ref, deficit }
  }
}
```

## Integration Roadmap — Option C (not yet implemented)

When Option C is implemented, no code in this repo needs to change. Changes are additive in the sibling repos:

- **physiq-report** (`app.js`): add `loadFromPhysiQROM()` to read `?rom=` param on startup, and extend `buildClinicalContext()` to render ROM data if `data.rom` is present.
- **physiq-assessment** (`app.js`): add `loadROMFromURL()` to read `?rom=` param and populate `state.rom`; include `rom` field in `buildPhysiQPayload()`.

## Sibling repos

| Repo | URL | Role |
|------|-----|------|
| physiq-assessment | https://physiodevapp.github.io/physiq-assessment/ | 5-phase clinical assessment; exports to physiq-report |
| physiq-report | https://physiodevapp.github.io/physiq-report/ | Audio transcription + Claude report generation |

## Pending

_No pending tasks._
