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
      flexion:   { label: 'Flexión',        axis: 'gravity',      phoneOrientation: 'alpha-rotation', ref: 50, icon: '⬇', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono <strong>de canto contra la sien</strong>, pantalla hacia fuera. El paciente parte de posición neutra e inclina la cabeza hacia adelante hasta su rango máximo.' },
      extension: { label: 'Extensión',      axis: 'gravity',      phoneOrientation: 'alpha-rotation', ref: 60, icon: '⬆', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono <strong>de canto contra la sien</strong>, pantalla hacia fuera. El paciente parte de posición neutra e inclina la cabeza hacia atrás hasta su rango máximo.' },
      lat_izq:   { label: 'Lat. Izquierda', axis: 'gravity',      phoneOrientation: 'alpha-rotation', ref: 45, icon: '↙', placement: 'frontal-vertical',  instruction: 'Coloca el teléfono <strong>contra la frente</strong>, pantalla hacia el examinador. El paciente inclina la cabeza lateralmente hacia la izquierda hasta su rango máximo.' },
      lat_der:   { label: 'Lat. Derecha',   axis: 'gravity',      phoneOrientation: 'alpha-rotation', ref: 45, icon: '↘', placement: 'frontal-vertical',  instruction: 'Coloca el teléfono <strong>contra la frente</strong>, pantalla hacia el examinador. El paciente inclina la cabeza lateralmente hacia la derecha hasta su rango máximo.' },
      rot_izq:   { label: 'Rotación Izq.',  axis: 'alpha', phoneOrientation: 'horizontal', ref: 80, icon: '↺', placement: 'flat-left',         instruction: 'Coloca el teléfono <strong>plano sobre la cabeza del paciente con la pantalla hacia arriba</strong>. El paciente rota lentamente la cabeza hacia la izquierda hasta su rango máximo.' },
      rot_der:   { label: 'Rotación Der.',  axis: 'alpha', phoneOrientation: 'horizontal', ref: 80, icon: '↻', placement: 'flat-right',        instruction: 'Coloca el teléfono <strong>plano sobre la cabeza del paciente con la pantalla hacia arriba</strong>. El paciente rota lentamente la cabeza hacia la derecha hasta su rango máximo.' }
    }
  },
  hombro: {
    label: 'Hombro', abbr: 'Hb',
    groups: [
      { label: 'Flexión',  ids: ['flexion']            },
      { label: 'Rotación', ids: ['rot_ext', 'rot_int'] }
    ],
    movements: {
      flexion:  {
        label: 'Flexión', measureType: 'beta-zero', neutralAngle: -90,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 170, icon: '⬆',
        instruction: 'Paciente en supino. Coloca el teléfono sobre la <strong>cara anterior del brazo</strong>, pantalla mirando al frente (plano coronal), borde superior hacia craneal. El ángulo parte de 0° con el brazo a lo largo del cuerpo (teléfono boca abajo). Eleva el brazo hasta el rango máximo y pulsa <em>Detener</em>.'
      },
      rot_ext: {
        label: 'Rot. Externa', measureType: 'beta-zero', neutralAngle: 180,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 90, icon: '↻',
        instruction: 'Paciente en supino, brazo en 90° de abducción y 90° de flexión de codo (antebrazo vertical). Coloca el teléfono sobre la <strong>cara anterior del antebrazo</strong>, pantalla mirando al frente, borde superior hacia la mano. El ángulo parte de 0° con el antebrazo vertical. Rota externamente hasta el rango máximo y pulsa <em>Detener</em>.'
      },
      rot_int: {
        label: 'Rot. Interna', measureType: 'beta-zero', neutralAngle: 180,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 80, icon: '↺',
        instruction: 'Paciente en supino, brazo en 90° de abducción y 90° de flexión de codo (antebrazo vertical). Coloca el teléfono sobre la <strong>cara anterior del antebrazo</strong>, pantalla mirando al frente, borde superior hacia la mano. El ángulo parte de 0° con el antebrazo vertical. Rota internamente hasta el rango máximo y pulsa <em>Detener</em>.'
      }
    }
  },
  codo: {
    label: 'Codo', abbr: 'Co',
    groups: [
      { label: 'Flexo-extensión', ids: ['flexion', 'extension']   },
      { label: 'Pronosupinación', ids: ['pronacion', 'supinacion'] }
    ],
    movements: {
      flexion:   { label: 'Flexión',    axis: 'gravity', phoneOrientation: 'beta-rotation', ref: 145, icon: '⬇', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono sobre el antebrazo con la <strong>pantalla paralela al plano frontal</strong>. Calibra con el codo en extensión completa y flexiona hasta el rango máximo.' },
      extension: { label: 'Extensión',  axis: 'gravity', phoneOrientation: 'beta-rotation', ref: 5,   icon: '⬆', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono sobre el antebrazo con la <strong>pantalla paralela al plano frontal</strong>. Calibra con el codo en posición inicial y extiende hasta el rango máximo.' },
      pronacion: {
        label: 'Pronación', axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 80, icon: '↻',
        instruction: 'Paciente sentado, codo a 90°, brazo pegado al cuerpo, posición neutra (pulgar hacia arriba). Apoya el <strong>borde inferior del teléfono sobre el dorso de la mano</strong>, pantalla en el plano frontal. Pulsa <em>Calibrar neutro</em> y lleva la palma hacia abajo (pronación) hasta el rango máximo.'
      },
      supinacion: {
        label: 'Supinación', axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 80, icon: '↺',
        instruction: 'Paciente sentado, codo a 90°, brazo pegado al cuerpo, posición neutra (pulgar hacia arriba). Apoya el <strong>borde inferior del teléfono sobre el dorso de la mano</strong>, pantalla en el plano frontal. Pulsa <em>Calibrar neutro</em> y lleva la palma hacia arriba (supinación) hasta el rango máximo.'
      }
    }
  },
  muneca: {
    label: 'Muñeca', abbr: 'Mn',
    groups: [
      { label: 'Flexo-extensión', ids: ['flexion', 'extension'] },
      { label: 'Desviación',      ids: ['desv_rad', 'desv_cub'] }
    ],
    movements: {
      flexion:   {
        label: 'Flexión',   axis: 'gravity', phoneOrientation: 'beta-rotation', ref: 70, icon: '⬇',
        instruction: 'Paciente sentado, antebrazo en pronación apoyado sobre la camilla, mano libre al borde. Coloca el teléfono <strong>de canto sobre el dorso de la mano</strong>, pantalla paralela al plano frontal. Calibra con la muñeca en posición neutra y flexiona hasta el rango máximo.'
      },
      extension: {
        label: 'Extensión', axis: 'gravity', phoneOrientation: 'beta-rotation', ref: 70, icon: '⬆',
        instruction: 'Paciente sentado, antebrazo en pronación apoyado sobre la camilla, mano libre al borde. Coloca el teléfono <strong>de canto sobre el dorso de la mano</strong>, pantalla paralela al plano frontal. Calibra con la muñeca en posición neutra y extiende hasta el rango máximo.'
      },
      desv_rad:  {
        label: 'Desv. Radial',  axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 20, icon: '↗',
        instruction: 'Paciente sentado, antebrazo en <strong>pronosupinación neutra</strong> (posición de estrechar la mano), apoyado sobre el borde cubital. Apoya el <strong>borde corto inferior del teléfono sobre el borde radial de la mano</strong> (lado del pulgar), con la pantalla en el plano sagital hacia el examinador. Calibra con la muñeca en posición neutra y desviá radialmente hasta el rango máximo.'
      },
      desv_cub:  {
        label: 'Desv. Cubital', axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 35, icon: '↙',
        instruction: 'Paciente sentado, antebrazo en <strong>pronosupinación neutra</strong> (posición de estrechar la mano), apoyado sobre el borde cubital. Apoya el <strong>borde corto inferior del teléfono sobre el borde radial de la mano</strong> (lado del pulgar), con la pantalla en el plano sagital hacia el examinador. Calibra con la muñeca en posición neutra y desviá cubitalmente hasta el rango máximo.'
      }
    }
  },
  cadera: {
    label: 'Cadera', abbr: 'Cd',
    groups: [
      { label: 'Flexión',                 ids: ['flex_supino']                        },
      { label: 'Abducción',               ids: ['abd_supino']                         },
      { label: 'Rotación en supino',      ids: ['rot_ext_supino', 'rot_int_supino']   },
      { label: 'Rotación en sedestación', ids: ['rot_ext_sed',    'rot_int_sed']      }
    ],
    movements: {
      flex_supino: {
        label: 'Flexión', measureType: 'beta-zero', neutralAngle: 90,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 120, icon: '⬆',
        instruction: 'Paciente en decúbito supino, rodilla flexionada. Coloca el teléfono <strong>plano sobre la cara anterior del muslo</strong>, pantalla hacia arriba. El ángulo parte de 0° con el muslo horizontal. Flexiona la cadera hasta el rango máximo y pulsa <em>Detener</em>.'
      },
      abd_supino: {
        label: 'Abducción',
        axis: 'alpha', phoneOrientation: 'horizontal', ref: 45, icon: '↗',
        instruction: 'Paciente en decúbito supino, pierna en posición neutra. Coloca el teléfono <strong>plano sobre la cara anterior del muslo</strong>, pantalla hacia arriba. Pulsa <em>Calibrar neutro</em> con la pierna alineada y separa lateralmente hasta el rango máximo. Evita superficies metálicas cercanas.'
      },
      rot_ext_supino: {
        label: 'Rot. Externa',
        axis: 'alpha', phoneOrientation: 'horizontal', ref: 45, icon: '↻',
        instruction: 'Paciente en supino, cadera y rodilla a 90° (muslo vertical, pierna horizontal). Coloca el teléfono <strong>plano sobre la cara anterior de la tibia</strong>, pantalla hacia arriba. Pulsa <em>Calibrar neutro</em> con la pierna en posición neutra y rota externamente hasta el rango máximo. Evita superficies metálicas cercanas.'
      },
      rot_int_supino: {
        label: 'Rot. Interna',
        axis: 'alpha', phoneOrientation: 'horizontal', ref: 45, icon: '↺',
        instruction: 'Paciente en supino, cadera y rodilla a 90° (muslo vertical, pierna horizontal). Coloca el teléfono <strong>plano sobre la cara anterior de la tibia</strong>, pantalla hacia arriba. Pulsa <em>Calibrar neutro</em> con la pierna en posición neutra y rota internamente hasta el rango máximo. Evita superficies metálicas cercanas.'
      },
      rot_ext_sed: {
        label: 'Rot. Externa',
        measureType: 'beta-zero', neutralAngle: 180,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 45, icon: '↻',
        instruction: 'Paciente sentado al borde de la camilla, rodilla a 90° y pierna colgando. Coloca el teléfono <strong>de canto sobre la cara anterior de la tibia</strong>, paralelo al plano sagital, pantalla hacia el lateral. Pulsa <em>Calibrar neutro</em> con la pierna en posición neutra y lleva el pie hacia afuera hasta el rango máximo.'
      },
      rot_int_sed: {
        label: 'Rot. Interna',
        measureType: 'beta-zero', neutralAngle: 180,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 45, icon: '↺',
        instruction: 'Paciente sentado al borde de la camilla, rodilla a 90° y pierna colgando. Coloca el teléfono <strong>de canto sobre la cara anterior de la tibia</strong>, paralelo al plano sagital, pantalla hacia el lateral. Pulsa <em>Calibrar neutro</em> con la pierna en posición neutra y lleva el pie hacia adentro hasta el rango máximo.'
      }
    }
  },
  rodilla: {
    label: 'Rodilla', abbr: 'Rd',
    groups: [
      { label: 'Flexión',   ids: ['flexion', 'pkb'] },
      { label: 'Extensión', ids: ['extension']       }
    ],
    movements: {
      extension: {
        label: 'Extensión', measureType: 'two-segment-signed',
        phoneOrientation: 'none', ref: 0, skipStatus: true, icon: '⬆',
        instruction: '<strong>Paso 1</strong> — coloca el teléfono <strong>plano sobre el muslo</strong>, pantalla hacia arriba. Pulsa <em>Capturar muslo</em>.<br><strong>Paso 2</strong> — sin mover al paciente, coloca el teléfono igual <strong>sobre la tibia</strong>. Resultado: positivo = déficit de extensión; negativo = hiperextensión.'
      },
      flexion: {
        label: 'Flexión', measureType: 'two-segment-abs',
        phoneOrientation: 'none', ref: 135, icon: '⬇',
        instruction: 'Con la rodilla en posición de máxima flexión. <strong>Paso 1</strong> — coloca el teléfono <strong>plano sobre el muslo</strong>, pantalla hacia arriba. Pulsa <em>Capturar muslo</em>.<br><strong>Paso 2</strong> — sin mover al paciente, coloca el teléfono <strong>plano sobre la tibia</strong>, pantalla hacia arriba.'
      },
      pkb: {
        label: 'PKB', measureType: 'gravity-vertical', axis: 'gravity',
        phoneOrientation: 'alpha-rotation', ref: 135, icon: '↗', baseAngle: 90,
        instruction: 'Paciente en <strong>decúbito prono</strong>, rodilla a 90°. Coloca el teléfono <strong>de canto sobre la tibia</strong>, pantalla hacia el examinador. El ángulo parte de 90°. Pulsa <em>Iniciar</em> y flexiona la rodilla hasta el rango máximo.'
      }
    }
  },
  tobillo: {
    label: 'Tobillo', abbr: 'Tb',
    groups: [
      { label: 'Dorsi / Plantar', ids: ['dorsiflexion', 'plantarflexion'] }
    ],
    movements: {
      dorsiflexion:   { label: 'Dorsiflexión',   measureType: 'gravity-vertical', axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 20, icon: '⬆', instruction: 'Coloca el teléfono <strong>de canto sobre la tibia</strong>, pantalla hacia el examinador (lateral). Con la tibia a 90° el ángulo es 0°. Pulsa <em>Iniciar</em> y realiza la dorsiflexión hasta el rango máximo.' },
      plantarflexion: { label: 'Plantarflexión', measureType: 'gravity-vertical', axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 50, icon: '⬇', instruction: 'Coloca el teléfono <strong>de canto sobre la tibia</strong>, pantalla hacia el examinador (lateral). Con la tibia a 90° el ángulo es 0°. Pulsa <em>Iniciar</em> y realiza la plantarflexión hasta el rango máximo.' }
    }
  },
  lumbar: {
    label: 'Lumbar', abbr: 'Lb',
    groups: [
      { label: 'Flexión', ids: ['flexion'] }
    ],
    movements: {
      flexion: {
        label: 'Flexión', measureType: 'two-segment-vertical',
        phoneOrientation: 'alpha-rotation', ref: 60, icon: '⬇',
        instruction: 'Paciente de pie, pies a la anchura de los hombros, rodillas en extensión. Se inclina hacia adelante al máximo y <strong>mantiene la posición</strong>.<br><strong>Paso 1</strong> — coloca el teléfono en <strong>modo landscape</strong>, apoya el borde largo sobre <strong>S1</strong> (a nivel de los hoyuelos sacros), pantalla en el plano sagital. Pulsa <em>Capturar S1</em>.<br><strong>Paso 2</strong> — sin mover al paciente, coloca el teléfono igual sobre <strong>T12/L1</strong> (última costilla → espina). Resultado = ángulo T12 − ángulo S1 (flexión lumbar pura).'
      }
    }
  }
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
  segmentData: Object.fromEntries(
    Object.entries(REGIONS).map(([id, def]) => [
      id,
      Object.fromEntries(Object.keys(def.movements).map(k => [k, null]))
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
let sensorStarted = false;
let sensorSeen    = false;
let tiltInvalid   = false;
let lastDisplayUpdate = 0;

// Suavizado de la visualización
const EMA_ALPHA  = 0.5;
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
      const def  = region.movements[id];
      const val  = meas[id];
      if (val !== null) done++;
      grid.appendChild(buildCard(id, def, val, cardIndex++));
    });
    if (group.ids.length === 1) {
      const filler = document.createElement('div');
      filler.className = 'movement-card-filler';
      filler.innerHTML = '<span>— sin más —</span>';
      grid.appendChild(filler);
    }
  });

  const total = Object.keys(region.movements).length;
  document.getElementById('completionBadge').textContent = `${done} / ${total}`;
  const any = Object.values(meas).some(v => v !== null);
  document.getElementById('summaryCard').style.display = any ? 'block' : 'none';
  if (any) renderSummaryTable();
}

