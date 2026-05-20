# PhysiQ — Motion

Mobile-first inclinometer web app for measuring joint range of motion (ROM) using the phone's built-in sensors. Part of the [PhysiQ](https://physiodevapp.github.io) clinical toolkit.

**Live app:** https://physiodevapp.github.io/physiq-motion/

---

## Overview

PhysiQ Motion uses the browser's `DeviceOrientationEvent` (fused accelerometer + magnetometer) to measure angular displacement without any external hardware. The examiner holds the phone against the patient's body segment, calibrates neutral, and records peak displacement for each movement.

Results are classified against reference norms and can be exported directly to [PhysiQ Report](https://physiodevapp.github.io/physiq-report/).

## Features

- Measure up to 6 movements per session (flexion, extension, lateral flexion L/R, rotation L/R)
- Calibrate neutral position before each measurement
- Live degree readout during measurement
- Automatic deficit classification: Normal / Borderline / Deficit
- Summary table with all measured movements
- One-tap export to PhysiQ Report
- Works on any modern Android or iOS device (iOS 13+ requires a permission tap)
- No install, no account, no backend — runs entirely in the browser

## Sensor mapping

| Axis | Movement | Phone placement |
|------|----------|-----------------|
| `beta` | Flexion / Extension | Vertical, screen facing examiner, against forehead |
| `gamma` | Lateral flexion L/R | Vertical, screen facing examiner, against temple |
| `alpha` | Rotation L/R | Flat on top of head, screen facing up |

> **Note — rotation accuracy:** `alpha` is a compass heading (0–360°) and is sensitive to nearby metal surfaces and magnetic equipment. Always calibrate from neutral and keep the phone away from ferromagnetic objects.

## Deficit classification

| Status | Threshold |
|--------|-----------|
| Normal | ≥ 90% of reference |
| Borderline | 75 – 89% |
| Deficit | < 75% |

## Running locally

No build step, no package manager, no dependencies.

```bash
npx serve .
```

Then open the URL shown in the terminal on your phone (same Wi-Fi network required).

## Export format

Tapping **Export to PhysiQ Report** encodes the session as Base64 and opens PhysiQ Report with a `?rom=` query parameter:

```json
{
  "src": "physiq-motion",
  "patient": "...",
  "fecha": "DD/MM/YYYY",
  "rom": {
    "<movementId>": { "label": "...", "value": 45, "ref": 50, "deficit": false }
  }
}
```

## PhysiQ ecosystem

| App | URL | Role |
|-----|-----|------|
| PhysiQ Assessment | https://physiodevapp.github.io/physiq-assessment/ | 5-phase clinical assessment |
| PhysiQ Report | https://physiodevapp.github.io/physiq-report/ | Audio transcription + AI report generation |
| PhysiQ Motion | https://physiodevapp.github.io/physiq-motion/ | Joint ROM measurement |

## Deployment

Push to `main` — GitHub Pages deploys automatically.
