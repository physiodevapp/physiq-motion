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
      flexion:   { label: 'Flexión',        axis: 'gravity', ref: 50, icon: '⬇', placement: 'apex-edge',      instruction: 'Coloca el teléfono <strong>de canto sobre el apex del cráneo</strong>, con la pantalla mirando hacia arriba. El paciente parte de posición neutra e inclina la cabeza lentamente hacia adelante hasta su rango máximo.' },
      extension: { label: 'Extensión',      axis: 'gravity', ref: 60, icon: '⬆', placement: 'vertical',       instruction: 'Coloca el teléfono <strong>verticalmente apoyado en la frente</strong>, pantalla hacia el examinador. El paciente parte de posición neutra e inclina la cabeza lentamente hacia atrás hasta su rango máximo.' },
      lat_izq:   { label: 'Lat. Izquierda', axis: 'gamma', ref: 45, icon: '↙', placement: 'landscape-left',  instruction: 'Coloca el teléfono <strong>en modo apaisado sobre la sien izquierda</strong>, con la pantalla en vertical mirando al examinador (no hacia arriba). El paciente inclina la cabeza lateralmente hacia la izquierda hasta su rango máximo.' },
      lat_der:   { label: 'Lat. Derecha',   axis: 'gamma', ref: 45, icon: '↘', placement: 'landscape-right', instruction: 'Coloca el teléfono <strong>en modo apaisado sobre la sien derecha</strong>, con la pantalla en vertical mirando al examinador (no hacia arriba). El paciente inclina la cabeza lateralmente hacia la derecha hasta su rango máximo.' },
      rot_izq:   { label: 'Rotación Izq.',  axis: 'alpha', ref: 80, icon: '↺', placement: 'flat-left',       instruction: 'Coloca el teléfono <strong>plano sobre la cabeza del paciente con la pantalla hacia arriba</strong>. El paciente rota lentamente la cabeza hacia la izquierda hasta su rango máximo.<br><br><small style="color:var(--text3)">⚠️ Calibra siempre desde la posición neutra (vista al frente). Evita fuentes metálicas cercanas.</small>' },
      rot_der:   { label: 'Rotación Der.',  axis: 'alpha', ref: 80, icon: '↻', placement: 'flat-right',      instruction: 'Coloca el teléfono <strong>plano sobre la cabeza del paciente con la pantalla hacia arriba</strong>. El paciente rota lentamente la cabeza hacia la derecha hasta su rango máximo.<br><br><small style="color:var(--text3)">⚠️ Calibra siempre desde la posición neutra (vista al frente). Evita fuentes metálicas cercanas.</small>' }
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

// Suavizado de la visualización
const EMA_ALPHA  = 0.15;
let smoothedDelta = 0;

// Filtro complementario (gyro + accel) para movimientos basados en gravedad
const CF_ALPHA = 0.98;
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
  if (e.alpha === null && e.beta === null && e.gamma === null) return;
  sensor.alpha = e.alpha ?? sensor.alpha;
  sensor.beta  = e.beta  ?? sensor.beta;
  sensor.gamma = e.gamma ?? sensor.gamma;
  if (!sensorSeen) { sensorSeen = true; setSensorBadge('active', 'Sensor activo'); }
  updateLiveAngle();
}

function handleMotion(e) {
  const g   = e.accelerationIncludingGravity;
  const r   = e.rotationRate;
  const now = e.timeStamp;
  if (!g || g.x === null) return;
  grav.x = g.x; grav.y = g.y; grav.z = g.z;
  if (!sensorSeen) { sensorSeen = true; setSensorBadge('active', 'Sensor activo'); }

  const ref = state.active.gravRef;
  if (ref && r && r.beta !== null && cfLastTime !== null) {
    const dt = (now - cfLastTime) / 1000;
    if (dt > 0 && dt < 0.5) {
      const gyroRate = -r.beta;           // negativo: beta+ = tope hacia examinador, no flexión
      const accelAng = angleFromGravity(ref);
      cfAngle = CF_ALPHA * (cfAngle + gyroRate * dt) + (1 - CF_ALPHA) * accelAng;
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
      <span class="mov-icon">${def.icon}</span>
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
    neutralRef: null, peakDelta: 0, result: null
  });

  document.getElementById('sheetTitle').textContent     = def.label;
  document.getElementById('sheetInstruction').innerHTML = def.instruction;
  document.getElementById('placementDiagram').innerHTML = placementSVG(def.placement);
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
    state.active.gravRef    = { y: grav.y, z: grav.z };
    state.active.neutralRef = null;
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
  const { movementId, phase, neutralRef, gravRef } = state.active;
  if (!movementId || !state.regionId || phase === 'idle') return;

  const { axis } = REGIONS[state.regionId].movements[movementId];
  let delta;
  if (axis === 'gravity') {
    if (!gravRef) return;
    delta = Math.abs(cfAngle);
  } else {
    if (neutralRef === null) return;
    delta = (axis === 'alpha' || axis === 'beta')
      ? Math.abs(angularDiff(sensor[axis], neutralRef))
      : Math.abs(sensor[axis] - neutralRef);
  }
  smoothedDelta = EMA_ALPHA * delta + (1 - EMA_ALPHA) * smoothedDelta;
  const deg = Math.round(smoothedDelta);

  document.getElementById('angleValue').textContent = deg + '°';

  if (phase === 'measuring' && delta > state.active.peakDelta) {
    state.active.peakDelta = delta;
    document.getElementById('peakLabel').textContent = 'Máx: ' + Math.round(delta) + '°';
  }
}