function buildCard(id, def, val, i) {
  const card = document.createElement('div');
  const status = def.skipStatus ? '' : statusFor(val, def.ref);
  card.className = 'movement-card' + (val !== null && status ? ' ' + status : '');
  card.style.animationDelay = (i * 0.05) + 's';

  const badgeHtml = val !== null && !def.skipStatus ? badgeFor(val, def.ref) : '';
  const valueHtml = val !== null
    ? `<div class="mov-value ${status}">${val}°</div>`
    : `<div class="mov-value">—</div>`;
  const refHtml  = def.skipStatus ? '' : `<div class="mov-ref">Ref: ${def.ref}°</div>`;
  const btnCls   = val !== null ? 'btn-measure remeasure' : 'btn-measure';
  const btnLabel = val !== null ? 'Repetir' : 'Medir';

  const segs = val !== null ? state.segmentData[state.regionId]?.[id] : null;
  const isVert = def.measureType === 'two-segment-vertical';
  const segHtml = segs
    ? `<div class="mov-segments"><span>${isVert ? 'S1' : 'Muslo'} ${segs.seg1}°</span><span>${isVert ? 'T12' : 'Tibia'} ${segs.seg2}°</span></div>`
    : '';

  card.innerHTML = `
    <div class="mov-top">
      <div>
        <div class="mov-label">${def.label}</div>
        ${refHtml}
      </div>
      ${badgeHtml}
    </div>
    <div class="mov-value-row">${valueHtml}${segHtml}</div>
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
      <td>${def.skipStatus ? '—' : def.ref + '°'}</td>
      <td>${def.skipStatus ? '' : badgeFor(val, def.ref)}</td>`;
    tbody.appendChild(tr);
  });
}

