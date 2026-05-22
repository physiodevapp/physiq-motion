'use strict';

// ── Regiones y movimientos ──────────────────────────────────────────────────
const REGIONS = {
  cervical: {
    label: 'Cervical', abbr: 'Cx',
    groups: [
      { label: 'Flexo-extensión',     ids: ['flexion', 'extension'] },
      { label: 'Inclinación lateral', ids: ['lat_izq', 'lat_der']   },
      { label: 'Rotación',            ids: ['rot_izq', 'rot_der']   }
    ],
    movements: {
      flexion:   { label: 'Flexión',        axis: 'gravity',      phoneOrientation: 'vertical',   ref: 50, icon: '⬇', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono <strong>de canto contra la sien</strong>, pantalla hacia fuera. El paciente parte de posición neutra e inclina la cabeza hacia adelante hasta su rango máximo.' },
      extension: { label: 'Extensión',      axis: 'gravity',      phoneOrientation: 'vertical',   ref: 60, icon: '⬆', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono <strong>de canto contra la sien</strong>, pantalla hacia fuera. El paciente parte de posición neutra e inclina la cabeza hacia atrás hasta su rango máximo.' },
      lat_izq:   { label: 'Lat. Izquierda', axis: 'gravity',      phoneOrientation: 'vertical',   ref: 45, icon: '↙', placement: 'frontal-vertical',  instruction: 'Coloca el teléfono <strong>contra la frente</strong>, pantalla hacia el examinador. El paciente inclina la cabeza lateralmente hacia la izquierda hasta su rango máximo.' },
      lat_der:   { label: 'Lat. Derecha',   axis: 'gravity',      phoneOrientation: 'vertical',   ref: 45, icon: '↘', placement: 'frontal-vertical',  instruction: 'Coloca el teléfono <strong>contra la frente</strong>, pantalla hacia el examinador. El paciente inclina la cabeza lateralmente hacia la derecha hasta su rango máximo.' },
      rot_izq:   { label: 'Rotación Izq.',  axis: 'alpha', phoneOrientation: 'horizontal', ref: 80, icon: '↺', placement: 'flat-left',         instruction: 'Coloca el teléfono <strong>plano sobre la cabeza del paciente con la pantalla hacia arriba</strong>. El paciente rota lentamente la cabeza hacia la izquierda hasta su rango máximo.' },
      rot_der:   { label: 'Rotación Der.',  axis: 'alpha', phoneOrientation: 'horizontal', ref: 80, icon: '↻', placement: 'flat-right',        instruction: 'Coloca el teléfono <strong>plano sobre la cabeza del paciente con la pantalla hacia arriba</strong>. El paciente rota lentamente la cabeza hacia la derecha hasta su rango máximo.' }
    }
  },
  hombro:  { label: 'Hombro',  abbr: 'Hb', groups: [], movements: {} },
  codo:    { label: 'Codo',    abbr: 'Co', groups: [], movements: {} },
  muneca:  { label: 'Muñeca',  abbr: 'Mn', groups: [], movements: {} },
  cadera:  { label: 'Cadera',  abbr: 'Cd', groups: [], movements: {} },
  rodilla: { label: 'Rodilla', abbr: 'Rd', groups: [], movements: {} },
  tobillo: { label: 'Tobillo', abbr: 'Tb', groups: [], movements: {} },
  lumbar:  { label: 'Lumbar',  abbr: 'Lb', groups: [], movements: {} }
};

// ── Estado ────────────────────────────────────────────────────────────────
const state = {
  regionId: null,
  measurements: Object.fromEntries(
    Object.entries(REGIONS).map(([id, def]) => [
      id,
      Object.fromEntries(Object.keys(def.movements).map(k => [k, null]))
    ])
  ),
  active: {
    movementId: null,
    phase: 'idle',      // 'idle' | 'calibrated' | 'measuring' | 'done'
    neutralRef: null,   // para movimientos basados en ángulo Euler
    gravRef: null,      // para movimientos basados en vector de gravedad
    peakDelta: 0,
    result: null
  }
};

// Lecturas crudas del sensor
const sensor = { alpha: 0, beta: 0, gamma: 0 };
const grav   = { x: 0, y: 0, z: 0 };
let sensorStarted = false;
let sensorSeen    = false;
let tiltInvalid   = false;

// Suavizado de la visualización
const EMA_ALPHA  = 0.15;
let smoothedDelta = 0;

// Filtro complementario adaptativo para movimientos axis:'gravity'
let cfAngle    = 0;
let cfLastTime = null;

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('summaryDate').textContent = new Date().toLocaleDateString('es-ES');
  renderRegionGrid();
  initSensor();
});