// Ángulo firmado en el plano YZ entre g actual y g0 — componente accel del filtro complementario
function angleFromGravity(ref) {
  const num = grav.z * ref.y - grav.y * ref.z;
  const den = grav.z * ref.z + grav.y * ref.y;
  return Math.atan2(num, den) * (180 / Math.PI);
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

// ── SVG ilustraciones de colocación ──────────────────────────────────────
function placementSVG(type) {
  if (type === 'flat-left' || type === 'flat-right') {
    const left = type === 'flat-left';
    const arrow = left
      ? `<path d="M14,42 Q2,53 14,66" stroke="#c084fc" stroke-width="1.5" fill="none" marker-end="url(#a1)"/>`
      : `<path d="M74,66 Q86,55 74,42" stroke="#c084fc" stroke-width="1.5" fill="none" marker-end="url(#a1)"/>`;
    return `<svg viewBox="0 0 88 108" class="placement-svg" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="44" cy="60" rx="25" ry="33" fill="none" stroke="#8fa0bf" stroke-width="1" stroke-dasharray="4,3"/>
      <rect x="18" y="37" width="52" height="32" rx="7" fill="none" stroke="#c084fc" stroke-width="1.5"/>
      <rect x="22" y="41" width="44" height="24" rx="4" fill="#171e2e"/>
      ${arrow}
      <defs>
        <marker id="a1" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L5,2.5z" fill="#c084fc"/></marker>
      </defs>
    </svg>`;
  }
  if (type === 'landscape-left' || type === 'landscape-right') {
    const left = type === 'landscape-left';
    const ex = left ? 33 : 55;
    const qx = left ? 26 : 62;
    return `<svg viewBox="0 0 88 108" class="placement-svg" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="16" width="68" height="42" rx="6" fill="none" stroke="#c084fc" stroke-width="1.5"/>
      <rect x="14" y="20" width="60" height="34" rx="3" fill="#171e2e"/>
      <circle cx="78" cy="37" r="2.5" fill="none" stroke="#c084fc" stroke-width="1.2"/>
      <ellipse cx="44" cy="86" rx="13" ry="17" fill="none" stroke="#8fa0bf" stroke-width="1" stroke-dasharray="4,3"/>
      <path d="M44,60 Q${qx},70 ${ex},78" stroke="#c084fc" stroke-width="1.5" fill="none" marker-end="url(#a4)"/>
      <defs>
        <marker id="a4" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L5,2.5z" fill="#c084fc"/></marker>
      </defs>
    </svg>`;
  }
  if (type === 'apex-edge') {
    return `<svg viewBox="0 0 88 108" class="placement-svg" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="44" cy="80" rx="22" ry="19" fill="none" stroke="#8fa0bf" stroke-width="1" stroke-dasharray="4,3"/>
      <rect x="13" y="53" width="58" height="8" rx="3" fill="none" stroke="#c084fc" stroke-width="1.5"/>
      <rect x="16" y="55" width="52" height="4" rx="2" fill="#171e2e"/>
      <line x1="44" y1="61" x2="44" y2="61" stroke="#8fa0bf" stroke-width="1"/>
      <path d="M25,61 Q15,70 22,79" stroke="#c084fc" stroke-width="1.5" fill="none" marker-end="url(#aE)"/>
      <defs>
        <marker id="aE" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L5,2.5z" fill="#c084fc"/></marker>
      </defs>
    </svg>`;
  }
  // Vertical (extension)
  return `<svg viewBox="0 0 88 108" class="placement-svg" xmlns="http://www.w3.org/2000/svg">
    <rect x="27" y="8" width="34" height="58" rx="6" fill="none" stroke="#c084fc" stroke-width="1.5"/>
    <rect x="31" y="13" width="26" height="46" rx="3" fill="#171e2e"/>
    <circle cx="44" cy="71" r="3.5" fill="none" stroke="#c084fc" stroke-width="1.2"/>
    <ellipse cx="44" cy="94" rx="18" ry="11" fill="none" stroke="#8fa0bf" stroke-width="1" stroke-dasharray="4,3"/>
    <path d="M44,79 Q30,87 28,94" stroke="#c084fc" stroke-width="1.5" fill="none" marker-end="url(#a3)"/>
    <defs>
      <marker id="a3" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L5,2.5z" fill="#c084fc"/></marker>
    </defs>
  </svg>`;
}