// ── Overlay de medición ───────────────────────────────────────────────────
function openMeasurement(id) {
  const def   = REGIONS[state.regionId].movements[id];
  const mtype = def.measureType || 'standard';
  Object.assign(state.active, {
    movementId: id, phase: 'idle',
    neutralRef: null, gravRef: null, peakDelta: 0, result: null, seg1Value: null
  });
  tiltInvalid = false;

  document.getElementById('sheetTitle').textContent = def.label;
  document.getElementById('sheetInstruction').innerHTML = def.instruction || '';
  resetAngleDisplay();
  if (mtype === 'gravity-vertical') startVerticalMeasurement();
  else if (mtype === 'beta-zero')   startBetaZeroMeasurement();
  else refreshSheetUI();
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
  state.active.phase     = 'measuring';
  state.active.peakDelta = 0;
  smoothedDelta          = 0;
  document.getElementById('angleValue').textContent = '0°';
  document.getElementById('angleValue').className   = 'angle-value measuring';
  refreshSheetUI();
}


function startVerticalMeasurement() {
  const gTotal = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
  const ySign  = grav.y >= 0 ? 1 : -1;
  state.active.gravRef    = { x: 0, y: ySign, z: 0 };
  cfAngle = gTotal > 0.1
    ? Math.acos(Math.max(-1, Math.min(1, grav.y * ySign / gTotal))) * 180 / Math.PI
    : 0;
  state.active.neutralRef = 0;
  cfLastTime              = null;
  smoothedDelta           = cfAngle;
  state.active.phase      = 'measuring';
  state.active.peakDelta  = 0;
  document.getElementById('angleValue').className = 'angle-value measuring';
  refreshSheetUI();
}

