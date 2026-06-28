# PhysiQ — Motion

Mobile-first inclinometer web app for measuring joint range of motion (ROM) using the phone's built-in sensors.

**Primary entry point: [PhysiQ Hub](https://physiodevapp.github.io/physiq/)** — installs as a single PWA covering all PhysiQ apps.

**Standalone: [→ Open app](https://physiodevapp.github.io/physiq-motion/)**

---

## Overview

PhysiQ Motion uses the browser's `DeviceOrientationEvent` (fused accelerometer + magnetometer) to measure angular displacement without any external hardware. The examiner holds the phone against the patient's body segment, calibrates neutral, and records peak displacement for each movement.

Results are classified against reference norms and shared with the rest of the PhysiQ ecosystem via a shared IndexedDB session.

## Features

- **8 anatomical regions:** cervical, hombro, codo, muñeca, cadera, rodilla, tobillo, lumbar
- **Bilateral tracking:** side-by-side Izquierda / Derecha slots for bilateral movements
- **Active and passive ROM:** separate slots per movement where clinically relevant
- Calibrate neutral position before each measurement
- Live degree readout during measurement
- Automatic deficit classification: Normal / Borderline / Deficit
- Asymmetry index chips for bilateral movements
- Global summary with all measured regions
- Copy measurements to clipboard (📋)
- Works on any modern Android or iOS device (iOS 13+ requires a permission tap)
- No install, no account, no backend — runs entirely in the browser

## Sensor mapping

Movements in the sagittal or frontal plane use the gravity vector (`axis: 'gravity'` or `'beta'`) — reliable indoors. Axial rotations use the compass heading (`axis: 'alpha'`) — sensitive to nearby metal and magnetic equipment; always calibrate from neutral.

| Axis | Anatomical plane | Example movements |
|------|-----------------|-------------------|
| `gravity` / `beta` | Sagittal or Frontal | Cervical flex/ext, shoulder flex, knee flex |
| `alpha` | Transverse (axial rotation) | Cervical rot, hip rot |

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

## Session & data sharing

Measurements and the patient name are saved to a shared IndexedDB session (`physiq` DB v3) as you work — no manual save required. A session button (person icon) in the header appears once a patient name is entered; clicking it clears the full session across all PhysiQ satellites.

The session is shared across the PhysiQ ecosystem via `BroadcastChannel('physiq-session')` and IDB. physiq-report picks up the ROM data in real time via BroadcastChannel; on startup it restores ROM data from IDB only if a patient name was entered in the prior session.

### ROM payload schema

```json
{
  "src": "physiq-motion",
  "patient": "...",
  "fecha": "DD/MM/YYYY",
  "regions": {
    "<regionId>": {
      "label": "...",
      "rom": {
        "<movementId>": {
          "label": "...", "ref": 50,
          "bilateral": true,
          "modes": ["activa", "pasiva"],
          "slots": {
            "izquierda": { "activa": { "value": 45, "deficit": false }, "pasiva": null },
            "derecha":   { "activa": { "value": 40, "deficit": true },  "pasiva": null }
          }
        }
      }
    }
  }
}
```

## PhysiQ ecosystem

| App | Role |
|-----|------|
| [PhysiQ Hub](https://physiodevapp.github.io/physiq/) | Single installable PWA, navigation shell, audio recorder |
| [PhysiQ Assessment](https://physiodevapp.github.io/physiq-assessment/) | 5-phase clinical assessment |
| [PhysiQ Report](https://physiodevapp.github.io/physiq-report/) | Audio transcription + AI report generation |
| [PhysiQ Motion](https://physiodevapp.github.io/physiq-motion/) | Joint motion measurement |

## Deployment

Push to `main` — GitHub Pages deploys automatically. The CD pipeline also copies files into the hub repo (`physiq/motion/`).