// ── Sensor ────────────────────────────────────────────────────────────────
function initSensor() {
  if (!window.DeviceOrientationEvent) {
    setSensorBadge('error', 'Sin sensor');
    document.getElementById('noSensorBanner').style.display = 'block';
    return;
  }
  const needsPermission =
    typeof DeviceOrientationEvent?.requestPermission === 'function' ||
    typeof DeviceMotionEvent?.requestPermission     === 'function';
  if (needsPermission) {
    setSensorBadge('pending', 'Requiere permiso');
    document.getElementById('permissionCard').style.display = 'block';
  } else {
    attachSensor();
  }
}

async function requestPermission() {
  try {
    const requests = [];
    if (typeof DeviceOrientationEvent?.requestPermission === 'function')
      requests.push(DeviceOrientationEvent.requestPermission());
    if (typeof DeviceMotionEvent?.requestPermission === 'function')
      requests.push(DeviceMotionEvent.requestPermission());
    const results = await Promise.all(requests);
    if (results.some(r => r !== 'granted')) {
      setSensorBadge('error', 'Permiso denegado');
      return;
    }
    document.getElementById('permissionCard').style.display = 'none';
    attachSensor();
  } catch {
    attachSensor();
  }
}

function attachSensor() {
  if (sensorStarted) return;
  sensorStarted = true;
  setSensorBadge('pending', 'Esperando...');
  window.addEventListener('deviceorientation', handleOrientation, true);
  window.addEventListener('devicemotion',      handleMotion,      true);
}

function handleOrientation(e) {
  if (e.alpha === null) return;
  sensor.alpha = e.alpha;
  if (!sensorSeen) { sensorSeen = true; setSensorBadge('active', 'Sensor activo'); }
  updateLiveAngle();
}

function handleMotion(e) {
  const g = e.accelerationIncludingGravity;
  const r = e.rotationRate;
  const now = e.timeStamp;
  if (!g || g.x === null) return;
  grav.x = g.x; grav.y = g.y; grav.z = g.z;

  const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
  if (gTotal > 0.5) {
    sensor.beta  = Math.atan2(grav.z, -grav.y) * 180 / Math.PI;
    sensor.gamma = Math.atan2(grav.x, -grav.y) * 180 / Math.PI;
  }

  if (!sensorSeen) { sensorSeen = true; setSensorBadge('active', 'Sensor activo'); }

  const { phase, neutralRef, gravRef, movementId } = state.active;
  if (phase !== 'idle' && movementId && state.regionId) {
    const mov = REGIONS[state.regionId].movements[movementId];
    if (mov) {
      const { axis, phoneOrientation } = mov;

      if (gTotal > 0.5) {
        tiltInvalid = phoneOrientation === 'horizontal'
          ? Math.sqrt(grav.x**2 + grav.y**2) / gTotal > 0.25
          : Math.abs(grav.z) / gTotal > 0.25;
      }

      if (neutralRef !== null && r && r.alpha !== null && cfLastTime !== null) {
        const dt = (now - cfLastTime) / 1000;
        if (dt > 0 && dt < 0.5) {
          if (axis === 'gravity' && gravRef && gTotal > 0.1) {
            const gn  = { x: grav.x/gTotal, y: grav.y/gTotal, z: grav.z/gTotal };
            const dot = Math.max(-1, Math.min(1, gn.x*gravRef.x + gn.y*gravRef.y + gn.z*gravRef.z));
            const accelAngleDeg = Math.acos(dot) * 180 / Math.PI;
            const confidence    = 1 - Math.min(1, Math.abs(gTotal - 9.81) / 5);
            cfAngle = confidence * accelAngleDeg + (1 - confidence) * (cfAngle + (r.alpha || 0) * dt);
          }
        }
      }
    }
  }
  cfLastTime = now;
  updateLiveAngle();
}