function startBetaZeroMeasurement() {
  const mov = REGIONS[state.regionId].movements[state.active.movementId];
  state.active.neutralRef = mov.neutralAngle !== undefined ? mov.neutralAngle : 0;
  state.active.gravRef    = null;
  state.active.phase      = 'measuring';
  state.active.peakDelta  = 0;
  smoothedDelta           = 0;
  cfAngle                 = 0;
  cfLastTime              = null;
  document.getElementById('angleValue').className = 'angle-value measuring';
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
  state.measurements[state.regionId][state.active.movementId] = state.active.result;
  closeMeasurement();
  renderMovementGrid();
}

function redoMeasurement() {
  tiltInvalid = false;
  Object.assign(state.active, { phase: 'idle', neutralRef: null, gravRef: null, peakDelta: 0, result: null, seg1Value: null });
  resetAngleDisplay();
  const mtype = state.active.movementId && state.regionId
    ? (REGIONS[state.regionId].movements[state.active.movementId].measureType || 'standard')
    : 'standard';
  if (mtype === 'gravity-vertical') startVerticalMeasurement();
  else if (mtype === 'beta-zero')   startBetaZeroMeasurement();
  else refreshSheetUI();
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
  const p      = state.active.phase;
  const movId  = state.active.movementId;
  const mtype  = movId && state.regionId
    ? (REGIONS[state.regionId].movements[movId].measureType || 'standard')
    : 'standard';

  const show = (id, v) => { document.getElementById(id).style.display = v ? '' : 'none'; };

  const isTwoSeg = mtype === 'two-segment-signed' || mtype === 'two-segment-abs' || mtype === 'two-segment-vertical';
  const isVert   = mtype === 'two-segment-vertical';

  // button visibility
  show('btnCalibrate',      mtype === 'standard' && p === 'idle');
  document.getElementById('btnCalibrate').disabled = tiltInvalid && p === 'idle';
  show('btnStopMeasure',       mtype === 'standard' && p === 'measuring');
  document.getElementById('btnStopMeasure').disabled = tiltInvalid && p === 'measuring';
  show('rowMeasuringActions',  mtype === 'standard' && p === 'measuring');
  show('rowVertical',       (mtype === 'gravity-vertical' || mtype === 'beta-zero') && p === 'measuring');
  document.getElementById('btnStopVertical').disabled = tiltInvalid && p === 'measuring';
  show('btnCaptureSeg1',    isTwoSeg && p === 'idle');
  show('rowSeg1',           isTwoSeg && p === 'seg1');
  show('rowDone',           p === 'done');

  // etiquetas y handlers dinámicos de botones two-segment
  if (isTwoSeg) {
    const btn1 = document.getElementById('btnCaptureSeg1');
    const btn2 = document.getElementById('btnCaptureSeg2');
    if (isVert) {
      btn1.textContent = 'Capturar S1';
      if (btn2) { btn2.textContent = 'Capturar T12'; }
    } else {
      btn1.textContent = 'Capturar muslo';
      if (btn2) { btn2.innerHTML = '<span class="sheet-lbl-full">Capturar tibia</span><span class="sheet-lbl-short">Tibia</span>'; }
    }
  }

  // phase step labels and states
  const labels = isTwoSeg
    ? (isVert ? ['S1', 'T12', 'Listo'] : ['Muslo', 'Tibia', 'Listo'])
    : mtype === 'gravity-vertical' || mtype === 'beta-zero'
    ? ['Medir', 'Midiendo', 'Listo']
    : ['Neutro', 'Midiendo', 'Listo'];

  const actives = isTwoSeg
    ? [p === 'idle', p === 'seg1', p === 'done']
    : mtype === 'gravity-vertical'
    ? [p === 'idle', p === 'measuring', p === 'done']
    : [p === 'idle', p === 'measuring', p === 'done'];

  const dones = isTwoSeg
    ? [p === 'seg1' || p === 'done', p === 'done', false]
    : mtype === 'gravity-vertical'
    ? [p === 'measuring' || p === 'done', p === 'done', false]
    : [p === 'measuring' || p === 'done', p === 'done', false];

  [1, 2, 3].forEach((n, i) => {
    const el  = document.getElementById('phaseStep' + n);
    const dot = document.getElementById('phaseDot' + n);
    const lbl = document.getElementById('stepLabel' + n);
    if (lbl) lbl.textContent = labels[i];
    el.className  = 'phase-step-item' + (actives[i] ? ' active' : '') + (dones[i] ? ' done' : '');
    dot.className = 'phase-dot' + (
      (mtype === 'standard' || mtype === 'gravity-vertical' || mtype === 'beta-zero') && p === 'measuring' && n === 2 ? ' pulsing' : ''
    );
  });
}

