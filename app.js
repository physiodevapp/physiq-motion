'use strict';

// ─── SCROLL LOCK (dialogs / bottom sheets) ───────────────────
// Reference-counted: varios overlays pueden estar apilados o abrirse
// en secuencia. Cada uno debe liberar su propio lock sin desbloquear
// el scroll mientras otro overlay siga abierto.
let _scrollLockCount = 0;
function lockBodyScroll() {
  _scrollLockCount++;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}
function unlockBodyScroll() {
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if (_scrollLockCount === 0) {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
}

// ── Estrategias de medición ───────────────────────────────────────────────
function makeTwoSegStrategy({ steps, seg1Label, seg2Label, btn1, btn2, captureSeg, liveDeg, calcResult }) {
  const _liveDeg = liveDeg || captureSeg;
  return {
    steps, pulses: false, twoSeg: true,
    seg1Label, seg2Label, btn1, btn2,
    show: { idle: ['btnCaptureSeg1'], measuring: [], seg1: ['rowSeg1'], done: ['rowDone'] },
    onOpen(def) {},
    liveAngle(def) {
      const p = state.active.phase;
      if (p !== 'idle' && p !== 'seg1') return null;
      return { deg: Math.round(_liveDeg()), isLive: true };
    },
    capture1(def) { return captureSeg(); },
    capture2(def, seg1) {
      const seg2 = captureSeg();
      return { result: calcResult(seg1, seg2), seg1, seg2 };
    },
  };
}

// Cada entrada encapsula toda la lógica de un measureType:
//   steps      — etiquetas de los 3 indicadores de fase
//   pulses     — si el dot de paso 2 pulsa durante 'measuring'
//   twoSeg     — true para tipos de dos capturas (idle → seg1 → done)
//   show       — ids DOM visibles por fase
//   onOpen(def)— se llama al abrir el overlay (y en redo); puede auto-iniciar
//   liveAngle  — devuelve { deg, isPreview|isLive|isSmoothed, base? } o null
//   capture1/2 — sólo en tipos twoSeg; capturan y calculan el resultado
const STRATEGIES = {
  standard: {
    steps: ['Neutro', 'Midiendo', 'Listo'], pulses: true, twoSeg: false,
    show: {
      idle:      ['btnCalibrate'],
      measuring: ['btnStopMeasure', 'rowMeasuringActions'],
      seg1:      [],
      done:      ['rowDone'],
    },
    onOpen(def) {},
    liveAngle(def) {
      if (state.active.phase !== 'measuring') return null;
      const { axis } = def;
      const delta = axis === 'gravity'
        ? foldAngle(Math.abs(cfAngle))
        : foldAngle(Math.abs(
            (axis === 'alpha' || axis === 'beta')
              ? angularDiff(sensor[axis], state.active.neutralRef)
              : sensor[axis] - state.active.neutralRef
          ));
      return { delta, isSmoothed: true, base: def.baseAngle || 0 };
    },
  },

  'gravity-vertical': {
    steps: ['Medir', 'Midiendo', 'Listo'], pulses: true, twoSeg: false,
    show: { idle: [], measuring: ['rowVertical'], seg1: [], done: ['rowDone'] },
    onOpen(def) {
      const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
      const ySign  = grav.y >= 0 ? 1 : -1;
      state.active.gravRef    = { x: 0, y: ySign, z: 0 };
      cfAngle = gTotal > 0.1
        ? Math.acos(Math.max(-1, Math.min(1, grav.y * ySign / gTotal))) * 180 / Math.PI
        : 0;
      state.active.neutralRef = 0;
      cfLastTime   = null;
      smoothedDelta = cfAngle;
      state.active.phase     = 'measuring';
      state.active.peakDelta = 0;
      document.getElementById('angleValue').className = 'angle-value measuring';
    },
    liveAngle(def) {
      const { phase } = state.active;
      if (phase === 'idle') {
        const gT = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
        if (gT < 0.1) return null;
        const yS  = grav.y >= 0 ? 1 : -1;
        const dot = Math.max(-1, Math.min(1, grav.y * yS / gT));
        return { deg: Math.round(Math.acos(dot) * 180 / Math.PI) + (def.baseAngle || 0), isPreview: true };
      }
      return { delta: foldAngle(Math.abs(cfAngle)), isSmoothed: true, base: def.baseAngle || 0 };
    },
  },

  'beta-zero': {
    steps: ['Medir', 'Midiendo', 'Listo'], pulses: true, twoSeg: false,
    show: { idle: [], measuring: ['rowVertical'], seg1: [], done: ['rowDone'] },
    onOpen(def) {
      state.active.neutralRef = def.neutralAngle !== undefined ? def.neutralAngle : 0;
      state.active.gravRef    = null;
      state.active.phase      = 'measuring';
      state.active.peakDelta  = 0;
      smoothedDelta = 0;
      cfAngle       = 0;
      cfLastTime    = null;
      document.getElementById('angleValue').className = 'angle-value measuring';
    },
    liveAngle(def) {
      if (state.active.phase !== 'measuring') return null;
      return {
        delta: foldAngle(Math.abs(angularDiff(sensor.beta, state.active.neutralRef))),
        isSmoothed: true,
        base: 0,
      };
    },
  },

  'two-segment-signed': makeTwoSegStrategy({
    steps: ['Muslo', 'Pierna', 'Listo'],
    seg1Label: 'Muslo', seg2Label: 'Pierna',
    btn1: 'Capturar muslo',
    btn2: '<span class="sheet-lbl-full">Capturar pierna</span><span class="sheet-lbl-short">Pierna</span>',
    captureSeg: () => segmentInclination(),
    calcResult: (s1, s2) => Math.round(s1 - s2),
  }),

  'two-segment-beta': makeTwoSegStrategy({
    steps: ['Muslo', 'Pierna', 'Listo'],
    seg1Label: 'Muslo', seg2Label: 'Pierna',
    btn1: 'Capturar muslo',
    btn2: '<span class="sheet-lbl-full">Capturar pierna</span><span class="sheet-lbl-short">Pierna</span>',
    captureSeg: () => Math.abs(angularDiff(sensor.beta, 90)),
    calcResult: (s1, s2) => Math.max(0, Math.round(180 - s1 - s2)),
  }),

  'two-segment-vertical': makeTwoSegStrategy({
    steps: ['S1', 'T12', 'Listo'],
    seg1Label: 'S1', seg2Label: 'T12',
    btn1: 'Capturar S1', btn2: 'Capturar T12',
    captureSeg: () => verticalInclination(),
    calcResult: (s1, s2) => Math.max(0, Math.round(s2 - s1)),
  }),

  'two-segment-vertical-signed': makeTwoSegStrategy({
    steps: ['S1', 'T12', 'Listo'],
    seg1Label: 'S1', seg2Label: 'T12',
    btn1: 'Capturar S1', btn2: 'Capturar T12',
    captureSeg: () => signedVerticalInclination(),
    calcResult: (s1, s2) => Math.round(s2 - s1),
  }),

  'two-segment-abs': makeTwoSegStrategy({
    steps: ['Muslo', 'Pierna', 'Listo'],
    seg1Label: 'Muslo', seg2Label: 'Pierna',
    btn1: 'Capturar muslo',
    btn2: '<span class="sheet-lbl-full">Capturar pierna</span><span class="sheet-lbl-short">Pierna</span>',
    captureSeg: () => segmentInclination(),
    liveDeg:    () => Math.abs(segmentInclination()),
    calcResult: (s1, s2) => Math.round(Math.min(180, Math.abs(s1) + Math.abs(s2))),
  }),
};

function getStrategy() {
  const movId = state.active.movementId;
  const mtype = movId && state.regionId
    ? (REGIONS[state.regionId].movements[movId].measureType || 'standard')
    : 'standard';
  return STRATEGIES[mtype];
}

// ── Helpers de slots ──────────────────────────────────────────────────────
function initSlots(def) {
  const sides = def.bilateral ? ['izquierda', 'derecha'] : ['centro'];
  return Object.fromEntries(sides.map(s => [
    s, Object.fromEntries(def.modes.map(m => [m, null]))
  ]));
}

function effectiveSide(def) {
  return def.bilateral ? state.context.side : 'centro';
}

function effectiveMode(def) {
  return def.modes.includes(state.context.mode) ? state.context.mode : def.modes[0];
}

function clearAllSlots(store) {
  Object.values(store).forEach(region =>
    Object.values(region).forEach(mov =>
      Object.values(mov).forEach(sideSlots =>
        Object.keys(sideSlots).forEach(mode => { sideSlots[mode] = null; })
      )
    )
  );
}

function countSlots(regionId) {
  const region = REGIONS[regionId];
  const meas   = state.measurements[regionId];
  let done = 0, total = 0;
  Object.entries(region.movements).forEach(([movId, def]) => {
    const sides = def.bilateral ? ['izquierda', 'derecha'] : ['centro'];
    sides.forEach(side => def.modes.forEach(mode => {
      total++;
      if (meas[movId]?.[side]?.[mode] !== null) done++;
    }));
  });
  return { done, total };
}

// ── Estado ────────────────────────────────────────────────────────────────
const state = {
  regionId: null,
  context: { side: 'izquierda', mode: 'activa' },
  measurements: Object.fromEntries(
    Object.entries(REGIONS).map(([id, def]) => [
      id,
      Object.fromEntries(Object.keys(def.movements).map(k => [k, initSlots(def.movements[k])]))
    ])
  ),
  segmentData: Object.fromEntries(
    Object.entries(REGIONS).map(([id, def]) => [
      id,
      Object.fromEntries(Object.keys(def.movements).map(k => [k, initSlots(def.movements[k])]))
    ])
  ),
  active: {
    movementId: null,
    phase: 'idle',      // 'idle' | 'measuring' | 'done' | 'seg1'
    neutralRef: null,
    gravRef: null,
    peakDelta: 0,
    result: null,
    seg1Value: null     // primer segmento capturado (two-segment types)
  }
};

// Lecturas crudas del sensor
const sensor = { alpha: 0, beta: 0, gamma: 0 };
const grav   = { x: 0, y: 0, z: 0 };
let _popstateLock = false;
let _gridInstant  = false;
function _pushState(state) {
  history.pushState(state, '');
}
let sensorStarted = false;
let sensorSeen    = false;
let motionSeen    = false;
let tiltInvalid   = false;
let lastDisplayUpdate = 0;

// Suavizado de la visualización
const EMA_ALPHA  = 0.5;
let smoothedDelta = 0;

// Filtro complementario adaptativo para movimientos axis:'gravity'
let cfAngle    = 0;
let cfLastTime = null;

// ── Hub history helpers ───────────────────────────────────────────────────
function _rebuildHubHistory() {
  history.replaceState({ view: 'hub-exit' }, '');
  history.pushState({ view: 'home' }, '');
  if (state.regionId) history.pushState({ view: 'measure' }, '');
}

let _firstVisible = true;
window.addEventListener('message', e => {
  if (e.data?.type === 'PHYSIQ_SAT_VISIBLE' && document.body.classList.contains('in-hub')) {
    if (_firstVisible) { _firstVisible = false; return; }
    _rebuildHubHistory();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('in-hub')) {
    history.replaceState({ view: 'hub-exit' }, '');
    history.pushState({ view: 'home' }, '');
  } else {
    history.replaceState(null, '');
  }
  renderRegionGrid();
  initSensor();
  document.getElementById('patientName').addEventListener('input', () => {
    scheduleIDBSync();
    _updateSessionPanelTitle();
  });
  readSession().then(session => {
    if (!session) return;
    updateSessionChip(session);
    const el = document.getElementById('patientName');
    if (session.patient && el && !el.value) el.value = session.patient;
    if (session.rom?.regions) {
      Object.entries(session.rom.regions).forEach(([regionId, regionData]) => {
        if (!state.measurements[regionId]) return;
        Object.entries(regionData.rom || {}).forEach(([movId, movData]) => {
          if (!movData || !state.measurements[regionId][movId]) return;
          Object.entries(movData.slots || {}).forEach(([side, sideSlots]) => {
            if (!state.measurements[regionId][movId][side]) return;
            Object.entries(sideSlots || {}).forEach(([mode, slotData]) => {
              if (slotData?.value != null)
                state.measurements[regionId][movId][side][mode] = slotData.value;
            });
          });
        });
      });
      renderRegionGrid();
    }
    _updateSessionPanelTitle();
  });
});

window.addEventListener('popstate', (e) => {
  if (e.state?.view === 'hub-exit' && document.body.classList.contains('in-hub')) {
    window.parent.postMessage({ type: 'PHYSIQ_GO_HOME' }, '*');
    return;
  }
  if (_popstateLock) { _popstateLock = false; return; }
  if (document.getElementById('measureOverlay').classList.contains('open')) {
    const p = state.active.phase;
    if (p === 'measuring' || p === 'seg1') {
      history.pushState({ view: 'overlay' }, '');
    } else {
      closeMeasurement(true);
    }
  } else if (state.regionId !== null) {
    goBackToRegions(true);
  }
});

// ── Sensor ────────────────────────────────────────────────────────────────
function initSensor() {
  if (!window.DeviceOrientationEvent) {
    setSensorBadge('error');
    document.getElementById('noSensorBanner').style.display = 'block';
    return;
  }
  const needsPermission =
    typeof DeviceOrientationEvent?.requestPermission === 'function' ||
    typeof DeviceMotionEvent?.requestPermission     === 'function';
  if (needsPermission) {
    setSensorBadge('pending');
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
      setSensorBadge('error');
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
  setSensorBadge('pending');
  window.addEventListener('deviceorientation', handleOrientation, true);
  window.addEventListener('devicemotion',      handleMotion,      true);
}

function handleOrientation(e) {
  if (e.alpha === null) return;
  sensor.alpha = e.alpha;
  // Emulator fallback: derive gravity vector and cfAngle from Euler angles when devicemotion never fires
  if (!motionSeen && e.beta !== null && e.gamma !== null) {
    const bRad = e.beta  * Math.PI / 180;
    const gRad = e.gamma * Math.PI / 180;
    const g    = 9.81;
    grav.x = g * Math.cos(bRad) * Math.sin(gRad);
    grav.y = -g * Math.sin(bRad);
    grav.z = -g * Math.cos(bRad) * Math.cos(gRad);
    sensor.beta  = Math.atan2(grav.z, -grav.y) * 180 / Math.PI;
    sensor.gamma = Math.atan2(grav.x, -grav.y) * 180 / Math.PI;
    const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
    const { gravRef } = state.active;
    if (gravRef && gTotal > 0.1) {
      const gn  = { x: grav.x/gTotal, y: grav.y/gTotal, z: grav.z/gTotal };
      const dot = Math.max(-1, Math.min(1, gn.x*gravRef.x + gn.y*gravRef.y + gn.z*gravRef.z));
      cfAngle = Math.acos(dot) * 180 / Math.PI;
    }
  }
  if (!sensorSeen) { sensorSeen = true; setSensorBadge('active'); }
  updateLiveAngle();
}

function handleMotion(e) {
  const g = e.accelerationIncludingGravity;
  const r = e.rotationRate;
  const now = e.timeStamp;
  if (!g || g.x === null) return;
  motionSeen = true;
  grav.x = g.x; grav.y = g.y; grav.z = g.z;

  const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
  if (gTotal > 0.5) {
    sensor.beta  = Math.atan2(grav.z, -grav.y) * 180 / Math.PI;
    sensor.gamma = Math.atan2(grav.x, -grav.y) * 180 / Math.PI;
  }

  if (!sensorSeen) { sensorSeen = true; setSensorBadge('active'); }

  const { phase, neutralRef, gravRef, movementId } = state.active;
  if (movementId && state.regionId) {
    const mov = REGIONS[state.regionId].movements[movementId];
    if (mov) {
      const { axis, phoneOrientation } = mov;

      if (gTotal > 0.5) {
        tiltInvalid = phoneOrientation === 'horizontal' || phoneOrientation === 'none'
          ? Math.sqrt(grav.x**2 + grav.y**2) / gTotal > 0.25
          : phoneOrientation === 'beta-rotation'
          ? Math.abs(grav.x) / gTotal > 0.25
          : phoneOrientation === 'flat-frontal'
          ? Math.abs(grav.y) / gTotal > 0.25
          : Math.abs(grav.z) / gTotal > 0.25;
      }

      if (phase !== 'idle' && neutralRef !== null && r && r.alpha !== null && cfLastTime !== null) {
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

function setSensorBadge(cls) {
  document.getElementById('sensorBadge').className = 'sensor-badge ' + cls;
}

// ── Pantalla de regiones ──────────────────────────────────────────────────
function renderRegionGrid() {
  const grid = document.getElementById('regionGrid');
  grid.innerHTML = '';
  Object.entries(REGIONS).forEach(([id, def], i) => {
    const hasMovements = Object.keys(def.movements).length > 0;
    const { done, total } = countSlots(id);
    const hasData = done > 0;

    const card = document.createElement('div');
    card.className = 'region-card' +
      (!hasMovements ? ' empty' : '') +
      (hasData       ? ' has-data' : '');
    card.style.animationDelay = (i * 0.04) + 's';
    if (hasMovements) card.onclick = () => selectRegion(id);

    const countText = !hasMovements
      ? 'Por configurar'
      : hasData ? `${done} / ${total}` : `${total} mediciones`;

    card.innerHTML = `
      <div class="region-label">${def.label}</div>
      <div class="region-count">${countText}</div>`;
    grid.appendChild(card);
  });
  document.querySelector('.btn-reset').style.display =
    Object.keys(REGIONS).some(id => hasAnySlot(id)) ? '' : 'none';
  renderGlobalExport();
}

function renderGlobalExport() {
  const card  = document.getElementById('globalExportCard');
  const chips = document.getElementById('globalExportChips');
  if (!card) return;
  const measured = Object.entries(REGIONS).filter(([id]) => hasAnySlot(id));
  if (!measured.length) { card.style.display = 'none'; return; }
  chips.innerHTML = measured.map(([id, def]) => {
    const { done, total } = countSlots(id);
    return `<span class="region-chip" onclick="selectRegion('${id}')">${def.label} <span class="chip-count">${done}/${total}</span></span>`;
  }).join('');
  card.style.display = 'block';
}

function selectRegion(id) {
  _pushState({ view: 'measure' });
  state.regionId = id;
  document.getElementById('regionScreen').style.display = 'none';
  document.getElementById('measureScreen').style.display = '';
  document.querySelector('main').classList.add('in-measure');
  document.getElementById('activeRegionLabel').innerHTML = `${REGIONS[id].label} <span class="badge-count" id="completionBadge"></span>`;
  renderMovementGrid();
}

function goBackToRegions(fromPopstate = false) {
  state.regionId = null;
  document.getElementById('measureScreen').style.display = 'none';
  document.getElementById('regionScreen').style.display = '';
  document.querySelector('main').classList.remove('in-measure');
  renderRegionGrid();
  if (!fromPopstate && history.state?.view === 'measure') history.back();
}

// ── Barra de contexto ─────────────────────────────────────────────────────
function renderContextBar() {
  const region      = REGIONS[state.regionId];
  const hasBilateral = Object.values(region.movements).some(m => m.bilateral);
  const hasPassive   = Object.values(region.movements).some(m => m.modes.includes('pasiva'));

  const bar    = document.getElementById('contextBar');
  const sideEl = document.getElementById('ctxSideGroup');
  const modeEl = document.getElementById('ctxModeGroup');
  bar.style.display    = (hasBilateral || hasPassive) ? '' : 'none';
  sideEl.style.display = hasBilateral ? '' : 'none';
  modeEl.style.display = hasPassive   ? '' : 'none';
  sideEl.style.gridColumn = '1';
  modeEl.style.gridColumn = '2';

  document.getElementById('ctxBtnIzq').classList.toggle('active', state.context.side === 'izquierda');
  document.getElementById('ctxBtnDer').classList.toggle('active', state.context.side === 'derecha');
  document.getElementById('ctxBtnAct').classList.toggle('active', state.context.mode === 'activa');
  document.getElementById('ctxBtnPas').classList.toggle('active', state.context.mode === 'pasiva');
}

function setContextSide(side) {
  state.context.side = side;
  renderContextBar();
  _gridInstant = true;
  renderMovementGrid();
  _gridInstant = false;
}

function setContextMode(mode) {
  state.context.mode = mode;
  renderContextBar();
  _gridInstant = true;
  renderMovementGrid();
  _gridInstant = false;
}

// ── Renderizado de tarjetas de movimiento ─────────────────────────────────
function renderMovementGrid() {
  const region = REGIONS[state.regionId];
  const grid   = document.getElementById('movementGrid');
  grid.innerHTML = '';
  let cardIndex = 0;

  region.groups.forEach(group => {
    const label = document.createElement('span');
    label.className = 'movement-group-label';
    label.textContent = group.label;
    grid.appendChild(label);
    group.ids.forEach(id => {
      grid.appendChild(buildCard(id, region.movements[id], cardIndex++));
    });
    if (group.ids.length === 1) {
      const filler = document.createElement('div');
      filler.className = 'movement-card-filler';
      filler.innerHTML = '<span>— sin más —</span>';
      grid.appendChild(filler);
    }
  });

  renderContextBar();

  const { done, total } = countSlots(state.regionId);
  document.getElementById('completionBadge').textContent = `${done} / ${total}`;
  document.querySelector('.btn-reset').style.display =
    Object.keys(REGIONS).some(id => hasAnySlot(id)) ? '' : 'none';
}

function calcWorstStatus(def, meas) {
  if (def.skipStatus) return '';
  const rank = { ok: 1, borderline: 2, deficit: 3 };
  let worst = '';
  const sides = def.bilateral ? ['izquierda', 'derecha'] : ['centro'];
  sides.forEach(s => def.modes.forEach(m => {
    const v = meas?.[s]?.[m] ?? null;
    if (v === null) return;
    const s2 = statusFor(v, def.ref);
    if (!worst || (rank[s2] || 0) > (rank[worst] || 0)) worst = s2;
  }));
  return worst;
}

function buildAsymmetryHtml(def, meas) {
  if (!def.bilateral) return '';
  const chips = def.modes.map(mode => {
    const ia = asymmetryFor(meas?.izquierda?.[mode] ?? null, meas?.derecha?.[mode] ?? null);
    if (ia === null) return '';
    const cls    = ia < 10 ? 'ia-sym' : ia <= 20 ? 'ia-mod' : 'ia-asym';
    const prefix = def.modes.length > 1 ? (mode === 'activa' ? 'A ' : 'P ') : '';
    return `<span class="ia-chip ${cls}">${prefix}${ia}%</span>`;
  }).filter(Boolean).join('');
  return `<div class="mov-ia-chips">${chips}</div>`;
}

function buildDataRows(id, def, meas, strategy, segStore, currentDataSide, currentMode) {
  return ['activa', 'pasiva'].map(mode => {
    const thLabel = mode === 'activa' ? 'Act' : 'Pas';

    if (!def.bilateral) {
      if (!def.modes.includes(mode))
        return `<tr><th>${thLabel}</th><td colspan="2" class="na">N/A</td></tr>`;
      const v      = meas?.centro?.[mode] ?? null;
      const segs   = strategy.twoSeg ? (segStore?.[id]?.centro?.[mode] ?? null) : null;
      const curCls = (currentDataSide === 'centro' && mode === currentMode) ? ' cur' : '';
      if (v !== null) {
        const sc     = def.skipStatus ? '' : statusFor(v, def.ref);
        const segBtn = segs
          ? ` <button class="seg-expand" onclick="toggleSegDetail('${id}','centro','${mode}',event)">▸</button>`
          : '';
        return `<tr><th>${thLabel}</th><td colspan="2" class="${sc}${curCls}">${v}°${segBtn}</td></tr>`;
      }
      return `<tr><th>${thLabel}</th><td colspan="2" class="empty${curCls}">—</td></tr>`;
    }

    const cells = ['izquierda', 'derecha'].map(dataSide => {
      if (!def.modes.includes(mode))
        return `<td class="na">N/A</td>`;
      const v      = meas?.[dataSide]?.[mode] ?? null;
      const segs   = strategy.twoSeg ? (segStore?.[id]?.[dataSide]?.[mode] ?? null) : null;
      const curCls = (dataSide === currentDataSide && mode === currentMode) ? ' cur' : '';
      if (v !== null) {
        const sc     = def.skipStatus ? '' : statusFor(v, def.ref);
        const segBtn = segs
          ? ` <button class="seg-expand" onclick="toggleSegDetail('${id}','${dataSide}','${mode}',event)">▸</button>`
          : '';
        return `<td class="${sc}${curCls}">${v}°${segBtn}</td>`;
      }
      return `<td class="empty${curCls}">—</td>`;
    }).join('');
    return `<tr><th>${thLabel}</th>${cells}</tr>`;
  }).join('');
}

function buildCardButtons(id, meas, currentDataSide, currentMode) {
  const currentVal = meas?.[currentDataSide]?.[currentMode] ?? null;
  return currentVal !== null
    ? `<div class="btn-measure-row">
         <button class="btn-clear" onclick="clearMeasurement('${id}','${currentDataSide}','${currentMode}')">✕</button>
         <button class="btn-measure remeasure" onclick="openMeasurement('${id}')">Repetir</button>
       </div>`
    : `<button class="btn-measure" onclick="openMeasurement('${id}')">Medir</button>`;
}

function buildCard(id, def, i) {
  const meas        = state.measurements[state.regionId][id];
  const segStore    = state.segmentData[state.regionId];
  const strategy    = STRATEGIES[def.measureType || 'standard'];
  const currentSide = effectiveSide(def);
  const currentMode = effectiveMode(def);
  const worstStatus = calcWorstStatus(def, meas);

  const card = document.createElement('div');
  card.className = 'movement-card' + (worstStatus ? ' ' + worstStatus : '');
  if (_gridInstant) card.style.animation = 'none';
  else card.style.animationDelay = (i * 0.05) + 's';

  const refHtml       = def.ref != null ? `<div class="mov-ref">Ref: ${def.ref}°</div>` : '';
  const iaHtml        = buildAsymmetryHtml(def, meas);
  const dataRows      = buildDataRows(id, def, meas, strategy, segStore, currentSide, currentMode);
  const segDetailHtml = strategy.twoSeg ? `<div class="mov-segs-detail" id="segs-${id}"></div>` : '';
  const btnHtml       = buildCardButtons(id, meas, currentSide, currentMode);

  card.innerHTML = `
    <div class="mov-top">
      <div>
        <div class="mov-label">${def.label}</div>
        ${refHtml}
      </div>
      ${iaHtml}
    </div>
    <table class="mov-grid">
      ${def.bilateral ? '<thead><tr><th></th><th>Izq</th><th>Der</th></tr></thead>' : ''}
      <tbody>${dataRows}</tbody>
    </table>
    ${segDetailHtml}
    ${btnHtml}`;
  return card;
}

function clearMeasurement(movId, side, mode) {
  state.measurements[state.regionId][movId][side][mode] = null;
  const seg = state.segmentData[state.regionId]?.[movId]?.[side];
  if (seg) seg[mode] = null;
  scheduleIDBSync();
  renderMovementGrid();
}

function toggleSegDetail(movId, side, mode, event) {
  event.stopPropagation();
  const detail = document.getElementById('segs-' + movId);
  if (!detail) return;
  const segs = state.segmentData[state.regionId]?.[movId]?.[side]?.[mode];
  if (!segs) return;
  const strategy = STRATEGIES[REGIONS[state.regionId].movements[movId].measureType || 'standard'];
  const abbr = l => l.length <= 3 ? l : l[0];
  const isSame = detail.dataset.side === side && detail.dataset.mode === mode && detail.classList.contains('open');
  if (isSame) {
    detail.classList.remove('open');
    detail.innerHTML = '';
    delete detail.dataset.side;
    delete detail.dataset.mode;
  } else {
    detail.dataset.side = side;
    detail.dataset.mode = mode;
    detail.classList.add('open');
    detail.innerHTML = `<span>${abbr(strategy.seg1Label)}: ${segs.seg1}°</span><span>${abbr(strategy.seg2Label)}: ${segs.seg2}°</span>`;
  }
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

function asymmetryFor(l, r) {
  if (l === null || r === null) return null;
  const avg = (l + r) / 2;
  if (avg === 0) return null;
  return Math.round(Math.abs(l - r) / avg * 100);
}


// ── Overlay de medición ───────────────────────────────────────────────────
function openMeasurement(id) {
  const def      = REGIONS[state.regionId].movements[id];
  const strategy = STRATEGIES[def.measureType || 'standard'];
  Object.assign(state.active, {
    movementId: id, phase: 'idle',
    neutralRef: null, gravRef: null, peakDelta: 0, result: null, seg1Value: null
  });
  tiltInvalid = false;
  const sideLabel = { izquierda: 'Izq.', derecha: 'Der.' };
  const ctxParts  = [
    def.bilateral             ? sideLabel[state.context.side]  : null,
    def.modes.length > 1      ? state.context.mode             : null
  ].filter(Boolean);
  document.getElementById('sheetTitle').textContent     = def.label + (ctxParts.length ? ' · ' + ctxParts.join(' · ') : '');
  document.getElementById('sheetInstruction').innerHTML = def.instruction || '';
  resetAngleDisplay();
  strategy.onOpen(def);
  refreshSheetUI();
  const overlay = document.getElementById('measureOverlay');
  const wasOpen = overlay.classList.contains('open');
  overlay.classList.add('open');
  if (!wasOpen) lockBodyScroll();
  _pushState({ view: 'overlay' });
}

function closeMeasurement(fromPopstate = false) {
  const overlay = document.getElementById('measureOverlay');
  const wasOpen = overlay.classList.contains('open');
  overlay.classList.remove('open');
  if (wasOpen) unlockBodyScroll();
  state.active.movementId = null;
  state.active.phase = 'idle';
  if (!fromPopstate && history.state?.view === 'overlay') { _popstateLock = true; history.back(); }
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
  state.active.phase     = 'measuring';
  state.active.peakDelta = 0;
  smoothedDelta          = 0;
  document.getElementById('angleValue').textContent = '0°';
  document.getElementById('angleValue').className   = 'angle-value measuring';
  refreshSheetUI();
}


function stopMeasurement() {
  const def  = REGIONS[state.regionId].movements[state.active.movementId];
  const base = def.baseAngle || 0;
  state.active.phase  = 'done';
  state.active.result = Math.round(state.active.peakDelta) + base;
  document.getElementById('angleValue').textContent = state.active.result + '°';
  document.getElementById('angleValue').className   = 'angle-value done';
  document.getElementById('peakLabel').textContent  = '';
  refreshSheetUI();
}

function saveResult() {
  const def  = REGIONS[state.regionId].movements[state.active.movementId];
  const side = effectiveSide(def);
  const mode = effectiveMode(def);
  state.measurements[state.regionId][state.active.movementId][side][mode] = state.active.result;
  closeMeasurement();
  renderMovementGrid();
  scheduleIDBSync();
  updateSessionChip({
    patient: document.getElementById('patientName')?.value.trim() || '',
    date: new Date().toLocaleDateString('es-ES')
  });
}

function redoMeasurement() {
  const def = REGIONS[state.regionId].movements[state.active.movementId];
  tiltInvalid = false;
  Object.assign(state.active, { phase: 'idle', neutralRef: null, gravRef: null, peakDelta: 0, result: null, seg1Value: null });
  resetAngleDisplay();
  STRATEGIES[def.measureType || 'standard'].onOpen(def);
  refreshSheetUI();
}

function resetPeak() {
  state.active.peakDelta = smoothedDelta;
  const def  = REGIONS[state.regionId].movements[state.active.movementId];
  const base = def.baseAngle || 0;
  document.getElementById('peakLabel').textContent = 'Máx: ' + (Math.round(smoothedDelta) + base) + '°';
}

function resetAngleDisplay() {
  smoothedDelta = 0;
  cfAngle       = 0;
  cfLastTime    = null;
  document.getElementById('angleValue').textContent = '—';
  document.getElementById('angleValue').className   = 'angle-value';
  document.getElementById('peakLabel').textContent  = '';
  document.getElementById('tiltWarning').textContent = '';
  document.querySelector('.angle-display').classList.remove('tilt-warn');
}

function refreshSheetUI() {
  const p        = state.active.phase;
  const strategy = getStrategy();
  const show     = (id, v) => { document.getElementById(id).style.display = v ? '' : 'none'; };

  ['btnCalibrate', 'btnStopMeasure', 'rowMeasuringActions', 'rowVertical',
   'btnCaptureSeg1', 'rowSeg1', 'rowDone'].forEach(id => show(id, false));
  (strategy.show[p] || []).forEach(id => show(id, true));

  ['btnCalibrate', 'btnStopMeasure', 'btnStopVertical'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = tiltInvalid;
  });

  if (strategy.twoSeg) {
    const btn1 = document.getElementById('btnCaptureSeg1');
    const btn2 = document.getElementById('btnCaptureSeg2');
    if (btn1) btn1.textContent = strategy.btn1;
    if (btn2) btn2.innerHTML   = strategy.btn2;
  }

  const actives = strategy.twoSeg
    ? [p === 'idle', p === 'seg1', p === 'done']
    : [p === 'idle', p === 'measuring', p === 'done'];
  const dones = strategy.twoSeg
    ? [p === 'seg1' || p === 'done', p === 'done', false]
    : [p === 'measuring' || p === 'done', p === 'done', false];

  [1, 2, 3].forEach((n, i) => {
    document.getElementById('phaseStep' + n).className =
      'phase-step-item' + (actives[i] ? ' active' : '') + (dones[i] ? ' done' : '');
    document.getElementById('phaseDot' + n).className =
      'phase-dot' + (strategy.pulses && p === 'measuring' && n === 2 ? ' pulsing' : '');
    const lbl = document.getElementById('stepLabel' + n);
    if (lbl) lbl.textContent = strategy.steps[i];
  });
}

// ── Ángulo en vivo ────────────────────────────────────────────────────────
function updateLiveAngle() {
  const now = performance.now();
  if (now - lastDisplayUpdate < 50) return;
  lastDisplayUpdate = now;

  const { movementId, phase } = state.active;
  if (!movementId || !state.regionId || phase === 'done') return;

  const def      = REGIONS[state.regionId].movements[movementId];
  const strategy = STRATEGIES[def.measureType || 'standard'];
  const warn      = document.getElementById('tiltWarning');
  const displayEl = document.querySelector('.angle-display');
  const angleEl   = document.getElementById('angleValue');

  if (tiltInvalid) {
    warn.textContent = '⚠ fuera de plano';
    displayEl.classList.add('tilt-warn');
    angleEl.classList.add('tilt');
  } else {
    warn.textContent = '';
    displayEl.classList.remove('tilt-warn');
    angleEl.classList.remove('tilt');
  }

  if (phase === 'idle')      { const b = document.getElementById('btnCalibrate');    if (b) b.disabled = tiltInvalid; }
  if (phase === 'measuring') { const b = document.getElementById('btnStopMeasure');  if (b) b.disabled = tiltInvalid;
                               const v = document.getElementById('btnStopVertical'); if (v) v.disabled = tiltInvalid; }

  if (tiltInvalid && phase === 'measuring' && !strategy.twoSeg) return;

  const result = strategy.liveAngle(def);
  if (!result) return;

  if (result.isPreview) {
    angleEl.textContent = result.deg + '°';
    angleEl.className   = 'angle-value live';
    return;
  }
  if (result.isLive) {
    angleEl.textContent = result.deg + '°';
    angleEl.className   = 'angle-value live' + (tiltInvalid ? ' tilt' : '');
    return;
  }
  if (result.isSmoothed) {
    if (state.active.neutralRef === null) return;
    const { delta, base } = result;
    smoothedDelta = EMA_ALPHA * delta + (1 - EMA_ALPHA) * smoothedDelta;
    const deg = Math.round(smoothedDelta) + base;
    angleEl.textContent = deg + '°';
    if (phase === 'measuring' && smoothedDelta > state.active.peakDelta) {
      state.active.peakDelta = smoothedDelta;
      document.getElementById('peakLabel').textContent = 'Máx: ' + deg + '°';
    }
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

// ── Mediciones de dos segmentos y PKB ────────────────────────────────────

// Inclinación del segmento respecto a la horizontal absoluta (teléfono plano, pantalla arriba).
// atan2(grav.y, grav.z): positivo cuando el extremo superior (top) se despega,
// negativo cuando lo hace el inferior. Rango ±180°; discontinuidad en ±180° (pantalla abajo).
function segmentInclination() {
  const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
  if (gTotal < 0.5) return 0;
  return Math.atan2(grav.y, grav.z) * 180 / Math.PI;
}

// Inclinación del segmento respecto a la vertical absoluta (teléfono de canto en landscape, pantalla sagital).
// acos(|grav.x| / gTotal): 0° cuando el eje corto del teléfono está vertical (landscape), aumenta al inclinar.
function verticalInclination() {
  const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
  if (gTotal < 0.5) return 0;
  return Math.acos(Math.min(1, Math.abs(grav.x) / gTotal)) * 180 / Math.PI;
}

// Magnitud desde grav.x (0 deg cuando el telefono esta vertical en landscape); signo desde -grav.y (positivo = flexion, negativo = extension).
function signedVerticalInclination() {
  const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
  if (gTotal < 0.5) return 0;
  return Math.acos(Math.min(1, Math.abs(grav.x) / gTotal)) * 180 / Math.PI * -Math.sign(grav.y);
}

function captureSegment1() {
  const def      = REGIONS[state.regionId].movements[state.active.movementId];
  const strategy = STRATEGIES[def.measureType || 'standard'];
  const val = strategy.capture1(def);
  state.active.seg1Value = val;
  state.active.phase = 'seg1';
  document.getElementById('angleValue').textContent = '—';
  document.getElementById('angleValue').className   = 'angle-value live';
  document.getElementById('peakLabel').textContent  = strategy.seg1Label + ': ' + Math.round(val) + '°';
  refreshSheetUI();
}

function captureSegment2() {
  const def      = REGIONS[state.regionId].movements[state.active.movementId];
  const strategy = STRATEGIES[def.measureType || 'standard'];
  const { result, seg1, seg2 } = strategy.capture2(def, state.active.seg1Value);
  const side = effectiveSide(def);
  const mode = effectiveMode(def);
  state.segmentData[state.regionId][state.active.movementId][side][mode] = { seg1: Math.round(seg1), seg2: Math.round(seg2) };
  state.active.result = result;
  state.active.phase  = 'done';
  document.getElementById('angleValue').textContent = result + '°';
  document.getElementById('angleValue').className   = 'angle-value done';
  document.getElementById('peakLabel').textContent  = '';
  refreshSheetUI();
}

// ── Export ────────────────────────────────────────────────────────────────
function hasAnySlot(regionId) {
  return Object.values(state.measurements[regionId] || {}).some(mov =>
    Object.values(mov).some(sideSlots => Object.values(sideSlots).some(v => v !== null))
  );
}

function buildROMPayload() {
  const measured = Object.entries(REGIONS).filter(([id]) => hasAnySlot(id));
  return {
    src:     'physiq-motion',
    patient: document.getElementById('patientName').value.trim(),
    fecha:   new Date().toLocaleDateString('es-ES'),
    regions: Object.fromEntries(
      measured.map(([id, def]) => {
        const movEntries = Object.entries(def.movements).map(([movId, movDef]) => {
          const meas  = state.measurements[id][movId];
          const sides = movDef.bilateral ? ['izquierda', 'derecha'] : ['centro'];
          const slots = Object.fromEntries(sides.map(side => [
            side,
            Object.fromEntries(movDef.modes.map(mode => {
              const v = meas[side][mode];
              return [mode, v !== null ? { value: v, deficit: v < movDef.ref * 0.9 } : null];
            }))
          ]));
          const hasValue = sides.some(s => movDef.modes.some(m => meas[s][m] !== null));
          if (!hasValue) return null;
          return [movId, { label: movDef.label, ref: movDef.ref, bilateral: movDef.bilateral, modes: movDef.modes, slots }];
        }).filter(Boolean);
        return [id, { label: def.label, rom: Object.fromEntries(movEntries) }];
      })
    )
  };
}

function copyContextToClipboard() {
  const rom = buildROMPayload();
  const patient = rom.patient ? `\nPaciente: ${rom.patient}` : '';
  const sideLabel = { izquierda: 'Izq.', derecha: 'Der.', centro: '' };
  const modeLabel = { activa: 'Act.', pasiva: 'Pas.' };
  const regions = Object.values(rom.regions).map(r => {
    const lines = [];
    Object.values(r.rom).forEach(m => {
      const sides = m.bilateral ? ['izquierda', 'derecha'] : ['centro'];
      sides.forEach(side => m.modes.forEach(mode => {
        const slot = m.slots[side]?.[mode];
        if (!slot) return;
        const parts = [m.label, m.bilateral ? sideLabel[side] : '', m.modes.length > 1 ? modeLabel[mode] : ''].filter(Boolean);
        lines.push(`  ${parts.join(' ')}: ${slot.value}°  (ref ${m.ref}°)${slot.deficit ? ' ⚠' : ''}`);
      }));
    });
    return `${r.label}:\n${lines.join('\n')}`;
  }).join('\n\n');
  const text = `MEDICIÓN PhysiQ-Motion${patient}\nFecha: ${rom.fecha}\n\n${regions}`;
  navigator.clipboard.writeText(text).then(() => showCopyFeedback());
}

function showCopyFeedback() {
  const existing = document.getElementById('copyFeedback');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'copyFeedback';
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--accent2);color:var(--accent2);font-size:0.8rem;font-family:\'Outfit\',sans-serif;padding:10px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.4);';
  toast.textContent = '✓ Mediciones copiadas al portapapeles';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Session chip ──────────────────────────────────────────────────────────────
let _sessionLabel = '';

function updateSessionChip(session) {
  const btn = document.getElementById('sessionBtn');
  if (!btn) return;
  if (!session || !session.patient) { _sessionLabel = ''; btn.classList.remove('active'); }
  else { _sessionLabel = `${session.patient} · ${session.date || '—'}`; btn.classList.add('active'); }
  _updateSessionPanelTitle();
}

function _updateSessionPanelTitle() {
  const panelTitle = document.getElementById('sessionPanelTitle');
  const panel      = document.getElementById('sessionPanel');
  if (!panelTitle) return;
  const name = (document.getElementById('patientName')?.value || '').trim();
  if (name) {
    panelTitle.textContent = `${name} · ${new Date().toLocaleDateString('es-ES')}`;
    panel?.classList.add('has-session');
  } else {
    panelTitle.textContent = 'Sin sesión activa';
    panel?.classList.remove('has-session');
  }
}

function _openSessionSheet() {
  const overlay = document.getElementById('sessionPanelOverlay');
  if (!overlay || overlay.classList.contains('open')) return;
  overlay.classList.add('open');
  lockBodyScroll();
  setTimeout(() => document.getElementById('patientName')?.focus(), 60);
}

function closeSessionPanel() {
  const panel   = document.getElementById('sessionPanel');
  const overlay = document.getElementById('sessionPanelOverlay');
  const wasOpen = overlay?.classList.contains('open');
  overlay?.classList.remove('open');
  if (wasOpen) unlockBodyScroll();
  if (panel) { panel.style.transition = ''; panel.style.transform = ''; }
}

function toggleSessionPanel() {
  const overlay = document.getElementById('sessionPanelOverlay');
  if (!overlay) return;
  if (overlay.classList.contains('open')) { closeSessionPanel(); return; }
  if ((document.getElementById('patientName')?.value || '').trim()) {
    _showSessionInfoBanner();
  } else {
    _openSessionSheet();
  }
}

function _showSessionInfoBanner() {
  const existing = document.getElementById('sessionInfoBanner');
  if (existing) existing.remove();
  const label = _sessionLabel || `${(document.getElementById('patientName')?.value || '').trim()} · ${new Date().toLocaleDateString('es-ES')}`;
  const overlay = document.createElement('div');
  overlay.className = 'confirm-banner';
  overlay.id = 'sessionInfoBanner';
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-box-title">Sesión en curso</div>
      <div class="confirm-box-text">${label}</div>
      <div class="confirm-box-btns" style="justify-content:stretch;gap:0.5rem;">
        <button class="confirm-btn-cancel" id="sib-cancel" style="flex:1;">Cancelar</button>
        <button class="confirm-btn-ok" id="sib-edit" style="flex:1;">Editar</button>
        <button class="confirm-btn-cancel" id="sib-delete" style="flex:1;color:var(--red);border-color:var(--red);">Borrar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  lockBodyScroll();
  window.parent.postMessage({ type: 'PHYSIQ_WIDGET_HIDE' }, '*');
  const dismiss = () => { overlay.remove(); unlockBodyScroll(); window.parent.postMessage({ type: 'PHYSIQ_WIDGET_SHOW' }, '*'); };
  document.getElementById('sib-cancel').onclick = dismiss;
  document.getElementById('sib-edit').onclick   = () => { dismiss(); _openSessionSheet(); };
  document.getElementById('sib-delete').onclick = () => { dismiss(); promptClearSession(); };
}

function promptClearSession() {
  closeSessionPanel();
  showConfirmBanner(
    'Sesión en curso',
    `${_sessionLabel}<br>¿Borrar y empezar de nuevo?`,
    'Borrar sesión',
    () => {
      clearTimeout(_idbSyncTimer);
      _idbSyncTimer = null;
      _sessionGen++;
      _sessionCleared = true;
      clearAllSlots(state.measurements);
      clearAllSlots(state.segmentData);
      const el = document.getElementById('patientName');
      if (el) el.value = '';
      if (state.regionId !== null) {
        state.regionId = null;
        document.getElementById('measureScreen').style.display = 'none';
        document.getElementById('regionScreen').style.display = '';
        document.querySelector('main').classList.remove('in-measure');
        if (history.state?.view === 'measure') history.back();
      }
      renderRegionGrid();
      clearSession().then(() => {
        updateSessionChip(null);
        _sessionCh.postMessage({ type: 'SESSION_ROM', rom: null });
        _sessionCh.postMessage({ type: 'SESSION_CLEAR' });
      });
    }
  );
}

function promptSoftResetMotion() {
  showConfirmBanner(
    '↺ Borrar mediciones',
    'Se eliminarán las mediciones de ROM. Los datos de otros satélites se conservarán.',
    'Borrar',
    () => {
      clearAllSlots(state.measurements);
      clearAllSlots(state.segmentData);
      if (state.regionId !== null) {
        state.regionId = null;
        document.getElementById('measureScreen').style.display = 'none';
        document.getElementById('regionScreen').style.display = '';
        document.querySelector('main').classList.remove('in-measure');
        if (history.state?.view === 'measure') history.back();
      }
      renderRegionGrid();
      writeSession({ rom: null }).then(session => {
        updateSessionChip(session);
        _sessionCh.postMessage({ type: 'SESSION_ROM', rom: null });
      });
    }
  );
}

// ── IDB sync ─────────────────────────────────────────────────────────────────
let _idbSyncTimer   = null;
let _sessionGen     = 0;    // incremented on clear; stale writeSession .then() calls detect mismatch
let _sessionCleared = false; // true after a clear; blocks new writes until real data appears

const _sessionCh = new BroadcastChannel('physiq-session');
_sessionCh.onmessage = ({ data }) => {
  if (data.type === 'SESSION_CLEAR') {
    clearTimeout(_idbSyncTimer);
    _idbSyncTimer = null;
    _sessionGen++;
    _sessionCleared = true;
    clearSession();
    clearAllSlots(state.measurements);
    clearAllSlots(state.segmentData);
    const el = document.getElementById('patientName');
    if (el) el.value = '';
    if (state.regionId !== null) {
      state.regionId = null;
      document.getElementById('measureScreen').style.display = 'none';
      document.getElementById('regionScreen').style.display = '';
      document.querySelector('main').classList.remove('in-measure');
      if (history.state?.view === 'measure') history.back();
    }
    renderRegionGrid();
    updateSessionChip(null);
    return;
  }
  if (data.type === 'SESSION_ROM') {
    if (data.rom?.regions && Object.keys(data.rom.regions).length > 0) {
      clearAllSlots(state.measurements);
      clearAllSlots(state.segmentData);
      Object.entries(data.rom.regions).forEach(([regionId, regionData]) => {
        if (!state.measurements[regionId]) return;
        Object.entries(regionData.rom || {}).forEach(([movId, movData]) => {
          if (!movData || !state.measurements[regionId][movId]) return;
          Object.entries(movData.slots || {}).forEach(([side, sideSlots]) => {
            if (!state.measurements[regionId][movId][side]) return;
            Object.entries(sideSlots || {}).forEach(([mode, slotData]) => {
              if (slotData?.value != null)
                state.measurements[regionId][movId][side][mode] = slotData.value;
            });
          });
        });
      });
    } else {
      clearAllSlots(state.measurements);
      clearAllSlots(state.segmentData);
    }
    renderRegionGrid();
    if (state.regionId !== null) renderMovementGrid();
    updateSessionChip({
      patient: document.getElementById('patientName')?.value.trim() || '',
      date: new Date().toLocaleDateString('es-ES')
    });
    return;
  }
  if (data.type !== 'SESSION_PATIENT') return;
  const el = document.getElementById('patientName');
  if (!el || document.activeElement === el) return;
  el.value = data.patient || '';
  if (!data.patient) { _updateSessionPanelTitle(); return; }
  updateSession({ patient: data.patient }).then(session => {
    if (session) updateSessionChip(session);
  });
};

function scheduleIDBSync() {
  clearTimeout(_idbSyncTimer);
  _idbSyncTimer = setTimeout(() => {
    const patient = document.getElementById('patientName')?.value.trim() || '';
    const date    = new Date().toLocaleDateString('es-ES');
    const rom     = buildROMPayload();
    const hasMeasurements = Object.keys(rom.regions).length > 0;
    if (!patient && !hasMeasurements) return;
    if (patient) _sessionCh.postMessage({ type: 'SESSION_PATIENT', patient });
    _sessionCh.postMessage({ type: 'SESSION_ROM', rom });
    if (!patient) return;
    if (_sessionCleared) _sessionCleared = false;
    const gen = _sessionGen;
    writeSession({ patient, date, rom }).then(session => {
      if (_sessionGen !== gen) { clearSession(); return; }
      if (session) updateSessionChip(session);
    });
  }, 800);
}

function showConfirmBanner(title, text, actionLabel, onConfirm) {
  const existing = document.getElementById('confirmBanner');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'confirm-banner';
  overlay.id = 'confirmBanner';
  overlay.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-box-title">${title}</div>
      <div class="confirm-box-text">${text}</div>
      <div class="confirm-box-btns">
        <button class="confirm-btn-cancel" id="confirmCancel">Cancelar</button>
        <button class="confirm-btn-ok" id="confirmAction">${actionLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  lockBodyScroll();
  window.parent.postMessage({ type: 'PHYSIQ_WIDGET_HIDE' }, '*');
  const dismiss = () => { overlay.remove(); unlockBodyScroll(); window.parent.postMessage({ type: 'PHYSIQ_WIDGET_SHOW' }, '*'); };
  document.getElementById('confirmCancel').onclick = dismiss;
  document.getElementById('confirmAction').onclick = () => { dismiss(); onConfirm(); };
}

// ─── TRANSLATE BANNER ────────────────────────────────────
let _translateTimer = null;
function handleTranslateClick() {
  if (window.innerWidth > 768) return;
  const banner = document.getElementById('translateBanner');
  if (!banner) return;
  banner.classList.add('visible');
  clearTimeout(_translateTimer);
  _translateTimer = setTimeout(hideTranslateBanner, 4000);
}
function hideTranslateBanner() {
  clearTimeout(_translateTimer);
  const banner = document.getElementById('translateBanner');
  if (banner) banner.classList.remove('visible');
}

// ========= SWIPE-TO-DISMISS BOTTOM SHEET =========
(function () {
  function initSwipe(sheet, closeFn) {
    let startY = 0, startTime = 0, dragging = false, delta = 0, snapTimer = null;
    const EASE = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';

    sheet.addEventListener('touchstart', e => {
      if (e.touches[0].clientY - sheet.getBoundingClientRect().top > 72) return;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      delta = 0;
      dragging = true;
      clearTimeout(snapTimer);
      sheet.style.transition = 'none';
    }, { passive: true });

    sheet.addEventListener('touchmove', e => {
      if (!dragging) return;
      delta = Math.max(0, e.touches[0].clientY - startY);
      sheet.style.transform = delta > 0 ? `translateY(${delta}px)` : 'translateY(0)';
    }, { passive: true });

    function onRelease() {
      if (!dragging) return;
      dragging = false;
      const velocity = delta / (Date.now() - startTime);
      if (delta > 80 || velocity > 0.3) {
        sheet.style.transition = EASE;
        sheet.style.transform = 'translateY(110%)';
        setTimeout(() => {
          sheet.style.transition = 'none';
          closeFn();
          sheet.style.transform = '';
          sheet.style.transition = '';
        }, 300);
      } else {
        sheet.style.transition = EASE;
        sheet.style.transform = 'translateY(0)';
        snapTimer = setTimeout(() => {
          sheet.style.transform = '';
          sheet.style.transition = '';
        }, 310);
      }
    }

    sheet.addEventListener('touchend', onRelease, { passive: true });
    sheet.addEventListener('touchcancel', () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transform = '';
      sheet.style.transition = '';
    }, { passive: true });
  }

  const sheet = document.getElementById('measureSheet');
  if (sheet) initSwipe(sheet, closeMeasurement);
}());

