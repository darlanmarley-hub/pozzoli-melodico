import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Volume2, VolumeX, Music, Minus, Plus } from 'lucide-react';

// Mapa de alturas (Pitch -> Solfejo e nota MIDI)
const PITCH_INFO = {
  G3: { solfege: 'Sol', midi: 55 },
  A3: { solfege: 'Lá', midi: 57 },
  B3: { solfege: 'Si', midi: 59 },
  C4: { solfege: 'Dó', midi: 60 },
  D4: { solfege: 'Ré', midi: 62 },
  E4: { solfege: 'Mi', midi: 64 },
  F4: { solfege: 'Fá', midi: 65 },
  G4: { solfege: 'Sol', midi: 67 },
  A4: { solfege: 'Lá', midi: 69 },
  B4: { solfege: 'Si', midi: 71 },
  C5: { solfege: 'Dó', midi: 72 },
  D5: { solfege: 'Ré', midi: 74 },
  E5: { solfege: 'Mi', midi: 76 },
  F5: { solfege: 'Fá', midi: 77 },
  G5: { solfege: 'Sol', midi: 79 },
  A5: { solfege: 'Lá', midi: 81 },
  REST: { solfege: 'Pausa', midi: null }
};

// Construtor compacto de nota/pausa:
// type: 'wd' (12), 'w' (8), 'hd' (6), 'h' (4), 'qdd' (3.5), 'qd' (3), 'q' (2), 'ed' (1.5), 'e' (1), 's' (0.5),
// 'r4' (pausa de semínima = 2), 'r8' (pausa de colcheia = 1), 'r16' (pausa de semicolcheia = 0.5)
function n(pitch, type, extra = {}) {
  if (type === 'r16' || type === 'r8' || type === 'r4' || pitch === 'REST') {
    const eighthDur = type === 'r4' ? 2 : type === 'r16' ? 0.5 : 1;
    return {
      pitch: 'REST',
      solfege: 'Pausa',
      midi: null,
      eighthDur,
      type: type === 'r4' ? 'r4' : type === 'r16' ? 'r16' : 'r8',
      dotted: false,
      isRest: true,
      ...extra
    };
  }
  const hasSharp = pitch.includes('#');
  const hasFlat = pitch.includes('b');
  const hasNatural = /^[A-G]n\d/.test(pitch);
  const basePitch = pitch.replace(/[#bn]/g, '');
  const info = PITCH_INFO[basePitch] || { solfege: 'Dó', midi: 60 };
  const midiOffset = hasSharp ? 1 : hasFlat ? -1 : 0;
  const accidental = extra.accidental ?? (hasSharp ? '#' : hasFlat ? 'b' : hasNatural ? 'n' : null);
  const eighthDur =
    type === 'wd'
      ? 12
      : type === 'w'
      ? 8
      : type === 'hd'
      ? 6
      : type === 'h'
      ? 4
      : type === 'qdd'
      ? 3.5
      : type === 'qd'
      ? 3
      : type === 'q'
      ? 2
      : type === 'ed'
      ? 1.5
      : type === 's'
      ? 0.5
      : 1;
  const doubleDotted = type === 'qdd';
  const dotted = type === 'wd' || type === 'hd' || type === 'qd' || type === 'ed' || doubleDotted;
  return {
    pitch: basePitch,
    solfege: info.solfege + (hasSharp ? '#' : hasFlat ? 'b' : ''),
    midi: info.midi + midiOffset,
    accidental,
    eighthDur,
    type,
    dotted,
    doubleDotted,
    isRest: false,
    ...extra
  };
}

// Helpers compactos para grupos de colcheias e semicolcheias unidas por barra (beam)
const b5 = (p1, p2, p3, p4, p5) => [
  n(p1, 'e', { beam: 'start' }),
  n(p2, 'e', { beam: 'mid' }),
  n(p3, 'e', { beam: 'mid' }),
  n(p4, 'e', { beam: 'mid' }),
  n(p5, 'e', { beam: 'end' })
];
const b4 = (p1, p2, p3, p4) => [
  n(p1, 'e', { beam: 'start' }),
  n(p2, 'e', { beam: 'mid' }),
  n(p3, 'e', { beam: 'mid' }),
  n(p4, 'e', { beam: 'end' })
];
const b3 = (p1, p2, p3) => [
  n(p1, 'e', { beam: 'start' }),
  n(p2, 'e', { beam: 'mid' }),
  n(p3, 'e', { beam: 'end' })
];
const b2 = (p1, p2) => [
  n(p1, 'e', { beam: 'start' }),
  n(p2, 'e', { beam: 'end' })
];
const s4 = (p1, p2, p3, p4) => [
  n(p1, 's', { beam: 'start' }),
  n(p2, 's', { beam: 'mid' }),
  n(p3, 's', { beam: 'mid' }),
  n(p4, 's', { beam: 'end' })
];
const s2 = (p1, p2) => [
  n(p1, 's', { beam: 'start' }),
  n(p2, 's', { beam: 'end' })
];
const es2 = (p1, p2, p3) => [
  n(p1, 'e', { beam: 'start' }),
  n(p2, 's', { beam: 'mid' }),
  n(p3, 's', { beam: 'end' })
];
const s2e = (p1, p2, p3) => [
  n(p1, 's', { beam: 'start' }),
  n(p2, 's', { beam: 'mid' }),
  n(p3, 'e', { beam: 'end' })
];
const eds = (p1, p2) => [
  n(p1, 'ed', { beam: 'start' }),
  n(p2, 's', { beam: 'end' })
];

/**
 * EXERCÍCIO Nº 1 — 4ª Série (6/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), n('B3', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('D4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'q'), n('F4', 'e'), n('E4', 'q'), n('C4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('B3', 'qd', { tieStart: true }), n('B3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C4', 'qd'), n('B3', 'q'), n('C4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd'), n('D4', 'q'), n('E4', 'e')] },
  { measure: 12, slurEnd: 2, notes: [n('G4', 'q'), n('F4', 'e'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('F4', 'e'), n('E4', 'q'), n('G4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'q'), n('G4', 'e'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 2 — 4ª Série (6/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd'), n('D4', 'e', { beam: 'start' }), n('C4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' })] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'e', { beam: 'start' }), n('G4', 'e', { beam: 'mid' }), n('F4', 'e', { beam: 'end' })] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('E5', 'qd'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'q'), n('C5', 'e'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd'), n('B4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' })] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), n('G4', 'e', { beam: 'start' }), n('F4', 'e', { beam: 'mid' }), n('G4', 'e', { beam: 'end' })] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end' }), n('B4', 'e', { beam: 'start' }), n('C5', 'e', { beam: 'mid' }), n('D5', 'e', { beam: 'end' })] },
  { measure: 14, slurEnd: 3, notes: [n('C5', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), n('G4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd'), n('D4', 'e', { beam: 'start' }), n('C4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' })] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 3 — 4ª Série (6/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX3_MEASURES = [
  { measure: 1, localSlurs: [[0, 3]], notes: [n('E4', 'e', { beam: 'start' }), n('F4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 3]], notes: [n('F4', 'e', { beam: 'start' }), n('G4', 'e', { beam: 'mid' }), n('E4', 'e', { beam: 'end' }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('C5', 'q'), n('A4', 'e')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('F4', 'e', { beam: 'start' }), n('G4', 'e', { beam: 'mid' }), n('E4', 'e', { beam: 'end' }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('E4', 'e', { beam: 'start' }), n('F4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'q'), n('E4', 'e'), n('G4', 'q'), n('E4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('D4', 'hd')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [n('C4', 'e', { beam: 'start' }), n('D4', 'e', { beam: 'mid' }), n('B3', 'e', { beam: 'end' }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [n('D4', 'e', { beam: 'start' }), n('E4', 'e', { beam: 'mid' }), n('C4', 'e', { beam: 'end' }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'e', { beam: 'start' }), n('F4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' }), n('E4', 'e', { beam: 'start' }), n('F4', 'e', { beam: 'mid' }), n('G4', 'e', { beam: 'end' })] },
  { measure: 12, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [n('G4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('F4', 'e', { beam: 'end' }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [n('A4', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('G4', 'e', { beam: 'end' }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('B4', 'e', { beam: 'start' }), n('C5', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), n('G4', 'e', { beam: 'start' }), n('F4', 'e', { beam: 'mid' }), n('E4', 'e', { beam: 'end' })] },
  { measure: 16, slurEnd: 1, localSlurs: [[0, 1]], notes: [n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 4 — 4ª Série (6/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' }), n('C5', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' })] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' }), n('C5', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end' })] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C5', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('D5', 'e', { beam: 'end' }), n('C5', 'qd')] },
  { measure: 6, slurEnd: 3, notes: [n('B4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end' }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end' }), n('B4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('G4', 'e', { beam: 'end' })] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('D5', 'e', { beam: 'end' }), n('C5', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' })] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('D5', 'e', { beam: 'end' }), n('C5', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' })] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end' }), n('B4', 'e', { beam: 'start' }), n('D5', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end' })] },
  { measure: 14, slurEnd: 1, notes: [n('E5', 'qd'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), n('B4', 'e', { beam: 'start' }), n('C5', 'e', { beam: 'mid' }), n('D5', 'e', { beam: 'end' })] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 5 — 4ª Série (6/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'q'), n('E4', 'e'), n('D4', 'q'), n('F4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'q'), n('E4', 'e'), n('D4', 'e', { beam: 'start' }), n('F4', 'e', { beam: 'mid' }), n('E4', 'e', { beam: 'end' })] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), n('B4', 'e'), n('A4', 'q'), n('C5', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('B4', 'e'), n('A4', 'e', { beam: 'start' }), n('C5', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' })] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), n('A4', 'e'), n('B4', 'q'), n('G4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), n('A4', 'e'), n('B4', 'e', { beam: 'start' }), n('G4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' })] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'q'), n('F4', 'e'), n('G4', 'q'), n('E4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('D4', 'e'), n('E4', 'e', { beam: 'start' }), n('C4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' })] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 6 — 4ª Série (6/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX6_MEASURES = [
  { measure: 1, localSlurs: [[0, 1], [2, 3]], notes: [n('E4', 'e'), n('G4', 'q'), n('E4', 'e'), n('D4', 'q')] },
  { measure: 2, localSlurs: [[0, 3]], notes: [n('E4', 'e', { beam: 'start' }), n('C4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[0, 1], [2, 3]], notes: [n('E4', 'e'), n('G4', 'q'), n('A4', 'e'), n('F4', 'q')] },
  { measure: 4, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e', { beam: 'start' }), n('E4', 'e', { beam: 'end' }), n('F4', 'e', { beam: 'start' }), n('G4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' })] },
  { measure: 6, slurEnd: 3, notes: [n('B4', 'e', { beam: 'start' }), n('C5', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), n('G4', 'qd')] },
  { measure: 7, localSlurs: [[0, 1], [2, 3]], notes: [n('A4', 'e'), n('B4', 'q'), n('A4', 'e'), n('D5', 'q')] },
  { measure: 8, localSlurs: [[0, 3]], notes: [n('B4', 'e', { beam: 'start' }), n('G4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), n('B4', 'qd')] },
  { measure: 9, localSlurs: [[0, 1], [2, 3]], notes: [n('C5', 'e'), n('E5', 'q'), n('C5', 'e'), n('B4', 'q')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [n('A4', 'e', { beam: 'start' }), n('B4', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end' }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 1], [2, 3]], notes: [n('A4', 'e'), n('C5', 'q'), n('B4', 'e'), n('G4', 'q')] },
  { measure: 12, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('F4', 'e', { beam: 'start' }), n('E4', 'e', { beam: 'end' }), n('D4', 'e', { beam: 'start' }), n('E4', 'e', { beam: 'mid' }), n('F4', 'e', { beam: 'end' })] },
  { measure: 14, slurEnd: 3, notes: [n('G4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('F4', 'e', { beam: 'end' }), n('E4', 'qd')] },
  { measure: 15, localSlurs: [[0, 1], [2, 3]], notes: [n('F4', 'e'), n('G4', 'q'), n('F4', 'e'), n('D4', 'q')] },
  { measure: 16, localSlurs: [[0, 3]], notes: [n('C4', 'e', { beam: 'start' }), n('E4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 7 — 4ª Série (9/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX7_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'hd'), n('A4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('B4', 'qd'), n('C5', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('B4', 'hd'), n('A4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd'), n('E4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'hd'), n('F4', 'qd')] },
  { measure: 6, slurEnd: 2, notes: [n('E4', 'q'), n('F4', 'e'), n('G4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'hd'), n('A4', 'qd')] },
  { measure: 8, slurEnd: 2, notes: [n('G4', 'q'), n('A4', 'e'), n('B4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'hd'), n('B4', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'qd'), n('C5', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'qd'), n('C5', 'qd'), n('B4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'qd'), n('F4', 'qd')] },
  { measure: 14, slurEnd: 2, notes: [n('E4', 'q'), n('F4', 'e'), n('G4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'hd'), n('D4', 'q'), n('E4', 'e')] },
  { measure: 16, slurEnd: 2, notes: [n('D4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 8 — 4ª Série (9/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX8_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'qd'), n('C5', 'qd')] },
  { measure: 2, slurEnd: 2, notes: [n('B4', 'q'), n('A4', 'e'), n('G4', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'qd'), n('A4', 'qd')] },
  { measure: 4, slurEnd: 2, notes: [n('G4', 'q'), n('F4', 'e'), n('E4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'q'), n('E4', 'e'), n('F4', 'qd'), n('G4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('A4', 'qd'), n('G4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('B4', 'qd'), n('C5', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('E5', 'qd'), n('D5', 'hd')] },
  { measure: 9, localSlurs: [[0, 2]], notes: [n('C5', 'q'), n('B4', 'e', { tieStart: true }), n('B4', 'hd', { tieStop: true })] },
  { measure: 10, localSlurs: [[0, 2]], notes: [n('A4', 'q'), n('G4', 'e', { tieStart: true }), n('G4', 'hd', { tieStop: true })] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'q'), n('A4', 'e'), n('B4', 'qd'), n('A4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'qd'), n('G4', 'qd'), n('E4', 'qd')] },
  { measure: 14, slurEnd: 2, notes: [n('G4', 'q'), n('F4', 'e'), n('E4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'e'), n('E4', 'qd'), n('D4', 'qd')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 9 — 4ª Série (9/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX9_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'hd'), ...b3('D4', 'E4', 'C4')] },
  { measure: 2, slurEnd: 2, notes: [n('E4', 'qd'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'hd'), ...b3('F4', 'G4', 'E4')] },
  { measure: 4, slurEnd: 2, notes: [n('G4', 'qd'), n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('F4', 'q'), n('E4', 'e'), n('D4', 'q'), n('E4', 'e'), n('F4', 'q'), n('G4', 'e')] },
  { measure: 6, slurEnd: 2, notes: [n('A4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('F4', 'e'), n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('A4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd'), ...b3('A4', 'B4', 'G4'), n('C5', 'qd')] },
  { measure: 10, slurEnd: 2, notes: [n('B4', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'hd'), ...b3('G4', 'A4', 'F4')] },
  { measure: 12, slurEnd: 2, notes: [n('A4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), n('E4', 'e'), n('D4', 'q'), n('C4', 'e'), n('B3', 'q'), n('C4', 'e')] },
  { measure: 14, slurEnd: 2, notes: [n('E4', 'qd'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'hd'), ...b3('C4', 'D4', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 10 — 4ª Série (9/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), ...b3('D4', 'E4', 'F4'), ...b3('G4', 'A4', 'B4')] },
  { measure: 2, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), ...b3('F4', 'G4', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 4, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [...b3('A4', 'B4', 'C5'), n('A4', 'hd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [...b3('G4', 'A4', 'B4'), n('G4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [...b3('A4', 'B4', 'C5'), ...b3('D5', 'C5', 'B4'), ...b3('A4', 'B4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd'), ...b3('A4', 'G4', 'F4'), ...b3('E4', 'D4', 'C4')] },
  { measure: 10, slurEnd: 2, notes: [n('E4', 'qd'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd'), ...b3('F4', 'E4', 'D4'), ...b3('C4', 'B3', 'A3')] },
  { measure: 12, slurEnd: 2, notes: [n('C4', 'qd'), n('B3', 'qd', { tieStart: true }), n('B3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [...b3('C4', 'D4', 'E4'), n('D4', 'hd')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...b3('D4', 'E4', 'F4'), n('E4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...b3('F4', 'G4', 'A4'), ...b3('G4', 'F4', 'E4'), ...b3('D4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 11 — 4ª Série (9/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX11_MEASURES = [
  { measure: 1, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'qd'), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('C4', 'e'), n('D4', 'q'), n('F4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'q'), n('E4', 'e'), n('F4', 'q'), n('A4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'hd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('G4', 'F4', 'E4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 12 — 4ª Série (9/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX12_MEASURES = [
  { measure: 1, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b2('C4', 'D4'), n('E4', 'qd'), n('G4', 'qd')] },
  { measure: 2, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b2('E4', 'D4'), n('C4', 'hd')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b2('C4', 'D4'), ...b3('E4', 'F4', 'G4'), ...b3('A4', 'G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 5, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b2('E4', 'F4'), n('G4', 'qd'), n('A4', 'qd')] },
  { measure: 6, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b2('F4', 'E4'), n('D4', 'hd')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b2('D4', 'E4'), ...b3('F4', 'G4', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 8, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'qd'), n('A4', 'qd')] },
  { measure: 9, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b2('G4', 'A4'), n('B4', 'qd'), n('C5', 'qd')] },
  { measure: 10, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b2('A4', 'G4'), n('F4', 'hd')] },
  { measure: 11, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b2('F4', 'G4'), n('A4', 'qd'), n('B4', 'qd')] },
  { measure: 12, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b2('G4', 'F4'), n('E4', 'hd')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b2('E4', 'F4'), ...b3('G4', 'A4', 'B4'), ...b3('C5', 'B4', 'A4')] },
  { measure: 14, slurEnd: 2, notes: [n('G4', 'qd'), n('F4', 'qd'), n('E4', 'qd')] },
  { measure: 15, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b2('D4', 'E4'), n('F4', 'hd')] },
  { measure: 16, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b2('E4', 'D4'), n('C4', 'hd')] }
];

/**
 * EXERCÍCIO Nº 13 — 4ª Série (12/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX13_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'hd'), n('D4', 'qd'), n('B3', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'hd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'hd'), n('F4', 'qd'), n('D4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'hd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'qd'), n('G4', 'qd'), n('F4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'qd'), n('E4', 'qd'), n('C4', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'hd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C4', 'hd'), n('D4', 'q'), n('C4', 'e'), n('B3', 'q'), n('C4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('D4', 'hd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'hd'), n('F4', 'q'), n('E4', 'e'), n('D4', 'q'), n('E4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'hd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'q'), n('B4', 'e'), n('C5', 'qd'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'hd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'q'), n('F4', 'e'), n('D4', 'qd'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'hd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 14 — 4ª Série (12/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX14_MEASURES = [
  { measure: 1, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C4', 'qd'), n('E4', 'qd'), n('G4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'hd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('A4', 'qd'), n('F4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'hd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd'), n('G4', 'qd'), n('B4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'hd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd'), n('A4', 'qd'), n('F4', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'hd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'q'), n('E4', 'e'), n('G4', 'qd'), n('F4', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('E4', 'hd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('F4', 'e'), n('A4', 'qd'), n('G4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F4', 'q'), n('G4', 'e'), n('A4', 'qd'), n('B4', 'qd')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'hd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'q'), n('B4', 'e'), n('A4', 'q'), n('G4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'hd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 15 — 4ª Série (12/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX15_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'qd', { tieStop: true }), ...b3('D4', 'E4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'hd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'hd', { tieStart: true }), n('D4', 'qd', { tieStop: true }), ...b3('C4', 'D4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'hd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'qd'), ...b3('B3', 'C4', 'D4'), n('E4', 'qd'), ...b3('D4', 'E4', 'F4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), ...b3('F4', 'G4', 'A4'), n('B4', 'qd'), ...b3('A4', 'B4', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true }), ...b3('B4', 'C5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'qd', { tieStop: true }), ...b3('A4', 'B4', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'hd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'qd'), ...b3('A4', 'G4', 'F4'), n('E4', 'qd'), ...b3('F4', 'E4', 'D4')] },
  { measure: 14, slurEnd: 3, notes: [n('C4', 'qd'), n('D4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'hd', { tieStart: true }), n('D4', 'qd', { tieStop: true }), ...b3('E4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'hd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 16 — 4ª Série (12/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX16_MEASURES = [
  { measure: 1, localSlurs: [[0, 3], [6, 9]], notes: [...b3('C4', 'D4', 'B3'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...b3('C4', 'D4', 'B3'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 7]], notes: [...b3('C4', 'B3', 'C4'), ...b3('D4', 'C4', 'D4'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[0, 3], [6, 9]], notes: [...b3('E4', 'F4', 'D4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...b3('E4', 'F4', 'D4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 4, localSlurs: [[0, 7]], notes: [...b3('E4', 'D4', 'E4'), ...b3('F4', 'E4', 'F4'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 6]], notes: [...b3('G4', 'A4', 'G4'), ...b3('A4', 'G4', 'A4'), n('G4', 'hd')] },
  { measure: 6, localSlurs: [[0, 6]], notes: [...b3('A4', 'B4', 'A4'), ...b3('B4', 'A4', 'B4'), n('A4', 'hd')] },
  { measure: 7, localSlurs: [[0, 7]], notes: [...b3('B4', 'C5', 'B4'), ...b3('A4', 'B4', 'C5'), n('B4', 'qd'), n('D5', 'qd')] },
  { measure: 8, localSlurs: [[0, 7]], notes: [...b3('C5', 'D5', 'C5'), ...b3('B4', 'C5', 'D5'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 3], [6, 9]], notes: [...b3('C5', 'D5', 'B4'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...b3('B4', 'C5', 'A4'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 7]], notes: [...b3('A4', 'B4', 'A4'), ...b3('G4', 'A4', 'G4'), n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 3], [6, 9]], notes: [...b3('F4', 'G4', 'E4'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...b3('E4', 'F4', 'D4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 7]], notes: [...b3('D4', 'E4', 'D4'), ...b3('C4', 'D4', 'C4'), n('B3', 'qd', { tieStart: true }), n('B3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 6]], notes: [...b3('F4', 'G4', 'F4'), ...b3('G4', 'F4', 'G4'), n('F4', 'hd')] },
  { measure: 14, localSlurs: [[0, 6]], notes: [...b3('E4', 'F4', 'E4'), ...b3('F4', 'E4', 'F4'), n('E4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...b3('D4', 'E4', 'D4'), ...b3('E4', 'D4', 'E4'), n('D4', 'qd'), ...b3('C4', 'B3', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 17 — 4ª Série (12/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX17_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('B4', 'q'), n('A4', 'e'), n('G4', 'q'), n('A4', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'hd'), n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('F4', 'e'), n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 5]], notes: [n('C4', 'q'), n('B3', 'e'), n('D4', 'q'), n('C4', 'e'), n('E4', 'qd'), n('D4', 'qd')] },
  { measure: 6, localSlurs: [[0, 5]], notes: [n('E4', 'q'), n('D4', 'e'), n('F4', 'q'), n('E4', 'e'), n('G4', 'qd'), n('F4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'D4', 'E4'), ...b3('F4', 'E4', 'F4'), ...b3('G4', 'F4', 'G4'), ...b3('A4', 'G4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('B4', 'wd')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('C5', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('C5', 'e')] },
  { measure: 10, slurEnd: 2, notes: [n('B4', 'hd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 7]], notes: [n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('B4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('B4', 'e')] },
  { measure: 12, localSlurs: [[0, 2]], notes: [n('A4', 'hd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('B4', 'q'), n('A4', 'e'), n('G4', 'qd'), n('F4', 'qd')] },
  { measure: 14, slurEnd: 5, notes: [n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('F4', 'e'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b3('F4', 'G4', 'F4'), ...b3('E4', 'F4', 'E4'), ...b3('D4', 'E4', 'D4'), ...b3('C4', 'D4', 'C4')] },
  { measure: 16, slurEnd: 1, notes: [n('B3', 'hd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 18 — 4ª Série (12/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX18_MEASURES = [
  { measure: 1, notes: [n('G4', 'qd'), n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[2, 5]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'q'), n('B4', 'e'), n('A4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd')] },
  { measure: 4, localSlurs: [[2, 5]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'q'), n('F4', 'e'), n('E4', 'qd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('C4', 'B3', 'C4'), n('E4', 'qd'), n('D4', 'qd')] },
  { measure: 6, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('D4', 'C4', 'D4'), n('F4', 'qd'), n('E4', 'qd')] },
  { measure: 7, localSlurs: [[2, 5], [6, 8]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('E4', 'F4', 'G4'), n('A4', 'qd'), ...b3('G4', 'A4', 'B4')] },
  { measure: 8, localSlurs: [[1, 5]], notes: [n('C5', 'qd'), ...b3('A4', 'B4', 'C5'), n('D5', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'qd'), n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd')] },
  { measure: 10, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('D5', 'C5', 'B4'), n('D5', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd'), n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd')] },
  { measure: 12, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('B4', 'A4', 'G4'), n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('A4', 'G4', 'F4'), n('A4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('G4', 'F4', 'E4'), n('G4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd'), n('REST', 'r4'), n('REST', 'r8'), n('C4', 'qd')] },
  { measure: 16, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('D4', 'C4', 'B3'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 1ª SÉRIE — EXERCÍCIOS Nº 1 A Nº 10 (Intervalos de Segunda — 2/4, 3/4 e 4/4)
 */
export const POZZOLI_SERIE1_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h')] },
  { measure: 2, slurEnd: 0, notes: [n('D4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'h')] },
  { measure: 4, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'q'), n('D4', 'q')] },
  { measure: 6, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'h')] },
  { measure: 10, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'h')] },
  { measure: 12, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('F4', 'q')] },
  { measure: 14, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('D4', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), n('D4', 'q')] },
  { measure: 2, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q')] },
  { measure: 6, slurEnd: 0, notes: [n('B4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'h')] },
  { measure: 8, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), n('B4', 'q')] },
  { measure: 10, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), n('G4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), n('E4', 'q')] },
  { measure: 14, slurEnd: 0, notes: [n('D4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'h')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX3_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...b2('A4', 'B4')] },
  { measure: 2, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('C5', 'h')] },
  { measure: 4, slurEnd: 0, notes: [n('B4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'q'), ...b2('C5', 'D5')] },
  { measure: 6, slurEnd: 0, notes: [n('E5', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('E5', 'h')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'q'), ...b2('C5', 'B4')] },
  { measure: 10, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), n('B4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'q'), ...b2('B4', 'A4')] },
  { measure: 14, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b2('G4', 'F4'), ...b2('E4', 'D4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h'), n('D4', 'q')] },
  { measure: 2, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('D4', 'q'), n('C4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('D4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'q'), n('E4', 'q'), n('F4', 'q')] },
  { measure: 6, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'h'), n('B4', 'q')] },
  { measure: 10, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), n('G4', 'q'), n('F4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'q'), n('G4', 'q')] },
  { measure: 14, slurEnd: 0, notes: [n('F4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'q'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'q'), n('D4', 'q'), n('E4', 'q')] },
  { measure: 2, slurEnd: 0, notes: [n('F4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'q'), n('G4', 'q'), n('F4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'q'), n('G4', 'q')] },
  { measure: 6, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'h'), ...b2('B4', 'C5')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'q'), n('E5', 'q'), n('D5', 'q')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), n('B4', 'q'), n('A4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q'), n('G4', 'q')] },
  { measure: 14, slurEnd: 0, notes: [n('F4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'h'), ...b2('E4', 'D4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'hd')] }
];

export const POZZOLI_SERIE1_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'h'), ...b2('F4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h'), ...b2('A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'q'), ...b2('C5', 'D5'), ...b2('E5', 'D5')] },
  { measure: 6, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'q'), n('B4', 'q'), n('A4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'h'), ...b2('A4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'h'), ...b2('F4', 'E4')] },
  { measure: 12, slurEnd: 0, notes: [n('D4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'q'), n('E4', 'q'), n('F4', 'q')] },
  { measure: 14, slurEnd: 2, notes: [...b2('E4', 'D4'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b2('C4', 'D4'), n('C4', 'q'), n('B3', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX7_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 2, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 3, slurStart: 0, notes: [...b2('C5', 'B4'), ...b2('A4', 'G4'), ...b2('F4', 'E4')] },
  { measure: 4, slurEnd: 0, notes: [n('D4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'q'), n('E4', 'q'), n('F4', 'q')] },
  { measure: 6, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [...b2('G4', 'F4'), ...b2('E4', 'D4'), ...b2('C4', 'B3')] },
  { measure: 8, slurEnd: 0, notes: [n('C4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('C4', 'q'), ...b2('B3', 'C4'), ...b2('D4', 'E4')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'q'), ...b2('D4', 'E4'), ...b2('F4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 14, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...b2('C5', 'B4'), ...b2('A4', 'G4'), ...b2('F4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'q'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX8_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h'), n('D4', 'h')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'h'), n('F4', 'h')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h'), n('A4', 'q'), n('G4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'q'), n('G4', 'q'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('C5', 'w')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'h'), n('B4', 'h')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'h'), n('G4', 'h')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), n('G4', 'q'), n('F4', 'q'), n('E4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'h'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX9_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'q'), n('G4', 'q'), n('A4', 'q')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'q'), n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'q'), n('G4', 'q'), n('A4', 'q')] },
  { measure: 4, slurEnd: 2, notes: [n('B4', 'q'), n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 6, slurEnd: 2, notes: [n('C5', 'q'), n('D5', 'q'), n('E5', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('E5', 'q'), n('D5', 'q'), n('C5', 'q'), n('B4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q'), n('B4', 'q'), n('C5', 'q')] },
  { measure: 10, slurEnd: 2, notes: [n('B4', 'q'), n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q'), n('G4', 'q'), n('F4', 'q')] },
  { measure: 12, slurEnd: 2, notes: [n('E4', 'q'), n('D4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'h'), n('F4', 'q'), n('G4', 'q')] },
  { measure: 14, slurEnd: 2, notes: [n('F4', 'q'), n('E4', 'q'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'h'), n('C4', 'q'), n('B3', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('B3', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE1_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...b2('A4', 'B4'), n('C5', 'q'), ...b2('B4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h'), ...b2('A4', 'G4'), ...b2('F4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'q'), ...b2('E4', 'F4'), n('G4', 'h')] },
  { measure: 6, slurEnd: 2, notes: [n('E4', 'q'), n('F4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), ...b2('A4', 'B4'), n('C5', 'q'), ...b2('B4', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'h'), ...b4('C5', 'B4', 'A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'h'), ...b4('B4', 'A4', 'G4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'q'), ...b2('C5', 'B4'), n('A4', 'q'), ...b2('G4', 'F4')] },
  { measure: 14, slurEnd: 2, notes: [n('E4', 'q'), n('D4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'h'), ...b4('F4', 'E4', 'D4', 'C4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 2ª SÉRIE — EXERCÍCIOS Nº 1 A Nº 10 (Intervalos de Terça — 2/4, 3/4 e 4/4)
 */
export const POZZOLI_SERIE2_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h')] },
  { measure: 2, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'h')] },
  { measure: 6, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('E4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'h')] },
  { measure: 10, slurEnd: 0, notes: [n('B4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'q'), n('G4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('B4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'q'), n('D5', 'q')] },
  { measure: 14, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'q'), n('A4', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'h')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q'), ...b2('E4', 'C4')] },
  { measure: 4, slurEnd: 0, notes: [n('D4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'h')] },
  { measure: 6, slurEnd: 0, notes: [n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'q'), ...b2('A4', 'F4')] },
  { measure: 8, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'q'), ...b2('C4', 'E4')] },
  { measure: 10, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'q'), ...b2('E4', 'G4')] },
  { measure: 12, slurEnd: 0, notes: [n('B4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'q'), ...b2('G4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b2('C5', 'A4'), ...b2('B4', 'D5')] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX3_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...b2('E4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'q'), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'q'), ...b2('E4', 'G4')] },
  { measure: 4, slurEnd: 0, notes: [n('A4', 'h')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'q'), ...b2('F4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('F4', 'q'), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'q'), ...b2('F4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'q'), ...b2('G4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), ...b2('A4', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), ...b2('A4', 'F4')] },
  { measure: 14, slurEnd: 0, notes: [n('D4', 'h')] },
  { measure: 15, slurStart: 0, notes: [...b2('E4', 'G4'), ...b2('D4', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

export const POZZOLI_SERIE2_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), n('G4', 'q'), n('E4', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('C4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'q'), n('E4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'q'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), n('A4', 'q'), n('C5', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('F4', 'q'), n('A4', 'q'), n('F4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('D4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'q'), n('F4', 'q'), n('D4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b2('G4', 'E4'), n('C4', 'q'), n('B3', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX5_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'q'), ...b2('E4', 'G4'), ...b2('E4', 'G4')] },
  { measure: 4, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('A4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'q'), ...b2('F4', 'A4'), ...b2('F4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('C5', 'q'), n('E5', 'q'), n('REST', 'r4')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('C5', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), ...b2('C5', 'A4'), ...b2('C5', 'A4')] },
  { measure: 12, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 13, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('C4', 'q'), ...b2('E4', 'C4'), ...b2('D4', 'B3')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX6_MEASURES = [
  { measure: 1, localSlurs: [[1, 2]], notes: [n('REST', 'r4'), n('C4', 'q'), n('E4', 'q')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[0, 2]], notes: [n('G4', 'h'), ...b2('E4', 'C4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 2]], notes: [n('REST', 'r4'), n('D4', 'q'), n('F4', 'q')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'h'), ...b2('C5', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, localSlurs: [[1, 2]], notes: [n('REST', 'r4'), n('G4', 'q'), n('B4', 'q')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('B4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D5', 'q'), n('B4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'h'), ...b2('A4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'h'), ...b2('E4', 'D4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX7_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h'), n('E4', 'q'), n('G4', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('G4', 'q'), n('E4', 'q'), n('C4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'h'), n('F4', 'q'), n('A4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('A4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'q'), n('A4', 'q'), n('F4', 'q'), n('D4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'h'), n('G4', 'q'), n('B4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'h'), n('A4', 'q'), n('F4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('D4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), n('D4', 'q'), n('F4', 'q'), n('A4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'q'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX8_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'q'), n('B3', 'q'), n('D4', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('C4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('G4', 'q'), n('A4', 'q'), n('F4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'q'), n('F4', 'q'), n('E4', 'q'), n('C4', 'q')] },
  { measure: 6, slurEnd: 2, notes: [n('B3', 'q'), n('D4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('C4', 'q'), n('A3', 'q'), n('B3', 'q'), n('D4', 'q')] },
  { measure: 8, slurEnd: 2, notes: [n('C4', 'q'), n('A3', 'q'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('B3', 'q'), n('D4', 'q'), n('E4', 'q'), n('C4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('E4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'q'), n('F4', 'q'), n('G4', 'q'), n('E4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), n('A4', 'q'), n('G4', 'q'), n('B4', 'q')] },
  { measure: 14, slurEnd: 2, notes: [n('A4', 'q'), n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('B4', 'q'), n('D5', 'q'), n('C5', 'q'), n('A4', 'q')] },
  { measure: 16, slurEnd: 2, notes: [n('C5', 'q'), n('B4', 'q'), n('C5', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX9_MEASURES = [
  { measure: 1, notes: [n('REST', 'r4'), n('E4', 'q'), n('REST', 'r4'), n('G4', 'q')] },
  { measure: 2, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('G4', 'q'), n('E4', 'q'), n('C4', 'q')] },
  { measure: 3, notes: [n('REST', 'r4'), n('C4', 'q'), n('REST', 'r4'), n('E4', 'q')] },
  { measure: 4, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('E4', 'q'), n('C4', 'q'), n('A3', 'q')] },
  { measure: 5, notes: [n('REST', 'r4'), n('A3', 'q'), n('REST', 'r4'), n('C4', 'q')] },
  { measure: 6, notes: [n('REST', 'r4'), n('B3', 'q'), n('REST', 'r4'), n('D4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'q'), n('E4', 'q'), n('G4', 'q')] },
  { measure: 8, slurEnd: 2, notes: [n('B4', 'q'), n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, notes: [n('REST', 'r4'), n('G4', 'q'), n('REST', 'r4'), n('B4', 'q')] },
  { measure: 10, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('B4', 'q'), n('D5', 'q'), n('B4', 'q')] },
  { measure: 11, notes: [n('REST', 'r4'), n('A4', 'q'), n('REST', 'r4'), n('C5', 'q')] },
  { measure: 12, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('C5', 'q'), n('E5', 'q'), n('C5', 'q')] },
  { measure: 13, notes: [n('REST', 'r4'), n('B4', 'q'), n('REST', 'r4'), n('D5', 'q')] },
  { measure: 14, notes: [n('REST', 'r4'), n('C5', 'q'), n('REST', 'r4'), n('A4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q'), n('F4', 'q'), n('D4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('B3', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE2_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'hd'), ...b2('G4', 'E4')] },
  { measure: 2, slurEnd: 1, notes: [n('C4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'h'), n('C4', 'q'), ...b2('E4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'hd'), ...b2('A4', 'F4')] },
  { measure: 6, slurEnd: 1, notes: [n('D4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'h'), n('D4', 'q'), ...b2('F4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'hd'), ...b2('G4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'hd'), ...b2('A4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'h'), ...b2('F4', 'D4'), ...b2('F4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'h'), ...b4('E4', 'G4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 3ª SÉRIE — EXERCÍCIOS Nº 1 A Nº 18 (Intervalos de Segunda e Terça Alternados — 2/4, 3/4 e 4/4)
 */
export const POZZOLI_SERIE3_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), ...b2('G4', 'E4')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'q'), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), ...b2('F4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), ...b2('F4', 'A4')] },
  { measure: 6, slurEnd: 2, notes: [...b2('B4', 'A4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('G4', 'A4'), ...b2('C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'q'), ...b2('D5', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), ...b2('B4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'q'), ...b2('G4', 'F4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('G4', 'A4'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'q'), ...b2('E4', 'F4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'q'), n('C4', 'e'), n('REST', 'r8')] }
];

export const POZZOLI_SERIE3_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...b2('C4', 'D4'), ...b2('B3', 'D4')] },
  { measure: 2, slurEnd: 0, notes: [n('C4', 'h')] },
  { measure: 3, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('D4', 'F4')] },
  { measure: 4, slurEnd: 0, notes: [n('E4', 'h')] },
  { measure: 5, slurStart: 0, notes: [...b2('G4', 'A4'), ...b2('F4', 'A4')] },
  { measure: 6, slurEnd: 2, notes: [...b2('G4', 'F4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('G4', 'A4'), ...b2('C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...b2('C5', 'D5'), ...b2('B4', 'D5')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'h')] },
  { measure: 11, slurStart: 0, notes: [...b2('B4', 'C5'), ...b2('A4', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('B4', 'h')] },
  { measure: 13, slurStart: 0, notes: [...b2('A4', 'B4'), ...b2('C5', 'A4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('G4', 'F4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('D4', 'F4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

export const POZZOLI_SERIE3_EX3_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), n('E4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('B4', 'C5'), ...b2('E5', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd'), n('B4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), n('G4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'qd'), n('F4', 'e')] },
  { measure: 14, slurEnd: 2, notes: [...b2('E4', 'D4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'qd'), n('B3', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

export const POZZOLI_SERIE3_EX4_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'F4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'A4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'B4', 'C5')] },
  { measure: 6, slurEnd: 0, notes: [n('A4', 'h')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('A4', 'G4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('F4', 'h')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('F4', 'E4', 'D4')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('A4', 'G4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'F4', 'G4')] },
  { measure: 14, slurEnd: 0, notes: [n('E4', 'h')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'D4', 'E4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'h')] }
];

export const POZZOLI_SERIE3_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), n('B4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...b2('G4', 'A4'), ...b2('B4', 'C5')] },
  { measure: 6, slurEnd: 2, notes: [...b2('B4', 'A4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'qd'), n('B4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'e')] },
  { measure: 12, slurEnd: 2, notes: [...b3('F4', 'E4', 'D4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b2('D4', 'E4'), ...b2('G4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b2('G4', 'A4'), ...b2('B4', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] }
];

export const POZZOLI_SERIE3_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...es2('C4', 'D4', 'E4'), ...es2('F4', 'E4', 'D4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...es2('E4', 'F4', 'G4'), ...b2('A4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [...es2('D4', 'E4', 'F4'), n('D4', 'q')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [...es2('E4', 'F4', 'G4'), n('E4', 'q')] },
  { measure: 7, slurStart: 0, notes: [...b2('F4', 'E4'), ...b2('F4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...es2('G4', 'A4', 'B4'), ...es2('C5', 'B4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...es2('G4', 'A4', 'B4'), ...es2('C5', 'B4', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('E5', 'q'), ...s4('D5', 'C5', 'B4', 'A4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('G4', 'F4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...es2('F4', 'G4', 'F4'), ...es2('E4', 'F4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

export const POZZOLI_SERIE3_EX7_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h'), ...b2('D4', 'F4')] },
  { measure: 2, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'h'), ...b2('F4', 'A4')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h'), ...b2('A4', 'C5')] },
  { measure: 6, slurEnd: 2, notes: [...b2('B4', 'A4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'q'), n('C5', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'h'), ...b2('B4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'h'), ...b2('G4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), ...b2('E4', 'D4'), ...b2('E4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'h'), ...b2('D4', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'q'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX8_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'h'), n('G4', 'q')] },
  { measure: 2, slurEnd: 2, notes: [...b2('E4', 'D4'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...b2('C4', 'D4'), n('E4', 'q'), n('G4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('F4', 'h'), n('A4', 'q')] },
  { measure: 6, slurEnd: 2, notes: [...b2('F4', 'E4'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...b2('D4', 'E4'), n('F4', 'q'), n('A4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'h'), n('A4', 'q')] },
  { measure: 10, slurEnd: 2, notes: [...b2('F4', 'G4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'h'), n('A4', 'q')] },
  { measure: 12, slurEnd: 2, notes: [...b2('G4', 'F4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'h'), n('G4', 'q')] },
  { measure: 14, slurEnd: 2, notes: [...b2('A4', 'G4'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b2('F4', 'G4'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX9_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e'), ...b2('B4', 'C5')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e'), ...b2('B4', 'C5')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd'), n('C5', 'e'), ...b2('B4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'qd'), n('C5', 'e'), ...b2('A4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e'), ...b2('G4', 'E4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('F4', 'qd'), n('G4', 'e'), ...b2('A4', 'F4')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'qd'), n('E4', 'e'), ...b2('F4', 'G4')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e'), ...b2('B4', 'D5')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX10_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r8'), n('C4', 'e'), ...b2('D4', 'E4'), ...b2('C4', 'E4')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('A4', 'B4'), ...b2('G4', 'B4')] },
  { measure: 4, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('B4', 'C5'), ...b2('D5', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'qd'), n('B4', 'e'), ...b2('A4', 'B4')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('A4', 'G4'), ...b2('E4', 'G4')] },
  { measure: 10, slurEnd: 0, notes: [n('F4', 'hd')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), n('F4', 'e'), ...b2('G4', 'F4'), ...b2('D4', 'F4')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F4', 'G4'), ...b2('E4', 'G4')] },
  { measure: 14, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('F4', 'e'), ...b2('G4', 'A4'), ...b2('F4', 'B4')] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'hd')] }
];

export const POZZOLI_SERIE3_EX11_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), n('D4', 'e'), ...b2('F4', 'E4')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('C4', 'e'), ...b2('D4', 'F4'), ...b2('E4', 'C4')] },
  { measure: 4, slurEnd: 0, notes: [n('D4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'qd'), n('E4', 'e'), ...b2('G4', 'F4')] },
  { measure: 6, slurEnd: 1, notes: [n('E4', 'q'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e'), ...b2('E4', 'G4'), ...b2('F4', 'D4')] },
  { measure: 8, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'e'), ...b2('A4', 'F4')] },
  { measure: 10, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd'), n('B4', 'e'), ...b2('C5', 'A4')] },
  { measure: 12, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('B4', 'C5'), ...b2('A4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('F4', 'e'), ...b2('E4', 'F4'), ...b2('D4', 'E4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'hd')] }
];

export const POZZOLI_SERIE3_EX12_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...s4('C4', 'D4', 'E4', 'F4'), ...b2('G4', 'E4'), ...b2('F4', 'D4')] },
  { measure: 2, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...s4('C4', 'D4', 'E4', 'F4'), ...b2('G4', 'E4'), ...b2('F4', 'A4')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 5]], notes: [...s4('G4', 'A4', 'B4', 'C5'), n('B4', 'q'), n('A4', 'q')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [...s4('G4', 'A4', 'B4', 'C5'), n('D5', 'h')] },
  { measure: 7, slurStart: 0, notes: [...s2e('E5', 'D5', 'C5'), ...b2('B4', 'A4'), ...b2('G4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [...s4('C5', 'B4', 'A4', 'B4'), ...b2('C5', 'A4'), ...b2('C5', 'A4')] },
  { measure: 10, slurEnd: 0, notes: [n('F4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [...s4('G4', 'F4', 'E4', 'F4'), ...b2('G4', 'F4'), ...b2('A4', 'F4')] },
  { measure: 12, slurEnd: 0, notes: [n('D4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [...s4('E4', 'F4', 'G4', 'A4'), n('B4', 'q'), n('B4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...s2e('C5', 'B4', 'A4'), ...b2('G4', 'E4'), ...b2('F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX13_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 2, slurEnd: 4, notes: [n('F4', 'q'), ...b2('E4', 'D4'), n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'h'), n('G4', 'q'), n('F4', 'q')] },
  { measure: 4, slurEnd: 4, notes: [n('A4', 'q'), ...b2('G4', 'F4'), n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h'), n('A4', 'q'), n('C5', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'h'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'q'), ...b2('B4', 'A4'), n('G4', 'q'), ...b2('F4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D4', 'h'), n('F4', 'q'), ...b2('E4', 'D4')] },
  { measure: 10, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'h'), n('G4', 'q'), ...b2('F4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), n('G4', 'q'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'q'), ...b2('B4', 'A4'), n('G4', 'q'), ...b2('F4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX14_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'h'), ...b2('G4', 'F4'), ...b2('E4', 'D4')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), ...b2('F4', 'E4'), ...b2('D4', 'C4'), n('E4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'h'), ...b2('D4', 'E4'), ...b2('C4', 'D4')] },
  { measure: 6, slurEnd: 2, notes: [n('E4', 'q'), n('F4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'h'), ...b4('A4', 'B4', 'G4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('B4', 'w')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'h'), ...b4('D5', 'C5', 'B4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'h'), ...b4('D5', 'C5', 'B4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'h'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'h'), ...b4('B4', 'C5', 'B4', 'A4')] },
  { measure: 14, slurEnd: 2, notes: [n('G4', 'q'), n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'h'), ...b4('G4', 'F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX15_MEASURES = [
  { measure: 1, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('C4', 'q'), n('A3', 'q'), n('B3', 'q')] },
  { measure: 2, localSlurs: [[0, 5]], notes: [n('C4', 'q'), ...s4('A3', 'B3', 'C4', 'B3'), n('A3', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('D4', 'q'), n('F4', 'q'), n('E4', 'q')] },
  { measure: 4, localSlurs: [[0, 5]], notes: [n('D4', 'q'), ...s4('F4', 'E4', 'D4', 'E4'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('F4', 'q'), n('G4', 'q'), n('B4', 'q')] },
  { measure: 6, localSlurs: [[0, 5]], notes: [n('A4', 'q'), ...s4('B4', 'A4', 'G4', 'A4'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[1, 4]], notes: [n('REST', 'r4'), ...b2('B4', 'A4'), n('B4', 'q'), n('D5', 'q')] },
  { measure: 8, localSlurs: [[0, 5]], notes: [n('C5', 'q'), ...s4('A4', 'B4', 'C5', 'D5'), n('E5', 'q'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('C5', 'q'), n('E5', 'q'), n('D5', 'q')] },
  { measure: 10, localSlurs: [[0, 5]], notes: [n('C5', 'q'), ...s4('C5', 'B4', 'A4', 'B4'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('A4', 'q'), n('C5', 'q'), n('B4', 'q')] },
  { measure: 12, localSlurs: [[0, 5]], notes: [n('A4', 'q'), ...s4('A4', 'G4', 'F4', 'G4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('A4', 'q'), n('G4', 'q'), n('E4', 'q')] },
  { measure: 14, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('G4', 'q'), n('F4', 'q'), n('D4', 'q')] },
  { measure: 15, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('F4', 'q'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 16, localSlurs: [[0, 5]], notes: [n('C4', 'q'), ...s4('E4', 'D4', 'C4', 'D4'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX16_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), n('D4', 'e'), n('F4', 'qd'), n('E4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'e'), n('A4', 'qd'), n('G4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('G4', 'qd'), n('A4', 'e'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('A4', 'qd'), n('B4', 'e'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'qd'), n('C5', 'e'), n('D5', 'qd'), n('C5', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'h'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd'), n('B4', 'e'), n('D5', 'qd'), n('C5', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'qd'), n('A4', 'e'), n('C5', 'qd'), n('B4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [n('A4', 'qd'), n('G4', 'e'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [n('G4', 'qd'), n('F4', 'e'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'qd'), n('E4', 'e'), n('D4', 'qd'), n('C4', 'e')] },
  { measure: 16, slurEnd: 2, notes: [n('E4', 'q'), n('D4', 'q'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX17_MEASURES = [
  { measure: 1, localSlurs: [[0, 3]], notes: [n('C4', 'qd'), ...s2('E4', 'D4'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 3]], notes: [n('E4', 'qd'), ...s2('G4', 'F4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'hd'), ...b2('A4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('D4', 'qd'), ...s2('F4', 'E4'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('F4', 'qd'), ...s2('A4', 'G4'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'hd'), ...b2('C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [n('G4', 'qd'), ...s2('B4', 'A4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [n('A4', 'qd'), ...s2('C5', 'B4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'qd'), n('C5', 'e'), n('D5', 'qd'), n('C5', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [n('A4', 'qd'), ...s2('G4', 'F4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [n('G4', 'qd'), ...s2('F4', 'E4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'hd'), ...b2('F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('B3', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

export const POZZOLI_SERIE3_EX18_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), n('B3', 'e'), ...b4('D4', 'C4', 'E4', 'D4')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('D4', 'e'), ...b4('F4', 'E4', 'G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 5, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('B4', 'qd'), n('A4', 'e'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 7, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('E5', 'h'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd'), n('D5', 'e'), ...b4('B4', 'C5', 'A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e'), ...b4('F4', 'G4', 'E4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 13, notes: [n('REST', 'r8'), n('D4', 'e'), n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('F4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, notes: [n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('D4', 'e'), n('REST', 'r8'), n('C4', 'e'), n('REST', 'r8'), n('B3', 'e')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'h', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C5', 'qd'), ...s2('B4', 'A4')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('B4', 'h')] },
  { measure: 4, slurEnd: 0, notes: [n('F4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'qd'), ...s2('G4', 'F4')] },
  { measure: 6, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'h')] },
  { measure: 8, slurEnd: 0, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [...es2('D4', 'E4', 'F4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 3]], notes: [...es2('E4', 'F4', 'G4'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [...es2('F4', 'G4', 'A4'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...es2('G4', 'A4', 'B4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b2('A4', 'D5'), ...b2('B4', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 2 (2/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'q'), ...s4('B4', 'A4', 'G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [...s4('E4', 'F4', 'G4', 'A4'), n('E4', 'q')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [...s4('F4', 'G4', 'A4', 'B4'), n('F4', 'q')] },
  { measure: 7, slurStart: 0, notes: [...s4('G4', 'A4', 'B4', 'C5'), ...s4('G4', 'A4', 'B4', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'q'), ...s4('G4', 'A4', 'B4', 'C5')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), ...s4('F4', 'G4', 'A4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 4]], notes: [n('A4', 'q'), ...s4('E4', 'F4', 'G4', 'A4')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [...b2('G4', 'C4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[0, 5]], notes: [...s4('F4', 'E4', 'D4', 'C4'), ...b2('G4', 'F4')] },
  { measure: 16, notes: [n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 3 (2/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX3_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...b2('C4', 'F4'), ...b2('C4', 'F4')] },
  { measure: 2, slurEnd: 0, notes: [n('F4', 'h')] },
  { measure: 3, slurStart: 0, notes: [...b2('D4', 'G4'), ...b2('D4', 'G4')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'h')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [...b2('E4', 'A4'), n('G4', 'q')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [...b2('F4', 'B4'), n('A4', 'q')] },
  { measure: 7, slurStart: 0, notes: [...b2('G4', 'C5'), ...b2('G4', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...b2('C5', 'G4'), ...b2('C5', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b2('A4', 'E4'), ...b2('A4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [...b2('G4', 'D4'), n('G4', 'q')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [...b2('F4', 'C4'), n('F4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('REST', 'r8'), ...b3('E4', 'B3', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 4 (2/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX4_MEASURES = [
  { measure: 1, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('C4', 'e'), ...b2('F4', 'E4')] },
  { measure: 2, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('C4', 'e'), ...b2('F4', 'E4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e'), ...s4('G4', 'A4', 'G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('A4', 'G4')] },
  { measure: 6, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('F4', 'e'), ...b2('B4', 'A4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('C5', 'G4')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'h')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D5', 'G4', 'A4')] },
  { measure: 10, slurEnd: 0, notes: [n('B4', 'h')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'F4', 'G4')] },
  { measure: 12, slurEnd: 0, notes: [n('A4', 'h')] },
  { measure: 13, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b3('B4', 'E4', 'F4')] },
  { measure: 14, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b3('A4', 'D4', 'E4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...s4('G4', 'F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd'), ...s2('C5', 'A4'), ...es2('B4', 'A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), ...s2('F4', 'E4'), ...es2('D4', 'E4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'qd'), ...s2('F4', 'G4'), ...es2('A4', 'G4', 'F4')] },
  { measure: 6, slurEnd: 1, notes: [n('E4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'qd'), ...s2('E4', 'D4'), ...es2('C4', 'D4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [n('D4', 'qd'), ...s2('E4', 'F4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [n('E4', 'qd'), ...s2('F4', 'G4'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('F4', 'qd'), n('G4', 'e'), ...b2('A4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd'), ...s2('C5', 'B4'), ...b2('A4', 'D5')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 1], [2, 3]], slurStart: 4, notes: [...b2('A4', 'E4'), ...b2('G4', 'D4'), ...b2('F4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'q'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd'), n('C5', 'e'), ...b2('F4', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'e'), ...b2('D4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'q'), n('F4', 'qd'), n('D4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('E4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'q'), n('G4', 'qd'), n('E4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd'), n('C5', 'e'), ...b2('A4', 'D5')] },
  { measure: 10, slurEnd: 0, notes: [n('B4', 'h'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'qd'), n('D5', 'e'), ...b2('A4', 'D5')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'h'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'q'), n('G4', 'qd'), n('C5', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'q'), n('D5', 'qd'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 7 (3/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX7_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('C5', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('A4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q'), n('D4', 'qd'), n('G4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'q'), n('B3', 'qd'), n('E4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C4', 'q'), n('F4', 'qd'), n('E4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('D4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'q'), n('G4', 'qd'), n('F4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('D5', 'q'), n('A4', 'qd'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 8 (4/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX8_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('A4', 'q'), n('E4', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('A4', 'q'), n('E4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'h'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('C4', 'q'), n('D4', 'q'), n('G4', 'q')] },
  { measure: 6, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('D4', 'q'), n('E4', 'q'), n('A4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'q'), n('F4', 'q'), n('B4', 'q')] },
  { measure: 8, slurEnd: 2, notes: [n('G4', 'q'), n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'q'), n('D5', 'q'), n('G4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q'), n('B4', 'q'), n('E4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('E4', 'q'), n('F4', 'q'), n('E4', 'q')] },
  { measure: 14, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('D4', 'q'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'q'), n('B3', 'q'), n('F4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 9 (4/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX9_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), n('F4', 'e'), n('D4', 'qd'), n('G4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'e'), n('F4', 'qd'), n('B4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('G4', 'qd'), n('C5', 'e'), n('G4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('A4', 'qd'), n('D5', 'e'), n('A4', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'qd'), n('E5', 'e'), n('B4', 'qd'), n('E5', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd'), n('G4', 'e'), n('C5', 'qd'), n('F4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), n('E4', 'e'), n('A4', 'qd'), n('E4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [n('G4', 'qd'), n('D4', 'e'), n('G4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [n('A4', 'qd'), n('E4', 'e'), n('G4', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'qd'), n('C4', 'e'), n('E4', 'qd'), n('B3', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 5ª SÉRIE — EXERCÍCIO Nº 10 (4/4, 16 compassos — Intervalos de quarta)
 */
export const POZZOLI_SERIE5_EX10_MEASURES = [
  { measure: 1, localSlurs: [[1, 3], [4, 5]], notes: [n('REST', 'r4'), ...b2('C4', 'F4'), n('E4', 'q'), ...b2('D4', 'G4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('G4', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[1, 3], [4, 5]], notes: [n('REST', 'r4'), ...b2('C5', 'G4'), n('A4', 'q'), ...b2('B4', 'F4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('G4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), ...b2('E4', 'A4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), ...b2('F4', 'B4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r4'), ...b2('G4', 'C5'), ...b4('A4', 'B4', 'C5', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), ...b2('D5', 'A4'), n('B4', 'q'), ...b2('C5', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), ...b2('B4', 'F4'), n('G4', 'q'), ...b2('A4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), ...b2('E4', 'B3'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), ...b2('F4', 'C4'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), ...b2('G4', 'D4'), ...b4('E4', 'F4', 'G4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX1_MEASURES = [
  { measure: 1, localSlurs: [[0, 4]], notes: [...s4('C4', 'D4', 'E4', 'F4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[0, 4]], notes: [...s4('A4', 'G4', 'F4', 'E4'), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [...s4('E4', 'F4', 'G4', 'A4'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...s4('E5', 'D5', 'C5', 'B4'), ...b2('A4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 4]], notes: [...s4('C5', 'B4', 'A4', 'G4'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 4]], notes: [...s4('B4', 'A4', 'G4', 'F4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 5]], notes: [...s4('A4', 'G4', 'F4', 'E4'), ...b2('D4', 'G4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[0, 5]], notes: [...s4('G4', 'F4', 'E4', 'D4'), ...b2('C4', 'D4')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 2 (2/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...eds('C4', 'D4'), ...eds('G4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('C4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...eds('A4', 'G4'), ...eds('D4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...eds('G4', 'B4'), ...eds('D5', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'q'), ...b2('A4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...eds('C5', 'B4'), ...eds('C5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('E5', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...eds('A4', 'G4'), ...eds('A4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [...eds('B4', 'A4'), n('G4', 'q')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [...eds('A4', 'G4'), n('F4', 'q')] },
  { measure: 15, slurStart: 0, notes: [...eds('G4', 'F4'), ...eds('D4', 'G4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 3 (2/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX3_MEASURES = [
  { measure: 1, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('C4', 'e'), n('G4', 'q')] },
  { measure: 2, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('G4', 'e'), n('C4', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('C4', 'e'), ...b2('F4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('G4', 'e'), n('D5', 'q')] },
  { measure: 6, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('D5', 'e'), n('G4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('C5', 'E5')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('E5', 'e'), n('A4', 'q')] },
  { measure: 10, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b3('A4', 'D5', 'A4')] },
  { measure: 11, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('D5', 'e'), n('G4', 'q')] },
  { measure: 12, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b3('G4', 'C5', 'G4')] },
  { measure: 13, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('A4', 'e'), n('D4', 'q')] },
  { measure: 14, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('G4', 'e'), n('C4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('B3', 'G4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 4 (3/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX4_MEASURES = [
  { measure: 1, localSlurs: [[0, 4]], notes: [...s4('C4', 'D4', 'E4', 'F4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[0, 4]], notes: [...s4('E4', 'F4', 'G4', 'A4'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 5]], notes: [...s4('D4', 'E4', 'F4', 'G4'), n('A4', 'q'), n('F4', 'q')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 8]], notes: [...s4('G4', 'A4', 'B4', 'C5'), ...s4('D5', 'C5', 'B4', 'A4'), n('G4', 'q')] },
  { measure: 8, localSlurs: [[0, 2]], notes: [...b2('G4', 'D5'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 4]], notes: [...s4('E5', 'D5', 'C5', 'B4'), n('A4', 'q'), n('E5', 'q')] },
  { measure: 10, localSlurs: [[0, 4]], notes: [...s4('D5', 'C5', 'B4', 'A4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[0, 4]], notes: [...s4('B4', 'A4', 'G4', 'F4'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 12, localSlurs: [[0, 4]], notes: [...s4('A4', 'G4', 'F4', 'E4'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 4]], notes: [...s4('G4', 'F4', 'E4', 'D4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 4]], notes: [...s4('F4', 'E4', 'D4', 'C4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 4]], notes: [...s4('B3', 'C4', 'D4', 'E4'), n('F4', 'q'), n('B3', 'q')] },
  { measure: 16, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'h'), ...b2('C4', 'G4')] },
  { measure: 2, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'h'), ...b2('D4', 'A4')] },
  { measure: 4, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'h'), ...b2('E4', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [...b2('C5', 'B4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'h'), ...b2('A4', 'E5')] },
  { measure: 10, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'h'), ...b2('G4', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'h'), ...b2('D4', 'A4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('G4', 'F4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX6_MEASURES = [
  { measure: 1, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('C4', 'E4', 'G4', 'E4', 'C4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('D4', 'F4', 'A4', 'F4', 'D4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b5('G4', 'B4', 'D5', 'B4', 'G4')] },
  { measure: 6, slurEnd: 2, notes: [n('D5', 'q'), n('C5', 'q'), n('B4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b5('C5', 'D5', 'E5', 'C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b5('E5', 'C5', 'A4', 'C5', 'E5')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b5('D5', 'B4', 'G4', 'B4', 'D5')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('C5', 'A4', 'F4', 'A4', 'C5')] },
  { measure: 14, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('G4', 'E4', 'C4', 'E4', 'G4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b5('G4', 'D4', 'B3', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 7 (3/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX7_MEASURES = [
  { measure: 1, notes: [n('REST', 'r8'), n('C4', 'e'), n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('C4', 'e')] },
  { measure: 2, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), n('A4', 'e'), ...b2('D4', 'E4'), n('F4', 'q')] },
  { measure: 3, notes: [n('REST', 'r8'), n('D4', 'e'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('D4', 'e')] },
  { measure: 4, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), n('B4', 'e'), ...b2('E4', 'F4'), n('G4', 'q')] },
  { measure: 5, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('D5', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 6, notes: [n('REST', 'r8'), n('F4', 'e'), n('REST', 'r8'), n('C5', 'e'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 7, notes: [n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('D5', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 10, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), n('D5', 'e'), ...b2('G4', 'E5'), n('D5', 'q')] },
  { measure: 11, notes: [n('REST', 'r8'), n('C5', 'e'), n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 12, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), n('B4', 'e'), ...b2('E4', 'C5'), n('B4', 'q')] },
  { measure: 13, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('A4', 'e'), n('D4', 'q'), n('A4', 'q')] },
  { measure: 14, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('C4', 'D4'), n('E4', 'q')] },
  { measure: 15, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('B3', 'e'), n('REST', 'r8'), n('D4', 'e')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 8 (4/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX8_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('C4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b3('C4', 'G4', 'E4'), n('D4', 'q'), n('C4', 'q')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('D4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 4, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b3('D4', 'A4', 'F4'), n('E4', 'q'), n('D4', 'q')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('G4', 'h'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b3('G4', 'D5', 'C5'), ...b2('B4', 'A4'), n('G4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'D5', 'G4'), ...b4('C5', 'B4', 'A4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('E5', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 10, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b3('A4', 'E5', 'D5'), n('C5', 'q'), n('B4', 'q')] },
  { measure: 11, localSlurs: [[0, 1]], notes: [n('C5', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 12, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b3('F4', 'C5', 'A4'), n('G4', 'q'), n('F4', 'q')] },
  { measure: 13, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b3('E4', 'B4', 'G4'), n('F4', 'q'), n('E4', 'q')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('A4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[1, 3], [5, 7]], notes: [n('REST', 'r8'), ...b3('C4', 'G4', 'D4'), n('REST', 'r8'), ...b3('B3', 'G4', 'D4')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'h', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 9 (4/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX9_MEASURES = [
  { measure: 1, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('C4', 'q'), n('G4', 'q'), n('C4', 'q')] },
  { measure: 2, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('G4', 'q'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 3, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('G4', 'q'), n('A4', 'q'), n('G4', 'q')] },
  { measure: 4, localSlurs: [[1, 4]], notes: [n('REST', 'r4'), ...b2('C5', 'G4'), ...b2('A4', 'D5'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('G4', 'q'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 6, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('B4', 'q'), n('G4', 'q'), n('B4', 'q')] },
  { measure: 7, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('F4', 'q'), n('A4', 'q'), n('F4', 'q')] },
  { measure: 8, localSlurs: [[0, 4]], notes: [...b2('C5', 'A4'), ...b2('G4', 'B4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('A4', 'q'), n('E4', 'q'), n('A4', 'q')] },
  { measure: 10, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('G4', 'q'), n('C5', 'q'), n('G4', 'q')] },
  { measure: 11, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('G4', 'q'), n('C4', 'q'), n('G4', 'q')] },
  { measure: 12, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('F4', 'q'), n('B4', 'q'), n('F4', 'q')] },
  { measure: 13, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('F4', 'q'), n('B3', 'q'), n('F4', 'q')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...b4('E4', 'F4', 'G4', 'F4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('B3', 'q'), n('D4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 6ª SÉRIE — EXERCÍCIO Nº 10 (4/4, 16 compassos — Intervalos de quinta)
 */
export const POZZOLI_SERIE6_EX10_MEASURES = [
  { measure: 1, localSlurs: [[1, 3], [5, 7]], notes: [n('REST', 'r8'), ...b3('C4', 'G4', 'C4'), n('REST', 'r8'), ...b3('C4', 'G4', 'C4')] },
  { measure: 2, localSlurs: [[1, 2]], notes: [n('REST', 'r4'), n('G4', 'q'), n('C5', 'h')] },
  { measure: 3, localSlurs: [[1, 3], [5, 7]], notes: [n('REST', 'r8'), ...b3('C4', 'G4', 'C4'), n('REST', 'r8'), ...b3('C4', 'G4', 'C4')] },
  { measure: 4, localSlurs: [[1, 2]], notes: [n('REST', 'r4'), n('G4', 'q'), n('D5', 'h')] },
  { measure: 5, localSlurs: [[1, 3], [5, 7]], notes: [n('REST', 'r8'), ...b3('B4', 'E5', 'B4'), n('REST', 'r8'), ...b3('B4', 'E5', 'B4')] },
  { measure: 6, localSlurs: [[1, 2]], notes: [n('REST', 'r4'), n('A4', 'q'), n('E4', 'h')] },
  { measure: 7, localSlurs: [[1, 3], [5, 7]], notes: [n('REST', 'r8'), ...b3('A4', 'D5', 'A4'), n('REST', 'r8'), ...b3('A4', 'D5', 'A4')] },
  { measure: 8, localSlurs: [[1, 2]], notes: [n('REST', 'r4'), n('G4', 'q'), n('C4', 'h')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C4', 'G4', 'C4'), ...b4('G4', 'C4', 'G4', 'C4')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D4', 'A4', 'D4'), ...b4('A4', 'D4', 'A4', 'D4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('E4', 'B4', 'E4'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 14, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('D4', 'A4', 'D4'), n('A4', 'q'), n('F4', 'q')] },
  { measure: 15, localSlurs: [[1, 3], [5, 7]], notes: [n('REST', 'r8'), ...b3('G4', 'B3', 'G4'), n('REST', 'r8'), ...b3('F4', 'B3', 'F4')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'h', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 1 (6/8, 16 compassos — Intervalos da série precedente em compasso composto)
 */
export const POZZOLI_SERIE7_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('E4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('D4', 'q'), n('G4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...b3('E4', 'D4', 'C4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('A4', 'G4', 'F4'), ...b3('C5', 'B4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), n('D5', 'e'), n('G4', 'q'), n('C5', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), n('B4', 'e'), n('E4', 'q'), n('A4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b3('G4', 'F4', 'E4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'e'), n('D4', 'q'), n('G4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 2 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX2_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('C4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('C4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b3('C4', 'F4', 'E4'), ...b3('D4', 'A4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('G4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G4', 'qd'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('G4', 'C5', 'B4'), ...b3('A4', 'D5', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('E5', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('D5', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 1]], notes: [n('C5', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('B4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b3('E4', 'A4', 'G4'), ...b3('F4', 'B4', 'A4')] },
  { measure: 14, slurEnd: 3, notes: [...b3('G4', 'C5', 'B4'), n('A4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd'), ...b3('G4', 'D5', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 3 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX3_MEASURES = [
  { measure: 1, localSlurs: [[0, 3]], notes: [...b3('C4', 'D4', 'G4'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 3]], notes: [...b3('C4', 'E4', 'G4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b3('F4', 'G4', 'E4'), ...b3('F4', 'C4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [...b3('G4', 'A4', 'D5'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [...b3('G4', 'B4', 'D5'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('C5', 'D5', 'B4'), ...b3('C5', 'G4', 'E5')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [...b3('C5', 'A4', 'G4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [...b3('B4', 'G4', 'B4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b3('B4', 'G4', 'B4'), ...b3('F4', 'G4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [...b3('G4', 'E4', 'D4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...b3('F4', 'D4', 'C4'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b3('E4', 'D4', 'C4'), ...b3('G4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 4 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...s2('A4', 'F4'), n('G4', 'q'), ...s2('A4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[1, 6]], notes: [n('REST', 'r8'), ...b2('C4', 'D4'), ...b3('G4', 'E4', 'A4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 4, slurStart: 0, notes: [n('G4', 'q'), ...s2('A4', 'F4'), n('G4', 'q'), ...s2('A4', 'F4')] },
  { measure: 5, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, slurStart: 1, notes: [n('REST', 'r8'), ...b2('D4', 'E4'), ...b3('A4', 'F4', 'B4')] },
  { measure: 7, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 8, localSlurs: [[0, 3]], notes: [n('C5', 'q'), ...s2('D5', 'B4'), n('C5', 'qd')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [n('B4', 'q'), ...s2('C5', 'A4'), n('B4', 'qd')] },
  { measure: 10, slurStart: 0, notes: [n('A4', 'q'), ...s2('B4', 'G4'), n('A4', 'q'), ...s2('B4', 'G4')] },
  { measure: 11, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[1, 6]], notes: [n('REST', 'r8'), ...b2('G4', 'F4'), ...b3('E4', 'F4', 'D4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[1, 6]], notes: [n('REST', 'r8'), ...b2('G4', 'F4'), ...b3('E4', 'F4', 'D4'), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('C4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[0, 1]], notes: [n('C4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 5 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd'), n('F4', 'qd'), n('G4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('B4', 'qd'), n('A4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'hd', { tieStop: true })] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd'), n('C5', 'qd'), n('D5', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('E5', 'qd'), n('A4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'qd'), n('D5', 'qd'), n('D5', 'qd')] },
  { measure: 8, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 2]], notes: [n('D5', 'q'), n('C5', 'e'), n('G4', 'hd')] },
  { measure: 10, localSlurs: [[0, 2]], notes: [n('C5', 'q'), n('B4', 'e'), n('G4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'qd'), n('B4', 'qd'), n('E4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'hd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'qd'), n('G4', 'qd'), n('A4', 'qd')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'q'), n('F4', 'e'), n('D4', 'qd'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 6 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd'), ...b3('F4', 'A4', 'G4')] },
  { measure: 2, slurEnd: 2, notes: [n('E4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), ...b3('E4', 'B4', 'G4')] },
  { measure: 4, slurEnd: 2, notes: [n('F4', 'qd'), n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('G4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'qd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('G4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), ...b3('A4', 'B4', 'D5')] },
  { measure: 8, slurEnd: 0, notes: [n('E5', 'hd'), n('E5', 'qd')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), ...b3('D5', 'C5', 'D5')] },
  { measure: 10, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd'), ...b3('C5', 'B4', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 13, localSlurs: [[0, 5]], notes: [n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('A4', 'e'), n('B4', 'qd')] },
  { measure: 14, localSlurs: [[0, 5]], notes: [n('F4', 'q'), n('G4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'qd'), n('G4', 'qd'), ...b3('F4', 'A4', 'G4')] },
  { measure: 16, slurEnd: 2, notes: [n('E4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 7 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX7_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'e'), n('G4', 'q'), n('D4', 'e'), n('A4', 'q'), n('E4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q'), n('E4', 'e'), n('B4', 'q'), n('F4', 'e'), n('C5', 'q'), n('G4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('C5', 'q'), n('D5', 'e'), n('B4', 'hd')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('C5', 'q'), n('D5', 'e'), n('E5', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'q'), n('A4', 'e'), n('E5', 'q'), n('D5', 'e'), n('B4', 'q'), n('C5', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), n('G4', 'e'), n('B4', 'q'), n('F4', 'e'), n('A4', 'q'), n('E4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), n('G4', 'e'), n('F4', 'q'), n('E4', 'e'), n('D4', 'q'), n('C4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [n('E4', 'q'), n('D4', 'e'), n('G4', 'hd')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [n('F4', 'q'), n('D4', 'e'), n('G4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'e'), n('A4', 'q'), n('F4', 'e'), n('G4', 'q'), n('D4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 8 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX8_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('C5', 'qd'), n('G4', 'hd')] },
  { measure: 2, localSlurs: [[0, 4]], notes: [...b3('A4', 'G4', 'E4'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('A4', 'qd'), n('E4', 'hd')] },
  { measure: 4, localSlurs: [[0, 4]], notes: [...b3('F4', 'E4', 'C4'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'qd'), n('A4', 'qd'), n('G4', 'qd')] },
  { measure: 6, slurEnd: 3, notes: [...b3('E4', 'C5', 'A4'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), n('D5', 'qd'), n('C5', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'qd'), n('G5', 'hd')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('F5', 'qd'), n('B4', 'hd')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [...b3('E5', 'D5', 'B4'), n('C5', 'hd')] },
  { measure: 11, localSlurs: [[0, 1]], notes: [n('D5', 'qd'), n('G4', 'hd')] },
  { measure: 12, localSlurs: [[0, 3]], notes: [...b3('C5', 'B4', 'G4'), n('A4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'q'), n('C5', 'e'), n('A4', 'q'), n('G4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd'), n('C4', 'qd'), ...b3('F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 9 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX9_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C5', 'qd'), n('B4', 'q'), n('C5', 'e'), n('G4', 'q'), n('C5', 'e'), n('G4', 'q'), n('C5', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), n('F4', 'q'), n('A4', 'e'), n('E4', 'q'), n('G4', 'e'), n('D4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'e'), n('G4', 'qd'), n('F4', 'qd'), n('B4', 'qd')] },
  { measure: 6, slurEnd: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'hd', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('E4', 'e'), n('A4', 'q'), n('G4', 'e'), n('B4', 'q'), n('A4', 'e'), n('C5', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'wd')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), n('D5', 'q'), n('E5', 'e'), n('D5', 'q'), n('E5', 'e'), n('C5', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), n('G4', 'q'), n('B4', 'e'), n('F4', 'q'), n('A4', 'e'), n('E4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'qd'), ...b3('G4', 'F4', 'E4'), n('C4', 'qd')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'q'), n('F4', 'e'), n('F4', 'q'), n('E4', 'e'), n('E4', 'q'), n('D4', 'e'), n('D4', 'q'), n('C4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 10 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'qd', { tieStop: true }), ...b3('A4', 'G4', 'F4'), n('G4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'qd', { tieStop: true }), ...b3('G4', 'F4', 'E4'), n('F4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [...b3('C4', 'B3', 'C4'), n('G4', 'qd'), n('G4', 'hd')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [...b3('F4', 'E4', 'F4'), n('A4', 'qd'), n('A4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [...b3('G4', 'F4', 'E4'), ...b3('A4', 'G4', 'F4'), ...b3('B4', 'A4', 'G4'), ...b3('C5', 'B4', 'A4')] },
  { measure: 8, slurEnd: 2, notes: [n('D5', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'qd', { tieStop: true }), ...b3('F5', 'E5', 'D5'), n('E5', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'qd', { tieStop: true }), ...b3('E5', 'D5', 'C5'), n('D5', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 4]], notes: [...b3('E4', 'D4', 'E4'), n('A4', 'qd'), n('A4', 'hd')] },
  { measure: 14, localSlurs: [[0, 4]], notes: [...b3('F4', 'E4', 'F4'), n('B4', 'qd'), n('B4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...b3('E4', 'D4', 'E4'), ...b3('F4', 'E4', 'F4'), ...b3('G4', 'F4', 'G4'), ...b3('A4', 'G4', 'F4')] },
  { measure: 16, slurEnd: 2, notes: [n('E4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Modo menor: Lá menor)
 */
export const POZZOLI_SERIE8_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'q'), ...b2('G#4', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b2('A4', 'G#4'), ...b2('A4', 'C5')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...b2('A4', 'F#4'), ...b2('G#4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('A4', 'G#4'), ...b2('A4', 'Gn4')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'q'), ...b2('F#4', 'G#4')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b2('E4', 'F#4'), ...b2('G#4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 14, notes: [...b2('B4', 'A4'), ...b2('G#4', 'A4')] },
  { measure: 15, notes: [...b2('C5', 'B4'), ...b2('A4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 2 (2/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...b2('A4', 'E4'), ...b2('F#4', 'G#4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b2('A4', 'E4'), ...b2('Fn4', 'G#4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...b2('A4', 'G#4'), ...b2('A4', 'Gn4')] },
  { measure: 6, slurEnd: 2, notes: [...b2('F4', 'E4'), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'q'), n('B4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('F#4', 'G#4')] },
  { measure: 10, slurEnd: 2, notes: [...b2('A4', 'B4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('F4', 'G#4')] },
  { measure: 12, slurEnd: 2, notes: [...b2('A4', 'B4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b2('D5', 'C5'), ...b2('B4', 'G#4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('A4', 'Gn4'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('G#4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 3 (2/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX3_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...eds('A4', 'G#4'), ...eds('A4', 'Gn4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...eds('A4', 'G#4'), ...eds('A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [...eds('A4', 'B4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [...eds('A4', 'Gn4'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('F4', 'A4'), ...b2('G4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...eds('E4', 'F#4'), ...eds('G#4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...eds('E4', 'F4'), ...eds('F4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b2('B4', 'D5'), ...b2('A4', 'G4')] },
  { measure: 14, notes: [...b2('G#4', 'A4'), ...b2('Gn4', 'F4')] },
  { measure: 15, notes: [n('E4', 'q'), ...b2('F#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 4 (2/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A3', 'q'), ...s4('C4', 'D4', 'E4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'qd'), n('B4', 'e')] },
  { measure: 6, slurEnd: 2, notes: [...b2('G#4', 'E4'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 7, localSlurs: [[0, 3]], notes: [...b2('A4', 'G#4'), ...b2('A4', 'F4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'q'), ...s4('D5', 'C5', 'B4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('G#4', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), ...s4('B4', 'A4', 'G4', 'F#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'qd'), n('G4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('F4', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'h'), n('G#4', 'q')] },
  { measure: 2, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'h'), ...b2('G#4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'q'), n('A4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('E5', 'qd'), n('D5', 'e'), n('C5', 'q')] },
  { measure: 7, slurStart: 0, notes: [...b2('G4', 'A4'), ...b2('B4', 'G4'), ...b2('Fn4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'h'), n('F4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'q'), n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'q'), n('G#4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b2('E4', 'F#4'), ...b2('G#4', 'A4'), ...b2('B4', 'C5')] },
  { measure: 14, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'q'), n('B4', 'q'), n('G#4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd'), n('G#4', 'e'), ...b2('E4', 'G#4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd'), n('F#4', 'e'), ...b2('G#4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'q'), n('E5', 'q'), ...b2('C5', 'B4')] },
  { measure: 6, slurEnd: 2, notes: [n('A4', 'q'), n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('F4', 'C5'), ...b2('B4', 'A4'), ...b2('E4', 'G4')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'e'), ...b2('A4', 'G#4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('E4', 'G#4'), ...b2('B4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...b2('D5', 'C5'), ...b2('B4', 'G#4'), ...b2('A4', 'Gn4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('F4', 'E4'), n('D4', 'q', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), ...b2('F#4', 'G#4'), ...b2('B4', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 7 (3/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX7_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'G#4'), ...b2('A4', 'C5')] },
  { measure: 2, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'A4'), ...b2('G4', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'G#4'), ...b2('A4', 'D5')] },
  { measure: 6, slurEnd: 1, notes: [n('F5', 'h'), n('D5', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('B4', 'e'), ...b2('C5', 'B4'), ...b2('G#4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('E5', 'e'), ...b2('D5', 'C5'), ...b2('B4', 'G#4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h'), n('G4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('B4', 'A4'), ...b2('G4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'h'), n('C4', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F4', 'F#4'), ...b2('G#4', 'A4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('A4', 'B4'), n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b2('B4', 'A4'), n('E4', 'q'), n('G#4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 8 (4/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX8_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('E4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('E4', 'h'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), ...b2('F#4', 'G#4'), n('C5', 'q'), ...b2('B4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'h'), n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G#4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'q'), ...b2('E4', 'F#4'), n('G4', 'q'), ...b2('D5', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('A4', 'h'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('A4', 'h'), n('Gn4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), ...b2('F#4', 'G#4'), n('A4', 'q'), n('Gn4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 1]], notes: [n('E4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('E4', 'h'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('B4', 'q'), n('E4', 'q'), n('G#4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 9 (4/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX9_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'h'), ...b2('E4', 'F4'), ...b2('B4', 'G#4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...b2('E4', 'F#4'), ...b2('G#4', 'A4'), ...b2('C5', 'B4'), ...b2('An4', 'Gn4')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'q'), ...b2('E4', 'F#4'), ...b2('G#4', 'A4'), ...b2('C5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...b2('A4', 'G#4'), ...b2('F#4', 'G4'), ...b2('A4', 'B4'), ...b2('C5', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('E5', 'h', { tieStart: true }), n('E5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'q'), ...b2('G#4', 'A4'), ...b2('C5', 'B4'), n('E4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), ...b2('F#4', 'G#4'), ...b2('B4', 'A4'), n('E4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'q'), ...b2('E4', 'F#4'), ...b2('G#4', 'E5'), n('D5', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b2('G#4', 'A4'), ...b2('Gn4', 'F4'), n('E4', 'q'), ...b2('F#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 10 (4/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A3', 'qd'), n('C4', 'e'), n('E4', 'qd'), n('A4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'qd'), n('F4', 'e'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('G#4', 'e'), n('B4', 'qd'), n('E5', 'e')] },
  { measure: 4, slurEnd: 2, notes: [n('D5', 'qd'), n('C5', 'e'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [...b4('A4', 'E4', 'C5', 'E4'), n('G#4', 'h')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [...b4('F#4', 'D4', 'B4', 'D4'), n('E4', 'h')] },
  { measure: 7, slurStart: 0, notes: [...b2('E4', 'F#4'), ...b2('G#4', 'A4'), ...b2('B4', 'A4'), ...b2('Gn4', 'Fn4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'e'), n('C5', 'qd'), n('E5', 'e')] },
  { measure: 10, slurEnd: 2, notes: [n('D5', 'qd'), n('C5', 'e'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('F4', 'qd'), n('A4', 'e'), n('D5', 'qd'), n('F5', 'e')] },
  { measure: 12, slurEnd: 2, notes: [n('E5', 'qd'), n('D5', 'e'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 4]], notes: [...b4('C5', 'B4', 'A4', 'C5'), n('E5', 'h')] },
  { measure: 14, localSlurs: [[0, 4]], notes: [...b4('B4', 'A4', 'G#4', 'B4'), n('E5', 'h')] },
  { measure: 15, slurStart: 0, notes: [...b2('A4', 'G#4'), ...b2('F#4', 'G#4'), ...b4('A4', 'E5', 'C5', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 11 (6/8, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX11_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd'), ...b3('G#4', 'B4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'qd'), ...b3('A4', 'C5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('G#4', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('B4', 'Gn4', 'Fn4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 1], [2, 3]], notes: [n('F4', 'q'), n('E4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('A4', 'qd'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 1], [2, 3]], notes: [n('E4', 'q'), n('D4', 'e'), n('G#4', 'q'), n('E4', 'e')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b3('A4', 'Gn4', 'Fn4'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 12 (6/8, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX12_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...s2('E4', 'F4'), n('G4', 'q'), ...s2('E4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'q'), ...s2('F4', 'G4'), n('A4', 'q'), ...s2('F4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'q'), ...s2('F#4', 'G#4'), n('A4', 'q'), ...s2('B4', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('D5', 'C5', 'B4'), ...b3('G#4', 'A4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G#4', 'q'), ...s2('E4', 'F#4'), n('G#4', 'q'), ...s2('E4', 'F#4')] },
  { measure: 10, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), ...s2('F#4', 'G#4'), n('A4', 'q'), ...s2('F#4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'q'), ...s2('G#4', 'A4'), n('B4', 'q'), ...s2('G#4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 13 (9/8, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX13_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('G4', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('G#4', 'e'), n('Gn4', 'q'), n('A4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'hd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('E4', 'q'), n('F#4', 'e'), n('G#4', 'hd')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('E4', 'q'), n('F#4', 'e'), n('B4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'hd', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('G4', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e'), n('C5', 'q'), n('B4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b3('E5', 'D5', 'B4'), ...b3('A4', 'G#4', 'A4'), ...b3('Gn4', 'F4', 'E4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'e'), n('G#4', 'q'), n('E4', 'e'), n('G#4', 'q'), n('F4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 14 (9/8, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX14_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A3', 'qd'), ...s4('C4', 'D4', 'E4', 'F#4'), ...s2('G#4', 'A4')] },
  { measure: 2, slurEnd: 2, notes: [n('B4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'qd'), ...s4('E4', 'F#4', 'G#4', 'A4'), ...s2('B4', 'C5')] },
  { measure: 4, slurEnd: 2, notes: [n('D5', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [...b3('G#4', 'A4', 'B4'), n('E4', 'hd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [...b3('F#4', 'G#4', 'A4'), n('E4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('G#4', 'q'), n('E4', 'e'), n('Gn4', 'q'), n('E4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'qd'), n('E5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), ...s4('D5', 'C5', 'B4', 'G#4'), ...s2('A4', 'F4')] },
  { measure: 10, slurEnd: 2, notes: [n('C4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), ...s4('G#4', 'F4', 'E4', 'D4'), ...s2('C4', 'B3')] },
  { measure: 12, slurEnd: 2, notes: [n('A3', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [...b3('D4', 'E4', 'F4'), n('A4', 'hd')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...b3('E4', 'F4', 'E4'), n('A4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('G#4', 'q'), n('E4', 'e'), n('F4', 'q'), n('D4', 'e'), n('E4', 'q'), n('B3', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A3', 'qd', { tieStart: true }), n('A3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 15 (12/8, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX15_MEASURES = [
  { measure: 1, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('F4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'hd')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('F#4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'hd')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [...b3('E5', 'D5', 'C5'), n('A4', 'hd'), n('A4', 'qd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('E5', 'qd'), ...b3('D5', 'C5', 'B4'), n('G#4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'q'), n('C5', 'e'), n('B4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('E4', 'e'), n('Gn4', 'q'), n('F4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('F4', 'e'), n('E4', 'q'), n('C5', 'e'), n('G#4', 'q'), n('B4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 6]], notes: [...b3('E5', 'D5', 'C5'), ...b3('B4', 'G#4', 'A4'), n('B4', 'hd')] },
  { measure: 14, localSlurs: [[0, 6]], notes: [...b3('D5', 'C5', 'B4'), ...b3('A4', 'G#4', 'G#4'), n('A4', 'hd')] },
  { measure: 15, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'e'), n('Gn4', 'q'), n('Fn4', 'e'), n('E4', 'q'), n('F#4', 'e'), n('G#4', 'q'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Intervalos de 6ª e 7ª)
 */
export const POZZOLI_SERIE9_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), ...s4('F4', 'G4', 'A4', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q'), ...s4('A4', 'B4', 'C5', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('D5', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('C5', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 7, localSlurs: [[0, 4]], notes: [...s4('D4', 'E4', 'F4', 'G4'), ...b2('A4', 'B3')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'q'), ...s4('F4', 'G4', 'A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C4', 'q'), ...s4('D4', 'E4', 'F4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q'), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1]], notes: [n('B3', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...s4('D4', 'E4', 'F4', 'G4'), ...b2('A4', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q'), n('C4', 'e'), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 2 (2/4, 16 compassos — Intervalos de 6ª e 7ª)
 */
export const POZZOLI_SERIE9_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...eds('E5', 'D5')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'q'), ...eds('B4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('G4', 'q'), ...eds('E5', 'D5')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'q'), ...eds('C4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'q'), ...eds('C5', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'q'), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C4', 'q'), ...eds('A4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[0, 1], [2, 3]], notes: [...b2('F4', 'D5'), ...b2('G4', 'E5')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 3 (2/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE9_EX3_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('A3', 'q'), n('F4', 'q')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('A4', 'q')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('C5', 'q')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [...b2('B4', 'G#4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 7, localSlurs: [[0, 1]], notes: [n('G#4', 'q'), ...b2('E5', 'D5')] },
  { measure: 8, localSlurs: [[0, 4]], notes: [...s4('C5', 'D5', 'B4', 'C5'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'q'), ...b2('G4', 'G#4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), ...b2('E4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'q'), ...b2('B3', 'C4')] },
  { measure: 14, slurEnd: 4, notes: [...s4('D4', 'E4', 'F4', 'G4'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('G#3', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('A3', 'q', { tieStart: true }), n('A3', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 4 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...s4('A4', 'B4', 'C5', 'D5'), n('E5', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'q'), n('REST', 'r4'), n('G4', 'q')] },
  { measure: 3, localSlurs: [[0, 1], [3, 4]], notes: [n('D5', 'qd'), n('F4', 'e'), n('E4', 'q')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('C5', 'h'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q'), ...s4('F4', 'G4', 'A4', 'B4'), n('C5', 'q')] },
  { measure: 6, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 1]], notes: [n('D4', 'qd'), n('B4', 'e'), n('C5', 'q')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('B3', 'q'), ...s4('C4', 'D4', 'E4', 'F4'), ...b2('G4', 'B3')] },
  { measure: 10, slurEnd: 1, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C4', 'q'), ...s4('D4', 'E4', 'F4', 'G4'), ...b2('A4', 'C4')] },
  { measure: 12, slurEnd: 1, notes: [n('D4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('G4', 'A4'), ...b2('B4', 'C5')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 1], [2, 3]], notes: [n('A4', 'q'), n('C4', 'q'), ...b2('G4', 'B3')] },
  { measure: 16, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX5_MEASURES = [
  { measure: 1, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('C5', 'G4', 'E4', 'G4', 'C5')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('B4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('B4', 'F4', 'D4', 'F4', 'B4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('A4', 'h'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('A4', 'E4', 'C4', 'E4', 'A4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G4', 'h'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'q'), n('B3', 'q'), n('G4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('C4', 'E4', 'B4', 'E4', 'C4')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('D5', 'h'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('E4', 'G4', 'C5', 'G4', 'E4')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('E5', 'h'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('F4', 'A4', 'D5', 'A4', 'F4')] },
  { measure: 14, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('E4', 'G4', 'C5', 'G4', 'E4')] },
  { measure: 15, localSlurs: [[0, 2]], notes: [n('D4', 'q'), n('B4', 'q'), n('D4', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('C5', 'h'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE9_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...eds('A4', 'B4'), ...eds('C5', 'D5'), ...eds('E5', 'F5')] },
  { measure: 2, slurEnd: 1, notes: [n('E5', 'q'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('C5', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [...eds('E4', 'F#4'), ...eds('G#4', 'A4'), ...eds('B4', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('G#4', 'q'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [...eds('G4', 'F4'), ...eds('E4', 'D4'), ...eds('C4', 'B3')] },
  { measure: 10, slurEnd: 1, notes: [n('E4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [...eds('A4', 'G#4'), ...eds('F4', 'E4'), ...eds('D4', 'C4')] },
  { measure: 12, slurEnd: 1, notes: [n('D4', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...eds('D5', 'C5'), ...eds('B4', 'A4'), ...eds('G#4', 'F4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('E5', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('D5', 'q'), n('C5', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 7 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX7_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('E5', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('E5', 'q'), n('G4', 'q'), n('E5', 'q')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('D5', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 4, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('D5', 'q'), n('F4', 'q'), n('D5', 'q')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('C5', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('B4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('A4', 'q'), n('C4', 'q'), n('A4', 'q')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('B3', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 10, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('B3', 'q'), n('G4', 'q'), n('B3', 'q')] },
  { measure: 11, localSlurs: [[0, 1]], notes: [n('C4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 12, localSlurs: [[1, 2]], notes: [n('D4', 'q'), n('B4', 'h'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 1]], notes: [n('E4', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('F4', 'q'), n('D5', 'q'), n('F4', 'q')] },
  { measure: 15, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('D4', 'q'), n('B4', 'q'), n('D4', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'h'), n('C5', 'q'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 8 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX8_MEASURES = [
  { measure: 1, localSlurs: [[0, 2]], notes: [n('E4', 'qd'), n('G4', 'e'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 2]], notes: [n('B4', 'qd'), n('G4', 'e'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'qd'), n('E4', 'e'), n('A4', 'qd'), n('C4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('B3', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('B3', 'qd'), n('D4', 'e'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('C4', 'qd'), n('E4', 'e'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'qd'), n('F4', 'e'), n('B4', 'qd'), n('D4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), n('C5', 'e'), n('G4', 'qd'), n('E5', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'qd'), n('A4', 'e'), n('E4', 'qd'), n('C5', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [n('A4', 'qd'), n('F4', 'e'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [n('G4', 'qd'), n('E4', 'e'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'qd'), n('B3', 'e'), n('D5', 'qd'), n('F4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 9 (4/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE9_EX9_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q'), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 2, slurEnd: 0, notes: [n('F5', 'q'), n('A4', 'q'), n('G#4', 'h')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q'), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 4, slurEnd: 0, notes: [n('F5', 'q'), n('A4', 'q'), n('G#4', 'h')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('G#4', 'q'), ...s4('A4', 'B4', 'C5', 'D5')] },
  { measure: 6, slurEnd: 0, notes: [n('E5', 'q'), n('G4', 'q'), n('F4', 'q'), n('D5', 'q')] },
  { measure: 7, localSlurs: [[0, 2]], notes: [n('C5', 'q'), n('D4', 'q'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'q'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'q'), n('E4', 'q'), n('D4', 'q'), n('B4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'q'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'q'), n('E4', 'q'), n('D4', 'q'), n('B4', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'qd'), n('E4', 'e'), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 14, slurEnd: 0, notes: [n('F5', 'q'), n('A4', 'q'), n('G#4', 'q'), n('E5', 'q')] },
  { measure: 15, localSlurs: [[1, 3]], notes: [n('D5', 'q'), n('F4', 'q'), n('E4', 'q'), n('C5', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('B4', 'h'), n('A4', 'q'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 10 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX10_MEASURES = [
  { measure: 1, localSlurs: [[0, 2]], notes: [n('C4', 'q'), ...b2('F4', 'A4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[0, 2]], notes: [n('C5', 'q'), ...b2('G4', 'E4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('D4', 'q'), ...b2('G4', 'B4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 7, localSlurs: [[0, 2]], notes: [n('D5', 'q'), ...b2('A4', 'F4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 2]], notes: [n('E4', 'q'), ...b2('A4', 'C5')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('E5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 2]], notes: [n('F4', 'q'), ...b2('B4', 'D5')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('F5', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1], [2, 3]], notes: [...b2('G5', 'E5'), ...b2('G4', 'E4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('F5', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[0, 1]], notes: [n('D5', 'qd'), n('B4', 'e')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 11 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX11_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'q'), ...eds('A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'q'), ...eds('D5', 'C5')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), ...eds('E5', 'D5')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'q'), n('B4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C4', 'q'), ...eds('A4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'q'), ...eds('B4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'q'), ...eds('C5', 'B4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('A4', 'F4'), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), ...eds('D5', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q'), n('C4', 'e'), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 12 (2/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE9_EX12_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('A3', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('G#4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'E4', 'C4')] },
  { measure: 4, slurEnd: 0, notes: [n('B3', 'h')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('B4', 'G4', 'E4')] },
  { measure: 8, slurEnd: 0, notes: [n('D4', 'h')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C4', 'A4', 'F4')] },
  { measure: 14, notes: [...b4('G#4', 'A4', 'F4', 'D4')] },
  { measure: 15, slurEnd: 1, notes: [n('B3', 'q'), n('G#4', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('A3', 'q', { tieStart: true }), n('A3', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 13 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX13_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'q'), n('B4', 'q'), n('A4', 'q')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'q'), n('D5', 'q'), n('C5', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('E4', 'q'), n('C5', 'q'), n('B4', 'q')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('D4', 'q'), n('B4', 'q'), n('A4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('C4', 'q'), n('A4', 'q'), n('G4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, localSlurs: [[0, 2]], notes: [n('C4', 'q'), n('A4', 'qd'), n('G4', 'e')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[0, 2]], notes: [n('F4', 'q'), n('D5', 'qd'), n('C5', 'e')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('C5', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [n('E4', 'q'), n('C5', 'q'), n('B4', 'q')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('D5', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('B3', 'q'), n('A4', 'qd'), n('G4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 14 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX14_MEASURES = [
  { measure: 1, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('C4', 'E4', 'G4'), n('C5', 'q')] },
  { measure: 2, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('B4', 'G4', 'D4'), n('B3', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b5('C4', 'E4', 'G4', 'C5', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('D4', 'F4', 'A4'), n('D5', 'q')] },
  { measure: 6, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('C5', 'A4', 'E4'), n('C4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b5('D4', 'F4', 'A4', 'D5', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('E4', 'G4', 'C5', 'E5', 'D5')] },
  { measure: 10, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('D4', 'G4', 'B4', 'D5', 'C5')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b5('C4', 'F4', 'A4', 'C5', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('D5', 'B4', 'G4', 'D4', 'B4')] },
  { measure: 14, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('C5', 'A4', 'F4', 'C4', 'A4')] },
  { measure: 15, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('B4', 'G4', 'D4', 'B3', 'G4')] },
  { measure: 16, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 15 (3/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE9_EX15_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'q'), ...eds('E5', 'D5')] },
  { measure: 2, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q'), n('F4', 'q'), ...eds('D5', 'C5')] },
  { measure: 4, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [...b2('E4', 'E5'), n('C5', 'h')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [...b2('D4', 'D5'), n('B4', 'h')] },
  { measure: 7, slurStart: 0, notes: [n('C4', 'h'), n('A4', 'q')] },
  { measure: 8, slurEnd: 2, notes: [...b2('G#4', 'F4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'q'), ...eds('E5', 'D5')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('Gn4', 'q'), n('F#4', 'q'), ...eds('D5', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('Fn4', 'q'), n('E4', 'q'), ...eds('C5', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('B3', 'h'), n('G4', 'q')] },
  { measure: 16, slurEnd: 2, notes: [...eds('G#4', 'A4'), n('E4', 'q'), n('A3', 'q'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 16 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX16_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h'), ...b4('E4', 'G4', 'C5', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'h'), ...b4('F4', 'A4', 'D5', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'h', { tieStart: true }), n('E5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'h'), ...b4('G4', 'C5', 'E5', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('F5', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'h'), ...b4('A4', 'D5', 'F5', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'h'), ...b4('E4', 'G4', 'B4', 'E5')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'qd'), n('B4', 'e'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'h'), ...b4('D4', 'F4', 'A4', 'D5')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'qd'), n('A4', 'e'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'h'), ...b4('C4', 'E4', 'G4', 'C5')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 2]], notes: [n('B3', 'q'), ...b2('A4', 'G4'), n('F4', 'q'), n('B3', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 17 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX17_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'q'), ...b2('B3', 'B4')] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'h'), n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('D4', 'q'), ...b2('C4', 'C5')] },
  { measure: 4, slurEnd: 2, notes: [n('B4', 'h'), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1], [2, 3]], notes: [n('G4', 'q'), n('E5', 'q'), ...b2('D5', 'G4')] },
  { measure: 6, localSlurs: [[0, 1], [2, 3]], notes: [n('F4', 'q'), n('D5', 'q'), ...b2('C5', 'F4')] },
  { measure: 7, localSlurs: [[0, 1], [2, 3]], notes: [n('E4', 'q'), n('C5', 'q'), ...b2('B4', 'E4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('A4', 'h'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'q'), ...eds('B3', 'B4')] },
  { measure: 10, slurEnd: 2, notes: [n('A4', 'h'), n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D4', 'q'), ...eds('C4', 'C5')] },
  { measure: 12, slurEnd: 2, notes: [n('B4', 'h'), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1], [2, 3]], notes: [n('G4', 'q'), n('E5', 'q'), ...b2('D5', 'F4')] },
  { measure: 14, slurStart: 0, notes: [n('F4', 'q'), n('D5', 'q'), ...b2('C5', 'E4')] },
  { measure: 15, localSlurs: [[0, 2], [3, 5]], notes: [n('D4', 'q'), ...b2('D5', 'C5'), n('E4', 'q'), ...b2('C5', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h'), n('E5', 'q'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 18 (4/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE9_EX18_MEASURES = [
  { measure: 1, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), ...eds('A4', 'G#4'), n('A4', 'q'), n('A3', 'q')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('G#4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), ...eds('A4', 'G#4'), n('A4', 'q'), n('B3', 'q')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 4]], notes: [n('REST', 'r4'), ...eds('E4', 'F4'), n('E4', 'q'), n('D5', 'q')] },
  { measure: 6, localSlurs: [[1, 4]], notes: [n('REST', 'r4'), ...eds('E4', 'F4'), n('E4', 'q'), n('C5', 'q')] },
  { measure: 7, localSlurs: [[0, 1], [2, 3]], notes: [n('D5', 'qd'), n('E4', 'e'), n('C5', 'qd'), n('D4', 'e')] },
  { measure: 8, localSlurs: [[0, 2]], notes: [n('B4', 'q'), n('B3', 'q'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), ...eds('A4', 'G#4'), n('A4', 'q'), n('E4', 'q')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('D5', 'h', { tieStart: true }), n('D5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[1, 4]], notes: [n('REST', 'r4'), ...eds('B4', 'C5'), n('B4', 'q'), n('G#4', 'q')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('E5', 'h', { tieStart: true }), n('E5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('D5', 'q'), n('F4', 'q'), n('D5', 'q')] },
  { measure: 14, localSlurs: [[1, 3]], notes: [n('REST', 'r4'), n('C5', 'q'), n('E4', 'q'), n('C5', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('B4', 'q'), n('D4', 'q'), ...b2('D5', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('G#4', 'h'), n('A4', 'q'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Modulação do Tom de Dó Maior aos seus tons relativos)
 */
export const POZZOLI_SERIE10_EX1_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'q', { tieStart: true })] },
  { measure: 2, slurEnd: 2, notes: [n('C5', 'e', { tieStop: true }), n('A4', 'e'), n('B4', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q', { tieStart: true })] },
  { measure: 4, slurEnd: 2, notes: [n('G4', 'e', { tieStop: true }), n('E4', 'e'), n('G4', 'q')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q', { tieStart: true })] },
  { measure: 6, notes: [n('G4', 'e', { tieStop: true }), n('F4', 'e'), ...b2('E4', 'D4')] },
  { measure: 7, notes: [n('E4', 'q'), n('F#4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 2, notes: [n('C5', 'e', { tieStop: true }), n('A4', 'e'), n('B4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 2, notes: [n('A4', 'e', { tieStop: true }), n('G#4', 'e'), n('A4', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('A4', 'Gn4', 'F4')] },
  { measure: 14, notes: [...b2('E4', 'D4'), ...b2('C4', 'B3')] },
  { measure: 15, notes: [n('C4', 'qd'), ...s2('D4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 2 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX2_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'A4', 'B4', 'C5')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'A4', 'G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q', { tieStart: true }), ...s4('E4', 'F#4', 'G#4', 'A4')] },
  { measure: 6, notes: [...b2('B4', 'C5'), n('D5', 'q', { tieStart: true })] },
  { measure: 7, notes: [...s4('D5', 'C5', 'B4', 'A4'), ...s4('G#4', 'F#4', 'E4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd'), ...s2('A4', 'Bb4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 3]], notes: [...eds('F4', 'E4'), ...eds('D4', 'C#4')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s4('D5', 'Cn5', 'B4', 'A4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('G4', 'E4'), n('G4', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...s4('G4', 'F4', 'E4', 'D4'), ...s4('C4', 'B3', 'A3', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 3 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX3_MEASURES = [
  { measure: 1, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('E4', 'q'), n('G4', 'e')] },
  { measure: 2, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('F4', 'q'), n('C4', 'e')] },
  { measure: 3, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('B3', 'q'), n('C4', 'e')] },
  { measure: 4, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('C#4', 'q'), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('D4', 'q'), n('A4', 'e')] },
  { measure: 6, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('G4', 'q'), n('B4', 'e')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F4', 'F#4')] },
  { measure: 8, slurEnd: 2, notes: [...b2('G4', 'C5'), n('G4', 'q')] },
  { measure: 9, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('G4', 'q'), n('E5', 'e')] },
  { measure: 10, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('D5', 'q'), n('C5', 'e')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('Bb4', 'A4', 'G4')] },
  { measure: 12, slurEnd: 2, notes: [...b2('F4', 'Bb4'), n('A4', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('A4', 'Bn4', 'C5')] },
  { measure: 14, slurEnd: 2, notes: [...b2('D5', 'F4'), n('E4', 'q')] },
  { measure: 15, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('D4', 'q'), n('F4', 'e')] },
  { measure: 16, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('E4', 'q'), n('C4', 'e')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 4 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'h', { tieStart: true })] },
  { measure: 2, slurEnd: 4, notes: [...s4('G4', 'A4', 'F4', 'G4'), n('E4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h', { tieStart: true })] },
  { measure: 4, slurEnd: 4, notes: [...s4('G4', 'A4', 'D4', 'E4'), n('F4', 'q')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 6, slurEnd: 4, notes: [...s4('A4', 'B4', 'C5', 'D5'), n('G4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D4', 'E4', 'F#4')] },
  { measure: 8, slurEnd: 4, notes: [...s4('G4', 'A4', 'B4', 'C5'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'h', { tieStart: true })] },
  { measure: 10, slurEnd: 4, notes: [...s4('G4', 'F#4', 'Fn4', 'E4'), n('D4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'h', { tieStart: true })] },
  { measure: 12, slurEnd: 4, notes: [...s4('G4', 'F4', 'E4', 'D4'), n('C4', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D5', 'C5', 'Bb4')] },
  { measure: 14, slurEnd: 4, notes: [...b2('A4', 'G4'), ...b2('F4', 'E4')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'q', { tieStart: true }), ...s4('D4', 'E4', 'C4', 'B3')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX5_MEASURES = [
  { measure: 1, localSlurs: [[0, 3]], notes: [n('C4', 'q', { tieStart: true }), ...b2('C4', 'E4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 3]], notes: [n('C4', 'q', { tieStart: true }), ...b2('C4', 'F4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'q', { tieStart: true }), ...s4('C4', 'B3', 'C4', 'D4'), ...s4('E4', 'F4', 'G4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('F4', 'q', { tieStart: true }), ...b2('F4', 'A4'), ...b2('F#4', 'C5')] },
  { measure: 6, notes: [n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...b2('G4', 'Fn4'), ...b2('E4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('F4', 'q', { tieStart: true }), ...b2('F4', 'G4'), ...s2('A4', 'Bb4')] },
  { measure: 10, slurEnd: 1, notes: [n('Bb4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'q', { tieStart: true }), ...s4('D4', 'E4', 'F4', 'G4'), ...s4('A4', 'Bn4', 'C5', 'D5')] },
  { measure: 12, slurEnd: 0, notes: [n('E5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'h'), ...b2('D5', 'B4')] },
  { measure: 14, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 15, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 16, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 's', { tieStop: true }), ...eds('C5', 'B4'), ...eds('C5', 'D5')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qdd'), n('G#4', 's'), ...eds('A4', 'Gn4'), n('F4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('E4', 'q', { tieStart: true }), ...s4('E4', 'F4', 'E4', 'D4'), ...b2('C4', 'A4')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [...eds('D4', 'C4'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 4]], notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'A4', 'G4', 'F#4'), ...b2('G4', 'D5')] },
  { measure: 8, localSlurs: [[0, 2]], notes: [...eds('G4', 'F#4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qdd'), n('D#5', 's'), ...eds('E5', 'D5'), n('C5', 'q')] },
  { measure: 10, slurEnd: 2, notes: [n('B4', 'q'), n('B4', 'q'), n('C#5', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qdd', { accidental: 'n' }), n('C#5', 's'), ...eds('D5', 'C5'), n('B4', 'q')] },
  { measure: 12, slurEnd: 2, notes: [n('A4', 'q'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('Bb4', 'q', { tieStart: true }), ...eds('Bb4', 'A4'), ...s4('G4', 'F4', 'E4', 'D4')] },
  { measure: 14, slurEnd: 1, notes: [n('C4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q', { tieStart: true }), ...eds('E4', 'F4'), ...s4('D4', 'C4', 'B3', 'D4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 7 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX7_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'A4', 'G4'), n('C5', 'q', { tieStart: true })] },
  { measure: 2, notes: [...b2('C5', 'G4'), ...b2('A4', 'G4'), n('E4', 'q', { tieStart: true })] },
  { measure: 3, notes: [...b2('E4', 'D4'), ...b2('F4', 'E4'), ...b2('D4', 'C4')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'A4', 'G4'), n('D5', 'q', { tieStart: true })] },
  { measure: 6, notes: [...b2('D5', 'G4'), ...b2('B4', 'G4'), n('F4', 'q', { tieStart: true })] },
  { measure: 7, notes: [...b2('F4', 'E4'), ...b2('G4', 'F#4'), ...b2('G4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'D5', 'C5'), n('E5', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [...b2('E5', 'A4'), n('B4', 'q'), n('C#5', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('A4', 'B4', 'A4'), n('D5', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 3, notes: [...b2('D5', 'G4'), n('A4', 'q'), n('Bn4', 'q')] },
  { measure: 13, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('G4', 'A4', 'G4'), n('C5', 'q')] },
  { measure: 14, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('E4', 'F4', 'E4'), n('A4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D4', 'E4', 'F4'), n('G4', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 8 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX8_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true })] },
  { measure: 2, slurEnd: 5, notes: [...b2('G4', 'A4'), ...b2('E4', 'G4'), n('G4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qdd'), n('F4', 's'), ...eds('G4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true })] },
  { measure: 6, slurEnd: 5, notes: [...b2('G4', 'A4'), ...b2('B4', 'D5'), n('C5', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'qdd'), n('B4', 's'), ...eds('C5', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'hd', { tieStart: true })] },
  { measure: 10, slurEnd: 8, notes: [...s4('E5', 'D5', 'C5', 'B4'), ...s4('A4', 'G#4', 'A4', 'F#4'), n('G4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 12, slurEnd: 8, notes: [...s4('D5', 'C5', 'B4', 'A4'), ...s4('Gn4', 'F#4', 'E4', 'F#4'), n('G4', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true })] },
  { measure: 14, slurEnd: 5, notes: [...b2('G4', 'E4'), ...b2('G4', 'Fn4'), n('D4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qdd'), n('D4', 's'), ...eds('E4', 'F4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 9 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX9_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'q'), n('C5', 'h', { tieStart: true })] },
  { measure: 2, slurEnd: 4, notes: [...b2('C5', 'B4'), ...b2('G4', 'A4'), n('B4', 'h')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('C5', 'q'), n('Bb4', 'q', { tieStart: true })] },
  { measure: 4, slurEnd: 4, notes: [...b2('Bb4', 'A4'), ...b2('F4', 'G4'), n('A4', 'h')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q'), n('G4', 'q'), n('F4', 'q', { tieStart: true })] },
  { measure: 6, notes: [...b2('F4', 'E4'), ...b2('C4', 'D4'), n('E4', 'q'), n('G4', 'q')] },
  { measure: 7, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('G4', 'q'), n('F#4', 'q'), n('G4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('E5', 'h', { tieStart: true })] },
  { measure: 10, slurEnd: 4, notes: [...b2('E5', 'D#5'), ...b2('B4', 'C#5'), n('D5', 'h')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D5', 'q'), n('B4', 'h', { tieStart: true })] },
  { measure: 12, slurEnd: 4, notes: [...b2('B4', 'A4'), ...b2('G4', 'A4'), n('B4', 'h')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D5', 'C5', 'A4'), ...b2('G4', 'F4'), n('E4', 'q'), n('F#4', 'q')] },
  { measure: 14, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'A4', 'G4'), ...b4('Fn4', 'E4', 'F4', 'G4')] },
  { measure: 15, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 16, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 10 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...s4('G4', 'E4', 'F4', 'G4'), ...s2('A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...s4('G4', 'E4', 'F4', 'G4'), ...s2('A4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...s4('G4', 'A4', 'G4', 'F4'), ...s4('E4', 'F4', 'G4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'hd'), n('E5', 'q')] },
  { measure: 7, slurStart: 0, notes: [...b2('D5', 'C5'), n('G4', 'q', { tieStart: true }), ...b2('G4', 'A4'), ...b2('G4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'q', { tieStart: true }), ...s4('C5', 'G4', 'A4', 'B4'), ...s2('C5', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D5', 'q', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'C5'), ...s2('D5', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('E5', 'h', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...b2('E5', 'B4'), n('G#4', 'q', { tieStart: true }), ...b2('G#4', 'A4'), ...b2('B4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b2('C5', 'G4'), n('E4', 'q', { tieStart: true }), ...b4('E4', 'F4', 'G4', 'F4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 11 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX11_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C5', 'qd'), ...s2('B4', 'A4'), n('C5', 'qd'), ...s2('B4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), ...s2('F4', 'E4'), n('G4', 'qd'), ...s2('F4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'qd'), ...s2('D#4', 'E4'), n('F#4', 'qd'), ...s2('E4', 'F#4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd'), n('C5', 'e'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), ...s2('F#4', 'G4'), n('A4', 'qd'), ...s2('G4', 'A4')] },
  { measure: 8, slurEnd: 2, notes: [n('B4', 'h'), ...b2('C5', 'D5')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), ...s2('D5', 'C5'), n('D5', 'qd'), ...s2('C5', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'qd'), ...s2('A4', 'G#4'), n('B4', 'qd'), ...s2('A4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'h', { tieStart: true }), ...s4('D4', 'E4', 'F4', 'G4'), ...b2('A4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b4('C5', 'B4', 'A4', 'G4'), ...b4('F4', 'E4', 'D4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 12 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX12_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...b2('G4', 'A4'), ...b2('C5', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...b2('G4', 'A4'), ...b2('C5', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'h', { tieStart: true }), ...b2('D5', 'C5'), ...b2('Bb4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'h', { tieStart: true }), ...b2('C5', 'B4'), ...b2('A4', 'G#4')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[1, 7]], notes: [n('REST', 'r8'), n('G4', 'e'), n('E5', 'q', { tieStart: true }), ...b4('E5', 'D5', 'G4', 'D5')] },
  { measure: 10, localSlurs: [[1, 7]], notes: [n('REST', 'r8'), n('G4', 'e'), n('F5', 'q', { tieStart: true }), ...b4('F5', 'E5', 'G4', 'E5')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), n('E5', 'q', { tieStart: true }), ...s4('E5', 'D5', 'C5', 'B4'), ...s4('A4', 'G4', 'F4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'h', { tieStart: true }), ...b4('D4', 'F#4', 'G4', 'G#4')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('Gn4', 'h', { tieStart: true }), ...b4('G4', 'A4', 'D5', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 13 (6/8, 16 compassos — Compasso composto)
 */
export const POZZOLI_SERIE10_EX13_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'D4', 'C5')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'D4', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'G#4')] },
  { measure: 6, slurEnd: 1, notes: [n('A4', 'qd'), n('E4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F#4', 'E5')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'Fn4', 'D5')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b3('C5', 'Bb4', 'A4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 14, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'A4', 'G4')] },
  { measure: 15, notes: [...b3('C5', 'Bn4', 'A4'), ...b3('G4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 14 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX14_MEASURES = [
  { measure: 1, slurStart: 3, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true })] },
  { measure: 2, notes: [...b3('C5', 'B4', 'C5'), ...b3('D5', 'C5', 'B4')] },
  { measure: 3, slurEnd: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true })] },
  { measure: 4, notes: [...b3('C5', 'B4', 'C5'), ...b3('D5', 'C5', 'B4')] },
  { measure: 5, slurEnd: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true })] },
  { measure: 6, notes: [...b3('C5', 'D4', 'E4'), ...b3('F4', 'G4', 'A4')] },
  { measure: 7, notes: [n('D4', 'qd'), n('G4', 'qd', { tieStart: true })] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStop: true }), n('F#4', 'qd')] },
  { measure: 9, slurStart: 3, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true })] },
  { measure: 10, notes: [...b3('G4', 'F#4', 'G4'), ...b3('A4', 'G4', 'F4')] },
  { measure: 11, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true })] },
  { measure: 12, notes: [...b3('G4', 'F#4', 'G4'), ...b3('A4', 'G4', 'Fn4')] },
  { measure: 13, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true })] },
  { measure: 14, notes: [...b3('C5', 'D4', 'E4'), ...b3('F4', 'G4', 'A4')] },
  { measure: 15, notes: [n('D4', 'qd'), n('D4', 'qd')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 15 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX15_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true })] },
  { measure: 2, slurEnd: 3, notes: [...b3('G4', 'A4', 'G4'), n('E4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true })] },
  { measure: 4, slurEnd: 3, notes: [...b3('E4', 'F4', 'E4'), n('C4', 'qd')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'q'), n('E4', 'e'), n('D4', 'q'), n('G4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('E4', 'q'), n('A4', 'e'), n('G4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('A4', 'e'), n('F#4', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q'), n('C5', 'e'), n('B4', 'qd')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [...b3('D5', 'E5', 'Bb4'), n('A4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true })] },
  { measure: 12, slurEnd: 3, notes: [...b3('A4', 'Bb4', 'A4'), n('F4', 'qd')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r4'), n('D4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 14, notes: [n('G4', 'q'), n('F4', 'e'), n('A4', 'qd', { tieStart: true })] },
  { measure: 15, notes: [n('A4', 'q', { tieStop: true }), n('G4', 'e'), n('Bn4', 'q'), n('A4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('D5', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 16 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX16_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), ...s2('D4', 'C4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b2('C4', 'D4'), ...b3('E4', 'F4', 'F#4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), ...s2('F#4', 'E4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b2('E4', 'F#4'), ...b3('G4', 'C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'G#4'), n('A4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...s4('B4', 'A4', 'G#4', 'F#4'), n('G#4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b2('A4', 'B4'), ...b3('C#5', 'A4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b2('E4', 'F4'), ...b3('G4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 17 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX17_MEASURES = [
  { measure: 1, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('G#4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'qd', { tieStop: true }), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true })] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'e'), n('Gn4', 'q'), n('F4', 'e'), n('E4', 'q'), n('D4', 'e'), n('C4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('B3', 'qd', { tieStart: true }), n('B3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('A4', 'e')] },
  { measure: 6, slurEnd: 2, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'qd', { tieStop: true }), n('B4', 'q'), n('G#4', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'q'), n('E4', 'e'), n('F4', 'q'), n('G4', 'e'), n('A4', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd'), n('C#5', 'qd')] },
  { measure: 10, slurEnd: 2, notes: [n('D5', 'qd'), n('A4', 'hd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q', { tieStop: true }), n('G#4', 'e'), n('A4', 'qd'), n('B4', 'qd')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true }), n('Gn4', 'qd')] },
  { measure: 13, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd', { tieStart: true }), ...b3('E4', 'F4', 'F#4')] },
  { measure: 14, notes: [n('A4', 'qd'), n('G4', 'hd', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'q', { tieStop: true }), n('Fn4', 'e'), n('E4', 'q'), n('B3', 'e'), n('D4', 'q'), n('C4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 18 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX18_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('D4', 'e'), n('E4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), ...b3('C4', 'B3', 'C4'), ...b3('D4', 'C4', 'D4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('F#4', 'e'), n('G4', 'q'), n('B4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F#4', 'E4'), ...b3('D4', 'C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('B4', 'e'), n('C5', 'q'), n('E5', 'e')] },
  { measure: 10, slurEnd: 0, notes: [n('D5', 'hd'), n('C#5', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'Cn5', 'B4'), ...b3('A4', 'G4', 'F#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'Bb4', 'A4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 14, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'qd', { tieStop: true }), n('D4', 'qd')] },
  { measure: 15, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'E4'), ...b3('D4', 'C4', 'Bn3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 19 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX19_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd'), n('C5', 'q'), n('G4', 'e'), n('G4', 'qd', { tieStart: true })] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStop: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), n('D5', 'q'), n('G4', 'e'), n('G4', 'qd', { tieStart: true })] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd', { tieStop: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd'), n('G#4', 'qd'), n('A4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('Gn4', 'qd', { tieStart: true }), n('G4', 'qd', { tieStop: true }), n('F#4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...b3('G4', 'F#4', 'E4'), ...b3('D#4', 'E4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), n('C5', 'q'), n('G4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G#4', 'qd'), n('D5', 'q'), n('A4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('Bb4', 'e'), ...b3('A4', 'G4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('Bb4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'E4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 2, notes: [n('C4', 'qd'), n('Bn3', 'qd'), n('C4', 'qd')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 20 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX20_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), ...b3('C4', 'B3', 'C4')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b3('C4', 'B3', 'C4'), ...b3('D4', 'E4', 'F4'), ...b3('G4', 'A4', 'B4')] },
  { measure: 4, slurEnd: 2, notes: [n('C5', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4')] },
  { measure: 6, slurEnd: 2, notes: [n('C5', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('A4', 'G#4', 'A4'), ...b3('B4', 'C5', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 8, slurEnd: 0, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'C#4', 'D4')] },
  { measure: 10, slurEnd: 2, notes: [n('A4', 'qd'), n('F#4', 'qd', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b3('D4', 'C#4', 'D4'), ...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd'), ...b3('C5', 'Bb4', 'A4'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 14, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'qd', { tieStop: true })] },
  { measure: 15, notes: [...b3('G4', 'F4', 'E4'), ...b3('D4', 'C4', 'B3'), ...b3('C4', 'Bn3', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 21 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX21_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'wd', { tieStart: true })] },
  { measure: 2, slurEnd: 3, notes: [n('C4', 'qd', { tieStop: true }), n('C#4', 'qd'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'wd', { tieStart: true })] },
  { measure: 4, slurEnd: 3, notes: [n('D4', 'qd', { tieStop: true }), n('D#4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'F#4', 'G#4'), n('A4', 'qd')] },
  { measure: 6, slurEnd: 2, notes: [n('C5', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5'), ...b3('D5', 'C5', 'B4'), ...b3('A4', 'E4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'wd', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [n('G4', 'qd', { tieStop: true }), n('F#4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'wd', { tieStart: true })] },
  { measure: 12, slurEnd: 2, notes: [n('A4', 'qd'), n('B4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [n('C5', 'qd'), n('B4', 'qd'), n('Bb4', 'qd'), n('A4', 'qd')] },
  { measure: 14, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'qd', { tieStop: true }), n('D5', 'qd')] },
  { measure: 15, notes: [...b3('E5', 'D5', 'C5'), ...b3('B4', 'A4', 'G4'), ...b3('F4', 'E4', 'D4'), ...b3('E4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 22 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX22_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('D4', 'e'), n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('B4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C4', 'q'), n('D4', 'e'), n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('A4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('Bb4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'q', { tieStop: true }), n('E4', 'e'), n('F4', 'q'), n('G4', 'e'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('C#5', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'q'), n('E4', 'e'), n('F#4', 'q'), n('G4', 'e'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('C5', 'qd'), n('B4', 'qd'), n('A4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 10, slurEnd: 2, notes: [n('F#5', 'qd'), n('G5', 'qd', { tieStart: true }), n('G5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 12, slurEnd: 0, notes: [n('Fn5', 'qd'), n('E5', 'qd'), n('D5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4'), n('G#4', 'qd')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4'), n('Gn4', 'qd')] },
  { measure: 16, slurEnd: 2, notes: [n('B4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 23 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX23_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'qd', { tieStop: true }), n('A4', 'qd'), n('E4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'C4', 'D4'), n('E4', 'qd', { tieStart: true }), n('E4', 'qd', { tieStop: true })] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'E4', 'F4'), n('G4', 'hd')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'F4', 'G4'), n('A4', 'hd')] },
  { measure: 7, localSlurs: [[0, 4]], notes: [n('F#4', 'qd', { tieStart: true }), ...b3('F#4', 'G4', 'A4'), n('B4', 'qd'), n('D#4', 'qd')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'F#4', 'G#4'), n('C5', 'qd', { tieStart: true }), ...b3('C5', 'D5', 'C5')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'E#4', 'F#4'), n('A4', 'qd', { tieStart: true }), ...b3('A4', 'C5', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('F#4', 'e'), n('Fn4', 'q'), n('E4', 'e'), n('D4', 'qd'), n('A4', 'qd')] },
  { measure: 14, slurEnd: 2, notes: [n('G4', 'qd'), n('G4', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'D4', 'C4'), n('E4', 'qd', { tieStart: true }), ...b3('E4', 'F4', 'G4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 24 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX24_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), ...b3('C4', 'B3', 'C4'), ...b3('D4', 'E4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('C5', 'q'), n('B4', 'e'), n('A4', 'q'), n('G#4', 'e')] },
  { measure: 6, slurEnd: 3, notes: [n('A4', 'qd'), n('E4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('Bb4', 'q'), n('A4', 'e'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 8, slurEnd: 2, notes: [n('E4', 'qd'), n('C#4', 'qd', { tieStart: true }), n('C#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'C#4', 'D4'), ...b3('E4', 'F4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'E4', 'F4'), ...b3('G4', 'A4', 'Bb4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('Bn4', 'q'), n('A4', 'e'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 14, slurEnd: 3, notes: [n('G4', 'qd'), n('A4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'E4', 'D4'), ...b3('E4', 'D4', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Modulações do tom de Lá menor ao seu tom relativo)
 */
export const POZZOLI_SERIE11_EX1_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'h', { tieStart: true })] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'e', { tieStop: true }), n('E4', 'e'), n('F#4', 'e'), n('G#4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'h', { tieStart: true })] },
  { measure: 4, slurEnd: 2, notes: [n('A4', 'e', { tieStop: true }), n('B4', 'e'), n('C5', 'q')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 6, notes: [...b2('A4', 'B4'), n('E5', 'q', { tieStart: true })] },
  { measure: 7, slurEnd: 0, notes: [n('E5', 'e', { tieStop: true }), n('D#5', 'q')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('E5', 'q', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'h', { tieStart: true })] },
  { measure: 10, slurEnd: 2, notes: [n('A4', 'e', { tieStop: true }), n('Bb4', 'e'), n('A4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'h', { tieStart: true })] },
  { measure: 12, notes: [n('G4', 'e', { tieStop: true }), n('A4', 'e'), n('F4', 'e'), n('D#4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('E4', 'e'), n('REST', 'r8'), n('C5', 'q', { tieStart: true })] },
  { measure: 14, slurEnd: 3, notes: [...b2('C5', 'B4'), ...b2('A4', 'G4')] },
  { measure: 15, slurStart: 0, notes: [n('G#4', 'h', { tieStart: true })] },
  { measure: 16, slurEnd: 1, notes: [n('G#4', 'e', { tieStop: true }), n('A4', 'e'), n('A4', 'e'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 2 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX2_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q', { tieStart: true })] },
  { measure: 2, slurEnd: 2, notes: [...eds('A4', 'G#4'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'G#4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q', { tieStart: true })] },
  { measure: 6, notes: [...eds('A4', 'B4'), n('Gn4', 'q', { tieStart: true })] },
  { measure: 7, notes: [...b2('G4', 'F#4'), ...b2('G4', 'E#4')] },
  { measure: 8, slurEnd: 1, notes: [n('F#4', 'q', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('F4', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 2, notes: [...eds('F4', 'G#4'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('A4', 'B4', 'C#5')] },
  { measure: 14, slurEnd: 3, notes: [...b2('D5', 'Cn5'), ...b2('B4', 'A4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 3 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX3_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r8'), ...s2('B4', 'C5'), n('D5', 'q', { tieStart: true })] },
  { measure: 2, slurEnd: 3, notes: [n('D5', 'e', { tieStop: true }), ...s2('C5', 'B4'), n('G#4', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('B4', 'C5', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('E5', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...s2('B4', 'C5'), n('D5', 'q', { tieStart: true })] },
  { measure: 6, notes: [n('D5', 'e', { tieStop: true }), ...s2('C5', 'B4'), n('Gn4', 'q', { tieStart: true })] },
  { measure: 7, notes: [...b2('G4', 'A4'), ...b2('F4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'q'), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...s2('C4', 'D4'), n('E4', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 2, notes: [...b2('E4', 'Bb4'), n('A4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...s2('D4', 'E4'), n('F#4', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 2, notes: [...b2('F#4', 'C5'), n('Bn4', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...s2('E4', 'F#4'), n('G#4', 'q', { tieStart: true })] },
  { measure: 14, notes: [...b2('A4', 'B4'), n('C5', 'q', { tieStart: true })] },
  { measure: 15, notes: [...b2('C5', 'B4'), ...b2('A4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'q'), n('A3', 'e'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 4 (2/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX4_MEASURES = [
  { measure: 1, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b3('E4', 'F4', 'E4')] },
  { measure: 2, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b3('E4', 'A4', 'G#4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'C5', 'B4')] },
  { measure: 4, slurEnd: 0, notes: [n('E5', 'h', { tieStart: true })] },
  { measure: 5, slurStart: 0, notes: [...s2('E5', 'D5'), n('C5', 'e'), ...s4('B4', 'A4', 'G#4', 'A4')] },
  { measure: 6, slurEnd: 0, notes: [n('B4', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...s4('B4', 'C5', 'B4', 'A4'), ...s4('Gn4', 'F#4', 'E4', 'D#4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), ...b3('E4', 'Fn4', 'E4')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('A4', 'q'), n('G#4', 'q', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [...b2('G#4', 'A4'), n('B4', 'e'), n('C#5', 'e')] },
  { measure: 12, slurEnd: 2, notes: [n('D5', 'q', { tieStart: true }), ...s2('D5', 'E5'), n('D5', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...s2('D5', 'Cn5'), ...s4('B4', 'A4', 'G4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'q'), n('A4', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...b2('A4', 'G#4'), ...eds('F#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 6, notes: [n('E5', 'hd', { tieStart: true })] },
  { measure: 7, notes: [...s2('E5', 'D5'), n('C5', 'e'), ...s4('B4', 'A4', 'Gn4', 'F4'), ...s4('E4', 'D4', 'C4', 'B3')] },
  { measure: 8, slurEnd: 0, notes: [n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd'), ...s4('C5', 'D5', 'E5', 'D5'), ...s2('C5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('Bb4', 'q', { tieStart: true }), n('Bb4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'Bb4'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 12, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 13, slurEnd: 4, notes: [...s2('D5', 'C5'), ...eds('B4', 'C5'), ...eds('A4', 'G4'), n('F4', 'q')] },
  { measure: 14, slurStart: 0, notes: [n('C5', 'h', { tieStart: true }), ...s2('C5', 'B4'), n('A4', 'e')] },
  { measure: 15, notes: [...s4('G#4', 'F4', 'E4', 'D4'), ...s4('C4', 'B3', 'A3', 'B3')] },
  { measure: 16, slurEnd: 0, notes: [n('A3', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), ...s4('F#4', 'G#4', 'A4', 'B4'), ...s4('C5', 'D5', 'E5', 'F5')] },
  { measure: 2, slurEnd: 2, notes: [...eds('E5', 'D5'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4'), ...b2('A4', 'B4')] },
  { measure: 4, slurEnd: 0, notes: [n('E5', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q'), ...s4('Fn4', 'Gn4', 'A4', 'B4'), ...s4('C5', 'D5', 'E5', 'F5')] },
  { measure: 6, notes: [...eds('E5', 'D5'), n('C5', 'q', { tieStart: true })] },
  { measure: 7, notes: [...b2('C5', 'B4'), ...b2('A4', 'G4'), ...b2('F4', 'E4')] },
  { measure: 8, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'h'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 10, slurEnd: 0, notes: [n('F4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'h'), ...s4('B4', 'A4', 'G4', 'F#4')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'h'), ...s4('A4', 'G#4', 'Gn4', 'F4')] },
  { measure: 14, slurEnd: 0, notes: [n('E4', 'h')] },
  { measure: 15, slurStart: 0, notes: [...s4('E#4', 'F#4', 'G#4', 'A4'), n('B4', 'q'), n('B4', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 7 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX7_MEASURES = [
  { measure: 1, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('F4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('F#4', 'q'), n('G#4', 'e'), n('REST', 'r8')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('B4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('A4', 'e'), ...b2('G#4', 'A4'), ...eds('C5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('REST', 'r8'), n('A4', 'e'), ...b2('G#4', 'A4'), ...eds('C5', 'B4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('B4', 'e'), ...s2('C5', 'B4'), ...s4('A4', 'Gn4', 'F#4', 'G#4')] },
  { measure: 8, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('Fn4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('F4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('Bb4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('A4', 'e'), n('Bn4', 'q'), n('C#5', 'e'), n('REST', 'r8')] },
  { measure: 14, notes: [n('D5', 'q'), n('C5', 'q', { tieStart: true })] },
  { measure: 15, slurEnd: 3, notes: [...s2('C5', 'Bn4'), ...eds('A4', 'G4'), ...eds('F#4', 'G#4')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 8 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX8_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qdd'), n('G#4', 's'), ...eds('A4', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qdd'), n('G#4', 's'), ...eds('A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E5', 'qd'), ...s2('D#5', 'E5'), ...eds('D5', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'h'), n('B4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'qdd', { accidental: 'n' }), n('B4', 's'), ...eds('C5', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('G#4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'qdd'), n('G#4', 's'), ...eds('A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qdd'), n('Gn4', 's'), ...eds('Bb4', 'A4')] },
  { measure: 12, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('C#5', 'qdd'), n('Bn4', 's'), ...eds('C5', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'h'), ...b2('Cn5', 'B4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qdd'), n('F#4', 's'), ...eds('G#4', 'F#4')] },
  { measure: 16, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 9 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX9_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'h', { tieStart: true }), n('E4', 'q', { tieStart: true })] },
  { measure: 2, slurEnd: 3, notes: [...b2('E4', 'F#4'), ...b2('G#4', 'A4'), n('C5', 'q'), n('B4', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h', { tieStart: true }), n('E4', 'q', { tieStart: true })] },
  { measure: 4, slurEnd: 3, notes: [...b2('E4', 'F#4'), ...b2('G#4', 'A4'), n('D5', 'q'), n('C5', 'q')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('E5', 'q'), ...eds('D5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'q'), n('A4', 'q'), n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b4('E4', 'F#4', 'G#4', 'A4'), ...b4('B4', 'A4', 'G#4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h', { tieStart: true }), n('G4', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 4, notes: [...b2('G4', 'A4'), ...s4('B4', 'C5', 'D5', 'E5'), n('F5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'h', { tieStart: true }), n('E4', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 4, notes: [...s4('E4', 'F4', 'G#4', 'A4'), ...s4('B4', 'C5', 'D5', 'E5'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'A4'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 14, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'G#4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), ...s4('C5', 'D5', 'B4', 'C5')] },
  { measure: 16, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 10 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX10_MEASURES = [
  { measure: 1, notes: [n('REST', 'r8'), ...b3('A3', 'B3', 'C4'), ...b4('D4', 'E4', 'F#4', 'G#4')] },
  { measure: 2, localSlurs: [[0, 4]], notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4'), ...b4('A4', 'B4', 'C5', 'D5')] },
  { measure: 4, localSlurs: [[0, 4]], notes: [n('E5', 'q', { tieStart: true }), ...s4('E5', 'F5', 'E5', 'D5'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, notes: [n('REST', 'r8'), ...b3('E5', 'D5', 'C5'), n('B4', 'q'), n('G#4', 'q')] },
  { measure: 6, notes: [n('A4', 'e'), ...b3('F5', 'E5', 'D5'), n('C5', 'q'), n('A4', 'q')] },
  { measure: 7, notes: [...b4('B4', 'D5', 'C5', 'B4'), ...b4('A4', 'G#4', 'F#4', 'E#4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, notes: [n('REST', 'r8'), ...b3('C4', 'Dn4', 'E4'), ...b4('Fn4', 'G4', 'A4', 'B4')] },
  { measure: 10, localSlurs: [[0, 4]], notes: [n('C5', 'q', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'D5'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, notes: [n('REST', 'r8'), ...b3('C4', 'D4', 'E4'), ...b4('F4', 'G4', 'A4', 'Bb4')] },
  { measure: 12, localSlurs: [[0, 4]], notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G4', 'F4', 'G4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, notes: [n('REST', 'r8'), ...b3('D4', 'E4', 'F4'), ...b4('G4', 'A4', 'Bn4', 'C#5')] },
  { measure: 14, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('D5', 'q', { tieStart: true })] },
  { measure: 15, notes: [...b4('D5', 'Cn5', 'B4', 'A4'), ...b4('G#4', 'F#4', 'G#4', 'A4')] },
  { measure: 16, localSlurs: [[0, 4]], notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 11 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX11_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h'), ...eds('B4', 'G#4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r16'), ...s4('E4', 'F#4', 'G#4', 'A4'), ...s4('B4', 'A4', 'G#4', 'A4'), ...eds('C5', 'B4'), ...eds('C5', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('E5', 'h'), ...eds('D5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'h'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'B4', 'A4'), ...s4('G#4', 'A4', 'Gn4', 'F4'), ...eds('E4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h'), ...eds('Bb4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'h'), ...eds('G4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'qdd'), n('E4', 's'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r16'), ...s4('E4', 'F4', 'G4', 'A4'), ...s4('B4', 'C5', 'D5', 'C#5'), n('D5', 'h')] },
  { measure: 14, slurStart: 1, notes: [n('REST', 'r16'), ...s4('E4', 'F#4', 'G#4', 'A4'), ...s4('B4', 'C5', 'D5', 'E5'), n('F5', 'h')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h'), ...eds('A4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 12 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX12_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F4', 'E4'), ...b2('F#4', 'E4'), ...b2('G#4', 'E4')] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'qdd'), ...s2('B4', 'C5'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'E4'), ...b2('G#4', 'E4'), ...b2('B4', 'E4')] },
  { measure: 4, slurEnd: 2, notes: [n('B4', 'qdd'), ...s2('C5', 'D5'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('A4', 'e'), ...b2('B4', 'A4'), ...b2('C5', 'A4'), ...b2('D5', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('E5', 'h'), n('D5', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...b2('D5', 'C5'), ...b2('B4', 'A4'), n('B4', 'qdd'), ...s2('C5', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'B4', 'C5'), ...b4('Bb4', 'C5', 'A4', 'C5')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'h'), n('A4', 'h')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D5', 'C#5', 'D5'), ...b4('Cn5', 'D5', 'B4', 'D5')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'h'), n('B4', 'h')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E5', 'D#5', 'E5'), ...b4('Dn5', 'E5', 'C5', 'E5')] },
  { measure: 14, slurEnd: 2, notes: [n('B4', 'h'), n('A4', 'q'), n('G4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F4', 'E4'), ...b4('F#4', 'E4', 'G#4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'h'), n('A3', 'q'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 13 (6/8, 16 compassos — Compasso composto)
 */
export const POZZOLI_SERIE11_EX13_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd'), ...b3('A4', 'B4', 'C5')] },
  { measure: 2, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), ...b3('G#4', 'A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'qd'), ...b3('F#4', 'G#4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), ...b3('Gn4', 'A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd'), ...b3('F#4', 'A4', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'qd'), ...b3('Gn4', 'A4', 'E5')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'qd'), n('G#4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 14 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX14_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 2, slurEnd: 3, notes: [...b3('D5', 'E5', 'F5'), n('G5', 'qd')] },
  { measure: 3, slurStart: 0, notes: [...b3('G5', 'F5', 'E5'), ...b3('D5', 'C5', 'B4')] },
  { measure: 4, slurEnd: 3, notes: [...b3('A4', 'G#4', 'B4'), n('E4', 'qd')] },
  { measure: 5, slurStart: 0, notes: [...b3('E4', 'F#4', 'Gn4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 6, slurEnd: 3, notes: [...b3('D5', 'E5', 'F#5'), n('G5', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...b3('G5', 'Fn5', 'E5'), ...b3('D5', 'C5', 'B4')] },
  { measure: 8, slurEnd: 3, notes: [...b3('C5', 'B4', 'D5'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...b3('C5', 'Bb4', 'A4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 10, slurEnd: 3, notes: [...b3('D4', 'E4', 'F4'), n('Bb4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [...b3('Bb4', 'A4', 'G4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 12, slurEnd: 3, notes: [...b3('C4', 'D4', 'E4'), n('A4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [...b3('D5', 'C5', 'Bn4'), ...b3('A4', 'G4', 'F#4')] },
  { measure: 14, slurEnd: 0, notes: [...b3('E5', 'D5', 'C5'), ...b3('B4', 'A4', 'G4')] },
  { measure: 15, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 16, slurEnd: 3, notes: [...b3('D5', 'C5', 'B4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 15 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX15_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'q'), n('F#4', 'e'), n('G4', 'q'), n('B4', 'e')] },
  { measure: 2, slurEnd: 3, notes: [n('D5', 'qd'), ...b3('C5', 'B4', 'A4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('F#4', 'e'), n('G#4', 'q'), n('B4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q'), n('Fn4', 'e'), n('G4', 'q'), n('B4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'q'), n('G4', 'e'), ...b3('E4', 'G4', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), n('Bb4', 'e'), n('A4', 'q'), n('F4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'q'), n('A4', 'e'), n('G4', 'q'), n('E4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'q'), n('F4', 'e'), n('A4', 'q'), n('D#5', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('E5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('Bn4', 'qd'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 16 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX16_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), ...s2('F#4', 'G#4'), n('A4', 'q'), ...s2('B4', 'C5')] },
  { measure: 4, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'C5'), n('D5', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, localSlurs: [[0, 2], [3, 5]], notes: [n('A4', 'q'), ...s2('G4', 'F4'), n('G4', 'q'), ...s2('F4', 'E4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'G#4')] },
  { measure: 10, slurEnd: 1, notes: [n('E5', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), ...s4('E5', 'D5', 'C5', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'A4')] },
  { measure: 14, slurEnd: 3, notes: [n('G#4', 'q'), ...s2('A4', 'B4'), n('C5', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...s4('E4', 'F#4', 'G#4', 'A4'), ...s2('B4', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd'), n('A3', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 17 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX17_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'qd', { tieStop: true }), ...b3('G#4', 'F#4', 'G#4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'qd', { tieStop: true }), ...b3('C5', 'B4', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e'), n('E5', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('F5', 'qd', { tieStart: true }), n('F5', 'qd', { tieStop: true }), ...b3('E5', 'D#5', 'E5')] },
  { measure: 10, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'qd', { tieStop: true }), ...b3('D5', 'Cn5', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd'), n('B4', 'q'), n('A4', 'e'), n('G#4', 'qd', { tieStart: true })] },
  { measure: 14, slurEnd: 0, notes: [n('G#4', 'qd', { tieStop: true }), n('E4', 'q'), n('F#4', 'e')] },
  { measure: 15, slurStart: 0, notes: [n('G#4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'qd')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 18 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX18_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'qd'), n('G#4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('B4', 'qd'), n('A4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), ...b3('E5', 'D5', 'C5')] },
  { measure: 6, slurEnd: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'hd', { tieStop: true })] },
  { measure: 7, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), ...b3('E5', 'D5', 'C5')] },
  { measure: 8, slurEnd: 0, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'hd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('C4', 'qd'), n('G4', 'qd'), n('F4', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd'), n('Bb4', 'qd'), n('A4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'qd'), n('D#4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'qd'), n('G#4', 'qd')] },
  { measure: 16, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 19 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX19_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A3', 'qd', { tieStart: true }), ...b3('A3', 'C4', 'E4'), ...b3('A4', 'C5', 'B4')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 3, slurStart: 0, notes: [n('A3', 'qd', { tieStart: true }), ...b3('A3', 'C4', 'E4'), ...b3('A4', 'C5', 'B4')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 5, slurStart: 0, notes: [n('A3', 'qd', { tieStart: true }), ...b3('A3', 'D4', 'F4'), ...b3('B4', 'D5', 'C5')] },
  { measure: 6, slurEnd: 2, notes: [n('A4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'qd', { tieStop: true })] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'G#4', 'B4'), ...b3('D5', 'C5', 'B4')] },
  { measure: 8, slurEnd: 0, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'Gn4', 'B4'), ...b3('D5', 'C5', 'B4')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true })] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'A4', 'Bb4'), ...b3('D5', 'C5', 'B4')] },
  { measure: 12, slurEnd: 0, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'qd', { tieStop: true })] },
  { measure: 13, localSlurs: [[0, 4]], notes: [n('A3', 'qd', { tieStart: true }), ...b3('A3', 'D#4', 'F4'), n('A4', 'qd')] },
  { measure: 14, localSlurs: [[0, 4]], notes: [n('A3', 'qd', { tieStart: true }), ...b3('A3', 'D4', 'F4'), n('A4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('A3', 'qd', { tieStart: true }), ...b3('A3', 'E4', 'G#4'), n('A4', 'q'), n('G#4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd'), n('A3', 'hd')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 20 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX20_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...b3('E4', 'C4', 'E4'), n('A4', 'hd', { tieStart: true })] },
  { measure: 2, notes: [...b3('A4', 'B4', 'G#4'), n('A4', 'hd', { tieStart: true })] },
  { measure: 3, slurEnd: 3, notes: [...b3('A4', 'F#4', 'G#4'), n('A4', 'hd', { tieStart: true })] },
  { measure: 4, slurStart: 0, notes: [...b3('B4', 'C5', 'D5'), n('E5', 'hd')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('A4', 'q'), ...s2('G#4', 'A4'), n('B4', 'qd'), n('B4', 'qd')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [n('A4', 'q'), ...s2('G#4', 'A4'), n('C5', 'qd'), n('C5', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'qd', { tieStop: true }), n('D5', 'q'), n('C5', 'e')] },
  { measure: 8, slurEnd: 2, notes: [n('B4', 'q'), n('A4', 'e'), n('G4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [...b3('G4', 'E4', 'G#4'), n('A4', 'hd', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [...b3('A4', 'D5', 'A4'), n('G#4', 'hd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [...b3('G#4', 'F#4', 'G#4'), ...b3('A4', 'G#4', 'A4'), ...b3('B4', 'A4', 'B4')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [...b3('D5', 'C5', 'B4'), n('A4', 'qd'), ...s2('G#4', 'A4')] },
  { measure: 14, notes: [n('A4', 'qd'), n('B4', 'qd'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 15, notes: [...b3('A4', 'B4', 'C5'), ...b3('B4', 'C5', 'D5'), n('C5', 'qd')] },
  { measure: 16, slurEnd: 0, notes: [n('A4', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 21 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX21_MEASURES = [
  { measure: 1, localSlurs: [[0, 1]], notes: [n('A4', 'qd'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 3]], notes: [n('A4', 'qd'), n('Gn4', 'q'), n('F4', 'e'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('E4', 'qd'), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 4, localSlurs: [[0, 4]], notes: [n('E4', 'qd'), ...b3('Fn4', 'E4', 'D4'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('C5', 'qd'), n('Bb4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('A4', 'qd'), n('Bn4', 'q'), n('C#5', 'e'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'C5', 'Bb4'), n('A4', 'qd'), n('D5', 'qd')] },
  { measure: 8, slurEnd: 2, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'Bb4', 'A4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('E4', 'qd'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('G4', 'qd'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A4', 'B4')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'hd'), n('C#5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'Cn5', 'B4'), ...b3('A4', 'G4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd'), ...b3('F#4', 'G#4', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 22 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX22_MEASURES = [
  { measure: 1, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'qd', { tieStart: true }), n('E5', 'hd', { tieStop: true })] },
  { measure: 2, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true }), n('C5', 'hd', { tieStop: true })] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'qd', { tieStart: true }), n('E5', 'hd', { tieStop: true })] },
  { measure: 6, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true }), n('C5', 'hd', { tieStop: true })] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 8, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'q'), n('A4', 'e'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd'), n('D5', 'hd')] },
  { measure: 10, slurEnd: 4, notes: [...b3('D5', 'C5', 'B4'), ...b3('C5', 'B4', 'A4'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('C5', 'hd')] },
  { measure: 12, slurEnd: 4, notes: [...b3('C5', 'B4', 'A4'), ...b3('G#4', 'A4', 'B4'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('F4', 'qd'), n('D5', 'hd')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [n('Bb4', 'qd'), n('A4', 'qd'), n('G4', 'hd')] },
  { measure: 15, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'e'), n('F#4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 23 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX23_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q', { tieStop: true }), ...s2('G4', 'A4'), n('B4', 'qd', { tieStart: true }), n('B4', 'q', { tieStop: true }), ...s2('C5', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'qd', { tieStop: true }), ...b3('G#4', 'A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'q', { tieStop: true }), ...s2('C5', 'D5'), n('E5', 'qd', { tieStart: true }), n('E5', 'q', { tieStop: true }), ...s2('D5', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), ...s2('F4', 'G4'), n('A4', 'qd', { tieStart: true }), n('A4', 'q', { tieStop: true }), ...s2('B4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd'), n('C5', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q', { tieStop: true }), ...s2('E4', 'F#4'), n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), ...s2('A4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd'), n('D5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'q', { tieStop: true }), ...s2('F#4', 'G#4'), n('A4', 'qd', { tieStart: true }), n('A4', 'q', { tieStop: true }), ...s2('B4', 'C5')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'qd'), n('E5', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('D5', 'q'), n('C5', 'e'), n('B4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 24 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX24_MEASURES = [
  { measure: 1, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'q'), n('E4', 'e'), n('B4', 'q'), n('E4', 'e'), n('C5', 'q'), n('E4', 'e')] },
  { measure: 2, slurEnd: 4, notes: [n('B4', 'q'), n('E4', 'e'), n('G#4', 'q'), n('E4', 'e'), n('A4', 'hd')] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('B4', 'q'), n('E4', 'e'), n('C5', 'q'), n('E4', 'e'), n('D5', 'q'), n('E4', 'e')] },
  { measure: 4, slurEnd: 4, notes: [n('C5', 'q'), n('E4', 'e'), n('G#4', 'q'), n('E4', 'e'), n('A4', 'hd')] },
  { measure: 5, localSlurs: [[2, 5]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'q'), n('E4', 'e'), n('D5', 'q'), n('E4', 'e'), n('E5', 'qd')] },
  { measure: 6, localSlurs: [[2, 5]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'q'), n('E4', 'e'), n('D5', 'q'), n('E4', 'e'), n('D5', 'qd')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'q'), n('C4', 'e'), n('B4', 'q'), n('C4', 'e'), n('A4', 'q'), n('C4', 'e')] },
  { measure: 8, slurEnd: 3, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'E4'), n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'q'), n('C4', 'e'), n('A4', 'q'), n('C4', 'e'), n('G4', 'q'), n('C4', 'e')] },
  { measure: 10, slurEnd: 3, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'E4', 'F4'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'q'), n('D4', 'e'), n('B4', 'q'), n('D4', 'e'), n('A4', 'q'), n('D4', 'e')] },
  { measure: 12, slurEnd: 3, notes: [n('G#4', 'qd', { tieStart: true }), ...b3('G#4', 'F#4', 'G#4'), n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('B4', 'q'), n('E4', 'e'), n('E5', 'q'), n('E4', 'e'), n('D5', 'q'), n('E4', 'e')] },
  { measure: 14, slurEnd: 4, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'C5', 'B4'), n('A4', 'qd'), n('G#4', 'qd')] },
  { measure: 15, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'q'), n('E4', 'e'), n('F#4', 'q'), n('E4', 'e'), n('G#4', 'q'), n('E4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

export const POZZOLI_SERIE4_SCORES = {
  'serie-1-ex-1': POZZOLI_SERIE1_EX1_MEASURES,
  'serie-1-ex-2': POZZOLI_SERIE1_EX2_MEASURES,
  'serie-1-ex-3': POZZOLI_SERIE1_EX3_MEASURES,
  'serie-1-ex-4': POZZOLI_SERIE1_EX4_MEASURES,
  'serie-1-ex-5': POZZOLI_SERIE1_EX5_MEASURES,
  'serie-1-ex-6': POZZOLI_SERIE1_EX6_MEASURES,
  'serie-1-ex-7': POZZOLI_SERIE1_EX7_MEASURES,
  'serie-1-ex-8': POZZOLI_SERIE1_EX8_MEASURES,
  'serie-1-ex-9': POZZOLI_SERIE1_EX9_MEASURES,
  'serie-1-ex-10': POZZOLI_SERIE1_EX10_MEASURES,
  'serie-2-ex-1': POZZOLI_SERIE2_EX1_MEASURES,
  'serie-2-ex-2': POZZOLI_SERIE2_EX2_MEASURES,
  'serie-2-ex-3': POZZOLI_SERIE2_EX3_MEASURES,
  'serie-2-ex-4': POZZOLI_SERIE2_EX4_MEASURES,
  'serie-2-ex-5': POZZOLI_SERIE2_EX5_MEASURES,
  'serie-2-ex-6': POZZOLI_SERIE2_EX6_MEASURES,
  'serie-2-ex-7': POZZOLI_SERIE2_EX7_MEASURES,
  'serie-2-ex-8': POZZOLI_SERIE2_EX8_MEASURES,
  'serie-2-ex-9': POZZOLI_SERIE2_EX9_MEASURES,
  'serie-2-ex-10': POZZOLI_SERIE2_EX10_MEASURES,
  'serie-3-ex-1': POZZOLI_SERIE3_EX1_MEASURES,
  'serie-3-ex-2': POZZOLI_SERIE3_EX2_MEASURES,
  'serie-3-ex-3': POZZOLI_SERIE3_EX3_MEASURES,
  'serie-3-ex-4': POZZOLI_SERIE3_EX4_MEASURES,
  'serie-3-ex-5': POZZOLI_SERIE3_EX5_MEASURES,
  'serie-3-ex-6': POZZOLI_SERIE3_EX6_MEASURES,
  'serie-3-ex-7': POZZOLI_SERIE3_EX7_MEASURES,
  'serie-3-ex-8': POZZOLI_SERIE3_EX8_MEASURES,
  'serie-3-ex-9': POZZOLI_SERIE3_EX9_MEASURES,
  'serie-3-ex-10': POZZOLI_SERIE3_EX10_MEASURES,
  'serie-3-ex-11': POZZOLI_SERIE3_EX11_MEASURES,
  'serie-3-ex-12': POZZOLI_SERIE3_EX12_MEASURES,
  'serie-3-ex-13': POZZOLI_SERIE3_EX13_MEASURES,
  'serie-3-ex-14': POZZOLI_SERIE3_EX14_MEASURES,
  'serie-3-ex-15': POZZOLI_SERIE3_EX15_MEASURES,
  'serie-3-ex-16': POZZOLI_SERIE3_EX16_MEASURES,
  'serie-3-ex-17': POZZOLI_SERIE3_EX17_MEASURES,
  'serie-3-ex-18': POZZOLI_SERIE3_EX18_MEASURES,
  'serie-4-ex-1': POZZOLI_SERIE4_EX1_MEASURES,
  'serie-4-ex-2': POZZOLI_SERIE4_EX2_MEASURES,
  'serie-4-ex-3': POZZOLI_SERIE4_EX3_MEASURES,
  'serie-4-ex-4': POZZOLI_SERIE4_EX4_MEASURES,
  'serie-4-ex-5': POZZOLI_SERIE4_EX5_MEASURES,
  'serie-4-ex-6': POZZOLI_SERIE4_EX6_MEASURES,
  'serie-4-ex-7': POZZOLI_SERIE4_EX7_MEASURES,
  'serie-4-ex-8': POZZOLI_SERIE4_EX8_MEASURES,
  'serie-4-ex-9': POZZOLI_SERIE4_EX9_MEASURES,
  'serie-4-ex-10': POZZOLI_SERIE4_EX10_MEASURES,
  'serie-4-ex-11': POZZOLI_SERIE4_EX11_MEASURES,
  'serie-4-ex-12': POZZOLI_SERIE4_EX12_MEASURES,
  'serie-4-ex-13': POZZOLI_SERIE4_EX13_MEASURES,
  'serie-4-ex-14': POZZOLI_SERIE4_EX14_MEASURES,
  'serie-4-ex-15': POZZOLI_SERIE4_EX15_MEASURES,
  'serie-4-ex-16': POZZOLI_SERIE4_EX16_MEASURES,
  'serie-4-ex-17': POZZOLI_SERIE4_EX17_MEASURES,
  'serie-4-ex-18': POZZOLI_SERIE4_EX18_MEASURES,
  'serie-5-ex-1': POZZOLI_SERIE5_EX1_MEASURES,
  'serie-5-ex-2': POZZOLI_SERIE5_EX2_MEASURES,
  'serie-5-ex-3': POZZOLI_SERIE5_EX3_MEASURES,
  'serie-5-ex-4': POZZOLI_SERIE5_EX4_MEASURES,
  'serie-5-ex-5': POZZOLI_SERIE5_EX5_MEASURES,
  'serie-5-ex-6': POZZOLI_SERIE5_EX6_MEASURES,
  'serie-5-ex-7': POZZOLI_SERIE5_EX7_MEASURES,
  'serie-5-ex-8': POZZOLI_SERIE5_EX8_MEASURES,
  'serie-5-ex-9': POZZOLI_SERIE5_EX9_MEASURES,
  'serie-5-ex-10': POZZOLI_SERIE5_EX10_MEASURES,
  'serie-6-ex-1': POZZOLI_SERIE6_EX1_MEASURES,
  'serie-6-ex-2': POZZOLI_SERIE6_EX2_MEASURES,
  'serie-6-ex-3': POZZOLI_SERIE6_EX3_MEASURES,
  'serie-6-ex-4': POZZOLI_SERIE6_EX4_MEASURES,
  'serie-6-ex-5': POZZOLI_SERIE6_EX5_MEASURES,
  'serie-6-ex-6': POZZOLI_SERIE6_EX6_MEASURES,
  'serie-6-ex-7': POZZOLI_SERIE6_EX7_MEASURES,
  'serie-6-ex-8': POZZOLI_SERIE6_EX8_MEASURES,
  'serie-6-ex-9': POZZOLI_SERIE6_EX9_MEASURES,
  'serie-6-ex-10': POZZOLI_SERIE6_EX10_MEASURES,
  'serie-7-ex-1': POZZOLI_SERIE7_EX1_MEASURES,
  'serie-7-ex-2': POZZOLI_SERIE7_EX2_MEASURES,
  'serie-7-ex-3': POZZOLI_SERIE7_EX3_MEASURES,
  'serie-7-ex-4': POZZOLI_SERIE7_EX4_MEASURES,
  'serie-7-ex-5': POZZOLI_SERIE7_EX5_MEASURES,
  'serie-7-ex-6': POZZOLI_SERIE7_EX6_MEASURES,
  'serie-7-ex-7': POZZOLI_SERIE7_EX7_MEASURES,
  'serie-7-ex-8': POZZOLI_SERIE7_EX8_MEASURES,
  'serie-7-ex-9': POZZOLI_SERIE7_EX9_MEASURES,
  'serie-7-ex-10': POZZOLI_SERIE7_EX10_MEASURES,
  'serie-8-ex-1': POZZOLI_SERIE8_EX1_MEASURES,
  'serie-8-ex-2': POZZOLI_SERIE8_EX2_MEASURES,
  'serie-8-ex-3': POZZOLI_SERIE8_EX3_MEASURES,
  'serie-8-ex-4': POZZOLI_SERIE8_EX4_MEASURES,
  'serie-8-ex-5': POZZOLI_SERIE8_EX5_MEASURES,
  'serie-8-ex-6': POZZOLI_SERIE8_EX6_MEASURES,
  'serie-8-ex-7': POZZOLI_SERIE8_EX7_MEASURES,
  'serie-8-ex-8': POZZOLI_SERIE8_EX8_MEASURES,
  'serie-8-ex-9': POZZOLI_SERIE8_EX9_MEASURES,
  'serie-8-ex-10': POZZOLI_SERIE8_EX10_MEASURES,
  'serie-8-ex-11': POZZOLI_SERIE8_EX11_MEASURES,
  'serie-8-ex-12': POZZOLI_SERIE8_EX12_MEASURES,
  'serie-8-ex-13': POZZOLI_SERIE8_EX13_MEASURES,
  'serie-8-ex-14': POZZOLI_SERIE8_EX14_MEASURES,
  'serie-8-ex-15': POZZOLI_SERIE8_EX15_MEASURES,
  'serie-9-ex-1': POZZOLI_SERIE9_EX1_MEASURES,
  'serie-9-ex-2': POZZOLI_SERIE9_EX2_MEASURES,
  'serie-9-ex-3': POZZOLI_SERIE9_EX3_MEASURES,
  'serie-9-ex-4': POZZOLI_SERIE9_EX4_MEASURES,
  'serie-9-ex-5': POZZOLI_SERIE9_EX5_MEASURES,
  'serie-9-ex-6': POZZOLI_SERIE9_EX6_MEASURES,
  'serie-9-ex-7': POZZOLI_SERIE9_EX7_MEASURES,
  'serie-9-ex-8': POZZOLI_SERIE9_EX8_MEASURES,
  'serie-9-ex-9': POZZOLI_SERIE9_EX9_MEASURES,
  'serie-9-ex-10': POZZOLI_SERIE9_EX10_MEASURES,
  'serie-9-ex-11': POZZOLI_SERIE9_EX11_MEASURES,
  'serie-9-ex-12': POZZOLI_SERIE9_EX12_MEASURES,
  'serie-9-ex-13': POZZOLI_SERIE9_EX13_MEASURES,
  'serie-9-ex-14': POZZOLI_SERIE9_EX14_MEASURES,
  'serie-9-ex-15': POZZOLI_SERIE9_EX15_MEASURES,
  'serie-9-ex-16': POZZOLI_SERIE9_EX16_MEASURES,
  'serie-9-ex-17': POZZOLI_SERIE9_EX17_MEASURES,
  'serie-9-ex-18': POZZOLI_SERIE9_EX18_MEASURES,
  'serie-10-ex-1': POZZOLI_SERIE10_EX1_MEASURES,
  'serie-10-ex-2': POZZOLI_SERIE10_EX2_MEASURES,
  'serie-10-ex-3': POZZOLI_SERIE10_EX3_MEASURES,
  'serie-10-ex-4': POZZOLI_SERIE10_EX4_MEASURES,
  'serie-10-ex-5': POZZOLI_SERIE10_EX5_MEASURES,
  'serie-10-ex-6': POZZOLI_SERIE10_EX6_MEASURES,
  'serie-10-ex-7': POZZOLI_SERIE10_EX7_MEASURES,
  'serie-10-ex-8': POZZOLI_SERIE10_EX8_MEASURES,
  'serie-10-ex-9': POZZOLI_SERIE10_EX9_MEASURES,
  'serie-10-ex-10': POZZOLI_SERIE10_EX10_MEASURES,
  'serie-10-ex-11': POZZOLI_SERIE10_EX11_MEASURES,
  'serie-10-ex-12': POZZOLI_SERIE10_EX12_MEASURES,
  'serie-10-ex-13': POZZOLI_SERIE10_EX13_MEASURES,
  'serie-10-ex-14': POZZOLI_SERIE10_EX14_MEASURES,
  'serie-10-ex-15': POZZOLI_SERIE10_EX15_MEASURES,
  'serie-10-ex-16': POZZOLI_SERIE10_EX16_MEASURES,
  'serie-10-ex-17': POZZOLI_SERIE10_EX17_MEASURES,
  'serie-10-ex-18': POZZOLI_SERIE10_EX18_MEASURES,
  'serie-10-ex-19': POZZOLI_SERIE10_EX19_MEASURES,
  'serie-10-ex-20': POZZOLI_SERIE10_EX20_MEASURES,
  'serie-10-ex-21': POZZOLI_SERIE10_EX21_MEASURES,
  'serie-10-ex-22': POZZOLI_SERIE10_EX22_MEASURES,
  'serie-10-ex-23': POZZOLI_SERIE10_EX23_MEASURES,
  'serie-10-ex-24': POZZOLI_SERIE10_EX24_MEASURES,
  'serie-11-ex-1': POZZOLI_SERIE11_EX1_MEASURES,
  'serie-11-ex-2': POZZOLI_SERIE11_EX2_MEASURES,
  'serie-11-ex-3': POZZOLI_SERIE11_EX3_MEASURES,
  'serie-11-ex-4': POZZOLI_SERIE11_EX4_MEASURES,
  'serie-11-ex-5': POZZOLI_SERIE11_EX5_MEASURES,
  'serie-11-ex-6': POZZOLI_SERIE11_EX6_MEASURES,
  'serie-11-ex-7': POZZOLI_SERIE11_EX7_MEASURES,
  'serie-11-ex-8': POZZOLI_SERIE11_EX8_MEASURES,
  'serie-11-ex-9': POZZOLI_SERIE11_EX9_MEASURES,
  'serie-11-ex-10': POZZOLI_SERIE11_EX10_MEASURES,
  'serie-11-ex-11': POZZOLI_SERIE11_EX11_MEASURES,
  'serie-11-ex-12': POZZOLI_SERIE11_EX12_MEASURES,
  'serie-11-ex-13': POZZOLI_SERIE11_EX13_MEASURES,
  'serie-11-ex-14': POZZOLI_SERIE11_EX14_MEASURES,
  'serie-11-ex-15': POZZOLI_SERIE11_EX15_MEASURES,
  'serie-11-ex-16': POZZOLI_SERIE11_EX16_MEASURES,
  'serie-11-ex-17': POZZOLI_SERIE11_EX17_MEASURES,
  'serie-11-ex-18': POZZOLI_SERIE11_EX18_MEASURES,
  'serie-11-ex-19': POZZOLI_SERIE11_EX19_MEASURES,
  'serie-11-ex-20': POZZOLI_SERIE11_EX20_MEASURES,
  'serie-11-ex-21': POZZOLI_SERIE11_EX21_MEASURES,
  'serie-11-ex-22': POZZOLI_SERIE11_EX22_MEASURES,
  'serie-11-ex-23': POZZOLI_SERIE11_EX23_MEASURES,
  'serie-11-ex-24': POZZOLI_SERIE11_EX24_MEASURES
};

// Posição vertical diatônica na pauta (Clave de Sol):
// E4 (1ª linha de baixo) = step 0; cada linha/espaço acima soma +1 (stepSpacing = 5px)
const DIATONIC_STEP_FROM_E4 = {
  G3: -5, // Abaixo da 2ª linha suplementar inferior
  A3: -4, // 2ª linha suplementar inferior
  B3: -3, // Abaixo da 1ª linha suplementar inferior
  C4: -2, // 1ª linha suplementar inferior
  D4: -1, // Espaço abaixo da 1ª linha
  E4: 0,  // 1ª linha
  F4: 1,  // 1º espaço
  G4: 2,  // 2ª linha (Sol)
  A4: 3,  // 2º espaço
  B4: 4,  // 3ª linha
  C5: 5,  // 3º espaço
  D5: 6,  // 4ª linha
  E5: 7,  // 4º espaço
  F5: 8,  // 5ª linha
  G5: 9,  // Espaço acima da 5ª linha
  A5: 10  // 1ª linha suplementar superior
};

function midiToFreq(midi) {
  if (!midi) return null;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function InteractiveScorePlayer({
  currentSeries,
  bpm = 60,
  isDesktopMode = false,
  onVideoRef = null,
  onTimeUpdate = null,
  onToggleMenu = null,
  playerControls = null
}) {
  const measures = useMemo(() => {
    if (currentSeries?.interactiveMeasures) return currentSeries.interactiveMeasures;
    if (currentSeries?.id && POZZOLI_SERIE4_SCORES[currentSeries.id]) {
      return POZZOLI_SERIE4_SCORES[currentSeries.id];
    }
    return POZZOLI_SERIE4_EX7_MEASURES;
  }, [currentSeries?.id, currentSeries?.interactiveMeasures]);

  const timeSignature = currentSeries?.timeSignature || (currentSeries?.id === 'serie-4-ex-7' ? '9/8' : '6/8');
  const [timeSigNumStr, timeSigDenStr] = timeSignature.split('/');
  const isSimpleMeter = timeSigDenStr === '4';
  const eighthsPerMeasure = isSimpleMeter
    ? (parseInt(timeSigNumStr, 10) || 2) * 2
    : parseInt(timeSigNumStr, 10) || 6;
  const totalEighthsInScore = measures.length * eighthsPerMeasure;

  const defaultBpm = currentSeries?.defaultBpm || 60;

  // Nos compassos simples (2/4, 3/4, 4/4) 1 semínima = 2 colcheias = (60 / bpm) s -> 1 colcheia = (60 / bpm) / 2 s.
  // Nos compassos compostos (6/8, 9/8, 12/8) 1 semínima pontuada = 3 colcheias = (60 / bpm) s -> 1 colcheia = (60 / bpm) / 3 s.
  const baseEighthDurationSec = isSimpleMeter ? (60 / defaultBpm) / 2 : (60 / defaultBpm) / 3;

  // Constrói a linha do tempo linear de todas as notas + eventos sonoros (unindo notas ligadas por tie)
  const { visualTimeline, audioEvents, totalBaseDurationSec } = useMemo(() => {
    const vList = [];
    const aList = [];
    let currentEighth = 0;

    measures.forEach((mObj, mIdx) => {
      let beatInMeasureEighth = 0;
      mObj.notes.forEach((nItem, nIdx) => {
        const startEighth = currentEighth;
        const endEighth = currentEighth + nItem.eighthDur;
        const startTimeSec = startEighth * baseEighthDurationSec;
        const endTimeSec = endEighth * baseEighthDurationSec;
        const durationSec = nItem.eighthDur * baseEighthDurationSec;

        const visualItem = {
          id: `m${mObj.measure}_n${nIdx}`,
          globalIndex: vList.length,
          measureNumber: mObj.measure,
          measureIndex: mIdx,
          noteIndexInMeasure: nIdx,
          pitch: nItem.pitch,
          solfege: nItem.solfege,
          midi: nItem.midi,
          freq: midiToFreq(nItem.midi),
          eighthDur: nItem.eighthDur,
          beatStartInMeasure: beatInMeasureEighth + 1,
          type: nItem.type,
          dotted: !!nItem.dotted,
          isRest: !!nItem.isRest,
          tieStart: !!nItem.tieStart,
          tieStop: !!nItem.tieStop,
          beam: nItem.beam || null,
          startEighth,
          endEighth,
          startTimeSec,
          endTimeSec,
          durationSec
        };

        vList.push(visualItem);

        // Se esta nota é continuação de ligadura (tieStop), prolonga o evento de áudio anterior
        // para que o som não seja re-atacado no meio da ligadura!
        if (nItem.tieStop && aList.length > 0 && !nItem.isRest) {
          const prevAudio = aList[aList.length - 1];
          prevAudio.endEighth = endEighth;
          prevAudio.endTimeSec = endTimeSec;
          prevAudio.durationSec = prevAudio.endTimeSec - prevAudio.startTimeSec;
        } else if (!nItem.isRest && nItem.midi) {
          aList.push({
            id: visualItem.id,
            midi: nItem.midi,
            freq: visualItem.freq,
            solfege: nItem.solfege,
            startEighth,
            endEighth,
            startTimeSec,
            endTimeSec,
            durationSec
          });
        }

        currentEighth = endEighth;
        beatInMeasureEighth += nItem.eighthDur;
      });
    });

    return {
      visualTimeline: vList,
      audioEvents: aList,
      totalBaseDurationSec: currentEighth * baseEighthDurationSec
    };
  }, [measures, baseEighthDurationSec]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0); // Tempo na escala base (0 .. totalBaseDurationSec)
  const [showSolfegeNames, setShowSolfegeNames] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [metronomeVolume, setMetronomeVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('pozzoli_metronome_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed)) return Math.max(0, Math.min(1.5, parsed));
      }
    } catch {
      // ignore
    }
    return 1.0;
  });
  const rowRefs = useRef([]);

  // Refs para o motor de áudio em tempo real
  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const playbackRateRef = useRef(bpm / defaultBpm);
  const isMutedRef = useRef(false);
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const metronomeVolumeRef = useRef(metronomeVolume);
  const lastFrameWallTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const scheduledAudioIdsRef = useRef(new Set());
  const scheduledTicksRef = useRef(new Set());
  const listenersRef = useRef({
    timeupdate: new Set(),
    play: new Set(),
    pause: new Set(),
    ended: new Set()
  });

  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  useEffect(() => {
    metronomeVolumeRef.current = metronomeVolume;
    try {
      localStorage.setItem('pozzoli_metronome_volume', String(metronomeVolume));
    } catch {
      // ignore
    }
  }, [metronomeVolume]);

  useEffect(() => {
    playbackRateRef.current = Math.max(0.3, Math.min(3.0, bpm / defaultBpm));
  }, [bpm, defaultBpm]);

  const emitMediaEvent = useCallback((eventName) => {
    const set = listenersRef.current[eventName];
    if (set) {
      set.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    }
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopAllActiveSoundNodes = useCallback(() => {
    activeNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch {
        // ignore
      }
    });
    activeNodesRef.current = [];
  }, []);

  // Síntese realista de Violino Acústico (arco suave, harmônicos de corda friccionada, formantes de madeira e vibrato expressivo)
  const playMelodicNote = useCallback((freq, startWallTime, realDurationSec) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !freq || isMutedRef.current) return;

    try {
      const safeStart = Math.max(ctx.currentTime + 0.005, startWallTime);

      // 1. Osciladores de corda friccionada (2 sawtooth levemente desafinados + 1 triangle fundamental quente)
      const oscBow1 = ctx.createOscillator();
      const oscBow2 = ctx.createOscillator();
      const oscBody = ctx.createOscillator();

      oscBow1.type = 'sawtooth';
      oscBow1.frequency.setValueAtTime(freq, safeStart);
      oscBow1.detune.setValueAtTime(-4, safeStart);

      oscBow2.type = 'sawtooth';
      oscBow2.frequency.setValueAtTime(freq, safeStart);
      oscBow2.detune.setValueAtTime(4, safeStart);

      oscBody.type = 'triangle';
      oscBody.frequency.setValueAtTime(freq, safeStart);

      // 2. Vibrato natural de violino (5.6 Hz) que entra suavemente após o ataque do arco
      const vibratoLfo = ctx.createOscillator();
      const vibratoDepth = ctx.createGain();
      vibratoLfo.type = 'sine';
      vibratoLfo.frequency.setValueAtTime(5.6, safeStart);

      const maxVibratoHz = freq * 0.0075; // ~13 cents de vibrato expressivo
      vibratoDepth.gain.setValueAtTime(0.0001, safeStart);
      vibratoDepth.gain.linearRampToValueAtTime(
        realDurationSec > 0.45 ? maxVibratoHz : maxVibratoHz * 0.35,
        safeStart + Math.min(0.22, realDurationSec * 0.5)
      );

      vibratoLfo.connect(vibratoDepth);
      vibratoDepth.connect(oscBow1.frequency);
      vibratoDepth.connect(oscBow2.frequency);
      vibratoDepth.connect(oscBody.frequency);

      // 3. Filtros de Ressonância do Corpo de Madeira do Violino (Formantes + Lowpass aveludado)
      const bodyFormant1 = ctx.createBiquadFilter();
      bodyFormant1.type = 'peaking';
      bodyFormant1.frequency.setValueAtTime(320, safeStart); // Ressonância da caixa acústica
      bodyFormant1.Q.setValueAtTime(1.5, safeStart);
      bodyFormant1.gain.setValueAtTime(4.5, safeStart);

      const bodyFormant2 = ctx.createBiquadFilter();
      bodyFormant2.type = 'peaking';
      bodyFormant2.frequency.setValueAtTime(1100, safeStart); // Projeção doce do violino
      bodyFormant2.Q.setValueAtTime(1.8, safeStart);
      bodyFormant2.gain.setValueAtTime(3.5, safeStart);

      const warmLowpass = ctx.createBiquadFilter();
      warmLowpass.type = 'lowpass';
      warmLowpass.frequency.setValueAtTime(Math.min(3400, freq * 5.8), safeStart);
      warmLowpass.Q.setValueAtTime(0.7, safeStart);

      // Mixagem entre as cordas e o corpo fundamental
      const bowGain = ctx.createGain();
      bowGain.gain.setValueAtTime(0.22, safeStart);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.32, safeStart);

      // 4. Envelope de Arco de Violino (ataque macio de arco, sustentação contínua cantabile e saída suave)
      const masterGain = ctx.createGain();
      const attack = Math.min(0.065, Math.max(0.025, realDurationSec * 0.16));
      const swell = Math.min(0.14, Math.max(0.03, realDurationSec * 0.22));
      const peakLevel = 0.46;
      const sustainLevel = 0.40;
      const release = 0.085;
      const noteEnd = Math.max(
        safeStart + attack + swell + 0.01,
        safeStart + Math.max(0.07, realDurationSec - 0.01)
      );

      masterGain.gain.setValueAtTime(0.0001, safeStart);
      masterGain.gain.linearRampToValueAtTime(peakLevel * 0.82, safeStart + attack);
      masterGain.gain.linearRampToValueAtTime(peakLevel, safeStart + attack + swell);
      masterGain.gain.setValueAtTime(sustainLevel, noteEnd);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd + release);

      oscBow1.connect(bowGain);
      oscBow2.connect(bowGain);
      oscBody.connect(bodyGain);

      bowGain.connect(bodyFormant1);
      bodyGain.connect(bodyFormant1);
      bodyFormant1.connect(bodyFormant2);
      bodyFormant2.connect(warmLowpass);
      warmLowpass.connect(masterGain);
      masterGain.connect(ctx.destination);

      const stopAt = noteEnd + release + 0.03;
      oscBow1.start(safeStart);
      oscBow2.start(safeStart);
      oscBody.start(safeStart);
      vibratoLfo.start(safeStart);

      oscBow1.stop(stopAt);
      oscBow2.stop(stopAt);
      oscBody.stop(stopAt);
      vibratoLfo.stop(stopAt);

      activeNodesRef.current.push(oscBow1, oscBow2, oscBody, vibratoLfo);
    } catch (err) {
      console.warn('Erro ao tocar nota de violino:', err);
    }
  }, []);

  // Clique do metrônomo 9/8 de alta presença (madeira/woodblock nítido: forte no tempo 1, médio nos tempos 4 e 7, claro nas subdivisões)
  const playMetronomeClick = useCallback((beatInMeasure1to9, startWallTime, isCountIn = false) => {
    const ctx = audioCtxRef.current;
    if (!ctx || isMutedRef.current) return;
    if (!metronomeEnabledRef.current && !isCountIn) return;

    try {
      const safeStart = Math.max(ctx.currentTime + 0.005, startWallTime);
      const oscPrimary = ctx.createOscillator();
      const oscTransient = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const isDownbeat = beatInMeasure1to9 === 1;
      const isCompoundBeat =
        beatInMeasure1to9 === 4 || beatInMeasure1to9 === 7 || beatInMeasure1to9 === 10;

      // Envelope de altura percussivo (efeito "tac" de metrônomo mecânico/woodblock)
      const startFreq = isDownbeat ? 1850 : isCompoundBeat ? 1380 : 1020;
      const endFreq = isDownbeat ? 1080 : isCompoundBeat ? 820 : 640;
      const clickDur = isDownbeat ? 0.055 : isCompoundBeat ? 0.045 : 0.032;

      oscPrimary.type = 'triangle';
      oscPrimary.frequency.setValueAtTime(startFreq, safeStart);
      oscPrimary.frequency.exponentialRampToValueAtTime(endFreq, safeStart + clickDur);

      oscTransient.type = 'square';
      oscTransient.frequency.setValueAtTime(startFreq * 1.5, safeStart);
      oscTransient.frequency.exponentialRampToValueAtTime(endFreq, safeStart + 0.015);

      filter.type = 'peaking';
      filter.frequency.setValueAtTime(1400, safeStart);
      filter.Q.setValueAtTime(1.8, safeStart);
      filter.gain.setValueAtTime(6, safeStart);

      // Volume controlado pelo usuário (0% a 150%)
      const userVolMultiplier = metronomeVolumeRef.current;
      if (userVolMultiplier <= 0.001) return;

      const baseVol = (isDownbeat ? 0.92 : isCompoundBeat ? 0.70 : 0.44) * userVolMultiplier;
      const vol = Math.min(1.35, isCountIn ? baseVol * 1.08 : baseVol);

      const transientGain = ctx.createGain();
      transientGain.gain.setValueAtTime(vol * 0.35, safeStart);
      transientGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.016);

      gain.gain.setValueAtTime(0.0001, safeStart);
      gain.gain.linearRampToValueAtTime(vol, safeStart + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + clickDur);

      oscPrimary.connect(filter);
      oscTransient.connect(transientGain);
      transientGain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      oscPrimary.start(safeStart);
      oscTransient.start(safeStart);
      oscPrimary.stop(safeStart + clickDur + 0.008);
      oscTransient.stop(safeStart + 0.02);
      activeNodesRef.current.push(oscPrimary, oscTransient);
    } catch {
      // ignore
    }
  }, []);

  // Agenda notas e cliques do metrônomo na janela de lookahead (incluindo contagem negativa -eighthsPerMeasure..-1)
  const scheduleLookahead = useCallback(
    (baseSecNow) => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const rate = playbackRateRef.current;
      const lookaheadBaseSec = 0.14 * rate;

      // 1. Agendar notas melódicas (começam em t >= 0)
      for (let i = 0; i < audioEvents.length; i++) {
        const ev = audioEvents[i];
        if (scheduledAudioIdsRef.current.has(ev.id)) continue;

        // Se estamos começando exatamente dentro desta nota ou ela começa na janela de lookahead
        const startsInWindow =
          ev.startTimeSec >= baseSecNow - 0.02 && ev.startTimeSec <= baseSecNow + lookaheadBaseSec;
        const alreadyStartedButOngoing =
          baseSecNow >= 0 &&
          ev.startTimeSec < baseSecNow - 0.02 &&
          ev.endTimeSec > baseSecNow + 0.04 &&
          scheduledAudioIdsRef.current.size === 0;

        if (startsInWindow || alreadyStartedButOngoing) {
          scheduledAudioIdsRef.current.add(ev.id);
          const offsetBase = Math.max(0, ev.startTimeSec - baseSecNow);
          const delayWallSec = offsetBase / rate;
          const remainingBaseDur = alreadyStartedButOngoing
            ? ev.endTimeSec - baseSecNow
            : ev.durationSec;
          const realDurSec = remainingBaseDur / rate;

          playMelodicNote(ev.freq, ctx.currentTime + delayWallSec, realDurSec);
        }
      }

      // 2. Agendar cliques do metrônomo (em compasso simples clica a cada semínima = 2 colcheias; em composto a cada colcheia)
      const currentEighthFloat = baseSecNow / baseEighthDurationSec;
      const maxEighthFloat = (baseSecNow + lookaheadBaseSec) / baseEighthDurationSec;
      const startTick = Math.max(-eighthsPerMeasure, Math.floor(currentEighthFloat));
      const endTick = Math.min(totalEighthsInScore - 1, Math.floor(maxEighthFloat));

      for (let tick = startTick; tick <= endTick; tick++) {
        if (scheduledTicksRef.current.has(tick)) continue;
        if (isSimpleMeter && ((tick % 2) + 2) % 2 !== 0) continue;

        const tickBaseSec = tick * baseEighthDurationSec;
        if (tickBaseSec >= baseSecNow - 0.025 && tickBaseSec <= baseSecNow + lookaheadBaseSec) {
          scheduledTicksRef.current.add(tick);
          const delayWallSec = Math.max(0, (tickBaseSec - baseSecNow) / rate);
          const modTick = ((tick % eighthsPerMeasure) + eighthsPerMeasure) % eighthsPerMeasure;
          const beatInMeasure = isSimpleMeter
            ? modTick === 0
              ? 1
              : modTick === 4 && eighthsPerMeasure === 8
              ? 4
              : 2
            : modTick + 1;
          playMetronomeClick(beatInMeasure, ctx.currentTime + delayWallSec, tick < 0);
        }
      }
    },
    [
      audioEvents,
      baseEighthDurationSec,
      eighthsPerMeasure,
      isSimpleMeter,
      totalEighthsInScore,
      playMelodicNote,
      playMetronomeClick
    ]
  );

  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  const stopPlaybackLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    lastFrameWallTimeRef.current = null;
  }, []);

  const pausePlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopPlaybackLoop();
    stopAllActiveSoundNodes();
    if (currentTimeRef.current < 0) {
      currentTimeRef.current = 0;
      setCurrentTimeSec(0);
    }
    emitMediaEvent('pause');
  }, [stopPlaybackLoop, stopAllActiveSoundNodes, emitMediaEvent]);

  const startPlayback = useCallback(async () => {
    const ctx = ensureAudioContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }

    // Se estiver no início (ou no fim), faz 1 compasso completo de contagem inicial (-eighthsPerMeasure colcheias até 0)
    const countInDurationSec = eighthsPerMeasure * baseEighthDurationSec;
    if (currentTimeRef.current >= totalBaseDurationSec - 0.05 || currentTimeRef.current <= 0.05) {
      currentTimeRef.current = -countInDurationSec;
      setCurrentTimeSec(-countInDurationSec);
      scheduledAudioIdsRef.current.clear();
      scheduledTicksRef.current.clear();
    }

    stopPlaybackLoop();
    isPlayingRef.current = true;
    setIsPlaying(true);
    lastFrameWallTimeRef.current = performance.now();
    emitMediaEvent('play');

    const step = (nowMs) => {
      if (!isPlayingRef.current) return;
      const dtWallSec = Math.max(0, (nowMs - (lastFrameWallTimeRef.current || nowMs)) / 1000);
      lastFrameWallTimeRef.current = nowMs;

      const nextBaseSec = currentTimeRef.current + dtWallSec * playbackRateRef.current;

      if (nextBaseSec >= totalBaseDurationSec) {
        currentTimeRef.current = totalBaseDurationSec;
        setCurrentTimeSec(totalBaseDurationSec);
        isPlayingRef.current = false;
        setIsPlaying(false);
        stopAllActiveSoundNodes();
        emitMediaEvent('timeupdate');
        emitMediaEvent('ended');
        return;
      }

      currentTimeRef.current = nextBaseSec;
      setCurrentTimeSec(nextBaseSec);
      scheduleLookahead(nextBaseSec);
      emitMediaEvent('timeupdate');
      if (onTimeUpdateRef.current) onTimeUpdateRef.current(Math.max(0, nextBaseSec));

      animFrameRef.current = requestAnimationFrame(step);
    };

    scheduleLookahead(currentTimeRef.current);
    animFrameRef.current = requestAnimationFrame(step);
  }, [
    ensureAudioContext,
    eighthsPerMeasure,
    baseEighthDurationSec,
    totalBaseDurationSec,
    stopPlaybackLoop,
    emitMediaEvent,
    stopAllActiveSoundNodes,
    scheduleLookahead
  ]);

  const seekToTime = useCallback(
    (targetSec) => {
      const clamped = Math.max(0, Math.min(totalBaseDurationSec, targetSec));
      currentTimeRef.current = clamped;
      setCurrentTimeSec(clamped);
      stopAllActiveSoundNodes();
      scheduledAudioIdsRef.current.clear();
      scheduledTicksRef.current.clear();

      // Marca como já agendados os eventos anteriores ao ponto de seek
      audioEvents.forEach((ev) => {
        if (ev.endTimeSec <= clamped) {
          scheduledAudioIdsRef.current.add(ev.id);
        }
      });
      const currentTick = Math.floor(clamped / baseEighthDurationSec);
      for (let t = 0; t < currentTick; t++) {
        scheduledTicksRef.current.add(t);
      }

      if (isPlayingRef.current) {
        lastFrameWallTimeRef.current = performance.now();
        scheduleLookahead(clamped);
      }

      emitMediaEvent('timeupdate');
      if (onTimeUpdateRef.current) onTimeUpdateRef.current(clamped);
    },
    [
      totalBaseDurationSec,
      stopAllActiveSoundNodes,
      audioEvents,
      baseEighthDurationSec,
      scheduleLookahead,
      emitMediaEvent
    ]
  );

  const startPlaybackRef = useRef(startPlayback);
  const pausePlaybackRef = useRef(pausePlayback);
  const seekToTimeRef = useRef(seekToTime);
  const totalBaseDurationSecRef = useRef(totalBaseDurationSec);
  useEffect(() => {
    startPlaybackRef.current = startPlayback;
    pausePlaybackRef.current = pausePlayback;
    seekToTimeRef.current = seekToTime;
    totalBaseDurationSecRef.current = totalBaseDurationSec;
  }, [startPlayback, pausePlayback, seekToTime, totalBaseDurationSec]);

  // Reinicia quando o usuário troca de exercício
  useEffect(() => {
    pausePlayback();
    currentTimeRef.current = 0;
    setCurrentTimeSec(0);
    scheduledAudioIdsRef.current.clear();
    scheduledTicksRef.current.clear();
    emitMediaEvent('timeupdate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSeries?.id]);

  // Expõe objeto compatível com HTMLMediaElement para o AudioPlayerControls da barra inferior
  const virtualMediaRef = useRef(null);
  if (!virtualMediaRef.current) {
    const mediaProxy = {
      play: () => {
        if (startPlaybackRef.current) startPlaybackRef.current();
        return Promise.resolve();
      },
      pause: () => {
        if (pausePlaybackRef.current) pausePlaybackRef.current();
      },
      addEventListener: (type, fn) => {
        if (listenersRef.current[type]) {
          listenersRef.current[type].add(fn);
        }
      },
      removeEventListener: (type, fn) => {
        if (listenersRef.current[type]) {
          listenersRef.current[type].delete(fn);
        }
      },
      preservesPitch: true,
      webkitPreservesPitch: true,
      mozPreservesPitch: true
    };

    Object.defineProperties(mediaProxy, {
      currentTime: {
        get: () => Math.max(0, currentTimeRef.current),
        set: (val) => {
          if (seekToTimeRef.current) seekToTimeRef.current(Number(val) || 0);
        }
      },
      duration: {
        get: () => totalBaseDurationSecRef.current
      },
      paused: {
        get: () => !isPlayingRef.current
      },
      playbackRate: {
        get: () => playbackRateRef.current,
        set: (val) => {
          playbackRateRef.current = Math.max(0.3, Math.min(3.0, Number(val) || 1));
        }
      },
      muted: {
        get: () => isMutedRef.current,
        set: (val) => {
          isMutedRef.current = !!val;
          if (val) stopAllActiveSoundNodes();
        }
      }
    });

    virtualMediaRef.current = mediaProxy;
  }

  useEffect(() => {
    if (onVideoRef && virtualMediaRef.current) {
      onVideoRef(virtualMediaRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopPlaybackLoop();
      stopAllActiveSoundNodes();
    };
  }, [stopPlaybackLoop, stopAllActiveSoundNodes]);

  const isCountingIn = isPlaying && currentTimeSec < 0;
  const countInBeat = isCountingIn
    ? Math.min(
        eighthsPerMeasure,
        Math.max(
          1,
          Math.floor(
            (currentTimeSec + eighthsPerMeasure * baseEighthDurationSec) / baseEighthDurationSec
          ) + 1
        )
      )
    : null;

  // Determina a nota visual ativa, o compasso ativo (1..16) e a colcheia ativa
  const activeVisualNote = useMemo(() => {
    if (currentTimeSec < 0) return null;
    const found = visualTimeline.find(
      (item) => currentTimeSec >= item.startTimeSec && currentTimeSec < item.endTimeSec
    );
    return found || visualTimeline[0];
  }, [visualTimeline, currentTimeSec]);

  const currentEighthGlobal = Math.min(
    totalEighthsInScore - 1,
    Math.max(0, Math.floor(Math.max(0, currentTimeSec) / baseEighthDurationSec))
  );
  const activeMeasureNumber = isCountingIn
    ? 0
    : Math.floor(currentEighthGlobal / eighthsPerMeasure) + 1;
  const activeBeatInMeasure = isCountingIn
    ? countInBeat
    : (currentEighthGlobal % eighthsPerMeasure) + 1;
  const progressInsideMeasure = isCountingIn
    ? 0
    : ((Math.max(0, currentTimeSec) / baseEighthDurationSec) % eighthsPerMeasure) /
      eighthsPerMeasure;

  // Ao clicar na tela ou na partitura: começa a tocar (e esconde o menu) ou pausa (e mostra o menu de volta)
  const handleScreenClick = () => {
    if (isPlayingRef.current) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const handleNoteClick = (_noteItem, e) => {
    if (e) e.stopPropagation();
    handleScreenClick();
  };

  // Formato vertical para mobile: 2 compassos por linha (8 sistemas empilhados verticalmente, preservando cada fraseado de 2 compassos)
  const measureRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < measures.length; i += 2) {
      rows.push(measures.slice(i, i + 2));
    }
    return rows;
  }, [measures]);

  // Rola suavemente a tela verticalmente para acompanhar a linha do compasso ativo
  const activeRowIndex = activeMeasureNumber > 0 ? Math.floor((activeMeasureNumber - 1) / 2) : 0;
  useEffect(() => {
    if (!isPlaying) return;
    const rowEl = rowRefs.current[activeRowIndex];
    if (rowEl && typeof rowEl.scrollIntoView === 'function') {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeRowIndex, isPlaying]);

  // Mapa rápido (measureNumber, noteIndexInMeasure) -> visualTimeline item
  const noteLookup = useMemo(() => {
    const map = new Map();
    visualTimeline.forEach((item) => {
      map.set(`${item.measureNumber}_${item.noteIndexInMeasure}`, item);
    });
    return map;
  }, [visualTimeline]);

  return (
    <div
      onClick={handleScreenClick}
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fdfbf7',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: '130px',
        userSelect: 'none',
        cursor: 'pointer'
      }}
    >
      {/* Partitura Vetorial Interativa no Formato Vertical para Mobile */}
      <div
        style={{
          width: '96%',
          maxWidth: '560px',
          margin: '10px auto',
          background: '#ffffff',
          border: '1.5px solid #e4d4bc',
          borderRadius: '18px',
          padding: '16px 10px 24px 10px',
          boxShadow: '0 10px 30px rgba(30, 22, 16, 0.07)',
          cursor: 'pointer'
        }}
      >
        {/* Cabeçalho Compacto da Partitura Vertical (visível quando pausado) */}
        {!isPlaying && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderBottom: '1px solid #eee2cf',
              paddingBottom: '10px',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={() => setShowSolfegeNames((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: showSolfegeNames ? '1.5px solid #ea580c' : '1px solid #d4c4ac',
                  background: showSolfegeNames ? 'rgba(234, 88, 12, 0.12)' : '#ffffff',
                  color: showSolfegeNames ? '#c2410c' : '#574635'
                }}
              >
                <Music size={13} />
                <span>Notas</span>
              </button>

              {/* Controle de Metrônomo + Ajuste de Volume (- / slider / +) */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 6px',
                  borderRadius: '10px',
                  border:
                    metronomeEnabled && metronomeVolume > 0
                      ? '1.5px solid #d97706'
                      : '1px solid #d4c4ac',
                  background:
                    metronomeEnabled && metronomeVolume > 0
                      ? 'rgba(217, 119, 6, 0.09)'
                      : '#ffffff'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!metronomeEnabled && metronomeVolume === 0) {
                      setMetronomeVolume(1.0);
                    }
                    setMetronomeEnabled((v) => !v);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 5px',
                    borderRadius: '6px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    color:
                      metronomeEnabled && metronomeVolume > 0 ? '#b45309' : '#574635'
                  }}
                  title="Ativar / desativar metrônomo"
                >
                  {metronomeEnabled && metronomeVolume > 0 ? (
                    <Volume2 size={13} />
                  ) : (
                    <VolumeX size={13} />
                  )}
                  <span>Metrônomo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(0, Math.round((metronomeVolume - 0.1) * 10) / 10);
                    metronomeVolumeRef.current = next;
                    setMetronomeVolume(next);
                    if (next === 0) {
                      setMetronomeEnabled(false);
                    } else {
                      setMetronomeEnabled(true);
                      metronomeEnabledRef.current = true;
                      const ctx = ensureAudioContext();
                      if (ctx) playMetronomeClick(1, ctx.currentTime + 0.01, false);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: '1px solid #dccbb3',
                    background: '#fffaf2',
                    color: '#574635',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Diminuir volume do metrônomo"
                >
                  <Minus size={12} />
                </button>

                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={metronomeEnabled ? metronomeVolume : 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    metronomeVolumeRef.current = val;
                    setMetronomeVolume(val);
                    if (val <= 0) {
                      setMetronomeEnabled(false);
                    } else if (!metronomeEnabled) {
                      setMetronomeEnabled(true);
                      metronomeEnabledRef.current = true;
                    }
                  }}
                  style={{
                    width: '62px',
                    height: '4px',
                    accentColor: '#d97706',
                    cursor: 'pointer'
                  }}
                  title="Volume do metrônomo"
                />

                <button
                  type="button"
                  onClick={() => {
                    const base = metronomeEnabled ? metronomeVolume : 0;
                    const next = Math.min(1.5, Math.round((base + 0.1) * 10) / 10);
                    metronomeVolumeRef.current = next;
                    setMetronomeVolume(next);
                    setMetronomeEnabled(true);
                    metronomeEnabledRef.current = true;
                    const ctx = ensureAudioContext();
                    if (ctx) playMetronomeClick(1, ctx.currentTime + 0.01, false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    border: '1px solid #dccbb3',
                    background: '#fffaf2',
                    color: '#574635',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Aumentar volume do metrônomo"
                >
                  <Plus size={12} />
                </button>

                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: metronomeEnabled && metronomeVolume > 0 ? '#b45309' : '#8a7968',
                    minWidth: '30px',
                    textAlign: 'right'
                  }}
                >
                  {metronomeEnabled ? `${Math.round(metronomeVolume * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sistemas da Partitura SVG em formato vertical (2 compassos por linha) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {measureRows.map((rowMeasures, rowIdx) => {
            const svgWidth = 440;
            const svgHeight = 142;
            const staffTopY = 44;
            const lineSpacing = 10; // 5 linhas: y = 44, 54, 64, 74, 84
            const staffBottomY = staffTopY + 4 * lineSpacing; // 84 (1ª linha = E4)
            const stepSpacing = lineSpacing / 2; // 5px por grau diatônico

            const isFirstRow = rowIdx === 0;
            const leftHeaderWidth = isFirstRow ? 74 : 46;
            const rightMargin = 8;
            const usableWidth = svgWidth - leftHeaderWidth - rightMargin;
            const measureWidth = usableWidth / rowMeasures.length;

            // Coordenadas calculadas de todas as notas desta linha para desenhar ligaduras (slurs e ties) e barras de colcheia (beams)
            const renderedNotesInRow = [];

            return (
              <div
                key={rowIdx}
                ref={(el) => {
                  rowRefs.current[rowIdx] = el;
                }}
                style={{ width: '100%', overflow: 'hidden' }}
              >
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    overflow: 'visible'
                  }}
                >
                  {/* Destaque de fundo dos compassos e cálculo das posições das notas */}
                  {rowMeasures.map((mObj, mColIdx) => {
                    const mX = leftHeaderWidth + mColIdx * measureWidth;
                    const isMeasureActive = activeMeasureNumber === mObj.measure;
                    const padLeft = 18;
                    const padRight = 14;
                    const innerW = Math.max(40, measureWidth - padLeft - padRight);

                    // Calcula posição X proporcional de cada nota dentro do compasso
                    let accumEighth = 0;
                    const notePositions = mObj.notes.map((n, nIdx) => {
                      const item = noteLookup.get(`${mObj.measure}_${nIdx}`);
                      const centerRatio = (accumEighth + n.eighthDur * 0.42) / eighthsPerMeasure;
                      const nx = mX + padLeft + centerRatio * innerW;
                      const stepFromE4 = DIATONIC_STEP_FROM_E4[n.pitch] ?? 2;
                      const ny = staffBottomY - stepFromE4 * stepSpacing;
                      accumEighth += n.eighthDur;
                      const posObj = {
                        n,
                        nIdx,
                        item,
                        nx,
                        ny,
                        stepFromE4,
                        measureNumber: mObj.measure
                      };
                      renderedNotesInRow.push(posObj);
                      return posObj;
                    });

                    return (
                      <g key={mObj.measure}>
                        {/* Fundo do compasso ativo */}
                        <rect
                          x={mX}
                          y={staffTopY - 18}
                          width={measureWidth}
                          height={staffBottomY - staffTopY + 36}
                          rx={6}
                          fill={
                            isMeasureActive
                              ? 'rgba(234, 88, 12, 0.09)'
                              : 'transparent'
                          }
                          stroke={
                            isMeasureActive
                              ? 'rgba(234, 88, 12, 0.35)'
                              : 'transparent'
                          }
                          strokeWidth={1.2}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            if (notePositions[0]?.item) {
                              handleNoteClick(notePositions[0].item, e);
                            }
                          }}
                        />

                        {/* Número do compasso no canto superior esquerdo */}
                        <text
                          x={mX + 5}
                          y={staffTopY - 8}
                          fontSize="10"
                          fontWeight="700"
                          fill={isMeasureActive ? '#ea580c' : '#9ca3af'}
                          fontFamily="system-ui, sans-serif"
                        >
                          {mObj.measure}
                        </text>

                        {/* Cursor móvel contínuo dentro do compasso ativo */}
                        {isMeasureActive && (
                          <line
                            x1={mX + padLeft + progressInsideMeasure * innerW}
                            y1={staffTopY - 14}
                            x2={mX + padLeft + progressInsideMeasure * innerW}
                            y2={staffBottomY + 14}
                            stroke="#ea580c"
                            strokeWidth="2.2"
                            strokeDasharray="3,2"
                            opacity={0.65}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* As 5 linhas horizontais da pauta */}
                  {[0, 1, 2, 3, 4].map((lineIdx) => {
                    const y = staffTopY + lineIdx * lineSpacing;
                    return (
                      <line
                        key={lineIdx}
                        x1={10}
                        y1={y}
                        x2={svgWidth - rightMargin}
                        y2={y}
                        stroke="#261c14"
                        strokeWidth="1.25"
                      />
                    );
                  })}

                  {/* Barra inicial esquerda do sistema */}
                  <line
                    x1={10}
                    y1={staffTopY}
                    x2={10}
                    y2={staffBottomY}
                    stroke="#1f1610"
                    strokeWidth="2.2"
                  />

                  {/* Clave de Sol estilizada */}
                  <text
                    x={18}
                    y={staffBottomY - 6}
                    fontSize="46"
                    fontFamily="Georgia, serif"
                    fill="#1f1610"
                    style={{ userSelect: 'none' }}
                  >
                    𝄞
                  </text>

                  {/* Fórmula de Compasso (6/8, 9/8 ou 12/8) na primeira linha */}
                  {isFirstRow && (
                    <g>
                      <text
                        x={60}
                        y={staffTopY + 18}
                        fontSize={timeSigNumStr.length > 1 ? '18' : '21'}
                        fontWeight="800"
                        fontFamily="Georgia, serif"
                        textAnchor="middle"
                        letterSpacing={timeSigNumStr.length > 1 ? '-1px' : '0px'}
                        fill="#1f1610"
                      >
                        {timeSigNumStr}
                      </text>
                      <text
                        x={60}
                        y={staffTopY + 38}
                        fontSize="21"
                        fontWeight="800"
                        fontFamily="Georgia, serif"
                        textAnchor="middle"
                        fill="#1f1610"
                      >
                        {timeSigDenStr}
                      </text>
                    </g>
                  )}

                  {/* Barras divisórias de compasso (e barra dupla final no compasso 16) */}
                  {rowMeasures.map((mObj, mColIdx) => {
                    const barX = leftHeaderWidth + (mColIdx + 1) * measureWidth;
                    const isFinalMeasure = mObj.measure === measures.length;
                    return (
                      <g key={`bar_${mObj.measure}`}>
                        {isFinalMeasure ? (
                          <>
                            <line
                              x1={barX - 5}
                              y1={staffTopY}
                              x2={barX - 5}
                              y2={staffBottomY}
                              stroke="#1f1610"
                              strokeWidth="1.4"
                            />
                            <line
                              x1={barX}
                              y1={staffTopY}
                              x2={barX}
                              y2={staffBottomY}
                              stroke="#1f1610"
                              strokeWidth="3.5"
                            />
                          </>
                        ) : (
                          <line
                            x1={barX}
                            y1={staffTopY}
                            x2={barX}
                            y2={staffBottomY}
                            stroke="#1f1610"
                            strokeWidth="1.5"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Ligaduras de Prolongamento (Ties) */}
                  {renderedNotesInRow.map((pos, idx) => {
                    if (!pos.n.tieStart) return null;
                    const nextPos = renderedNotesInRow[idx + 1];
                    if (!nextPos) return null;
                    const x1 = pos.nx + 5;
                    const x2 = nextPos.nx - 5;
                    const tieBelow = pos.stepFromE4 <= 4;
                    const y = tieBelow ? pos.ny + 7 : pos.ny - 7;
                    const ctrlY = y + (tieBelow ? 10 : -10);
                    return (
                      <path
                        key={`tie_${pos.item?.id}`}
                        d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${ctrlY} ${x2} ${y}`}
                        fill="none"
                        stroke="#1f1610"
                        strokeWidth="1.8"
                      />
                    );
                  })}

                  {/* Ligaduras de Expressão entre 2 compassos (slurStart -> slurEnd) */}
                  {rowMeasures.map((mObj, mColIdx) => {
                    if (typeof mObj.slurStart !== 'number') return null;
                    const nextMeasureObj = rowMeasures[mColIdx + 1];
                    if (!nextMeasureObj || typeof nextMeasureObj.slurEnd !== 'number') return null;

                    const startNotePos = renderedNotesInRow.find(
                      (p) => p.measureNumber === mObj.measure && p.nIdx === mObj.slurStart
                    );
                    const endNotePos = renderedNotesInRow.find(
                      (p) =>
                        p.measureNumber === nextMeasureObj.measure &&
                        p.nIdx === nextMeasureObj.slurEnd
                    );
                    if (!startNotePos || !endNotePos) return null;

                    const avgStep = (startNotePos.stepFromE4 + endNotePos.stepFromE4) / 2;
                    const slurBelow = avgStep <= 3.5;
                    const x1 = startNotePos.nx;
                    const x2 = endNotePos.nx;
                    const y1 = slurBelow ? startNotePos.ny + 11 : startNotePos.ny - 11;
                    const y2 = slurBelow ? endNotePos.ny + 11 : endNotePos.ny - 11;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2 + (slurBelow ? 22 : -22);

                    return (
                      <path
                        key={`slur_${mObj.measure}`}
                        d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                        fill="none"
                        stroke="#37291d"
                        strokeWidth="1.6"
                      />
                    );
                  })}

                  {/* Ligaduras de Expressão dentro do mesmo compasso (localSlurs) */}
                  {rowMeasures.map((mObj) => {
                    if (!Array.isArray(mObj.localSlurs)) return null;
                    return mObj.localSlurs.map(([sIdx, eIdx], lIdx) => {
                      const startNotePos = renderedNotesInRow.find(
                        (p) => p.measureNumber === mObj.measure && p.nIdx === sIdx
                      );
                      const endNotePos = renderedNotesInRow.find(
                        (p) => p.measureNumber === mObj.measure && p.nIdx === eIdx
                      );
                      if (!startNotePos || !endNotePos) return null;

                      const avgStep = (startNotePos.stepFromE4 + endNotePos.stepFromE4) / 2;
                      const slurBelow = avgStep <= 3.5;
                      const x1 = startNotePos.nx;
                      const x2 = endNotePos.nx;
                      const y1 = slurBelow ? startNotePos.ny + 10 : startNotePos.ny - 10;
                      const y2 = slurBelow ? endNotePos.ny + 10 : endNotePos.ny - 10;
                      const midX = (x1 + x2) / 2;
                      const midY = (y1 + y2) / 2 + (slurBelow ? 15 : -15);

                      return (
                        <path
                          key={`localslur_${mObj.measure}_${lIdx}`}
                          d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                          fill="none"
                          stroke="#37291d"
                          strokeWidth="1.5"
                        />
                      );
                    });
                  })}

                  {/* Grupos de Colcheias Unidas por Barra (Beams de 3 colcheias nos compassos compostos) */}
                  {(() => {
                    const beamGroups = [];
                    let currentGroup = [];
                    renderedNotesInRow.forEach((pos) => {
                      if (pos.n.beam === 'start') {
                        currentGroup = [pos];
                      } else if (pos.n.beam === 'mid' && currentGroup.length > 0) {
                        currentGroup.push(pos);
                      } else if (pos.n.beam === 'end' && currentGroup.length > 0) {
                        currentGroup.push(pos);
                        beamGroups.push(currentGroup);
                        currentGroup = [];
                      }
                    });

                    return beamGroups.map((group) => {
                      const avgStep =
                        group.reduce((acc, p) => acc + p.stepFromE4, 0) / group.length;
                      const stemUp = avgStep < 4;
                      const first = group[0];
                      const last = group[group.length - 1];
                      const x1 = stemUp ? first.nx + 6 : first.nx - 6;
                      const x2 = stemUp ? last.nx + 6 : last.nx - 6;

                      // Calcula altura da barra garantindo haste mínima de 26px para todas as notas do grupo
                      const rawY1 = stemUp ? first.ny - 30 : first.ny + 30;
                      const rawY2 = stemUp ? last.ny - 30 : last.ny + 30;
                      const slope = x2 !== x1 ? Math.max(-0.22, Math.min(0.22, (rawY2 - rawY1) / (x2 - x1))) : 0;
                      let baseY1 = rawY1;

                      group.forEach((p) => {
                        const sx = stemUp ? p.nx + 6 : p.nx - 6;
                        const beamYAtNode = baseY1 + slope * (sx - x1);
                        if (stemUp) {
                          const minAllowedY = p.ny - 25;
                          if (beamYAtNode > minAllowedY) {
                            baseY1 -= beamYAtNode - minAllowedY;
                          }
                        } else {
                          const maxAllowedY = p.ny + 25;
                          if (beamYAtNode < maxAllowedY) {
                            baseY1 += maxAllowedY - beamYAtNode;
                          }
                        }
                      });

                      const y1 = baseY1;
                      const y2 = baseY1 + slope * (x2 - x1);

                      // Sub-segmentos de semicolcheias ('s') dentro do grupo para desenhar a 2ª barra (dupla barra de semicolcheia)
                      const sixteenthSubGroups = [];
                      let currSub = [];
                      group.forEach((p) => {
                        if (p.n.type === 's') {
                          currSub.push(p);
                        } else if (currSub.length > 0) {
                          sixteenthSubGroups.push(currSub);
                          currSub = [];
                        }
                      });
                      if (currSub.length > 0) sixteenthSubGroups.push(currSub);

                      return (
                        <g key={`beam_${first.item?.id}`}>
                          {/* Hastes das notas do grupo conectadas exatamente na barra */}
                          {group.map((p) => {
                            const sx = stemUp ? p.nx + 6 : p.nx - 6;
                            const sy2 = y1 + slope * (sx - x1);
                            const isNoteActive = activeVisualNote?.id === p.item?.id;
                            return (
                              <line
                                key={`beamstem_${p.item?.id}`}
                                x1={sx}
                                y1={p.ny}
                                x2={sx}
                                y2={sy2}
                                stroke={isNoteActive ? '#ea580c' : '#18120d'}
                                strokeWidth="1.8"
                              />
                            );
                          })}
                          {/* 1ª Barra grossa principal (beam) ligando o grupo */}
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#18120d"
                            strokeWidth="4.0"
                            strokeLinecap="butt"
                          />
                          {/* 2ª Barra paralela para semicolcheias ('s') */}
                          {sixteenthSubGroups.map((sub, sIdx) => {
                            const sFirst = sub[0];
                            const sLast = sub[sub.length - 1];
                            const sx1 = stemUp ? sFirst.nx + 6 : sFirst.nx - 6;
                            const isLastInGroup = group[group.length - 1] === sFirst;
                            const sx2 =
                              sub.length > 1
                                ? stemUp
                                  ? sLast.nx + 6
                                  : sLast.nx - 6
                                : isLastInGroup
                                ? sx1 - 7
                                : sx1 + 7;
                            const offset = stemUp ? 5.6 : -5.6;
                            const sy1 = y1 + slope * (sx1 - x1) + offset;
                            const sy2 = y1 + slope * (sx2 - x1) + offset;
                            return (
                              <line
                                key={`subbeam_${first.item?.id}_${sIdx}`}
                                x1={sx1}
                                y1={sy1}
                                x2={sx2}
                                y2={sy2}
                                stroke="#18120d"
                                strokeWidth="3.6"
                                strokeLinecap="butt"
                              />
                            );
                          })}
                        </g>
                      );
                    });
                  })()}

                  {/* Desenho de cada Nota e Pausa */}
                  {renderedNotesInRow.map((pos) => {
                    const { n, item, nx, ny, stepFromE4 } = pos;
                    const isNoteActive = activeVisualNote?.id === item?.id;
                    const noteColor = isNoteActive ? '#ea580c' : '#18120d';

                    // Pausas de semínima (r4) e colcheia (r8)
                    if (n.isRest) {
                      const restY = staffTopY + 2 * lineSpacing;
                      return (
                        <g
                          key={item.id}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => handleNoteClick(item, e)}
                        >
                          {isNoteActive && (
                            <circle
                              cx={nx}
                              cy={restY}
                              r={13}
                              fill="rgba(234, 88, 12, 0.16)"
                            />
                          )}
                          {n.type === 'r4' ? (
                            /* Símbolo gráfico de pausa de semínima */
                            <path
                              d={`M ${nx - 2} ${restY - 11} L ${nx + 3} ${restY - 5} L ${nx - 3} ${restY + 1} L ${nx + 2} ${restY + 6} Q ${nx - 4} ${restY + 7} ${nx - 2} ${restY + 11}`}
                              fill="none"
                              stroke={noteColor}
                              strokeWidth="2.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : n.type === 'r16' ? (
                            /* Símbolo gráfico de pausa de semicolcheia */
                            <>
                              <circle cx={nx - 1} cy={restY - 6} r={2.2} fill={noteColor} />
                              <circle cx={nx - 3} cy={restY + 1} r={2.2} fill={noteColor} />
                              <path
                                d={`M ${nx - 1} ${restY - 6} Q ${nx + 4} ${restY - 4} ${nx + 4} ${restY - 9} L ${nx - 3} ${restY + 11}`}
                                fill="none"
                                stroke={noteColor}
                                strokeWidth="1.9"
                                strokeLinecap="round"
                              />
                            </>
                          ) : (
                            /* Símbolo gráfico de pausa de colcheia */
                            <>
                              <circle cx={nx - 2} cy={restY - 4} r={2.6} fill={noteColor} />
                              <path
                                d={`M ${nx - 2} ${restY - 4} Q ${nx + 3} ${restY - 2} ${nx + 3} ${restY - 7} L ${nx - 2} ${restY + 9}`}
                                fill="none"
                                stroke={noteColor}
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </>
                          )}
                        </g>
                      );
                    }

                    const isWholeHead = n.type === 'wd' || n.type === 'w'; // Semibreve (cabeça aberta e sem haste)
                    const isOpenHead = n.type === 'hd' || n.type === 'h' || isWholeHead; // Mínima ou semibreve têm cabeça aberta (branca)
                    const stemUp = stepFromE4 < 4; // Notas abaixo de B4 têm haste para cima; B4+ para baixo
                    const stemX = stemUp ? nx + 6 : nx - 6;
                    const stemY1 = ny;
                    const stemY2 = stemUp ? ny - 31 : ny + 31;

                    return (
                      <g
                        key={item.id}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => handleNoteClick(item, e)}
                      >
                        {/* Halo pulsante na nota que está tocando agora */}
                        {isNoteActive && (
                          <circle
                            cx={nx}
                            cy={ny}
                            r={15}
                            fill="rgba(234, 88, 12, 0.2)"
                            stroke="#ea580c"
                            strokeWidth="1.5"
                          />
                        )}

                        {/* 1ª linha suplementar inferior para C4, B3, A3 e G3 */}
                        {(n.pitch === 'C4' || n.pitch === 'B3' || n.pitch === 'A3' || n.pitch === 'G3') && (
                          <line
                            x1={nx - 11}
                            y1={staffBottomY + lineSpacing}
                            x2={nx + 11}
                            y2={staffBottomY + lineSpacing}
                            stroke={noteColor}
                            strokeWidth="1.6"
                          />
                        )}

                        {/* 2ª linha suplementar inferior para A3 e G3 */}
                        {(n.pitch === 'A3' || n.pitch === 'G3') && (
                          <line
                            x1={nx - 11}
                            y1={staffBottomY + 2 * lineSpacing}
                            x2={nx + 11}
                            y2={staffBottomY + 2 * lineSpacing}
                            stroke={noteColor}
                            strokeWidth="1.6"
                          />
                        )}

                        {/* 1ª linha suplementar superior para A5 */}
                        {n.pitch === 'A5' && (
                          <line
                            x1={nx - 11}
                            y1={staffTopY - lineSpacing}
                            x2={nx + 11}
                            y2={staffTopY - lineSpacing}
                            stroke={noteColor}
                            strokeWidth="1.6"
                          />
                        )}

                        {/* Acidente musical (#, b, bequadro) */}
                        {n.accidental && (
                          <text
                            x={nx - 13}
                            y={ny + 4.5}
                            textAnchor="middle"
                            fontSize="15"
                            fontWeight="700"
                            fill={noteColor}
                            fontFamily="serif"
                          >
                            {n.accidental === '#' ? '♯' : n.accidental === 'b' ? '♭' : '♮'}
                          </text>
                        )}

                        {/* Haste individual (somente para notas que não fazem parte de barra de colcheias e não são semibreve) */}
                        {!n.beam && !isWholeHead && (
                          <line
                            x1={stemX}
                            y1={stemY1}
                            x2={stemX}
                            y2={stemY2}
                            stroke={noteColor}
                            strokeWidth="1.8"
                          />
                        )}

                        {/* Colchete individual (flag) quando for colcheia isolada sem barra ('e' && !n.beam) */}
                        {n.type === 'e' && !n.beam && (
                          <path
                            d={
                              stemUp
                                ? `M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 + 7} ${stemX + 6} ${stemY2 + 17}`
                                : `M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 - 7} ${stemX + 6} ${stemY2 - 17}`
                            }
                            fill="none"
                            stroke={noteColor}
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Cabeça da nota (aberta para mínima pontuada, preenchida para semínima/colcheia) */}
                        <ellipse
                          cx={nx}
                          cy={ny}
                          rx={6.8}
                          ry={4.8}
                          transform={`rotate(-18 ${nx} ${ny})`}
                          fill={isOpenHead ? '#ffffff' : noteColor}
                          stroke={noteColor}
                          strokeWidth={isOpenHead ? '2.2' : '1.2'}
                        />

                        {/* Ponto de aumento (simples ou duplo) */}
                        {n.dotted && (
                          <circle
                            cx={nx + 11.5}
                            cy={stepFromE4 % 2 === 0 ? ny - 3 : ny}
                            r={2.3}
                            fill={noteColor}
                          />
                        )}
                        {n.doubleDotted && (
                          <circle
                            cx={nx + 17}
                            cy={stepFromE4 % 2 === 0 ? ny - 3 : ny}
                            r={2.3}
                            fill={noteColor}
                          />
                        )}

                        {/* Nome da nota (Solfejo) abaixo para guiar o estudo */}
                        {showSolfegeNames && (
                          <text
                            x={nx}
                            y={staffBottomY + 34}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight={isNoteActive ? '800' : '600'}
                            fill={isNoteActive ? '#ea580c' : '#6b563e'}
                            fontFamily="system-ui, sans-serif"
                          >
                            {n.solfege}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      {/* Renderiza os controles do player da barra inferior se passados */}
      <div onClick={(e) => e.stopPropagation()}>{playerControls}</div>
    </div>
  );
}