// ── Ángulo en vivo ────────────────────────────────────────────────────────
function updateLiveAngle() {
  const now = performance.now();
  if (now - lastDisplayUpdate < 50) return;
  lastDisplayUpdate = now;

  const { movementId, phase } = state.active;
  if (!movementId || !state.regionId || phase === 'done') return;

  const def   = REGIONS[state.regionId].movements[movementId];
  const mtype = def.measureType || 'standard';

  // ── gravity-vertical: preview en idle, medición en measuring ─────────
  if (mtype === 'gravity-vertical') {
    if (phase === 'idle') {
      const gT = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2);
      if (gT > 0.1) {
        const yS   = grav.y >= 0 ? 1 : -1;
        const dot  = Math.max(-1, Math.min(1, grav.y * yS / gT));
        const base = def.baseAngle || 0;
        document.getElementById('angleValue').textContent = (Math.round(Math.acos(dot) * 180 / Math.PI) + base) + '°';
        document.getElementById('angleValue').className   = 'angle-value live';
      }
      return;
    }
    // En measuring/done cae al bloque estándar (usa cfAngle vía axis:'gravity')
  }

  // ── nuevos tipos: two-segment y pkb ──────────────────────────────────
  if (mtype === 'two-segment-signed' || mtype === 'two-segment-abs' || mtype === 'two-segment-vertical') {
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
    if (phase === 'idle' || phase === 'seg1') {
      let deg;
      if (mtype === 'two-segment-vertical') {
        deg = Math.round(verticalInclination());
      } else {
        deg = mtype === 'two-segment-abs'
          ? Math.round(Math.abs(segmentInclination()))
          : Math.round(segmentInclination());
      }
      angleEl.textContent = deg + '°';
      angleEl.className   = 'angle-value live' + (tiltInvalid ? ' tilt' : '');
    }
    return;
  }
  // ── tipo estándar ─────────────────────────────────────────────────────
  const { neutralRef } = state.active;
  if (phase === 'idle') {
    const warn      = document.getElementById('tiltWarning');
    const displayEl = document.querySelector('.angle-display');
    const btnCal    = document.getElementById('btnCalibrate');
    if (tiltInvalid) {
      warn.textContent = '⚠ fuera de plano';
      displayEl.classList.add('tilt-warn');
      if (btnCal) btnCal.disabled = true;
    } else {
      warn.textContent = '';
      displayEl.classList.remove('tilt-warn');
      if (btnCal) btnCal.disabled = false;
    }
    return;
  }
  if (neutralRef === null) return;

  const { axis } = def;
  const warn      = document.getElementById('tiltWarning');
  const angleEl   = document.getElementById('angleValue');
  const displayEl = document.querySelector('.angle-display');
  const shouldWarn = tiltInvalid && phase === 'measuring';
  if (phase === 'measuring') {
    if (mtype === 'standard') {
      document.getElementById('btnStopMeasure').disabled = tiltInvalid;
    } else {
      document.getElementById('btnStopVertical').disabled = tiltInvalid;
    }
  }
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
  const base = def.baseAngle || 0;
  const deg  = Math.round(smoothedDelta) + base;
  document.getElementById('angleValue').textContent = deg + '°';

  if (phase === 'measuring' && smoothedDelta > state.active.peakDelta) {
    state.active.peakDelta = smoothedDelta;
    document.getElementById('peakLabel').textContent = 'Máx: ' + (Math.round(smoothedDelta) + base) + '°';
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

function captureSegment1() {
  const mtype = REGIONS[state.regionId].movements[state.active.movementId].measureType;
  const val   = (mtype === 'two-segment-vertical') ? verticalInclination() : segmentInclination();
  state.active.seg1Value = val;
  state.active.phase = 'seg1';
  document.getElementById('angleValue').textContent = '—';
  document.getElementById('angleValue').className   = 'angle-value live';
  document.getElementById('peakLabel').textContent  =
    (mtype === 'two-segment-vertical' ? 'S1: ' : 'Muslo: ') + Math.round(val) + '°';
  refreshSheetUI();
}

function captureSegment2() {
  const { measureType } = REGIONS[state.regionId].movements[state.active.movementId];
  const seg1 = state.active.seg1Value;
  let result;
  
  if (measureType === 'two-segment-vertical') {
    const seg2 = verticalInclination();
    result = Math.max(0, Math.round(seg2 - seg1));
    state.segmentData[state.regionId][state.active.movementId] = { seg1: Math.round(seg1), seg2: Math.round(seg2) };
  } else if (measureType === 'two-segment-signed') {
    const seg2 = segmentInclination();
    result = Math.round(seg2 - seg1);
    state.segmentData[state.regionId][state.active.movementId] = { seg1: Math.round(seg1), seg2: Math.round(seg2) };
  } else {
    const seg2 = segmentInclination();
    result = Math.round(Math.min(180, Math.abs(seg1) + Math.abs(seg2)));
    state.segmentData[state.regionId][state.active.movementId] = { seg1: Math.round(seg1), seg2: Math.round(seg2) };
  }
  state.active.result = result;
  state.active.phase  = 'done';
  document.getElementById('angleValue').textContent = result + '°';
  document.getElementById('angleValue').className   = 'angle-value done';
  document.getElementById('peakLabel').textContent  = '';
  refreshSheetUI();
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
  const segs = state.segmentData[state.regionId];
  Object.keys(segs).forEach(k => { segs[k] = null; });
  document.getElementById('patientName').value = '';
  renderMovementGrid();
}
