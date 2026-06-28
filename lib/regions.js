'use strict';

// ── Regiones y movimientos ────────────────────────────────────────────────── 
const REGIONS = {
  cervical: {
    label: 'Cervical', abbr: 'Cx',
    groups: [
      { label: 'Flexo-extensión',     ids: ['flexion', 'extension'] },
      { label: 'Inclinación lateral', ids: ['lat']                  },
      { label: 'Rotación',            ids: ['rot']                  }
    ],
    movements: {
      flexion:   { label: 'Flexión',      bilateral: false, modes: ['activa', 'pasiva'], axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 50, icon: '⬇', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono <strong>de canto contra la sien</strong>, pantalla hacia fuera. El paciente parte de posición neutra e inclina la cabeza hacia adelante hasta su rango máximo.' },
      extension: { label: 'Extensión',    bilateral: false, modes: ['activa', 'pasiva'], axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 60, icon: '⬆', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono <strong>de canto contra la sien</strong>, pantalla hacia fuera. El paciente parte de posición neutra e inclina la cabeza hacia atrás hasta su rango máximo.' },
      lat:       { label: 'Inc. Lateral', bilateral: true,  modes: ['activa', 'pasiva'], axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 45, icon: '↔', placement: 'frontal-vertical',  instruction: 'Coloca el teléfono <strong>contra la frente</strong>, pantalla hacia el examinador. El paciente inclina la cabeza lateralmente hacia el <strong>lado seleccionado</strong> hasta su rango máximo.' },
      rot:       { label: 'Rotación',     bilateral: true,  modes: ['activa', 'pasiva'], axis: 'alpha',   phoneOrientation: 'horizontal',     ref: 80, icon: '↺', placement: 'flat-left',         instruction: 'Coloca el teléfono <strong>plano sobre la cabeza del paciente con la pantalla hacia arriba</strong>. El paciente rota lentamente la cabeza hacia el <strong>lado seleccionado</strong> hasta su rango máximo.' }
    }
  },
  hombro: {
    label: 'Hombro', abbr: 'Hb',
    groups: [
      { label: 'Flexión',  ids: ['flexion']            },
      { label: 'Rotación', ids: ['rot_ext', 'rot_int'] }
    ],
    movements: {
      flexion: {
        label: 'Flexión', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'beta-zero', neutralAngle: -90,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 170, icon: '⬆',
        instruction: 'Paciente en supino. Coloca el teléfono sobre la <strong>cara anterior del brazo</strong>, pantalla mirando al frente (plano coronal), borde superior hacia craneal. El ángulo parte de 0° con el brazo a lo largo del cuerpo (teléfono boca abajo). Eleva el brazo hasta el rango máximo y pulsa <em>Detener</em>.'
      },
      rot_ext: {
        label: 'Rot. Externa', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'beta-zero', neutralAngle: 180,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 90, icon: '↻',
        instruction: 'Paciente en supino, brazo en 90° de abducción y 90° de flexión de codo (antebrazo vertical). Coloca el teléfono sobre la <strong>cara anterior del antebrazo</strong>, pantalla mirando al frente, borde superior hacia la mano. El ángulo parte de 0° con el antebrazo vertical. Rota externamente hasta el rango máximo y pulsa <em>Detener</em>.'
      },
      rot_int: {
        label: 'Rot. Interna', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'beta-zero', neutralAngle: 180,
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
      flexion:    { label: 'Flexión',    bilateral: true, modes: ['activa', 'pasiva'], axis: 'gravity', phoneOrientation: 'beta-rotation',   ref: 145, icon: '⬇', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono sobre el antebrazo con la <strong>pantalla paralela al plano frontal</strong>. Calibra con el codo en extensión completa y flexiona hasta el rango máximo.' },
      extension:  { label: 'Extensión',  bilateral: true, modes: ['activa', 'pasiva'], axis: 'gravity', phoneOrientation: 'beta-rotation',   ref: 5,   icon: '⬆', placement: 'sagittal-vertical', instruction: 'Coloca el teléfono sobre el antebrazo con la <strong>pantalla paralela al plano frontal</strong>. Calibra con el codo en posición inicial y extiende hasta el rango máximo.' },
      pronacion: {
        label: 'Pronación', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 80, icon: '↻',
        instruction: 'Paciente sentado, codo a 90°, brazo pegado al cuerpo, posición neutra (pulgar hacia arriba). Apoya el <strong>borde inferior del teléfono sobre el dorso de la mano</strong>, pantalla en el plano frontal. Pulsa <em>Calibrar neutro</em> y lleva la palma hacia abajo (pronación) hasta el rango máximo.'
      },
      supinacion: {
        label: 'Supinación', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 80, icon: '↺',
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
      flexion: {
        label: 'Flexión', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 70, icon: '⬇',
        instruction: 'Paciente sentado, antebrazo en pronación apoyado sobre la camilla, mano libre al borde. Coloca el teléfono <strong>de canto sobre el dorso de la mano</strong>, pantalla paralela al plano frontal. Calibra con la muñeca en posición neutra y flexiona hasta el rango máximo.'
      },
      extension: {
        label: 'Extensión', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 70, icon: '⬆',
        instruction: 'Paciente sentado, antebrazo en pronación apoyado sobre la camilla, mano libre al borde. Coloca el teléfono <strong>de canto sobre el dorso de la mano</strong>, pantalla paralela al plano frontal. Calibra con la muñeca en posición neutra y extiende hasta el rango máximo.'
      },
      desv_rad: {
        label: 'Desv. Radial', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 20, icon: '↗',
        instruction: 'Paciente sentado, antebrazo en <strong>pronosupinación neutra</strong> (posición de estrechar la mano), apoyado sobre el borde cubital. Apoya el <strong>borde corto inferior del teléfono sobre el borde radial de la mano</strong> (lado del pulgar), con la pantalla en el plano sagital hacia el examinador. Calibra con la muñeca en posición neutra y desviá radialmente hasta el rango máximo.'
      },
      desv_cub: {
        label: 'Desv. Cubital', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 35, icon: '↙',
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
        label: 'Flexión', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'beta-zero', neutralAngle: 90,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 120, icon: '⬆',
        instruction: 'Paciente en decúbito supino, rodilla flexionada. Coloca el teléfono <strong>plano sobre la cara anterior del muslo</strong>, pantalla hacia arriba. El ángulo parte de 0° con el muslo horizontal. Flexiona la cadera hasta el rango máximo y pulsa <em>Detener</em>.'
      },
      abd_supino: {
        label: 'Abducción', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'alpha', phoneOrientation: 'horizontal', ref: 45, icon: '↗',
        instruction: 'Paciente en decúbito supino, pierna en posición neutra. Coloca el teléfono <strong>plano sobre la cara anterior del muslo</strong>, pantalla hacia arriba. Pulsa <em>Calibrar neutro</em> con la pierna alineada y separa lateralmente hasta el rango máximo. Evita superficies metálicas cercanas.'
      },
      rot_ext_supino: {
        label: 'Rot. Externa', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'alpha', phoneOrientation: 'horizontal', ref: 45, icon: '↻',
        instruction: 'Paciente en supino, cadera y rodilla a 90° (muslo vertical, pierna horizontal). Coloca el teléfono <strong>plano sobre la cara anterior de la tibia</strong>, pantalla hacia arriba. Pulsa <em>Calibrar neutro</em> con la pierna en posición neutra y rota externamente hasta el rango máximo. Evita superficies metálicas cercanas.'
      },
      rot_int_supino: {
        label: 'Rot. Interna', bilateral: true, modes: ['activa', 'pasiva'],
        axis: 'alpha', phoneOrientation: 'horizontal', ref: 45, icon: '↺',
        instruction: 'Paciente en supino, cadera y rodilla a 90° (muslo vertical, pierna horizontal). Coloca el teléfono <strong>plano sobre la cara anterior de la tibia</strong>, pantalla hacia arriba. Pulsa <em>Calibrar neutro</em> con la pierna en posición neutra y rota internamente hasta el rango máximo. Evita superficies metálicas cercanas.'
      },
      rot_ext_sed: {
        label: 'Rot. Externa', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'beta-zero', neutralAngle: 180,
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 45, icon: '↻',
        instruction: 'Paciente sentado al borde de la camilla, rodilla a 90° y pierna colgando. Coloca el teléfono <strong>de canto sobre la cara anterior de la tibia</strong>, paralelo al plano sagital, pantalla hacia el lateral. Pulsa <em>Calibrar neutro</em> con la pierna en posición neutra y lleva el pie hacia afuera hasta el rango máximo.'
      },
      rot_int_sed: {
        label: 'Rot. Interna', bilateral: true, modes: ['activa', 'pasiva'],
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
        label: 'Extensión', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'two-segment-signed',
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 0, skipStatus: true, icon: '⬆',
        instruction: '<strong>Paso 1</strong> — coloca el teléfono <strong>plano sobre el muslo</strong>, pantalla hacia arriba. Pulsa <em>Capturar muslo</em>.<br><strong>Paso 2</strong> — sin mover al paciente, coloca el teléfono igual <strong>sobre la tibia</strong>. Resultado: positivo = déficit de extensión; negativo = hiperextensión.'
      },
      flexion: {
        label: 'Flexión', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'two-segment-beta',
        axis: 'beta', phoneOrientation: 'beta-rotation', ref: 135, icon: '⬇',
        instruction: 'Rodilla en posición de máxima flexión. <strong>Paso 1</strong> — coloca el teléfono <strong>de canto sobre la cara lateral del muslo</strong>, portrait, pantalla hacia el examinador. Pulsa <em>Capturar muslo</em>.<br><strong>Paso 2</strong> — sin mover al paciente, coloca el teléfono igual <strong>de canto sobre la cara lateral de la tibia</strong>. Pulsa <em>Capturar tibia</em>.'
      },
      pkb: {
        label: 'PKB', bilateral: true, modes: ['activa', 'pasiva'],
        measureType: 'gravity-vertical', axis: 'gravity',
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
      dorsiflexion:   { label: 'Dorsiflexión',   bilateral: true, modes: ['activa', 'pasiva'], measureType: 'gravity-vertical', axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 20, icon: '⬆', instruction: 'Coloca el teléfono <strong>de canto sobre la tibia</strong>, pantalla hacia el examinador (lateral). Con la tibia a 90° el ángulo es 0°. Pulsa <em>Iniciar</em> y realiza la dorsiflexión hasta el rango máximo.' },
      plantarflexion: { label: 'Plantarflexión', bilateral: true, modes: ['activa', 'pasiva'],           measureType: 'gravity-vertical', axis: 'gravity', phoneOrientation: 'alpha-rotation', ref: 50, icon: '⬇', instruction: 'Coloca el teléfono <strong>de canto sobre la tibia</strong>, pantalla hacia el examinador (lateral). Con la tibia a 90° el ángulo es 0°. Pulsa <em>Iniciar</em> y realiza la plantarflexión hasta el rango máximo.' }
    }
  },
  lumbar: {
    label: 'Lumbar', abbr: 'Lb',
    groups: [
      { label: 'Flexión', ids: ['flexion'] }
    ],
    movements: {
      flexion: {
        label: 'Flexión', bilateral: false, modes: ['activa', 'pasiva'],
        measureType: 'two-segment-vertical-signed',
        phoneOrientation: 'alpha-rotation', ref: 60, icon: '⬇',
        instruction: 'Paciente de pie, pies a la anchura de los hombros, rodillas en extensión. Se inclina hacia adelante al máximo y <strong>mantiene la posición</strong>.<br><strong>Paso 1</strong> — coloca el teléfono en <strong>modo landscape</strong>, apoya el borde largo sobre <strong>S1</strong> (a nivel de los hoyuelos sacros), pantalla en el plano sagital. Pulsa <em>Capturar S1</em>.<br><strong>Paso 2</strong> — sin mover al paciente, coloca el teléfono igual sobre <strong>T12/L1</strong> (última costilla → espina). Resultado = ángulo T12 − ángulo S1 (flexión lumbar pura).'
      }
    }
  }
};