function setSensorBadge(cls, text) {
  const b = document.getElementById('sensorBadge');
  b.className = 'sensor-badge ' + cls;
  b.textContent = text;
}

// ── Pantalla de regiones ──────────────────────────────────────────────────
function renderRegionGrid() {
  const grid = document.getElementById('regionGrid');
  grid.innerHTML = '';
  Object.entries(REGIONS).forEach(([id, def], i) => {
    const hasMovements = Object.keys(def.movements).length > 0;
    const meas    = state.measurements[id] || {};
    const done    = Object.values(meas).filter(v => v !== null).length;
    const total   = Object.keys(def.movements).length;
    const hasData = done > 0;

    const card = document.createElement('div');
    card.className = 'region-card' +
      (!hasMovements ? ' empty' : '') +
      (hasData       ? ' has-data' : '');
    card.style.animationDelay = (i * 0.04) + 's';
    if (hasMovements) card.onclick = () => selectRegion(id);

    const countText = !hasMovements
      ? 'Por configurar'
      : hasData ? `${done} / ${total}` : `${total} movimientos`;

    card.innerHTML = `
      <div class="region-abbr">${def.abbr}</div>
      <div class="region-label">${def.label}</div>
      <div class="region-count">${countText}</div>`;
    grid.appendChild(card);
  });
}

function selectRegion(id) {
  state.regionId = id;
  document.getElementById('regionScreen').style.display = 'none';
  document.getElementById('measureScreen').style.display = '';
  document.getElementById('activeRegionLabel').textContent = REGIONS[id].label;
  renderMovementGrid();
}

function goBackToRegions() {
  state.regionId = null;
  document.getElementById('measureScreen').style.display = 'none';
  document.getElementById('regionScreen').style.display = '';
  renderRegionGrid();
}

// ── Renderizado de tarjetas de movimiento ─────────────────────────────────
function renderMovementGrid() {
  const region = REGIONS[state.regionId];
  const meas   = state.measurements[state.regionId];
  const grid   = document.getElementById('movementGrid');
  grid.innerHTML = '';
  let done = 0, cardIndex = 0;

  region.groups.forEach(group => {
    const label = document.createElement('span');
    label.className = 'movement-group-label';
    label.textContent = group.label;
    grid.appendChild(label);
    group.ids.forEach(id => {
      const def = region.movements[id];
      const val = meas[id];
      if (val !== null) done++;
      grid.appendChild(buildCard(id, def, val, cardIndex++));
    });
  });

  const total = Object.keys(region.movements).length;
  document.getElementById('completionBadge').textContent = `${done} / ${total}`;
  const any = Object.values(meas).some(v => v !== null);
  document.getElementById('summaryCard').style.display = any ? 'block' : 'none';
  if (any) renderSummaryTable();
}

function buildCard(id, def, val, i) {
  const card = document.createElement('div');
  const status = statusFor(val, def.ref);
  card.className = 'movement-card' + (val !== null ? ' ' + status : '');
  card.style.animationDelay = (i * 0.05) + 's';

  const badgeHtml = val !== null ? badgeFor(val, def.ref) : '';
  const valueHtml = val !== null
    ? `<div class="mov-value ${status}">${val}°</div>`
    : `<div class="mov-value">—</div>`;
  const btnCls   = val !== null ? 'btn-measure remeasure' : 'btn-measure';
  const btnLabel = val !== null ? 'Repetir' : 'Medir';

  card.innerHTML = `
    <div class="mov-top">
      ${badgeHtml}
    </div>
    <div>
      <div class="mov-label">${def.label}</div>
      <div class="mov-ref">Ref: ${def.ref}°</div>
    </div>
    ${valueHtml}
    <button class="${btnCls}" onclick="openMeasurement('${id}')">${btnLabel}</button>`;
  return card;
}

function statusFor(val, ref) {
  if (val === null) return '';
  const r = val / ref;
  if (r >= 0.9)  return 'ok';
  if (r >= 0.75) return 'borderline';
  return 'deficit';
}

function badgeFor(val, ref) {
  const s   = statusFor(val, ref);
  const pct = Math.round((1 - val / ref) * 100);
  const labels = { ok: 'Normal', borderline: `−${pct}%`, deficit: `−${pct}%` };
  return `<span class="badge badge-${s}">${labels[s]}</span>`;
}

// ── Tabla resumen ─────────────────────────────────────────────────────────
function renderSummaryTable() {
  const region = REGIONS[state.regionId];
  const meas   = state.measurements[state.regionId];
  const tbody  = document.getElementById('romTableBody');
  tbody.innerHTML = '';
  Object.entries(region.movements).forEach(([id, def]) => {
    const val = meas[id];
    if (val === null) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${def.label}</td>
      <td style="font-weight:500">${val}°</td>
      <td>${def.ref}°</td>
      <td>${badgeFor(val, def.ref)}</td>`;
    tbody.appendChild(tr);
  });
}

// ── Overlay de medición ───────────────────────────────────────────────────
function openMeasurement(id) {
  const def = REGIONS[state.regionId].movements[id];
  Object.assign(state.active, {
    movementId: id, phase: 'idle',
    neutralRef: null, gravRef: null, peakDelta: 0, result: null
  });

  document.getElementById('sheetTitle').textContent = def.label;
  resetAngleDisplay();
  refreshSheetUI();
  document.getElementById('measureOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMeasurement() {
  document.getElementById('measureOverlay').classList.remove('open');
  document.body.style.overflow = '';
  state.active.movementId = null;
  state.active.phase = 'idle';
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('measureOverlay')) closeMeasurement();
}

function calibrateNeutral() {
  const { axis } = REGIONS[state.regionId].movements[state.active.movementId];
  if (axis === 'gravity') {
    const mag = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
    state.active.gravRef    = mag > 0.1
      ? { x: grav.x/mag, y: grav.y/mag, z: grav.z/mag }
      : null;
    state.active.neutralRef = 0;
    cfAngle    = 0;
    cfLastTime = null;
  } else {
    state.active.neutralRef = sensor[axis];
    state.active.gravRef    = null;
  }
  state.active.phase     = 'calibrated';
  state.active.peakDelta = 0;
  smoothedDelta          = 0;
  document.getElementById('angleValue').textContent = '0°';
  document.getElementById('angleValue').className   = 'angle-value live';
  refreshSheetUI();
}

function startMeasurement() {
  state.active.phase     = 'measuring';
  state.active.peakDelta = 0;
  document.getElementById('angleValue').className = 'angle-value measuring';
  refreshSheetUI();
}

function stopMeasurement() {
  state.active.phase  = 'done';
  state.active.result = Math.round(state.active.peakDelta);
  document.getElementById('angleValue').textContent = state.active.result + '°';
  document.getElementById('angleValue').className   = 'angle-value done';
  document.getElementById('peakLabel').textContent  = '';
  refreshSheetUI();
}

function saveResult() {
  state.measurements[state.regionId][state.active.movementId] = state.active.result;
  closeMeasurement();
  renderMovementGrid();
}

function redoMeasurement() {
  Object.assign(state.active, { phase: 'idle', neutralRef: null, gravRef: null, peakDelta: 0, result: null });
  resetAngleDisplay();
  refreshSheetUI();
}

function resetAngleDisplay() {
  smoothedDelta = 0;
  cfAngle       = 0;
  cfLastTime    = null;
  document.getElementById('angleValue').textContent = '—';
  document.getElementById('angleValue').className   = 'angle-value';
  document.getElementById('peakLabel').textContent  = '';
}

function refreshSheetUI() {
  const p = state.active.phase;
  const show = (id, v) => { document.getElementById(id).style.display = v ? '' : 'none'; };

  show('btnCalibrate',    p === 'idle');
  show('btnStartMeasure', p === 'calibrated');
  show('btnStopMeasure',  p === 'measuring');
  show('btnSaveResult',   p === 'done');
  show('btnRedo',         p === 'calibrated' || p === 'done');

  const steps = [
    { id: 'phaseStep1', active: p === 'idle',                            done: p !== 'idle'  },
    { id: 'phaseStep2', active: p === 'calibrated' || p === 'measuring', done: p === 'done'  },
    { id: 'phaseStep3', active: p === 'done',                            done: false         }
  ];
  steps.forEach(({ id, active, done }, idx) => {
    const el  = document.getElementById(id);
    const dot = document.getElementById('phaseDot' + (idx + 1));
    el.className = 'phase-step-item' +
      (active ? ' active' : '') + (done ? ' done' : '');
    dot.className = 'phase-dot' +
      (p === 'measuring' && id === 'phaseStep2' ? ' pulsing' : '');
  });
}

// ── Ángulo en vivo ────────────────────────────────────────────────────────
function updateLiveAngle() {
  const { movementId, phase, neutralRef } = state.active;
  if (!movementId || !state.regionId || phase === 'idle' || phase === 'done') return;
  if (neutralRef === null) return;

  const { axis } = REGIONS[state.regionId].movements[movementId];

  const warn       = document.getElementById('tiltWarning');
  const angleEl    = document.getElementById('angleValue');
  const displayEl  = document.querySelector('.angle-display');
  const shouldWarn = tiltInvalid && (phase === 'calibrated' || phase === 'measuring');
  if (shouldWarn) {
    warn.textContent = '⚠ fuera de plano';
    displayEl.classList.add('tilt-warn');
    angleEl.classList.add('tilt');
    return;
  }
  warn.textContent = '';
  displayEl.classList.remove('tilt-warn');
  angleEl.classList.remove('tilt');

  let delta;
  if (axis === 'gravity' || axis === 'rotationRate') {
    delta = foldAngle(Math.abs(cfAngle));
  } else {
    const raw = (axis === 'alpha' || axis === 'beta')
      ? Math.abs(angularDiff(sensor[axis], neutralRef))
      : Math.abs(sensor[axis] - neutralRef);
    delta = foldAngle(raw);
  }

  smoothedDelta = EMA_ALPHA * delta + (1 - EMA_ALPHA) * smoothedDelta;
  const deg = Math.round(smoothedDelta);
  document.getElementById('angleValue').textContent = deg + '°';

  if (phase === 'measuring' && delta > state.active.peakDelta) {
    state.active.peakDelta = delta;
    document.getElementById('peakLabel').textContent = 'Máx: ' + Math.round(delta) + '°';
  }
}

function foldAngle(deg) {
  const a = Math.abs(deg) % 360;
  return a > 180 ? 360 - a : a;
}

// Diferencia angular con manejo de wrap-around (alpha: 0–360°, beta: ±180°)
function angularDiff(a, b) {
  let d = a - b;
  while (d >  180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// ── Exportar a PhysiQ Report ──────────────────────────────────────────────
function exportToPhysiQReport() {
  const region = REGIONS[state.regionId];
  const meas   = state.measurements[state.regionId];
  const payload = {
    src: 'physiq-motion',
    patient: document.getElementById('patientName').value.trim(),
    fecha: new Date().toLocaleDateString('es-ES'),
    region: state.regionId,
    rom: Object.fromEntries(
      Object.entries(meas)
        .filter(([, v]) => v !== null)
        .map(([id, val]) => [id, {
          label:   region.movements[id].label,
          value:   val,
          ref:     region.movements[id].ref,
          deficit: val < region.movements[id].ref * 0.9
        }])
    )
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  window.open('https://physiodevapp.github.io/physiq-report/?rom=' + encoded);
}

// ── Reset región activa ───────────────────────────────────────────────────
function resetAll() {
  const meas = state.measurements[state.regionId];
  Object.keys(meas).forEach(k => { meas[k] = null; });
  document.getElementById('patientName').value = '';
  renderMovementGrid();
}
