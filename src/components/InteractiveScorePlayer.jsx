import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Volume2, VolumeX, Music, Minus, Plus, Timer } from 'lucide-react';

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
  const hasDoubleSharp = pitch.includes('x');
  const hasDoubleFlat = pitch.includes('bb');
  const hasSharp = !hasDoubleSharp && pitch.includes('#');
  const hasFlat = !hasDoubleFlat && pitch.includes('b');
  const hasNatural = /^[A-G]n\d/.test(pitch);
  const basePitch = pitch.replace(/[#bnx]/g, '');
  const info = PITCH_INFO[basePitch] || { solfege: 'Dó', midi: 60 };
  const midiOffset = hasDoubleSharp ? 2 : hasDoubleFlat ? -2 : hasSharp ? 1 : hasFlat ? -1 : 0;
  const accidental =
    extra.accidental ?? (hasDoubleSharp ? 'x' : hasDoubleFlat ? 'bb' : hasSharp ? '#' : hasFlat ? 'b' : hasNatural ? 'n' : null);
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
const t3 = (p1, p2, p3) => [
  n(p1, 'e', { beam: 'start', eighthDur: 2 / 3, tuplet: 3 }),
  n(p2, 'e', { beam: 'mid', eighthDur: 2 / 3, tuplet: 3 }),
  n(p3, 'e', { beam: 'end', eighthDur: 2 / 3, tuplet: 3 })
];
const ts3 = (p1, p2, p3) => [
  n(p1, 's', { beam: 'start', eighthDur: 1 / 3, tuplet: 3 }),
  n(p2, 's', { beam: 'mid', eighthDur: 1 / 3, tuplet: 3 }),
  n(p3, 's', { beam: 'end', eighthDur: 1 / 3, tuplet: 3 })
];
const s6 = (p1, p2, p3, p4, p5, p6) => [
  n(p1, 's', { beam: 'start', eighthDur: 1 / 3, tuplet: 6 }),
  n(p2, 's', { beam: 'mid', eighthDur: 1 / 3, tuplet: 6 }),
  n(p3, 's', { beam: 'mid', eighthDur: 1 / 3, tuplet: 6 }),
  n(p4, 's', { beam: 'mid', eighthDur: 1 / 3, tuplet: 6 }),
  n(p5, 's', { beam: 'mid', eighthDur: 1 / 3, tuplet: 6 }),
  n(p6, 's', { beam: 'end', eighthDur: 1 / 3, tuplet: 6 })
];
const d2 = (p1, p2) => [
  n(p1, 'e', { beam: 'start', eighthDur: 1.5, tuplet: 2 }),
  n(p2, 'e', { beam: 'end', eighthDur: 1.5, tuplet: 2 })
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
  { measure: 2, slurEnd: 2, notes: [n('A4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), ...b3('F4', 'G4', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 4, slurEnd: 2, notes: [n('C5', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [...b3('C5', 'D5', 'E5'), n('A4', 'hd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [...b3('G4', 'A4', 'B4'), n('C5', 'hd')] },
  { measure: 7, slurStart: 0, notes: [...b3('C5', 'D5', 'E5'), ...b3('F5', 'E5', 'D5'), ...b3('C5', 'D5', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd'), ...b3('B4', 'A4', 'G4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 10, slurEnd: 2, notes: [n('F4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), ...b3('G4', 'F4', 'E4'), ...b3('D4', 'C4', 'B3')] },
  { measure: 12, slurEnd: 2, notes: [n('D4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [...b3('E4', 'F4', 'G4'), n('A4', 'hd')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...b3('F4', 'G4', 'A4'), n('B4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...b3('B4', 'C5', 'D5'), ...b3('C5', 'B4', 'A4'), ...b3('G4', 'A4', 'G4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * EXERCÍCIO Nº 11 — 4ª Série (9/8, 16 compassos)
 */
export const POZZOLI_SERIE4_EX11_MEASURES = [
  { measure: 1, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'q'), n('E4', 'e'), n('F4', 'q'), n('A4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'q'), n('A4', 'e'), n('B4', 'q'), n('D5', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('F5', 'qd', { tieStart: true }), n('F5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), ...b3('G4', 'F4', 'E4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
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
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'qd'), n('E4', 'qd'), n('D4', 'qd')] },
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
  { measure: 3, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'qd', { tieStop: true }), ...b3('D4', 'F4', 'E4')] },
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
  { measure: 15, slurStart: 0, notes: [n('D4', 'hd', { tieStart: true }), n('D4', 'qd', { tieStop: true }), ...b3('E4', 'F4', 'E4')] },
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
  { measure: 10, localSlurs: [[0, 7]], notes: [...b3('A4', 'B4', 'A4'), ...b3('G4', 'A4', 'B4'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 3], [6, 9]], notes: [...b3('G4', 'A4', 'F4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...b3('F4', 'G4', 'E4'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 7]], notes: [...b3('E4', 'F4', 'E4'), ...b3('D4', 'E4', 'F4'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
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
  { measure: 15, slurStart: 0, notes: [...b2('G4', 'A4'), ...b2('B4', 'D5')] },
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
  { measure: 7, slurStart: 0, notes: [n('B4', 'qd'), n('C5', 'e'), ...b2('A4', 'B4')] },
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
  { measure: 16, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('C4', 'q'), n('REST', 'r4')] }
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
  { measure: 4, localSlurs: [[0, 3]], notes: [...b2('C5', 'G4'), ...b2('A4', 'D5'), n('C5', 'q'), n('REST', 'r4')] },
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
  { measure: 1, localSlurs: [[0, 1]], notes: [n('C4', 'qd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('C4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
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
  { measure: 9, localSlurs: [[0, 3]], notes: [...b3('A4', 'G4', 'E4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [...b3('B4', 'A4', 'B4'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b3('B4', 'A4', 'B4'), ...b3('G4', 'A4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [...b3('G4', 'E4', 'F4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...b3('F4', 'D4', 'E4'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b3('G4', 'E4', 'F4'), ...b3('D4', 'E4', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 4 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'q'), ...s2('A4', 'F4'), n('G4', 'q'), ...s2('A4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b2('C4', 'D4'), ...b3('G4', 'E4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), ...s2('A4', 'F4'), n('G4', 'q'), ...s2('A4', 'F4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b2('D4', 'E4'), ...b3('A4', 'F4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [n('C5', 'q'), ...s2('D5', 'B4'), n('C5', 'qd')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [n('B4', 'q'), ...s2('C5', 'A4'), n('B4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), ...s2('B4', 'G4'), n('A4', 'q'), ...s2('B4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b2('G4', 'F4'), ...b3('E4', 'F4', 'D4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('E4', 'qd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b2('F4', 'E4'), ...b3('D4', 'E4', 'B3')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
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
  { measure: 1, slurStart: 0, notes: [n('G4', 'hd'), ...b3('F4', 'A4', 'G4')] },
  { measure: 2, slurEnd: 2, notes: [n('E4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'hd'), ...b3('E4', 'B4', 'G4')] },
  { measure: 4, slurEnd: 2, notes: [n('F4', 'qd'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('G4', 'q'), n('C5', 'e'), n('B4', 'q'), n('A4', 'e'), n('D5', 'qd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('G4', 'q'), n('C5', 'e'), n('B4', 'q'), n('A4', 'e'), n('D5', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'hd'), ...b3('A4', 'B4', 'D5')] },
  { measure: 8, slurEnd: 0, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'hd'), ...b3('D5', 'C5', 'D5')] },
  { measure: 10, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'hd'), ...b3('C5', 'B4', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 13, localSlurs: [[0, 5]], notes: [n('E4', 'q'), n('F4', 'e'), n('A4', 'q'), n('G4', 'e'), n('B4', 'qd')] },
  { measure: 14, localSlurs: [[0, 5]], notes: [n('F4', 'q'), n('G4', 'e'), n('B4', 'q'), n('A4', 'e'), n('C5', 'qd')] },
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
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), n('F4', 'q'), n('A4', 'e'), n('E4', 'q'), n('G4', 'e'), n('D4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q'), n('C4', 'e'), n('G4', 'qd'), n('F4', 'qd'), n('B4', 'qd')] },
  { measure: 6, slurEnd: 0, notes: [n('A4', 'wd')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('E4', 'e'), n('A4', 'q'), n('G4', 'e'), n('B4', 'q'), n('A4', 'e'), n('C5', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'wd')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), n('D5', 'q'), n('E5', 'e'), n('D5', 'q'), n('E5', 'e'), n('C5', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), n('G4', 'q'), n('B4', 'e'), n('F4', 'q'), n('A4', 'e'), n('E4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'qd'), ...b3('G4', 'F4', 'E4'), n('C4', 'qd')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'q'), n('F4', 'e'), n('F4', 'q'), n('E4', 'e'), n('E4', 'q'), n('D4', 'e'), n('D4', 'q'), n('C4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 7ª SÉRIE — EXERCÍCIO Nº 10 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE7_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true }), ...b3('A4', 'G4', 'E4')] },
  { measure: 2, slurEnd: 2, notes: [n('F4', 'hd'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true }), ...b3('G4', 'F4', 'C4')] },
  { measure: 4, slurEnd: 2, notes: [n('E4', 'hd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [...b3('C4', 'B3', 'C4'), n('G4', 'hd'), n('E4', 'qd')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [...b3('F4', 'E4', 'F4'), n('A4', 'hd'), n('G4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...b3('G4', 'F4', 'E4'), ...b3('A4', 'G4', 'F4'), ...b3('B4', 'A4', 'G4'), ...b3('C5', 'B4', 'A4')] },
  { measure: 8, slurEnd: 2, notes: [n('D5', 'hd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true }), ...b3('D5', 'C5', 'G4')] },
  { measure: 10, slurEnd: 2, notes: [n('C5', 'hd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd'), ...b3('E5', 'D5', 'G4'), n('D5', 'qd'), ...b3('E5', 'D5', 'G4')] },
  { measure: 12, slurEnd: 2, notes: [n('D5', 'hd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 4]], notes: [...b3('F4', 'E4', 'F4'), n('A4', 'hd'), n('F4', 'qd')] },
  { measure: 14, localSlurs: [[0, 4]], notes: [...b3('E4', 'D4', 'E4'), n('A4', 'hd'), n('E4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [...b3('D4', 'C4', 'B3'), ...b3('F4', 'E4', 'C4'), ...b3('G4', 'F4', 'E4'), ...b3('A4', 'G4', 'F4')] },
  { measure: 16, slurEnd: 2, notes: [n('E4', 'hd'), n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
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
  { measure: 11, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('E4', 'G#4')] },
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
  { measure: 1, slurStart: 0, notes: [...eds('A4', 'G#4'), ...eds('A4', 'G#4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...eds('A4', 'G#4'), ...eds('A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [...eds('A4', 'B4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [...eds('A4', 'Gn4'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('F4', 'A4'), ...b2('G4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...eds('E4', 'F#4'), ...eds('G#4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...eds('E4', 'F4'), ...eds('E4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b2('C5', 'B4'), ...b2('A4', 'G#4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('A4', 'Gn4'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), ...b2('F#4', 'G#4')] },
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
  { measure: 7, slurStart: 0, notes: [...b2('F4', 'A4'), ...b2('G4', 'F4'), ...b2('C4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'e'), ...b2('B4', 'G#4')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [...b2('E4', 'F4'), ...b2('E4', 'G#4'), ...b2('B4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...b2('D5', 'C5'), ...b2('B4', 'G#4'), ...b2('A4', 'Gn4')] },
  { measure: 14, slurEnd: 2, notes: [...b2('F4', 'E4'), n('D4', 'q', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), ...b2('F#4', 'G#4'), ...b2('C5', 'B4')] },
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
  { measure: 2, localSlurs: [[0, 1]], notes: [n('E4', 'h'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), ...b2('F#4', 'G#4'), n('C5', 'q'), ...b2('B4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'h'), n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G#4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G#4', 'q'), ...b2('E4', 'F#4'), n('A4', 'q'), ...b2('D5', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
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
  { measure: 3, slurStart: 0, notes: [...b2('E4', 'F#4'), ...b2('G#4', 'A4'), ...b2('C5', 'B4'), ...b2('Gn4', 'Fn4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'q'), ...b2('E4', 'F#4'), ...b2('G#4', 'A4'), ...b2('C5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...b2('A4', 'G#4'), ...b2('F#4', 'G#4'), ...b2('A4', 'B4'), ...b2('C5', 'D5')] },
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
  { measure: 1, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('C5', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('Gn4', 'e'), n('Fn4', 'q'), n('G4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('E4', 'q'), n('F#4', 'e'), n('A4', 'qd'), n('G#4', 'qd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('E4', 'q'), n('F#4', 'e'), n('C5', 'qd'), n('B4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'hd', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('C5', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e'), n('C5', 'q'), n('B4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b3('E5', 'D5', 'C5'), ...b3('B4', 'A4', 'G#4'), ...b3('A4', 'Gn4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('F4', 'e'), n('G#4', 'q'), n('E4', 'e'), n('G#4', 'q'), n('F4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 8ª SÉRIE — EXERCÍCIO Nº 14 (9/8, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE8_EX14_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A3', 'hd'), ...s4('C4', 'D4', 'E4', 'F#4'), ...s2('G#4', 'A4')] },
  { measure: 2, slurEnd: 2, notes: [n('B4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'hd'), ...s4('E4', 'F#4', 'G#4', 'A4'), ...s2('B4', 'C5')] },
  { measure: 4, slurEnd: 2, notes: [n('D5', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [...b3('G#4', 'A4', 'B4'), n('E4', 'hd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [...b3('F#4', 'G#4', 'A4'), n('E4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('G#4', 'q'), n('E4', 'e'), n('Gn4', 'q'), n('E4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'qd'), n('E5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'hd'), ...s4('D5', 'C5', 'B4', 'G#4'), ...s2('A4', 'F4')] },
  { measure: 10, slurEnd: 2, notes: [n('C4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'hd'), ...s4('G#4', 'F4', 'E4', 'D4'), ...s2('C4', 'B3')] },
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
  { measure: 1, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('F4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('F#4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('E5', 'qd'), ...b3('D5', 'C5', 'B4'), n('A4', 'hd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('E5', 'qd'), ...b3('D5', 'C5', 'B4'), n('G#4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'q'), n('C5', 'e'), n('B4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('E4', 'e'), n('Gn4', 'q'), n('F4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('F4', 'e'), n('E4', 'q'), n('C5', 'e'), n('G#4', 'q'), n('B4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 6]], notes: [...b3('E5', 'D5', 'C5'), ...b3('B4', 'G#4', 'A4'), n('B4', 'hd')] },
  { measure: 14, localSlurs: [[0, 6]], notes: [...b3('D5', 'C5', 'B4'), ...b3('G#4', 'F#4', 'G#4'), n('A4', 'hd')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'e'), n('Gn4', 'q'), n('Fn4', 'e'), n('E4', 'q'), n('F#4', 'e'), n('G#4', 'q'), n('B4', 'e')] },
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
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), ...b2('E4', 'F#4')] },
  { measure: 10, slurEnd: 1, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), ...b2('C4', 'D4')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), ...b2('A3', 'B3')] },
  { measure: 14, slurEnd: 4, notes: [...s4('C4', 'B3', 'C4', 'D4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('G#3', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('A3', 'q', { tieStart: true }), n('A3', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 4 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE9_EX4_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'h'), ...s4('A4', 'B4', 'C5', 'D5')] },
  { measure: 2, slurEnd: 1, notes: [n('E5', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('D5', 'qd'), n('F4', 'e')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('F4', 'h'), ...s4('G4', 'A4', 'B4', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('B4', 'qd'), n('F4', 'e')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('B3', 'h'), ...s4('C4', 'D4', 'E4', 'F4')] },
  { measure: 10, slurEnd: 2, notes: [...b2('G4', 'B3'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('C4', 'h'), ...s4('D4', 'E4', 'F4', 'G4')] },
  { measure: 12, slurEnd: 2, notes: [...b2('A4', 'C4'), n('D4', 'q'), n('REST', 'r4')] },
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
  { measure: 2, localSlurs: [[0, 1]], notes: [n('B4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('B4', 'F4', 'D4', 'F4', 'B4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('A4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('A4', 'E4', 'C4', 'E4', 'A4')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'q'), n('B3', 'q'), n('G4', 'q')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('C4', 'E4', 'B4', 'E4', 'C4')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('E4', 'G4', 'C5', 'G4', 'E4')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('E5', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('F4', 'A4', 'D5', 'A4', 'F4')] },
  { measure: 14, localSlurs: [[1, 5]], notes: [n('REST', 'r8'), ...b5('E4', 'G4', 'C5', 'G4', 'E4')] },
  { measure: 15, localSlurs: [[0, 2]], notes: [n('D4', 'q'), n('B4', 'q'), n('D4', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('C5', 'q'), n('REST', 'r4')] }
];

/**
 * 9ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos — Modo menor)
 */
export const POZZOLI_SERIE9_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [...eds('A4', 'B4'), ...eds('C5', 'D5'), ...eds('E5', 'F5')] },
  { measure: 2, slurEnd: 1, notes: [n('E5', 'q'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 3, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('C5', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [...eds('E4', 'F#4'), ...eds('G#4', 'A4'), ...eds('B4', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 1]], notes: [n('C4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('G#4', 'q'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [...eds('Gn4', 'F4'), ...eds('E4', 'D4'), ...eds('C4', 'B3')] },
  { measure: 10, slurEnd: 1, notes: [n('E4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [...eds('A4', 'G#4'), ...eds('F4', 'E4'), ...eds('D4', 'C4')] },
  { measure: 12, slurEnd: 1, notes: [n('D4', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...eds('D5', 'C5'), ...eds('B4', 'A4'), ...eds('G4', 'F4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('D5', 'q'), n('C5', 'q')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
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
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'h'), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 2, slurEnd: 0, notes: [n('F5', 'q'), n('A4', 'q'), n('G#4', 'h')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'h'), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 4, slurEnd: 0, notes: [n('F5', 'q'), n('A4', 'q'), n('G#4', 'h')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('G#4', 'h'), ...s4('A4', 'B4', 'C5', 'D5')] },
  { measure: 6, slurEnd: 0, notes: [n('E5', 'q'), n('G4', 'q'), n('F4', 'q'), n('D5', 'q')] },
  { measure: 7, localSlurs: [[0, 2]], notes: [n('C5', 'q'), n('D4', 'q'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'h'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'q'), n('E4', 'q'), n('D4', 'q'), n('B4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'h'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'q'), n('E4', 'q'), n('D4', 'q'), n('B4', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'hd'), ...s4('B4', 'C5', 'D5', 'E5')] },
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
  { measure: 13, slurStart: 0, notes: [n('Fn4', 'q'), n('E4', 'q'), ...eds('D5', 'C5')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('B3', 'q'), n('A4', 'q'), ...eds('G#4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q'), n('A3', 'q'), n('REST', 'r4')] }
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
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'h'), ...b2('B3', 'B4')] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'h'), n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('D4', 'h'), ...b2('C4', 'C5')] },
  { measure: 4, slurEnd: 2, notes: [n('B4', 'h'), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1], [2, 3]], notes: [n('G4', 'q'), n('E5', 'h'), ...b2('D5', 'G4')] },
  { measure: 6, localSlurs: [[0, 1], [2, 3]], notes: [n('F4', 'q'), n('D5', 'h'), ...b2('C5', 'F4')] },
  { measure: 7, localSlurs: [[0, 1], [2, 3]], notes: [n('E4', 'q'), n('C5', 'h'), ...b2('B4', 'E4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('A4', 'h'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'h'), ...eds('B3', 'B4')] },
  { measure: 10, slurEnd: 2, notes: [n('A4', 'h'), n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D4', 'h'), ...eds('C4', 'C5')] },
  { measure: 12, slurEnd: 2, notes: [n('B4', 'h'), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1], [2, 3]], notes: [n('G4', 'q'), n('E5', 'h'), ...b2('D5', 'F4')] },
  { measure: 14, slurStart: 0, notes: [n('F4', 'q'), n('D5', 'h'), ...b2('C5', 'E4')] },
  { measure: 15, localSlurs: [[0, 2], [3, 5]], notes: [n('D4', 'q'), ...b2('D5', 'C5'), n('E4', 'q'), ...b2('C5', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h'), n('C5', 'q'), n('REST', 'r4')] }
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
  { measure: 4, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('C#4', 'q'), n('D4', 'e')] },
  { measure: 5, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('D4', 'q'), n('A4', 'e')] },
  { measure: 6, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('G4', 'q'), n('B4', 'e')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F4', 'F#4')] },
  { measure: 8, slurEnd: 2, notes: [...b2('G4', 'C5'), n('G4', 'q')] },
  { measure: 9, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('G4', 'q'), n('C5', 'e')] },
  { measure: 10, localSlurs: [[1, 2]], notes: [n('REST', 'r8'), n('C5', 'q'), n('B4', 'e')] },
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
  { measure: 15, slurStart: 0, notes: [n('D4', 'q', { tieStart: true }), ...s4('D4', 'E4', 'C4', 'Bn3')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'h', { tieStart: true }), ...b2('C4', 'E4')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'h', { tieStart: true }), ...b2('C4', 'F4')] },
  { measure: 4, slurEnd: 0, notes: [n('A4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'q', { tieStart: true }), ...s4('C4', 'B3', 'C4', 'D4'), ...s4('E4', 'F4', 'G4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'q', { tieStart: true }), ...b2('F4', 'A4'), ...b2('F#4', 'C5')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...es2('G4', 'Fn4', 'E4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('F4', 'h', { tieStart: true }), ...es2('F4', 'G4', 'Bb4')] },
  { measure: 12, slurEnd: 1, notes: [n('Bb4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'q', { tieStart: true }), ...s4('D4', 'E4', 'F4', 'G4'), ...s4('A4', 'Bn4', 'C5', 'D5')] },
  { measure: 14, slurEnd: 0, notes: [n('E5', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('D5', 'h', { tieStart: true }), ...b2('D5', 'B4')] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C5', 'qdd'), n('B4', 's'), ...eds('C5', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qdd'), n('G#4', 's'), ...eds('A4', 'Gn4')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('E4', 'q', { tieStart: true }), ...es2('E4', 'F4', 'E4'), ...b2('D4', 'A4')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [...eds('D4', 'C4'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 7, localSlurs: [[0, 4]], notes: [n('G4', 'q', { tieStart: true }), ...es2('G4', 'A4', 'G4'), ...b2('F#4', 'C5')] },
  { measure: 8, localSlurs: [[0, 2]], notes: [...eds('G4', 'F#4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qdd'), n('D#5', 's'), ...eds('E5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('E5', 'q'), n('B4', 'q'), ...b2('C5', 'D#5')] },
  { measure: 11, slurStart: 0, notes: [n('Dn5', 'qdd'), n('C#5', 's'), ...eds('D5', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'q'), n('A4', 'q'), ...b2('B4', 'C5')] },
  { measure: 13, slurStart: 0, notes: [n('Bn4', 'q', { tieStart: true }), ...eds('B4', 'A4'), ...s4('G4', 'F4', 'E4', 'D4')] },
  { measure: 14, slurEnd: 1, notes: [n('D4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q', { tieStart: true }), ...eds('E4', 'F4'), ...s4('E4', 'D4', 'C4', 'B3')] },
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
  { measure: 7, notes: [...b2('F4', 'E4'), ...b2('F4', 'G4'), ...b2('A4', 'F#4')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'D5', 'C5'), n('E5', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [...b2('E5', 'A4'), n('B4', 'q'), n('C#5', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('A4', 'B4', 'A4'), n('D5', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 3, notes: [...b2('D5', 'G4'), n('C5', 'q'), n('Bn4', 'q')] },
  { measure: 13, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('G4', 'A4', 'G4'), n('C5', 'q')] },
  { measure: 14, localSlurs: [[1, 4]], notes: [n('REST', 'r8'), ...b3('E4', 'F4', 'E4'), n('A4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D4', 'E4', 'D4'), n('B3', 'q')] },
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
  { measure: 10, slurEnd: 8, notes: [...s4('E5', 'D5', 'C5', 'B4'), ...s4('A4', 'G#4', 'F#4', 'G#4'), n('A4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 12, slurEnd: 8, notes: [...s4('D5', 'C5', 'B4', 'A4'), ...s4('Gn4', 'F#4', 'E4', 'F#4'), n('G4', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true })] },
  { measure: 14, slurEnd: 5, notes: [...b2('G4', 'A4'), ...b2('E4', 'G4'), n('Fn4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qdd'), n('D4', 's'), ...eds('C4', 'B3')] },
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
  { measure: 7, localSlurs: [[0, 2]], notes: [n('D4', 'q'), n('G4', 'h'), n('F#4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('E5', 'h', { tieStart: true })] },
  { measure: 10, slurEnd: 4, notes: [...b2('E5', 'D#5'), ...b2('B4', 'C#5'), n('D5', 'h')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D5', 'q'), n('G4', 'q'), n('Cn5', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 4, notes: [...b2('C5', 'B4'), ...b2('G4', 'A4'), n('B4', 'h')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('D5', 'e'), ...b2('E5', 'D5'), ...b2('A4', 'G4'), ...b2('F4', 'E4')] },
  { measure: 14, slurEnd: 2, notes: [n('E4', 'h'), n('F4', 'q'), n('F#4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('A4', 'G4'), ...b2('Fn4', 'E4'), ...b2('F4', 'D4')] },
  { measure: 16, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 10 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE10_EX10_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...s4('G4', 'E4', 'F4', 'G4'), ...b2('A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...s4('G4', 'E4', 'F4', 'G4'), ...b2('A4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...s4('G4', 'A4', 'G4', 'F4'), ...s4('E4', 'F4', 'G4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'hd'), n('E5', 'q')] },
  { measure: 7, slurStart: 0, notes: [...b2('D5', 'C5'), n('G4', 'q', { tieStart: true }), ...b2('G4', 'A4'), ...b2('G4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'q', { tieStart: true }), ...s4('C5', 'G4', 'A4', 'B4'), ...b2('C5', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('D5', 'q', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'C5'), ...b2('D5', 'B4')] },
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
  { measure: 8, slurEnd: 2, notes: [n('B4', 'hd'), ...b2('C5', 'D5')] },
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
  { measure: 15, slurStart: 0, notes: [n('Gn4', 'h', { tieStart: true }), ...b4('G4', 'A4', 'D5', 'B4')] },
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
  { measure: 13, slurStart: 0, notes: [...b3('C5', 'Bb4', 'A4'), ...b3('G4', 'F4', 'E4', { tieStart: true })] },
  { measure: 14, slurEnd: 3, notes: [...b3('E4', 'F4', 'G4', { tieStopIdx: 0 }), n('C5', 'qd')] },
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
  { measure: 10, notes: [...b3('G4', 'F#4', 'G4'), ...b3('A4', 'G4', 'E4')] },
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
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'q', { tieStop: true }), ...s2('D4', 'C4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b2('C4', 'D4'), ...b3('E4', 'F4', 'F#4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), ...s2('F#4', 'E4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b2('E4', 'F#4'), ...b3('G4', 'C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), ...s2('B4', 'A4'), ...s2('G#4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), ...s2('A4', 'G#4'), ...s2('F#4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b2('A4', 'B4'), ...b3('C#5', 'B4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b2('F4', 'G4'), ...b3('A4', 'G4', 'F4')] },
  { measure: 16, slurEnd: 1, notes: [n('B4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 17 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX17_MEASURES = [
  { measure: 1, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('G#4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'qd', { tieStop: true })] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'q'), n('Gn4', 'e'), n('F4', 'q'), n('E4', 'e'), n('D4', 'q'), n('C4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('B3', 'qd', { tieStart: true }), n('B3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('A4', 'e')] },
  { measure: 6, slurEnd: 2, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'qd', { tieStop: true }), n('B4', 'q'), n('G#4', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'q'), n('E4', 'e'), n('F4', 'q'), n('G4', 'e'), n('A4', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd'), n('C#5', 'qd')] },
  { measure: 10, slurEnd: 2, notes: [n('D5', 'qd'), n('A4', 'hd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q', { tieStop: true }), n('G#4', 'e'), n('A4', 'qd'), n('B4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'qd'), n('Gn4', 'hd')] },
  { measure: 13, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd', { tieStart: true }), ...b3('E4', 'F4', 'F#4')] },
  { measure: 14, notes: [n('A4', 'qd'), n('G4', 'hd', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'q', { tieStop: true }), n('Fn4', 'e'), n('E4', 'qd'), n('A3', 'q'), n('B3', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 18 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX18_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('D4', 'e'), n('E4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'qd', { tieStop: true, tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), ...b3('C4', 'B3', 'C4'), ...b3('D4', 'C4', 'D4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('F#4', 'e'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 6, slurEnd: 2, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'qd', { tieStop: true, tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F#4', 'E4'), ...b3('D4', 'C5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('B4', 'e'), n('C5', 'q'), n('E5', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'qd'), n('C#5', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'Cn5', 'B4'), ...b3('A4', 'G4', 'F#4')] },
  { measure: 12, slurEnd: 2, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'qd', { tieStop: true, tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'Bb4', 'A4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 14, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'qd', { tieStop: true, tieStart: true }), n('G4', 'q', { tieStop: true }), n('D4', 'e')] },
  { measure: 15, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'E4'), ...b3('D4', 'C4', 'Bn3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 19 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX19_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'hd'), n('C5', 'q'), n('G4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'qd', { tieStop: true, tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'hd'), n('D5', 'q'), n('G4', 'e')] },
  { measure: 4, slurEnd: 2, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'qd', { tieStop: true, tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'hd'), n('G#4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('Gn4', 'hd'), n('F#4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('G#4', 'qd', { tieStart: true }), ...b3('G#4', 'F#4', 'E4', { tieStopIdx: 0 }), ...b3('D#4', 'E4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'hd'), n('C5', 'q'), n('G4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G#4', 'hd', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G#4', 'hd'), n('D5', 'q'), n('A4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('Bb4', 'e'), ...b3('A4', 'G4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('Bb4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'E4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 2, notes: [n('C4', 'qd'), n('Bn3', 'qd'), n('C4', 'qd')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 20 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX20_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'hd', { tieStart: true }), ...b3('C4', 'B3', 'C4')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b3('C4', 'B3', 'C4'), ...b3('D4', 'E4', 'F4'), ...b3('G4', 'A4', 'B4')] },
  { measure: 4, slurEnd: 2, notes: [n('C5', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), ...b3('A4', 'G#4', 'A4')] },
  { measure: 6, slurEnd: 2, notes: [n('C5', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('A4', 'G#4', 'A4'), ...b3('B4', 'C5', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 8, slurEnd: 0, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('D4', 'hd', { tieStart: true }), ...b3('D4', 'C#4', 'D4')] },
  { measure: 10, slurEnd: 2, notes: [n('A4', 'qd'), n('F#4', 'qd', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b3('D4', 'C#4', 'D4'), ...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd'), ...b3('C5', 'Bb4', 'A4'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 14, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'qd', { tieStop: true })] },
  { measure: 15, notes: [...b3('G4', 'F4', 'E4', { tieStart: true }), ...b3('E4', 'F4', 'D4', { tieStopIdx: 0, tieStart: true }), ...b3('D4', 'C4', 'Bn3', { tieStopIdx: 0 })] },
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
  { measure: 5, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true }), ...b3('E4', 'F#4', 'G4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 6, slurEnd: 2, notes: [n('C5', 'qd'), n('D5', 'hd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'F4', 'G#4'), ...b3('A4', 'B4', 'C5'), ...b3('D5', 'C5', 'B4'), ...b3('A4', 'E4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'wd', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [n('G4', 'qd', { tieStop: true }), n('F#4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'wd', { tieStart: true })] },
  { measure: 12, slurEnd: 3, notes: [n('G4', 'qd', { tieStop: true }), n('B4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [n('C5', 'qd'), n('B4', 'qd'), n('Bb4', 'qd'), n('A4', 'qd')] },
  { measure: 14, slurStart: 0, notes: [n('C#5', 'qd'), n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 15, notes: [...b3('E5', 'D5', 'C5'), ...b3('B4', 'A4', 'G4'), ...b3('F4', 'E4', 'D4'), ...b3('E4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 22 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX22_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'q', { tieStop: true }), n('D4', 'e'), n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('B4', 'hd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C4', 'q'), n('D4', 'e'), n('E4', 'q'), n('F4', 'e'), n('G4', 'q'), n('A4', 'e')] },
  { measure: 4, slurEnd: 2, notes: [n('Bb4', 'hd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'q', { tieStop: true }), n('E4', 'e'), n('F4', 'q'), n('G4', 'e'), n('A4', 'q'), n('Bn4', 'e')] },
  { measure: 6, slurEnd: 2, notes: [n('C#5', 'hd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'q'), n('E4', 'e'), n('F#4', 'q'), n('G4', 'e'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('C5', 'qd'), n('B4', 'qd'), n('A4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 10, slurEnd: 2, notes: [n('F#5', 'hd'), n('G5', 'qd', { tieStart: true }), n('G5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 12, slurEnd: 0, notes: [n('Fn5', 'qd'), n('E5', 'qd'), n('D5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4'), n('G#4', 'qd', { tieStart: true }), ...b3('G#4', 'A4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4'), n('Gn4', 'qd', { tieStart: true }), ...b3('G4', 'A4', 'B4')] },
  { measure: 16, slurEnd: 2, notes: [n('C5', 'qd'), n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 23 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX23_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'E4', 'G4'), n('A4', 'qd', { tieStart: true }), ...b3('A4', 'E5', 'C5')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'D4', 'F4'), n('G4', 'qd', { tieStart: true }), ...b3('G4', 'D5', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'F4', 'G4'), n('A4', 'hd')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'G4', 'A4'), n('B4', 'hd')] },
  { measure: 7, localSlurs: [[0, 4]], notes: [n('F#4', 'qd', { tieStart: true }), ...b3('F#4', 'G4', 'A4'), n('C5', 'qd'), n('D#4', 'qd')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('D#4', 'hd', { tieStart: true }), n('D#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'G#4', 'A4'), n('B4', 'qd', { tieStart: true }), ...b3('B4', 'E5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'F#4', 'G4'), n('A4', 'qd', { tieStart: true }), ...b3('A4', 'D5', 'C5')] },
  { measure: 12, slurEnd: 2, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'qd', { tieStop: true, tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('G#4', 'e'), n('Gn4', 'q'), n('F4', 'e'), n('E4', 'qd'), n('A4', 'qd')] },
  { measure: 14, slurEnd: 3, notes: [n('G4', 'qd'), n('G4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'D4', 'C4'), n('E4', 'qd', { tieStart: true }), ...b3('E4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 10ª SÉRIE — EXERCÍCIO Nº 24 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE10_EX24_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('C4', 'hd', { tieStart: true }), ...b3('C4', 'B3', 'C4'), ...b3('D4', 'E4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'hd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'q', { tieStop: true }), n('Cn5', 'e'), n('A4', 'q'), n('G#4', 'e')] },
  { measure: 6, slurEnd: 3, notes: [n('A4', 'qd'), n('E4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'q', { tieStop: true }), n('Bb4', 'e'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 8, slurEnd: 2, notes: [n('E4', 'hd'), n('C#4', 'qd', { tieStart: true }), n('C#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D4', 'hd', { tieStart: true }), ...b3('D4', 'C#4', 'D4'), ...b3('E4', 'F4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'hd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'hd', { tieStart: true }), ...b3('D4', 'E4', 'F4'), ...b3('G4', 'A4', 'Bb4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'hd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('Bn4', 'e'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 14, slurEnd: 3, notes: [n('G4', 'qd'), n('A4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'hd', { tieStart: true }), ...b3('F4', 'E4', 'D4'), ...b3('D4', 'C4', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
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
  { measure: 6, notes: [...b2('A4', 'B4'), n('E5', 'q')] },
  { measure: 7, slurEnd: 0, notes: [n('D#5', 'h')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('E5', 'q', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'h', { tieStart: true })] },
  { measure: 10, slurEnd: 2, notes: [n('A4', 'e', { tieStop: true }), n('Bb4', 'e'), n('A4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'h', { tieStart: true })] },
  { measure: 12, notes: [n('G4', 'e', { tieStop: true }), n('A4', 'e'), n('F4', 'e'), n('D#4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('E4', 'e'), n('REST', 'r8'), n('C5', 'q', { tieStart: true })] },
  { measure: 14, slurEnd: 3, notes: [...b2('C5', 'B4'), ...b2('A4', 'G4')] },
  { measure: 15, slurStart: 0, notes: [n('G#4', 'h', { tieStart: true })] },
  { measure: 16, slurEnd: 1, notes: [n('G#4', 'e', { beam: 'start', tieStop: true }), n('B4', 'e', { beam: 'end' }), n('A4', 'e'), n('REST', 'r8')] }
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
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 2, notes: [n('E4', 'ed', { beam: 'start', tieStop: true }), n('F#4', 's', { beam: 'end' }), n('G#4', 'e'), n('REST', 'r8')] },
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
  { measure: 14, notes: [n('G#4', 'ed', { beam: 'start', tieStop: true }), n('B4', 's', { beam: 'end' }), n('C5', 'q', { tieStart: true })] },
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
  { measure: 12, slurEnd: 3, notes: [n('D5', 'e', { beam: 'start', tieStart: true }), n('D5', 's', { beam: 'mid', tieStop: true }), n('E5', 's', { beam: 'end' }), n('D5', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...s2('D5', 'Cn5'), ...s4('B4', 'A4', 'G4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'q'), n('A4', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'e', { beam: 'start', tieStop: true }), n('G#4', 's', { beam: 'mid' }), n('F#4', 's', { beam: 'end' }), ...eds('G#4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 5 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX5_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd'), ...s2('G#4', 'A4'), ...s4('B4', 'A4', 'G4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd'), ...s2('G#4', 'A4'), ...s4('B4', 'A4', 'G4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'qd'), ...s2('G#4', 'A4'), ...s4('B4', 'A4', 'G4', 'A4')] },
  { measure: 6, notes: [n('E5', 'hd', { tieStart: true })] },
  { measure: 7, notes: [n('E5', 'e', { beam: 'start', tieStop: true }), n('D5', 's', { beam: 'mid' }), n('C5', 's', { beam: 'end' }), ...s4('B4', 'A4', 'Gn4', 'F4'), ...s4('E4', 'D4', 'C4', 'B3')] },
  { measure: 8, slurEnd: 0, notes: [n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd'), ...s2('C5', 'D5'), ...s4('E5', 'D5', 'C5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('Bb4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), ...s2('G#4', 'A4'), ...s4('Bb4', 'A4', 'G4', 'A4')] },
  { measure: 12, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 13, slurEnd: 5, notes: [n('D5', 'e', { beam: 'start', tieStop: true }), n('C5', 'e', { beam: 'end' }), ...eds('Bn4', 'C5'), ...eds('A4', 'G4')] },
  { measure: 14, slurStart: 0, notes: [n('F4', 'q'), n('C5', 'h', { tieStart: true })] },
  { measure: 15, notes: [n('C5', 'e', { beam: 'start', tieStop: true }), n('B4', 's', { beam: 'mid' }), n('A4', 's', { beam: 'end' }), ...es2('G#4', 'F4', 'E4'), ...es2('D4', 'C4', 'B3')] },
  { measure: 16, slurEnd: 0, notes: [n('A3', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX6_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'h'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 2, slurEnd: 2, notes: [...eds('C5', 'B4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F#4', 'G#4'), ...b2('A4', 'B4')] },
  { measure: 4, slurEnd: 0, notes: [n('E5', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'h'), ...s4('Fn4', 'Gn4', 'A4', 'B4')] },
  { measure: 6, notes: [...eds('C5', 'B4'), n('A4', 'h', { tieStart: true })] },
  { measure: 7, notes: [n('A4', 'e', { beam: 'start', tieStop: true }), n('G4', 'e', { beam: 'end' }), ...b2('E4', 'F4'), ...b2('D4', 'G4')] },
  { measure: 8, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'h'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 10, slurEnd: 0, notes: [n('F4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'h'), ...s4('B4', 'A4', 'G4', 'F#4')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'h'), ...s4('A4', 'G#4', 'Gn4', 'F4')] },
  { measure: 14, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...s4('E#4', 'F#4', 'G4', 'A4'), n('B4', 'q'), n('A4', 'q')] },
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
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('B4', 'q'), ...s2('A4', 'Gn4'), ...es2('F#4', 'E4', 'D#4')] },
  { measure: 8, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('Fn4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('F4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('F4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('Bb4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('A4', 'q'), n('Bn4', 'q'), n('C#5', 'e')] },
  { measure: 14, notes: [n('D5', 'q'), n('C5', 'h', { tieStart: true })] },
  { measure: 15, slurEnd: 5, notes: [n('C5', 'e', { beam: 'start', tieStop: true }), n('Bn4', 'e', { beam: 'end' }), ...eds('A4', 'G4'), ...eds('F#4', 'G4')] },
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
  { measure: 5, slurStart: 0, notes: [n('E5', 'qd'), ...s2('D#5', 'C#5'), ...eds('D5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'h'), n('B4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'qdd', { accidental: 'n' }), n('B4', 's', { accidental: 'n' }), ...eds('C5', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('G#4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'qdd'), n('G#4', 's'), ...eds('A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qdd'), n('Gn4', 's'), ...eds('Bb4', 'A4')] },
  { measure: 12, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('C#5', 'qdd'), n('Bn4', 's'), ...eds('C5', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'h'), ...b2('Cn5', 'B4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qdd'), n('F#4', 's'), ...eds('A4', 'G#4')] },
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
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('E5', 'h'), ...eds('D5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'h'), n('E4', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'e', { beam: 'start', tieStop: true }), n('D#4', 'e', { beam: 'mid' }), n('E4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), ...b4('G#4', 'F4', 'E4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('B4', 'h', { tieStart: true }), n('E4', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 7, notes: [n('E4', 'e', { beam: 'start', tieStop: true }), n('F#4', 's', { beam: 'mid' }), n('G#4', 's', { beam: 'end' }), ...s4('A4', 'B4', 'C5', 'D5'), n('E5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'h', { tieStart: true }), n('E4', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 7, notes: [n('E4', 'e', { beam: 'start', tieStop: true }), n('F4', 's', { beam: 'mid' }), n('G#4', 's', { beam: 'end' }), ...s4('A4', 'B4', 'C5', 'D5'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'A4'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 14, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'G#4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'h', { tieStart: true }), n('A4', 's', { beam: 'start', tieStop: true }), n('F#4', 's', { beam: 'mid' }), n('G#4', 's', { beam: 'mid' }), n('A4', 's', { beam: 'end' }), ...s4('B4', 'C5', 'D5', 'B4')] },
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
  { measure: 6, notes: [n('A4', 'e'), ...b3('F5', 'E5', 'D5'), n('C5', 'q'), n('B4', 'q', { tieStart: true })] },
  { measure: 7, notes: [n('B4', 'e', { beam: 'start', tieStop: true }), n('D5', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' }), ...b4('A4', 'G#4', 'F4', 'E#4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, notes: [n('REST', 'r8'), ...b3('C4', 'Dn4', 'E4'), ...b4('Fn4', 'G4', 'A4', 'B4')] },
  { measure: 10, localSlurs: [[0, 4]], notes: [n('C5', 'q', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'D5'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, notes: [n('REST', 'r8'), ...b3('C4', 'D4', 'E4'), ...b4('F4', 'G4', 'A4', 'Bb4')] },
  { measure: 12, localSlurs: [[0, 4]], notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G4', 'F4', 'G4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, notes: [n('REST', 'r8'), ...b3('D4', 'E4', 'F4'), ...b4('G4', 'A4', 'Bn4', 'C#5')] },
  { measure: 14, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('D5', 'h', { tieStart: true })] },
  { measure: 15, notes: [n('D5', 'e', { beam: 'start', tieStop: true }), n('Cn5', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), ...b4('G#4', 'F4', 'G#4', 'A4')] },
  { measure: 16, localSlurs: [[0, 4]], notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 11 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX11_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h'), ...eds('B4', 'G#4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r16'), n('E4', 's', { beam: 'start' }), n('F#4', 's', { beam: 'mid' }), n('G#4', 's', { beam: 'end' }), ...s4('A4', 'G#4', 'A4', 'B4'), ...eds('C5', 'B4'), ...eds('C5', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('E5', 'h'), ...eds('D5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'h'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'B4', 'A4'), ...s4('G#4', 'A4', 'Gn4', 'F4'), ...eds('E4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'h'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h'), ...eds('Bb4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'h'), ...eds('G4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'qdd'), n('E4', 's'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r16'), n('E4', 's', { beam: 'start' }), n('F4', 's', { beam: 'mid' }), n('G4', 's', { beam: 'end' }), ...s4('A4', 'B4', 'C5', 'C#5'), n('D5', 'h')] },
  { measure: 14, slurStart: 1, notes: [n('REST', 'r16'), n('E4', 's', { beam: 'start' }), n('F#4', 's', { beam: 'mid' }), n('G#4', 's', { beam: 'end' }), ...s4('A4', 'B4', 'C5', 'D5'), n('E5', 'h')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('C5', 'h'), ...eds('A4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 12 (4/4, 16 compassos)
 */
export const POZZOLI_SERIE11_EX12_MEASURES = [
  { measure: 1, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F4', 'E4'), ...b2('F#4', 'E4'), ...b2('G#4', 'E4')] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'qdd'), n('C5', 's'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'E4'), ...b2('G#4', 'E4'), ...b2('B4', 'E4')] },
  { measure: 4, slurEnd: 2, notes: [n('B4', 'qdd'), n('D5', 's'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('A4', 'e'), ...b2('B4', 'A4'), ...b2('C5', 'A4'), ...b2('D5', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('E5', 'h'), n('D5', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...b2('D5', 'C5'), ...b2('B4', 'A4'), n('B4', 'qdd'), n('D5', 's')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C5', 'B4', 'C5'), ...b4('Bb4', 'C5', 'A4', 'C5')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'h'), n('A4', 'h')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D5', 'C#5', 'D5'), ...b4('Cn5', 'D5', 'B4', 'D5')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'h'), n('B4', 'h')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E5', 'D#5', 'E5'), ...b4('Dn5', 'E5', 'C5', 'E5')] },
  { measure: 14, slurEnd: 2, notes: [n('B4', 'h'), n('A4', 'q', { tieStart: true }), n('A4', 'q', { tieStop: true })] },
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
  { measure: 1, slurStart: 0, notes: [n('E4', 'e', { beam: 'start' }), n('F#4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end', tieStart: true }), n('G#4', 'e', { beam: 'start', tieStop: true }), n('A4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end', tieStart: true })] },
  { measure: 2, slurEnd: 3, notes: [n('B4', 'e', { beam: 'start', tieStop: true }), n('C5', 'e', { beam: 'mid' }), n('D5', 'e', { beam: 'end' }), n('E5', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('E5', 'e', { beam: 'start' }), n('D5', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end', tieStart: true }), n('C5', 'e', { beam: 'start', tieStop: true }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end', tieStart: true })] },
  { measure: 4, slurEnd: 3, notes: [n('A4', 'e', { beam: 'start', tieStop: true }), n('G#4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' }), n('E4', 'qd')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'e', { beam: 'start' }), n('F#4', 'e', { beam: 'mid' }), n('Gn4', 'e', { beam: 'end', tieStart: true }), n('G4', 'e', { beam: 'start', tieStop: true }), n('A4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end', tieStart: true })] },
  { measure: 6, notes: [n('B4', 'e', { beam: 'start', tieStop: true }), n('C5', 'e', { beam: 'mid' }), n('D#5', 'e', { beam: 'end' }), n('E5', 'qd', { tieStart: true })] },
  { measure: 7, notes: [n('E5', 'e', { beam: 'start', tieStop: true }), n('Dn5', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end', tieStart: true }), n('C5', 'e', { beam: 'start', tieStop: true }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end', tieStart: true })] },
  { measure: 8, slurEnd: 3, notes: [n('A4', 'e', { beam: 'start', tieStop: true }), n('G4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'e', { beam: 'start' }), n('Bb4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end', tieStart: true }), n('A4', 'e', { beam: 'start', tieStop: true }), n('G4', 'e', { beam: 'mid' }), n('F4', 'e', { beam: 'end', tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [n('F4', 'e', { beam: 'start', tieStop: true }), n('E4', 'e', { beam: 'mid' }), n('G4', 'e', { beam: 'end' }), n('Bb4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('Bb4', 'e', { beam: 'start' }), n('A4', 'e', { beam: 'mid' }), n('G4', 'e', { beam: 'end', tieStart: true }), n('G4', 'e', { beam: 'start', tieStop: true }), n('F4', 'e', { beam: 'mid' }), n('E4', 'e', { beam: 'end', tieStart: true })] },
  { measure: 12, slurEnd: 3, notes: [n('E4', 'e', { beam: 'start', tieStop: true }), n('D4', 'e', { beam: 'mid' }), n('F4', 'e', { beam: 'end' }), n('A4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'e', { beam: 'start' }), n('C5', 'e', { beam: 'mid' }), n('Bn4', 'e', { beam: 'end', tieStart: true }), n('B4', 'e', { beam: 'start', tieStop: true }), n('A4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end' })] },
  { measure: 14, slurEnd: 0, notes: [n('E5', 'e', { beam: 'start' }), n('D5', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'end', tieStart: true }), n('C5', 'e', { beam: 'start', tieStop: true }), n('B4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' })] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'e', { beam: 'start' }), n('F#4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end', tieStart: true }), n('G#4', 'e', { beam: 'start', tieStop: true }), n('A4', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end', tieStart: true })] },
  { measure: 16, slurEnd: 3, notes: [n('B4', 'e', { beam: 'start', tieStop: true }), n('C5', 'e', { beam: 'mid' }), n('D5', 'e', { beam: 'end' }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
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
  { measure: 15, slurStart: 0, notes: [n('Bn4', 'q'), n('E4', 'e', { tieStart: true }), n('E4', 'e', { beam: 'start', tieStop: true }), n('F#4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end' })] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 16 (6/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX16_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { beam: 'start', tieStop: true }), n('G#4', 's', { beam: 'mid' }), n('A4', 's', { beam: 'mid' }), n('B4', 's', { beam: 'mid' }), n('A4', 's', { beam: 'end' })] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), ...s2('F#4', 'G#4'), n('A4', 'q'), ...s2('C5', 'E5')] },
  { measure: 4, slurEnd: 0, notes: [n('D5', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { beam: 'start', tieStop: true }), n('C5', 's', { beam: 'mid' }), n('B4', 's', { beam: 'mid' }), n('E5', 's', { beam: 'mid' }), n('D5', 's', { beam: 'end' })] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, localSlurs: [[0, 2], [3, 5]], notes: [n('A4', 'q'), ...s2('G4', 'F4'), n('G4', 'q'), ...s2('F4', 'E4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e', { beam: 'start', tieStop: true }), n('B4', 's', { beam: 'mid' }), n('A4', 's', { beam: 'mid' }), n('G4', 's', { beam: 'mid' }), n('F#4', 's', { beam: 'end' })] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e', { beam: 'start', tieStop: true }), n('D5', 's', { beam: 'mid' }), n('C5', 's', { beam: 'mid' }), n('B4', 's', { beam: 'mid' }), n('A#4', 's', { beam: 'end' })] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { beam: 'start', tieStop: true }), n('C5', 's', { beam: 'mid' }), n('B4', 's', { beam: 'mid' }), n('A4', 's', { beam: 'mid' }), n('G4', 's', { beam: 'end' })] },
  { measure: 14, slurEnd: 3, notes: [n('G#4', 'q'), ...s2('A4', 'B4'), n('C5', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { beam: 'start', tieStop: true }), n('F#4', 's', { beam: 'mid' }), n('G#4', 's', { beam: 'mid' }), n('C5', 's', { beam: 'mid' }), n('B4', 's', { beam: 'end' })] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd'), n('A3', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 17 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX17_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'qd', { tieStop: true }), ...b3('A4', 'G#4', 'F#4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'q'), n('G#4', 'e'), n('F#4', 'q'), n('A4', 'e'), n('G4', 'q'), n('B4', 'e')] },
  { measure: 4, slurEnd: 2, notes: [n('C5', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 6, slurEnd: 4, notes: [...b3('D5', 'C5', 'B4'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), n('B4', 'e'), n('A4', 'q'), n('C5', 'e'), n('B4', 'q'), n('D5', 'e')] },
  { measure: 8, slurEnd: 2, notes: [n('C5', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
  { measure: 10, slurEnd: 4, notes: [...b3('E5', 'D#5', 'C#5'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('Dn5', 'hd', { tieStart: true }), n('Dn5', 'qd', { tieStop: true })] },
  { measure: 12, slurEnd: 4, notes: [...b3('D5', 'Cn5', 'B4'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'hd'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('G#4', 'qd'), n('A4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q'), n('G#4', 'e'), n('F#4', 'q'), n('A4', 'e'), n('G4', 'q'), n('B4', 'e')] },
  { measure: 16, slurEnd: 2, notes: [n('C5', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 18 (9/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX18_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'qd'), n('G#4', 'qd')] },
  { measure: 2, slurEnd: 2, notes: [n('C5', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('B4', 'qd'), n('A4', 'qd')] },
  { measure: 4, slurEnd: 2, notes: [n('D5', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E5', 'hd'), ...b3('D5', 'B4', 'G4')] },
  { measure: 6, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 7, slurStart: 0, notes: [n('E5', 'hd'), ...b3('D5', 'A4', 'F4')] },
  { measure: 8, slurEnd: 0, notes: [n('F4', 'hd', { tieStart: true }), n('F4', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), n('G4', 'qd'), n('F4', 'qd')] },
  { measure: 10, slurEnd: 2, notes: [n('A4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd'), n('Bb4', 'qd'), n('A4', 'qd')] },
  { measure: 12, slurEnd: 2, notes: [n('D5', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'hd'), ...b3('B4', 'G4', 'E4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'hd'), n('D#4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd'), n('A4', 'qd'), n('G#4', 'qd')] },
  { measure: 16, slurEnd: 2, notes: [n('B4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
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
  { measure: 6, slurEnd: 2, notes: [n('A4', 'hd'), n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true })] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'G#4', 'B4'), ...b3('D5', 'C5', 'B4')] },
  { measure: 8, slurEnd: 0, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'Gn4', 'B4'), ...b3('D5', 'C5', 'B4')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true })] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { beam: 'start', tieStop: true }), n('G4', 'e', { beam: 'mid' }), n('Bb4', 'e', { beam: 'end' }), ...b3('D5', 'C5', 'B4')] },
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
  { measure: 1, slurStart: 0, notes: [...b3('E4', 'C4', 'D4'), n('E4', 'hd', { tieStart: true })] },
  { measure: 2, notes: [n('E4', 'e', { beam: 'start', tieStop: true }), n('F4', 'e', { beam: 'mid' }), n('D4', 'e', { beam: 'end' }), n('E4', 'hd', { tieStart: true })] },
  { measure: 3, slurEnd: 3, notes: [n('E4', 'e', { beam: 'start', tieStop: true }), n('F#4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end' }), n('A4', 'hd')] },
  { measure: 4, slurStart: 0, notes: [...b3('A4', 'C5', 'B4'), n('B4', 'hd')] },
  { measure: 5, localSlurs: [[0, 4]], notes: [n('A4', 'q'), ...s2('G#4', 'A4'), n('B4', 'qd'), n('B4', 'qd')] },
  { measure: 6, localSlurs: [[0, 4]], notes: [n('A4', 'q'), ...s2('G#4', 'A4'), n('C5', 'qd'), n('C5', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'q', { tieStop: true }), n('B4', 'e'), n('Gn4', 'q'), n('F#4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [...b3('G4', 'E4', 'G#4'), n('A4', 'hd', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [n('A4', 'e', { beam: 'start', tieStop: true }), n('D5', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' }), n('A4', 'hd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'e', { beam: 'start', tieStop: true }), n('G#4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'end' }), ...b3('F4', 'A4', 'C5'), ...b3('D5', 'C5', 'B4')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'q'), ...s2('C5', 'B4'), n('C5', 'qd'), n('A4', 'qd')] },
  { measure: 14, slurEnd: 4, notes: [n('B4', 'q'), ...s2('A4', 'G#4'), n('A4', 'qd'), n('F4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { beam: 'start', tieStop: true }), n('F#4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end' }), ...b3('A4', 'C5', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
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
  { measure: 13, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'e', { beam: 'start', tieStop: true }), n('Cn5', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' }), ...b3('A4', 'G4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e', { beam: 'start', tieStop: true }), n('F#4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end' }), ...b3('A4', 'B4', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 22 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX22_MEASURES = [
  { measure: 1, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'qd', { tieStart: true }), n('E5', 'hd', { tieStop: true })] },
  { measure: 2, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true }), n('C5', 'hd', { tieStop: true })] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'qd', { tieStart: true }), n('E5', 'hd', { tieStop: true })] },
  { measure: 6, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true }), n('C5', 'hd', { tieStop: true })] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('B4', 'q'), n('C5', 'e'), n('D5', 'q'), n('E5', 'e')] },
  { measure: 8, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'q'), n('A4', 'e'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd'), n('D5', 'hd')] },
  { measure: 10, slurEnd: 4, notes: [...b3('D5', 'C5', 'B4'), ...b3('C5', 'B4', 'A4'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), n('C5', 'hd')] },
  { measure: 12, slurEnd: 4, notes: [...b3('C5', 'B4', 'A4'), ...b3('G#4', 'A4', 'B4'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('F4', 'qd'), n('D5', 'hd')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [n('Bb4', 'qd'), n('A4', 'qd'), n('G4', 'hd')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('E4', 'e'), n('F#4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('B4', 'e'), n('C5', 'q'), n('D5', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 11ª SÉRIE — EXERCÍCIO Nº 23 (12/8, 16 compassos)
 */
export const POZZOLI_SERIE11_EX23_MEASURES = [
  { measure: 1, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q', { tieStop: true }), ...s2('G4', 'A4'), n('A4', 'qd', { tieStart: true }), n('A4', 'q', { tieStop: true }), ...s2('C5', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd'), n('A3', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'qd', { tieStop: true }), ...b3('G#4', 'A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'q', { tieStop: true }), ...s2('C5', 'D5'), n('D5', 'qd', { tieStart: true }), n('D5', 'q', { tieStop: true }), ...s2('F5', 'E5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'e', { beam: 'start', tieStop: true }), n('G4', 'e', { beam: 'mid' }), n('F4', 'e', { beam: 'end' }), ...b3('E4', 'E4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), ...s2('F4', 'G4'), n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), ...s2('A4', 'B4')] },
  { measure: 10, slurEnd: 2, notes: [n('G4', 'qd'), n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true })] },
  { measure: 11, slurStart: 0, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'q', { tieStop: true }), ...s2('F4', 'G#4'), n('G#4', 'qd', { tieStart: true }), n('G#4', 'q', { tieStop: true }), ...s2('B4', 'C5')] },
  { measure: 12, slurEnd: 2, notes: [n('A4', 'qd'), n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'q', { tieStop: true }), ...s2('F#4', 'G#4'), n('G#4', 'qd', { tieStart: true }), n('G#4', 'q', { tieStop: true }), ...s2('C5', 'D5')] },
  { measure: 14, slurEnd: 2, notes: [n('A4', 'qd'), n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
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
  { measure: 5, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'q'), n('G4', 'e'), n('D5', 'q'), n('G4', 'e'), n('C5', 'qd')] },
  { measure: 6, localSlurs: [[2, 6]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E5', 'q'), n('G4', 'e'), n('D5', 'q'), n('G4', 'e'), n('B4', 'qd')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C5', 'q'), n('C4', 'e'), n('B4', 'q'), n('C4', 'e'), n('A4', 'q'), n('C4', 'e')] },
  { measure: 8, slurEnd: 3, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'E4'), n('D4', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'q'), n('C4', 'e'), n('A4', 'q'), n('C4', 'e'), n('G4', 'q'), n('C4', 'e')] },
  { measure: 10, slurEnd: 3, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'E4', 'F4'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'q'), n('D4', 'e'), n('B4', 'q'), n('D4', 'e'), n('A4', 'q'), n('D4', 'e')] },
  { measure: 12, slurEnd: 3, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F#4', 'G4'), n('E5', 'qd', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('B4', 'q'), n('E4', 'e'), n('C5', 'q'), n('E4', 'e'), n('B4', 'q'), n('E4', 'e')] },
  { measure: 14, slurEnd: 4, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'C5', 'B4'), n('G#4', 'qd', { tieStart: true }), n('G#4', 'qd', { tieStop: true })] },
  { measure: 15, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'q'), n('E4', 'e'), n('F#4', 'q'), n('E4', 'e'), n('G#4', 'q'), n('E4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'C', localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('Ab4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b2('G4', 'An4'), ...b2('G4', 'Ab4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('F#4', 'e'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('Fn4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('G4', 'F4'), ...b2('G4', 'Eb4')] },
  { measure: 8, slurEnd: 0, notes: [n('D4', 'h')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('Eb4', 'e'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('En4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b2('D4', 'E4'), ...b2('D4', 'F#4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('Ab4', 'e'), n('REST', 'r8')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('An4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b2('G4', 'Bb4'), ...b2('G4', 'Bn4')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 2 (3/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX2_MEASURES = [
  {   measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 0, notes: [n('G4', 'qd'), n('F#4', 'e'), ...b2('A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'h'), n('Fn4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('D#4', 'e'), ...b2('F4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'h'), n('Dn4', 'q')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'qd'), n('B3', 'e'), ...b2('D4', 'C4')] },
  { measure: 6, notes: [n('C4', 'qd'), n('Bb3', 'e'), ...b2('D4', 'C4')] },
  { measure: 7, notes: [n('A3', 'q'), n('Bn3', 'q'), n('C#4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd'), n('C#5', 'e'), ...b2('D5', 'C#5')] },
  { measure: 10, notes: [n('D5', 'qd'), n('Cn5', 'e'), ...b2('D5', 'C5')] },
  { measure: 11, notes: [n('B4', 'qd'), n('A#4', 'e'), ...b2('B4', 'A4')] },
  { measure: 12, notes: [n('B4', 'qd'), n('An4', 'e'), ...b2('B4', 'A4')] },
  { measure: 13, notes: [n('G4', 'qd'), n('F#4', 'e'), ...b2('G4', 'Fn4')] },
  { measure: 14, notes: [n('E4', 'qd'), n('D#4', 'e'), ...b2('E4', 'Dn4')] },
  { measure: 15, notes: [...b4('C4', 'D4', 'C4', 'B3'), ...b2('A3', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 3 (4/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX3_MEASURES = [
  {   measure: 1, timeSignature: '4/4', keySignature: 'C', slurStart: 0, notes: [n('G4', 'qdd'), n('F#4', 's'), ...eds('G4', 'F4'), ...eds('G4', 'F4')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'q'), n('Fn4', 'q', { tieStart: true }), n('Fn4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qdd'), n('G#4', 's'), ...eds('A4', 'G4'), ...eds('A4', 'G4')] },
  { measure: 4, slurEnd: 2, notes: [n('A4', 'q'), n('Gn4', 'q', { tieStart: true }), n('Gn4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [n('A4', 'qdd'), n('G#4', 's'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [n('A4', 'qdd'), n('Gn4', 's'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'qdd'), n('Bb4', 's'), n('A4', 'qdd'), n('Bn4', 's')] },
  { measure: 8, slurEnd: 4, notes: [...b4('A4', 'Bb4', 'A4', 'C#5'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('F4', 'qdd'), n('Gb4', 's'), ...eds('F4', 'Gb4'), ...eds('F4', 'Gb4')] },
  { measure: 10, slurEnd: 2, notes: [n('F4', 'q'), n('Gn4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qdd'), n('A4', 's'), ...eds('G4', 'A4'), ...eds('G4', 'A4')] },
  { measure: 12, slurEnd: 2, notes: [n('G4', 'q'), n('G#4', 'q', { tieStart: true }), n('G#4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [n('Gn4', 'qdd'), n('A4', 's'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [n('G#4', 'qdd'), n('A4', 's'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('An4', 'qdd'), n('Bb4', 's'), n('A4', 'qdd'), n('Bn4', 's')] },
  { measure: 16, slurEnd: 4, notes: [...b4('A4', 'Bb4', 'A4', 'Bn4'), n('C5', 'q'), n('REST', 'r4')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 4 (4/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX4_MEASURES = [
  {   measure: 1, timeSignature: '4/4', keySignature: 'C', slurStart: 0, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e', { beam: 'start', tieStop: true }), n('B4', 'e', { beam: 'mid' }), n('C5', 'e', { beam: 'mid' }), n('B4', 'e', { beam: 'end' })] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'h'), n('Bb4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd'), n('Bb4', 'e'), n('A4', 'qd'), n('Bn4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { beam: 'start', tieStop: true }), n('F#4', 'e', { beam: 'mid' }), n('G4', 'e', { beam: 'mid' }), n('F#4', 'e', { beam: 'end' })] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'h'), n('Fn4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'e'), n('E4', 'qd'), n('F#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { beam: 'start', tieStop: true }), n('G#4', 'e', { beam: 'mid' }), n('A4', 'e', { beam: 'mid' }), n('G#4', 'e', { beam: 'end' })] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h'), n('Gn4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e', { tieStop: true }), n('G4', 'qd'), n('G#4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [n('G4', 'qd'), n('F#4', 'e'), n('Gn4', 'q'), n('REST', 'r4')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [n('Fn4', 'qd'), n('G4', 'e'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [...b4('G4', 'A4', 'G4', 'Ab4'), n('G4', 'q'), n('Bn4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'h'), n('C4', 'q'), n('REST', 'r4')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 5 (2/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX5_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'C', localSlurs: [[0, 1], [2, 3]], notes: [...b2('G4', 'F#4'), ...b2('G4', 'A4')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [...b2('G4', 'Fn4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b2('F4', 'E4'), ...b2('F4', 'Eb4')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1], [2, 3]], notes: [...b2('En4', 'D#4'), ...b2('E4', 'F4')] },
  { measure: 6, localSlurs: [[0, 1], [2, 3]], notes: [...b2('E4', 'Dn4'), ...b2('D4', 'E4')] },
  { measure: 7, slurStart: 0, notes: [...b2('C4', 'C#4'), ...b2('D4', 'Cn4')] },
  { measure: 8, slurEnd: 1, notes: [n('B3', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 1], [2, 3]], notes: [...b2('G4', 'Ab4'), ...b2('A4', 'G4')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 1], [2, 3]], notes: [...b2('G4', 'An4'), ...b2('A4', 'G4')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('G4', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1], [2, 3]], notes: [...b2('G4', 'Ab4'), ...b2('A4', 'G4')] },
  { measure: 14, localSlurs: [[0, 1], [2, 3]], notes: [...b2('G4', 'Bn4'), ...b2('An4', 'G4')] },
  { measure: 15, slurStart: 0, notes: [...b2('B4', 'C5'), ...b2('C#5', 'D5')] },
  { measure: 16, slurEnd: 1, notes: [n('Cn5', 'q', { tieStart: true }), n('C5', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX6_MEASURES = [
  {   measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 0, notes: [n('C5', 'qd'), n('B4', 'e'), ...b2('A4', 'B4')] },
  { measure: 2, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('C5', 'qd'), n('Bb4', 'e'), ...b2('A4', 'Bn4')] },
  { measure: 4, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd'), n('F4', 'e'), ...b2('E4', 'F4')] },
  { measure: 6, notes: [n('G4', 'qd'), n('F#4', 'e'), ...b2('E4', 'F#4')] },
  { measure: 7, notes: [...b2('G4', 'Ab4'), ...b2('G4', 'An4'), ...b2('G4', 'B4')] },
  { measure: 8, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), n('D#5', 'e'), ...b2('C#5', 'D#5')] },
  { measure: 10, slurEnd: 0, notes: [n('E5', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('E5', 'qd'), n('Dn5', 'e'), ...b2('Cn5', 'D5')] },
  { measure: 12, slurEnd: 0, notes: [n('E5', 'hd')] },
  { measure: 13, slurStart: 0, notes: [...b2('G4', 'Ab4'), ...b2('G4', 'An4'), ...b2('F4', 'D5')] },
  { measure: 14, slurEnd: 0, notes: [n('C5', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...b2('G4', 'Ab4'), ...b2('G4', 'An4'), ...b2('F4', 'D5')] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'hd')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 7 (4/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX7_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'C', localSlurs: [[0, 3]], notes: [n('G4', 'q'), ...eds('A4', 'G4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 2, localSlurs: [[0, 3]], notes: [n('G4', 'q'), ...eds('Ab4', 'G4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...eds('Ab4', 'G4'), ...eds('An4', 'G4'), ...eds('Bb4', 'G4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'h'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('G4', 'q'), ...eds('F#4', 'G4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('G4', 'q'), ...eds('Fn4', 'G4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('F#4', 'G4'), ...b2('Fn4', 'G4'), ...b2('E4', 'G4')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'h'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [n('D4', 'q'), ...eds('E4', 'D4'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [n('D4', 'q'), ...eds('Eb4', 'D4'), n('B3', 'q'), n('REST', 'r4')] },
  { measure: 11, localSlurs: [[0, 3]], notes: [n('En4', 'q'), ...eds('D#4', 'E4'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 12, localSlurs: [[0, 3]], notes: [n('E4', 'q'), ...eds('Dn4', 'E4'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 13, localSlurs: [[1, 3], [4, 7]], notes: [n('REST', 'r8'), ...b3('E4', 'E4', 'F#4'), ...b4('G4', 'G4', 'F4', 'G#4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'F#4', 'G4'), ...b4('A4', 'B4', 'G#4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'q', { tieStop: true }), n('REST', 'r4')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 8 (3/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX8_MEASURES = [
  {   measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 0, notes: [...b2('E4', 'D4'), ...b2('E4', 'F4'), ...b2('G4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...b2('E4', 'D#4'), ...b2('E4', 'F4'), ...b2('G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'q'), n('D#4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [...b2('E4', 'D#4'), ...b2('E4', 'F#4'), ...b2('G4', 'F#4')] },
  { measure: 6, notes: [...b2('E4', 'D#4'), ...b2('E4', 'F#4'), ...b2('G4', 'F#4')] },
  { measure: 7, notes: [...b2('E4', 'Dn4'), ...b2('E4', 'F#4'), ...b2('G4', 'A4')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [...b2('C5', 'B4'), ...b2('C5', 'D5'), ...b2('E5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [...b2('Bb4', 'A4'), ...b2('Bb4', 'C5'), ...b2('D5', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('Bb4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...b2('G4', 'F#4'), ...b2('G4', 'A4'), ...b2('Bn4', 'A4')] },
  { measure: 14, notes: [...b2('G4', 'F#4'), ...b2('G4', 'A4'), ...b2('Bb4', 'A4')] },
  { measure: 15, notes: [...b2('G4', 'F#4'), ...b2('G4', 'A4'), ...b2('Bn4', 'G4')] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 9 (3/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX9_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C', localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('G4', 'e'), n('G4', 'q'), n('A4', 'q')] },
  { measure: 2, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('G4', 'e'), n('G4', 'q'), n('Ab4', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('F#4', 'G4'), ...b2('Fn4', 'G4')] },
  { measure: 4, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 5, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('E4', 'q'), n('F4', 'q')] },
  { measure: 6, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('E4', 'q'), n('Eb4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('D#4', 'E4'), ...b2('Dn4', 'E4')] },
  { measure: 8, slurEnd: 0, notes: [n('C4', 'hd')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('E4', 'q'), n('F4', 'q')] },
  { measure: 10, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('E4', 'e'), n('E4', 'q'), n('F#4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('D#4', 'E4'), ...b2('Fn4', 'E4')] },
  { measure: 12, slurEnd: 2, notes: [n('C4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('A4', 'e'), ...b2('G#4', 'A4'), ...b2('Gn4', 'A4')] },
  { measure: 14, notes: [...b2('F4', 'E4'), n('D4', 'q'), n('B4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('Ab4', 'G4'), ...b2('Bn4', 'G4')] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'hd')] }
];

/**
 * 12ª SÉRIE — EXERCÍCIO Nº 10 (2/4, 16 compassos — Tom e semitom)
 */
export const POZZOLI_SERIE12_EX10_MEASURES = [
  {   measure: 1, timeSignature: '2/4', keySignature: 'C', slurStart: 0, notes: [...s4('G4', 'F#4', 'G4', 'F#4'), ...b2('G4', 'Fn4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...s4('G4', 'F#4', 'G4', 'F#4'), ...b2('G4', 'Fn4')] },
  { measure: 4, slurEnd: 1, notes: [n('C4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...s4('G4', 'F#4', 'G4', 'F#4'), ...b2('G4', 'Fn4')] },
  { measure: 6, slurEnd: 3, notes: [...b2('E4', 'G4'), ...b2('F#4', 'G4')] },
  { measure: 7, localSlurs: [[0, 4]], notes: [...s4('D5', 'C#5', 'D5', 'C#5'), ...b2('D5', 'Cn5')] },
  { measure: 8, localSlurs: [[0, 3]], notes: [...b2('B4', 'D5'), ...b2('C#5', 'D5')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'q', { tieStart: true }), ...s4('E5', 'D#5', 'E5', 'Dn5')] },
  { measure: 10, slurEnd: 4, notes: [n('D5', 'q', { tieStart: true }), ...s4('D5', 'C5', 'D5', 'Bb4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'Gn4')] },
  { measure: 12, slurEnd: 4, notes: [...s4('F4', 'E4', 'F4', 'G4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [...s2('G4', 'F#4'), n('G4', 'e'), ...s2('G4', 'A4'), n('G4', 'e')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [...s2('Gn4', 'A4'), n('G4', 'e'), ...s2('F#4', 'G4'), n('F#4', 'e')] },
  { measure: 15, slurStart: 0, notes: [...s4('Fn4', 'E4', 'F4', 'E4'), ...b2('D4', 'G4')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q'), n('C5', 'e'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 1 (2/4, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'G', localSlurs: [[0, 2]], notes: [...eds('G4', 'F#4'), n('G4', 'q')] },
  { measure: 2, localSlurs: [[0, 2]], notes: [...eds('G4', 'F#4'), n('G4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('B4', 'qd'), ...s2('C5', 'B4')] },
  { measure: 4, slurEnd: 4, notes: [...s4('A4', 'G4', 'A4', 'B4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 2]], notes: [...eds('D5', 'B4'), n('G4', 'q')] },
  { measure: 6, localSlurs: [[0, 2]], notes: [...eds('D5', 'B4'), n('G4', 'q', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...s4('G4', 'A4', 'C#5', 'D5'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 8, slurEnd: 1, notes: [n('F#4', 'q', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 1]], notes: [...eds('F#4', 'E4'), ...b2('D4', 'F#4')] },
  { measure: 10, localSlurs: [[0, 1]], notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 1]], notes: [...eds('A4', 'D4'), ...b2('E4', 'A4')] },
  { measure: 12, localSlurs: [[0, 1]], notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [...eds('D5', 'G4'), n('B4', 'q')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [...eds('C5', 'F#4'), n('A4', 'q')] },
  { measure: 15, slurStart: 0, notes: [...s4('G4', 'F#4', 'G4', 'A4'), ...b2('B4', 'F#4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 2 (2/4, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX2_MEASURES = [
  {   measure: 1, timeSignature: '2/4', keySignature: 'G', slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'F#4', 'G4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'qd'), n('D#4', 'e')] },
  { measure: 3, slurStart: 0, notes: [...eds('E4', 'F#4'), ...eds('G4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s4('D5', 'C#5', 'D5', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd'), n('G#4', 'e')] },
  { measure: 7, slurStart: 0, notes: [...eds('A4', 'G4'), ...eds('F#4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D4', 'q', { tieStart: true }), ...s4('D4', 'E4', 'D4', 'F#4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'A4', 'G4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'q'), n('E5', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('D5', 'C5', 'B4')] },
  { measure: 14, notes: [...b2('A4', 'G4'), ...b2('F#4', 'E4')] },
  { measure: 15, notes: [n('D4', 'q', { tieStart: true }), ...s4('D4', 'B4', 'A4', 'F#4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 3 (3/4, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX3_MEASURES = [
  {   measure: 1, timeSignature: '3/4', keySignature: 'G', slurStart: 0, notes: [n('B4', 'h'), ...eds('A4', 'C5')] },
  { measure: 2, notes: [n('B4', 'h'), n('G4', 'q')] },
  { measure: 3, notes: [n('G4', 'qd'), n('F#4', 'e'), ...b2('G4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C5', 'h'), ...eds('B4', 'D5')] },
  { measure: 6, notes: [n('C5', 'h'), n('A4', 'q')] },
  { measure: 7, notes: [n('A4', 'q', { tieStart: true }), ...b2('A4', 'G#4'), ...b2('A4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h'), n('REST', 'r8'), n('D4', 'e')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'h'), ...eds('C#5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('E5', 'q'), n('D5', 'q'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 11, slurStart: 0, notes: [n('Cn5', 'h'), ...eds('B4', 'C5')] },
  { measure: 12, slurEnd: 0, notes: [n('A4', 'hd', { tieStart: true })] },
  { measure: 13, slurStart: 0, notes: [...b2('A4', 'F#4'), ...b2('G4', 'A4'), ...eds('B4', 'C5')] },
  { measure: 14, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 15, notes: [...b2('D5', 'D4'), ...b2('E4', 'F#4'), ...eds('A4', 'G4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 4 (4/4, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX4_MEASURES = [
  {   measure: 1, timeSignature: '4/4', keySignature: 'G', slurStart: 0, notes: [n('D5', 'qd'), ...s2('C5', 'D5'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 2, slurEnd: 4, notes: [n('A4', 'qd'), ...s2('B4', 'C5'), n('G4', 'q'), n('F#4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'h', { tieStart: true }), ...b4('E4', 'F#4', 'G4', 'C5')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd'), ...s2('C#5', 'B4'), n('C5', 'q'), n('A4', 'q')] },
  { measure: 6, slurEnd: 4, notes: [n('B4', 'qd'), ...s2('A4', 'G4'), n('A4', 'q'), n('D4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), ...s2('F#4', 'E4'), ...b2('F#4', 'G4'), ...b2('A#4', 'C#5')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd'), ...s2('Cn5', 'D5'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('F#4', 'h'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd'), ...s2('B4', 'C5'), n('A4', 'q'), n('F#4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'qd'), ...s2('F#4', 'G4'), n('A4', 'qd'), ...s2('B4', 'C5')] },
  { measure: 14, notes: [n('D5', 'qd'), ...s2('E5', 'D5'), ...b2('C5', 'B4'), ...b2('A4', 'G4')] },
  { measure: 15, notes: [...b2('B4', 'D5'), ...b2('C5', 'A4'), n('G4', 'q'), n('F#4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 5 (2/4, 16 compassos — Ré Maior)
 */
export const POZZOLI_SERIE13_EX5_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'D', localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('D5', 'e'), n('A4', 'q', { tieStart: true })] },
  { measure: 2, localSlurs: [[0, 2]], notes: [...b2('A4', 'B4'), n('F#4', 'q', { tieStart: true })] },
  { measure: 3, slurStart: 0, notes: [...s4('F#4', 'E4', 'F#4', 'G4'), ...s4('A4', 'G4', 'F#4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('F#4', 'q'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('A4', 'e'), n('F#4', 'q', { tieStart: true })] },
  { measure: 6, localSlurs: [[0, 2]], notes: [...b2('F#4', 'A4'), n('G4', 'q', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...s2('G4', 'E5'), n('D5', 'e'), ...s4('C#5', 'B4', 'A4', 'G4')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('D5', 'e'), n('A4', 'q', { tieStart: true })] },
  { measure: 10, slurStart: 0, notes: [...s4('A4', 'B4', 'C#5', 'D5'), n('E5', 'e'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[1, 3]], notes: [n('REST', 'r8'), n('C#5', 'e'), n('G4', 'q', { tieStart: true })] },
  { measure: 12, slurStart: 0, notes: [...s2('G4', 'A4'), n('B4', 'e'), ...b2('G#4', 'A#4')] },
  { measure: 13, localSlurs: [[0, 4]], notes: [n('B4', 'e'), n('REST', 'r8'), ...s4('B4', 'C#5', 'D5', 'E5')] },
  { measure: 14, localSlurs: [[1, 3]], notes: [n('REST', 'r16'), n('F#4', 's'), n('G4', 's'), n('A4', 's'), n('A4', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...b2('A4', 'D5'), n('F#4', 'q', { tieStart: true })] },
  { measure: 16, slurEnd: 1, notes: [...b2('F#4', 'E4'), n('D4', 'e'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 6 (3/4, 16 compassos — Ré Maior)
 */
export const POZZOLI_SERIE13_EX6_MEASURES = [
  {   measure: 1, timeSignature: '3/4', keySignature: 'D', slurStart: 0, notes: [n('F#4', 'h'), ...b2('B4', 'D5')] },
  { measure: 2, notes: [...b2('C#5', 'B4'), n('A4', 'h', { tieStart: true })] },
  { measure: 3, slurEnd: 4, notes: [n('A4', 'e', { tieStop: true }), n('B4', 'e'), n('G4', 'q'), n('F#4', 'q')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('E4', 'q'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'q', { tieStart: true }), ...t3('E4', 'F#4', 'G#4'), ...t3('A4', 'B4', 'C#5')] },
  { measure: 6, notes: [n('D5', 'q'), n('C#5', 'q'), n('A4', 'q')] },
  { measure: 7, slurEnd: 7, notes: [...t3('F#4', 'G4', 'G#4'), ...t3('An4', 'B4', 'C#5'), ...t3('D5', 'C#5', 'B4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('E5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'h'), ...b2('A4', 'G4')] },
  { measure: 10, slurEnd: 2, notes: [n('F#4', 'q'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'h'), ...b2('G4', 'E4')] },
  { measure: 12, slurEnd: 2, notes: [n('D4', 'q'), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'q'), ...t3('F#4', 'G4', 'A4'), ...t3('B4', 'C#5', 'D5')] },
  { measure: 14, slurEnd: 2, notes: [n('E5', 'q'), n('D5', 'q'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 15, localSlurs: [[0, 2]], notes: [n('D4', 'q'), n('C#4', 'q'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('D4', 'q'), n('D4', 'q'), n('REST', 'r4')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 7 (4/4, 16 compassos — Ré Maior)
 */
export const POZZOLI_SERIE13_EX7_MEASURES = [
  {   measure: 1, timeSignature: '4/4', keySignature: 'D', slurStart: 0, notes: [n('D5', 'qd'), ...s2('C#5', 'B4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 2, slurStart: 0, notes: [n('A4', 'qd'), ...s2('G4', 'F#4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('F#4', 'qd'), n('D4', 'e'), n('G4', 'qd'), n('E4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd'), ...s2('C#5', 'B4'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 6, slurStart: 0, notes: [n('B4', 'qd'), ...s2('A4', 'G#4'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), n('E#4', 'e'), n('A4', 'qd'), n('G#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, localSlurs: [[0, 3]], notes: [n('A4', 'qd'), ...s2('Gn4', 'F#4'), n('E4', 'q'), n('D5', 'q')] },
  { measure: 10, localSlurs: [[0, 2]], notes: [n('C#5', 'qd'), ...s2('B4', 'C#5'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'G4', 'F#4', 'G4'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 12, slurEnd: 4, notes: [n('C#5', 'q', { tieStart: true }), ...s4('C#5', 'B4', 'A#4', 'B4'), n('C#5', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd'), ...s2('C#5', 'B#4'), n('C#5', 'q'), n('REST', 'r4')] },
  { measure: 14, slurStart: 0, notes: [n('B4', 'qd'), ...s2('An4', 'G4'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 15, localSlurs: [[0, 3]], notes: [n('G4', 'qd'), ...s2('A4', 'B4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 16, localSlurs: [[0, 4]], notes: [n('F#4', 'qd'), ...s2('G4', 'F#4'), n('E4', 'q'), n('D4', 'e'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 8 (2/4, 16 compassos — Lá Maior)
 */
export const POZZOLI_SERIE13_EX8_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'A', localSlurs: [[0, 1]], notes: [n('A4', 'q'), ...b2('B4', 'C#5')] },
  { measure: 2, localSlurs: [[0, 2]], notes: [...eds('E4', 'F#4'), n('E4', 'q')] },
  { measure: 3, slurStart: 0, notes: [...t3('E4', 'F#4', 'G#4'), ...t3('A4', 'B4', 'C#5')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[0, 1]], notes: [n('D5', 'q', { tieStart: true }), ...b2('D5', 'C#5')] },
  { measure: 6, localSlurs: [[0, 1]], notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...t3('D5', 'C#5', 'B4'), ...t3('A4', 'G#4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 2]], notes: [n('C#5', 'q'), ...b2('B4', 'A4')] },
  { measure: 10, localSlurs: [[0, 2]], notes: [...eds('D5', 'Dn5'), n('C#5', 'q')] },
  { measure: 11, slurStart: 0, notes: [...t3('C#4', 'D#4', 'E#4'), ...t3('F#4', 'G#4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 1], [2, 3]], notes: [...b2('E4', 'A4'), ...b2('F#4', 'B4')] },
  { measure: 14, localSlurs: [[0, 1]], notes: [n('E5', 'q', { tieStart: true }), n('E5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...t3('E4', 'F#4', 'G#4'), ...t3('A4', 'B4', 'C#5')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 9 (3/4, 16 compassos — Lá Maior)
 */
export const POZZOLI_SERIE13_EX9_MEASURES = [
  {   measure: 1, timeSignature: '3/4', keySignature: 'A', slurStart: 0, notes: [n('A4', 'qd'), ...s2('G#4', 'A4'), ...s4('B4', 'A4', 'G#4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h'), n('E4', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('C#4', 'e'), ...b2('E4', 'A4'), ...b2('G#4', 'E5')] },
  { measure: 4, slurEnd: 2, notes: [n('B4', 'q'), n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('F#4', 'qd'), ...s2('E#4', 'F#4'), ...s4('G#4', 'F#4', 'E#4', 'F#4')] },
  { measure: 6, slurEnd: 1, notes: [n('F#4', 'h'), n('C#4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('F#4', 'e'), ...b2('G#4', 'A4'), ...b2('G#4', 'B#4')] },
  { measure: 8, slurEnd: 0, notes: [n('C#5', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd'), ...s2('Cn5', 'D5'), ...s4('C#5', 'D5', 'B4', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('C#5', 'h'), n('A4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd'), ...s2('C#5', 'D5'), ...s4('C#5', 'D5', 'B4', 'D5')] },
  { measure: 12, slurEnd: 0, notes: [n('C#5', 'hd', { tieStart: true })] },
  { measure: 13, slurStart: 0, notes: [...b2('C#5', 'B4'), ...b2('A4', 'F#4'), ...b2('E4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('C#5', 'q'), n('D5', 'q', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd'), ...s2('F#4', 'G#4'), ...s4('A4', 'G#4', 'B4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r4')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 10 (4/4, 16 compassos — Lá Maior)
 */
export const POZZOLI_SERIE13_EX10_MEASURES = [
  {   measure: 1, timeSignature: '4/4', keySignature: 'A', slurStart: 0, notes: [n('E4', 'qd'), n('C#4', 'e'), ...b4('A3', 'C#4', 'E4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('C#5', 'h'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G#4', 'qd'), n('E4', 'e'), ...b4('B3', 'E4', 'G#4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'h'), n('D#5', 'q'), n('REST', 'r4')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('E5', 'q', { tieStart: true }), ...t3('E5', 'D5', 'C#5'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('A4', 'q', { tieStart: true }), ...t3('A4', 'G#4', 'F#4'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F#4', 'q', { tieStart: true }), ...t3('F#4', 'G#4', 'E4'), n('A4', 'q', { tieStart: true }), ...t3('A4', 'G#4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('E5', 'qd'), n('A4', 'e'), ...b4('F#4', 'D#4', 'E4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('C#5', 'h', { tieStart: true }), n('C#5', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd'), n('G#4', 'e'), ...b4('E#4', 'C#4', 'D4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q', { tieStop: true }), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C#5', 'qd'), n('A4', 'e'), ...b4('E4', 'F#4', 'G#4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'hd'), n('F#4', 'q')] },
  { measure: 15, localSlurs: [[0, 3]], notes: [n('E5', 'q', { tieStart: true }), ...t3('E5', 'D5', 'C#5'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 16, localSlurs: [[0, 3]], notes: [n('A4', 'q', { tieStart: true }), ...t3('A4', 'B4', 'G#4'), n('A4', 'q'), n('REST', 'r4')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 11 (6/8, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX11_MEASURES = [
  {   measure: 1, timeSignature: '6/8', keySignature: 'G', slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A4', 'D5')] },
  { measure: 2, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'q'), n('G4', 'e'), n('A4', 'q'), n('A#4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'E5')] },
  { measure: 6, slurEnd: 2, notes: [n('D5', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'q'), n('A4', 'e'), n('B4', 'q'), n('G4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'C5', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'G4')] },
  { measure: 12, slurEnd: 2, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'q'), n('B4', 'e'), n('A4', 'q'), n('E4', 'e')] },
  { measure: 14, slurEnd: 4, notes: [...b3('G4', 'F#4', 'D4'), n('B4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'qd'), ...b3('G4', 'A4', 'F#4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 12 (6/8, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX12_MEASURES = [
  {   measure: 1, timeSignature: '6/8', keySignature: 'G', slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...s4('G4', 'F#4', 'E4', 'D4'), ...s2('E4', 'F#4')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'e'), n('B4', 'q')] },
  { measure: 3, localSlurs: [[0, 2]], notes: [n('G4', 'e'), n('B4', 'q'), ...b3('A4', 'B4', 'G4')] },
  { measure: 4, localSlurs: [[0, 1]], notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...s4('B4', 'A#4', 'G#4', 'F#4'), ...s2('G#4', 'A#4')] },
  { measure: 6, slurEnd: 0, notes: [n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F#4', 'e'), n('B4', 'q')] },
  { measure: 7, localSlurs: [[0, 2]], notes: [n('F#4', 'e'), n('B4', 'q'), ...b3('G4', 'A#4', 'G#4')] },
  { measure: 8, localSlurs: [[0, 1]], notes: [n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...s4('D5', 'Cn5', 'B4', 'A4'), ...s2('G4', 'F#4')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...s4('A4', 'G4', 'F#4', 'E4'), ...s2('D4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'qd'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, localSlurs: [[0, 2]], notes: [n('G4', 'e'), n('A4', 'q'), n('G4', 'e'), n('B4', 'q')] },
  { measure: 14, localSlurs: [[0, 2]], notes: [...b3('A4', 'B4', 'C5'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd'), ...s4('A4', 'G4', 'F#4', 'E4'), ...s2('D4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 13 (9/8, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX13_MEASURES = [
  {   measure: 1, timeSignature: '9/8', keySignature: 'G', slurStart: 0, notes: [n('B4', 'hd', { tieStart: true }), ...b3('B4', 'A4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'qd'), n('B4', 'hd')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), ...b3('A4', 'G4', 'F#4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd'), n('A4', 'hd')] },
  { measure: 5, localSlurs: [[0, 3]], notes: [n('B4', 'ed'), n('C5', 's'), n('B4', 'e'), n('G4', 'hd')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('B4', 'ed'), n('C5', 's'), n('B4', 'e'), n('G4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'ed'), n('F#4', 's'), n('G4', 'e'), n('G4', 'ed'), n('A4', 's'), n('B4', 'e'), n('C5', 'ed'), n('D5', 's'), n('C#5', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 9, slurStart: 0, notes: [n('Cn5', 'hd', { tieStart: true }), ...b3('C5', 'B4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'qd'), n('G4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'hd', { tieStart: true }), ...b3('B4', 'A4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'qd'), n('F#4', 'hd')] },
  { measure: 13, localSlurs: [[0, 3]], notes: [n('A4', 'ed'), n('B4', 's'), n('A4', 'e'), n('G4', 'hd')] },
  { measure: 14, localSlurs: [[0, 3]], notes: [n('A4', 'ed'), n('B4', 's'), n('A4', 'e'), n('G4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'ed'), n('B4', 's'), n('A4', 'e'), n('C5', 'ed'), n('D5', 's'), n('C5', 'e'), n('D5', 'q'), n('F#4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 14 (12/8, 16 compassos — Sol Maior)
 */
export const POZZOLI_SERIE13_EX14_MEASURES = [
  {   measure: 1, timeSignature: '12/8', keySignature: 'G', slurStart: 0, notes: [n('G4', 'hd', { tieStart: true }), ...b3('A4', 'G4', 'F#4'), ...b3('G4', 'B4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'qd'), n('B4', 'hd', { tieStart: true }), n('B4', 'qd', { tieStop: true })] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true }), ...b3('A4', 'G4', 'F#4'), ...b3('G4', 'C5', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'qd'), n('C5', 'hd', { tieStart: true }), n('C5', 'qd', { tieStop: true })] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'hd', { tieStart: true }), ...b3('B4', 'A#4', 'B4'), ...b3('D5', 'C#5', 'B4')] },
  { measure: 6, notes: [n('An4', 'qd', { tieStart: true }), ...b3('A4', 'G4', 'A4'), n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F#4', 'G4')] },
  { measure: 7, notes: [n('F#4', 'qd', { tieStart: true }), ...b3('F#4', 'G4', 'F#4'), ...b3('E4', 'D4', 'C#4'), ...b3('B4', 'A4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('F#4', 'hd', { tieStart: true }), ...b3('F#4', 'G4', 'F#4'), ...b3('Cn5', 'B4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd'), n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 11, localSlurs: [[0, 2]], notes: [n('F#4', 'qd'), n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 12, localSlurs: [[0, 2]], notes: [n('G4', 'qd'), n('D5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd'), ...b3('A4', 'G4', 'F#4'), ...b3('G4', 'B4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('D4', 'qd'), n('B4', 'hd', { tieStart: true }), n('B4', 'qd', { tieStop: true })] },
  { measure: 15, slurStart: 0, notes: [...b3('E4', 'D4', 'E4'), ...b3('F#4', 'G4', 'A4'), ...b3('B4', 'C5', 'A4'), ...b3('E5', 'D5', 'F#4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 15 (6/8, 16 compassos — Ré Maior)
 */
export const POZZOLI_SERIE13_EX15_MEASURES = [
  {   measure: 1, timeSignature: '6/8', keySignature: 'D', slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q', { tieStop: true }), ...s2('B4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q', { tieStop: true }), ...s2('B4', 'A4')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...s4('A4', 'G#4', 'A4', 'B4'), ...s2('C#5', 'D5')] },
  { measure: 4, slurEnd: 3, notes: [...b3('E5', 'C#5', 'A4'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), ...s2('A4', 'G4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q', { tieStop: true }), ...s2('A4', 'G4')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'q'), ...b3('G#4', 'A4', 'D5'), n('B4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'q', { tieStop: true }), ...s2('E5', 'D5')] },
  { measure: 10, slurEnd: 1, notes: [n('Dn5', 'qd', { tieStart: true }), n('D5', 'q', { tieStop: true }), ...s2('E5', 'D5')] },
  { measure: 11, slurStart: 0, notes: [n('C#5', 'qd', { tieStart: true }), ...s4('C#5', 'B#4', 'C#5', 'D#5'), ...s2('E#5', 'F#5')] },
  { measure: 12, slurEnd: 3, notes: [...b3('D5', 'Cn5', 'B4'), n('A4', 'q'), ...s2('B4', 'A4')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'q'), ...s2('B4', 'A4'), n('A4', 'q'), ...s2('B4', 'A4')] },
  { measure: 14, slurEnd: 4, notes: [n('F#4', 'q'), ...s2('G#4', 'F#4'), n('G4', 'q'), ...s2('A4', 'G4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...s4('E4', 'F#4', 'G4', 'A4'), ...s2('B4', 'C#5')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 16 (9/8, 16 compassos — Ré Maior)
 */
export const POZZOLI_SERIE13_EX16_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'D', localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('F#4', 'qd', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b2('F#4', 'G4'), ...b3('A4', 'B4', 'C#5'), ...b3('D5', 'F#5', 'E5')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('A4', 'qd'), n('Gn4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b2('A4', 'G4'), ...b3('F#4', 'E4', 'D4'), ...b3('C#4', 'E4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('A3', 'qd', { tieStart: true }), n('A3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('F#4', 'qd', { tieStart: true }), n('F#4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'qd', { tieStart: true }), n('G4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b2('F#4', 'G4'), ...b3('A4', 'B4', 'Cn5'), ...b3('D5', 'F#5', 'E5')] },
  { measure: 12, slurEnd: 0, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'qd', { tieStop: true })] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A#4', 'B4'), ...b3('E5', 'D5', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 16, localSlurs: [[2, 3]], notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'qd', { tieStart: true }), n('D4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 17 (12/8, 16 compassos — Ré Maior)
 */
export const POZZOLI_SERIE13_EX17_MEASURES = [
  {   measure: 1, timeSignature: '12/8', keySignature: 'D', slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), ...s4('D5', 'C#5', 'B4', 'A4'), ...s4('B4', 'C#5', 'D5', 'C#5'), ...b2('B4', 'C#5')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'D4', 'C#4'), ...b3('D4', 'E4', 'F#4'), ...b3('G4', 'E4', 'D4')] },
  { measure: 4, slurEnd: 1, notes: [n('A3', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), ...s4('D5', 'C#5', 'B4', 'A4'), ...s4('B4', 'C#5', 'D5', 'C#5'), ...b2('B4', 'C#5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A4', 'G4'), ...b3('F#4', 'E4', 'D4'), ...b3('C#4', 'G4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('B3', 'qd', { tieStart: true }), n('B3', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, localSlurs: [[0, 6]], notes: [n('C#4', 'qd', { tieStart: true }), ...s4('C#4', 'D4', 'En4', 'F#4'), ...s2('G4', 'A4'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 6]], notes: [n('D4', 'qd', { tieStart: true }), ...s4('D4', 'E4', 'F#4', 'G4'), ...s2('A4', 'B4'), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 6]], notes: [n('E4', 'qd', { tieStart: true }), ...s4('E4', 'F#4', 'G4', 'A4'), ...s2('B4', 'C#5'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 12, localSlurs: [[0, 6]], notes: [n('F#4', 'qd', { tieStart: true }), ...s4('F#4', 'G4', 'A4', 'B4'), ...s2('C#5', 'D5'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), ...s4('D5', 'C#5', 'B4', 'A4'), ...s4('B4', 'C#5', 'D5', 'C#5'), ...b2('B4', 'C#5')] },
  { measure: 14, slurEnd: 1, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, localSlurs: [[0, 3]], notes: [n('B3', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 16, localSlurs: [[0, 6]], notes: [n('D4', 'qd', { tieStart: true }), ...s4('D4', 'E4', 'F#4', 'E4'), ...s2('D4', 'E4'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 18 (6/8, 16 compassos — Lá Maior)
 */
export const POZZOLI_SERIE13_EX18_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'A', localSlurs: [[0, 2]], notes: [n('E4', 'qd'), ...b2('F#4', 'E4'), n('E4', 'e')] },
  { measure: 2, localSlurs: [[0, 1]], notes: [n('C#5', 'qd'), n('A4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true })] },
  { measure: 4, slurEnd: 3, notes: [...b3('E5', 'D5', 'C#5'), ...b3('B4', 'A4', 'G#4')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, localSlurs: [[0, 3]], notes: [n('G#4', 'ed'), n('A4', 's'), n('G#4', 'e'), n('B4', 'qd', { tieStart: true })] },
  { measure: 7, localSlurs: [[0, 3]], notes: [n('A4', 'ed'), n('B4', 's'), n('A4', 'e'), n('C#5', 'qd', { tieStart: true })] },
  { measure: 8, slurStart: 0, notes: [...b3('D5', 'C#5', 'B4'), ...b3('A4', 'G#4', 'F#4')] },
  { measure: 9, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, localSlurs: [[0, 3]], notes: [n('C#5', 'ed'), n('D5', 's'), n('C#5', 'e'), n('E5', 'q'), n('A4', 'e')] },
  { measure: 11, localSlurs: [[0, 3]], notes: [n('G#4', 'ed'), n('A4', 's'), n('G#4', 'e'), n('B4', 'q'), n('E4', 'e')] },
  { measure: 12, slurStart: 0, notes: [...b3('C#5', 'B4', 'A4'), ...b3('B4', 'A4', 'G#4')] },
  { measure: 13, slurEnd: 3, notes: [n('F#4', 'ed'), n('G#4', 's'), n('F#4', 'e'), n('A4', 'qd')] },
  { measure: 14, slurStart: 0, notes: [n('G#4', 'ed'), n('A4', 's'), n('G#4', 'e'), n('B4', 'qd', { tieStart: true })] },
  { measure: 15, slurEnd: 3, notes: [n('A4', 'ed'), n('B4', 's'), n('A4', 'e'), n('C#5', 'qd')] },
  { measure: 16, localSlurs: [[0, 1]], notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 19 (9/8, 16 compassos — Lá Maior)
 */
export const POZZOLI_SERIE13_EX19_MEASURES = [
  {   measure: 1, timeSignature: '9/8', keySignature: 'A', slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'qd', { tieStop: true }), ...b3('B4', 'G#4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C#5', 'hd', { tieStart: true }), ...b3('C#5', 'B4', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('E5', 'hd', { tieStart: true }), ...b3('E5', 'D5', 'C#5')] },
  { measure: 6, slurEnd: 0, notes: [n('D5', 'hd', { tieStart: true }), ...b3('D5', 'C#5', 'B4')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), ...b3('B4', 'A4', 'G#4')] },
  { measure: 8, slurEnd: 1, notes: [n('E#4', 'qd'), n('C#5', 'qd', { tieStart: true }), n('C#5', 'e', { tieStop: true }), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'qd', { tieStop: true }), ...b3('G#4', 'E#4', 'F#4')] },
  { measure: 10, slurEnd: 1, notes: [n('C#4', 'qd'), n('A4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'qd', { tieStop: true }), ...b3('G#4', 'E#4', 'F#4')] },
  { measure: 12, slurEnd: 1, notes: [n('C#4', 'qd'), n('B4', 'hd')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), ...b3('B4', 'A4', 'G#4')] },
  { measure: 14, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), ...b3('C#5', 'B4', 'A4')] },
  { measure: 15, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStop: true })] },
  { measure: 16, slurEnd: 3, notes: [...b3('D5', 'C#5', 'B4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

/**
 * 13ª SÉRIE — EXERCÍCIO Nº 20 (12/8, 16 compassos — Lá Maior)
 */
export const POZZOLI_SERIE13_EX20_MEASURES = [
  {   measure: 1, timeSignature: '12/8', keySignature: 'A', slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), ...s4('G#4', 'A4', 'B4', 'C#5'), n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), ...s4('G#4', 'A4', 'B4', 'C#5')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C#4', 'qd', { tieStart: true }), ...b3('C#4', 'E4', 'A4'), n('C#5', 'qd', { tieStart: true }), ...b3('C#5', 'E5', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), ...s4('C#5', 'D5', 'E5', 'F#5'), n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), ...s4('C#5', 'D5', 'E5', 'F#5')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'qd'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), ...b3('F#4', 'D4', 'F#4'), ...b3('B4', 'E5', 'D5'), n('C#5', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C#5', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), ...s4('C#5', 'D5', 'F#5', 'E5'), n('E5', 'hd')] },
  { measure: 10, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e', { tieStop: true }), ...s4('C#5', 'D5', 'F#5', 'E5'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, localSlurs: [[0, 5]], notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), ...b3('C#5', 'B4', 'A4'), n('E4', 'qd')] },
  { measure: 12, localSlurs: [[0, 5]], notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), ...b3('B4', 'A4', 'G#4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G#4', 'A4'), n('D5', 'qd', { tieStart: true }), ...b3('D5', 'C#5', 'B4')] },
  { measure: 14, slurEnd: 3, notes: [n('A4', 'qd'), ...b3('A4', 'G#4', 'E4'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e', { tieStop: true }), ...s4('D#4', 'E4', 'F#4', 'G#4'), n('A4', 'e'), ...s4('G#4', 'F#4', 'E4', 'B4'), n('A4', 'q'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e', { tieStop: true }), ...s4('A4', 'B4', 'C#5', 'B4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

// Série 14: Tonalidades com sustenidos (Mi menor - Si menor - Fá# menor)
const POZZOLI_SERIE14_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Em', notes: [n('REST', 'r8'), n('E4', 'e'), n('E4', 'q', { tieStart: true })] },
  { measure: 2, notes: [...s4('E4', 'F#4', 'G4', 'F#4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, notes: [n('REST', 'r8'), n('E4', 'e'), n('G4', 'q', { tieStart: true })] },
  { measure: 4, notes: [...s4('G4', 'A4', 'G4', 'F#4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r16'), ...s4('E4', 'F#4', 'G4', 'A4'), n('B4', 's'), n('C#5', 's'), n('D#5', 's')] },
  { measure: 6, slurEnd: 0, notes: [n('E5', 'e'), n('REST', 'r8'), n('E5', 'q', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...t3('E5', 'B4', 'G4'), ...t3('E4', 'G4', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r8'), ...s2('C5', 'B4'), n('A4', 'q')] },
  { measure: 10, notes: [n('REST', 'r16'), n('A4', 's'), n('B4', 's'), n('C5', 's'), n('D5', 'q')] },
  { measure: 11, notes: [n('REST', 'r8'), n('D5', 'e'), n('B4', 'q', { tieStart: true })] },
  { measure: 12, notes: [n('REST', 'r16'), n('B4', 's'), n('C5', 's'), n('D5', 's'), n('D5', 'q', { tieStart: true })] },
  { measure: 13, slurStart: 0, notes: [...s4('D5', 'E5', 'D5', 'C5'), ...s4('B4', 'A4', 'G4', 'A4')] },
  { measure: 14, slurEnd: 0, notes: [n('F#4', 'e'), n('G4', 'e'), n('A4', 'q')] },
  { measure: 15, notes: [n('REST', 'r8'), n('E4', 'e'), n('F#4', 'q', { tieStart: true })] },
  { measure: 16, notes: [...s4('F#4', 'G#4', 'F#4', 'E4'), n('G4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX2_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Em', notes: [n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 2, notes: [n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 3, slurStart: 0, notes: [...t3('B4', 'A4', 'G4'), ...t3('F#4', 'G4', 'A4')] },
  { measure: 4, slurEnd: 0, notes: [n('B4', 'h')] },
  { measure: 5, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 6, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 7, slurStart: 0, notes: [...t3('G4', 'F#4', 'E4'), ...t3('D4', 'E4', 'F#4')] },
  { measure: 8, slurEnd: 0, notes: [n('G4', 'h')] },
  { measure: 9, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('G#4', 'e')] },
  { measure: 10, notes: [n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 11, notes: [n('REST', 'r8'), n('C5', 'e'), n('REST', 'r8'), n('C#5', 'e')] },
  { measure: 12, notes: [n('D5', 'q'), n('D#5', 'q')] },
  { measure: 13, slurStart: 0, notes: [...t3('E5', 'Dn5', 'C5'), ...t3('B4', 'C5', 'D5')] },
  { measure: 14, notes: [...t3('C5', 'B4', 'A4'), ...t3('G4', 'B4', 'A4')] },
  { measure: 15, slurEnd: 0, notes: [n('E4', 'qdd', { tieStart: true }), n('E4', 's')] },
  { measure: 16, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX3_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Em', slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'G4'), ...b2('B4', 'D#5')] },
  { measure: 2, slurEnd: 1, notes: [n('E5', 'q'), n('B4', 'h')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'G4'), ...b2('B4', 'D#5')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'q'), n('B4', 'h')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), ...b2('F#4', 'G4'), ...b2('B4', 'Dn5')] },
  { measure: 6, slurEnd: 1, notes: [n('Dn5', 'q'), n('B4', 'h')] },
  { measure: 7, notes: [n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('F#4', 'e'), n('REST', 'r8'), n('G#4', 'e')] },
  { measure: 8, notes: [n('REST', 'r8'), ...s2('B4', 'C#5'), n('B4', 'q', { tieStart: true }), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('Cn5', 'B4'), ...b2('G#4', 'Gn4')] },
  { measure: 10, slurEnd: 0, notes: [n('F#4', 'hd')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), n('B4', 'e'), ...b2('B4', 'A4'), ...b2('Gn4', 'F#4')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 13, notes: [n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('F#4', 'e'), n('REST', 'r8'), n('G#4', 'e')] },
  { measure: 14, notes: [n('REST', 'r8'), ...s2('B4', 'C#5'), n('B4', 'h')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('Cn5', 'B4'), ...b2('G#4', 'F#4')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE14_EX4_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Em', notes: [n('REST', 'r8'), n('E4', 'e'), n('D5', 'q', { tieStart: true }), n('D5', 'e'), n('E4', 'e'), n('C5', 'q', { tieStart: true })] },
  { measure: 2, notes: [n('C5', 'e'), n('E4', 'e'), n('B4', 'q', { tieStart: true }), n('B4', 'e'), n('E4', 'e'), n('A4', 'q')] },
  { measure: 3, notes: [n('REST', 'r8'), n('B3', 'e'), n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('B3', 'e'), n('F#4', 'q', { tieStart: true })] },
  { measure: 4, notes: [n('F#4', 'e'), n('B3', 'e'), n('E4', 'q', { tieStart: true }), n('E4', 'e'), n('B3', 'e'), n('E4', 'q')] },
  { measure: 5, notes: [n('REST', 'r8'), n('E4', 'e', { tieStart: true }), n('E4', 'q'), ...b2('E4', 'E4'), n('E4', 'q', { tieStart: true })] },
  { measure: 6, notes: [...b2('E4', 'F#4'), n('G4', 'q', { tieStart: true }), ...b2('G4', 'A4'), n('G4', 'q')] },
  { measure: 7, notes: [n('REST', 'r8'), n('E4', 'e'), n('B4', 'q', { tieStart: true }), ...b2('B4', 'E4'), n('G4', 'q', { tieStart: true })] },
  { measure: 8, notes: [...b2('G4', 'E4'), n('C5', 'q'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 9, notes: [n('REST', 'r8'), n('G4', 'e'), n('Fn4', 'q', { tieStart: true }), ...b2('Fn4', 'G4'), n('G4', 'q', { tieStart: true })] },
  { measure: 10, notes: [...b2('G4', 'E4'), ...b2('F#4', 'D4'), n('C4', 'q', { tieStart: true }), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 11, notes: [n('REST', 'r8'), n('A4', 'e', { tieStart: true }), n('A4', 'q', { tieStart: true }), ...b2('A4', 'A4'), n('G#4', 'q', { tieStart: true })] },
  { measure: 12, notes: [...b2('G#4', 'A4'), ...b2('E4', 'E4'), n('E4', 'q', { tieStart: true }), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 13, notes: [n('REST', 'r8'), n('B4', 'e', { tieStart: true }), n('B4', 'q', { tieStart: true }), ...b2('B4', 'C5'), n('A4', 'q', { tieStart: true })] },
  { measure: 14, notes: [...b2('A4', 'B4'), n('G4', 'q', { tieStart: true }), ...b2('G4', 'B4'), n('F#4', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...b4('F#4', 'D#4', 'C#4', 'D#4'), ...b4('E4', 'F#4', 'G4', 'A4')] },
  { measure: 16, slurEnd: 2, notes: [n('B4', 'q'), n('D#4', 'q'), n('E4', 'q'), n('REST', 'r4')] }
];

const POZZOLI_SERIE14_EX5_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Em', notes: [n('E4', 'e'), n('E4', 'q'), n('E4', 'e')] },
  { measure: 2, notes: [n('F#4', 'e'), n('F#4', 'q'), n('F#4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'F#4', 'G4', 'A4')] },
  { measure: 4, slurEnd: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, notes: [n('E4', 'e'), n('E4', 'q'), n('E4', 'e')] },
  { measure: 6, notes: [n('Fn4', 'e'), n('Fn4', 'q'), n('Fn4', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('F#4', 'q', { tieStart: true }), ...s4('F#4', 'G4', 'D#4', 'F#4')] },
  { measure: 8, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, notes: [n('E4', 'e'), n('E4', 'q'), n('E4', 'e')] },
  { measure: 10, notes: [...s2('E4', 'F#4'), n('E4', 'e'), n('REST', 'r4')] },
  { measure: 11, notes: [n('G4', 'e'), n('G4', 'q'), n('G4', 'e')] },
  { measure: 12, notes: [...s2('G4', 'A4'), n('G4', 'e'), n('REST', 'r4')] },
  { measure: 13, notes: [n('B4', 'e'), n('B4', 'q'), n('C5', 'e', { tieStart: true })] },
  { measure: 14, notes: [...b2('C5', 'B4'), n('A4', 'e'), n('G4', 'e')] },
  { measure: 15, slurStart: 0, notes: [n('F#4', 'q', { tieStart: true }), ...s4('F#4', 'G4', 'D#4', 'F#4')] },
  { measure: 16, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE14_EX6_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Bm', slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('B3', 'e'), ...b2('D4', 'F#4'), n('B4', 'q')] },
  { measure: 2, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r8'), n('REST', 'r16'), n('B3', 's'), n('D4', 'ed'), n('F#4', 's'), n('B4', 'q')] },
  { measure: 3, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('A4', 'B4'), n('C#5', 'q')] },
  { measure: 4, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r8'), n('REST', 'r16'), n('G4', 's'), n('A4', 'ed'), n('B4', 's'), n('C#5', 'q')] },
  { measure: 5, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('D5', 'e'), ...b2('C#5', 'D5'), n('E5', 'q')] },
  { measure: 6, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r8'), n('REST', 'r16'), n('D5', 's'), n('C#5', 'ed'), n('D5', 's'), n('E5', 'q')] },
  { measure: 7, slurStart: 1, slurEnd: 6, notes: [n('REST', 'r16'), n('E5', 's'), n('D5', 'e'), n('C#5', 'e'), n('Bn4', 's'), n('A#4', 's'), n('F#4', 'q')] },
  { measure: 8, slurStart: 1, slurEnd: 6, notes: [n('REST', 'r8', { eighthDur: 2/3, tuplet: 3 }), n('D5', 'e', { eighthDur: 2/3, tuplet: 3 }), n('C#5', 'e', { eighthDur: 2/3, tuplet: 3 }), ...t3('B4', 'A#4', 'G4'), n('F#4', 'q')] },
  { measure: 9, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r8'), n('REST', 'r16'), n('G4', 's'), n('F#4', 'ed'), n('G4', 's'), n('A#4', 'q')] },
  { measure: 10, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('F#4', 'G4'), n('A#4', 'q')] },
  { measure: 11, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r8'), n('REST', 'r16'), n('G4', 's'), n('F#4', 'ed'), n('G4', 's'), n('A#4', 'q')] },
  { measure: 12, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('F#4', 'G4'), n('A#4', 'q')] },
  { measure: 13, slurStart: 1, slurEnd: 6, notes: [n('REST', 'r8', { eighthDur: 2/3, tuplet: 3 }), n('G4', 'e', { eighthDur: 2/3, tuplet: 3 }), n('A#4', 'e', { eighthDur: 2/3, tuplet: 3 }), ...t3('B4', 'C#5', 'D5'), n('E5', 'q')] },
  { measure: 14, slurStart: 1, slurEnd: 6, notes: [n('REST', 'r8'), n('G4', 's'), n('A#4', 's'), n('B4', 'e'), n('C#5', 's'), n('D5', 's'), n('E5', 'q')] },
  { measure: 15, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('D5', 'e'), ...b2('A#4', 'B4'), n('D5', 'q')] },
  { measure: 16, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r8'), n('REST', 'r16'), n('D5', 's'), n('A#4', 'ed'), n('B4', 's'), n('D5', 'q')] }
];

const POZZOLI_SERIE14_EX7_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Bm', slurStart: 0, slurEnd: 2, notes: [n('B4', 'qdd'), n('A#4', 's'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 2, slurStart: 0, slurEnd: 3, notes: [n('B4', 'qd'), ...s2('A4', 'G4'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...b4('B4', 'A#4', 'An4', 'G#4'), ...b4('G4', 'A#4', 'B4', 'C#5')] },
  { measure: 4, slurEnd: 0, notes: [n('D5', 'hd'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, slurEnd: 2, notes: [n('D5', 'qdd'), n('C#5', 's'), n('Bn4', 'q'), n('REST', 'r4')] },
  { measure: 6, slurStart: 0, slurEnd: 3, notes: [n('D5', 'qd'), ...s2('Cn5', 'B4'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...b4('D5', 'C5', 'B4', 'A4'), ...b4('G4', 'A4', 'C#5', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('D5', 'h'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, slurEnd: 2, notes: [n('F#4', 'qdd'), n('E#4', 's'), n('C#4', 'q'), n('REST', 'r4')] },
  { measure: 10, slurStart: 0, slurEnd: 3, notes: [n('F#4', 'qd'), ...s2('En4', 'D4'), n('C#4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('F#4', 'qd'), ...s2('E#4', 'F#4'), n('G#4', 'qd'), ...s2('F#4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'h'), n('A#4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, slurEnd: 2, notes: [n('B4', 'qdd'), n('A#4', 's'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 14, slurStart: 0, slurEnd: 3, notes: [n('B4', 'qd'), ...s2('An4', 'G4'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b3('B4', 'A#4', 'An4'), ...b4('G4', 'F#4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('B3', 'h', { tieStart: true }), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE14_EX8_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'F#m', slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), ...b3('C#5', 'A4', 'F#4')] },
  { measure: 2, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), ...b3('A4', 'E#4', 'C#4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r16'), n('C#4', 's'), n('D#4', 's'), n('E#4', 's'), ...s4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), ...b3('C#5', 'A4', 'F#4')] },
  { measure: 6, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), ...b3('A4', 'En4', 'C#4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r16'), n('C#4', 's'), n('B3', 's'), n('C#4', 's'), ...s4('D#4', 'E#4', 'F#4', 'G#4')] },
  { measure: 8, slurEnd: 1, notes: [n('C#4', 'q', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('C#4', 'E#4', 'G#4')] },
  { measure: 10, slurEnd: 2, notes: [...b2('B4', 'A4'), n('C#5', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('F#4', 'A#4', 'C#5')] },
  { measure: 12, slurEnd: 2, notes: [...b2('C#5', 'B4'), n('D5', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r16'), n('D5', 's'), n('C#5', 's'), n('B4', 's'), ...s4('A4', 'Gn4', 'F#4', 'E4')] },
  { measure: 14, slurEnd: 0, notes: [n('D4', 'h')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r16'), n('C#4', 's'), n('D#4', 's'), n('E#4', 's'), ...s4('F#4', 'G#4', 'B4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('F#4', 'q', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX9_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'F#m', slurStart: 0, slurEnd: 2, notes: [n('F#4', 'ed'), n('E#4', 's'), n('F#4', 'h')] },
  { measure: 2, slurStart: 0, slurEnd: 2, notes: [n('G#4', 'ed'), n('A4', 's'), n('G#4', 'h', { tieStart: true })] },
  { measure: 3, slurStart: 0, notes: [...b2('G#4', 'F#4'), ...b2('A4', 'C#5'), ...b2('E5', 'D5')] },
  { measure: 4, slurEnd: 0, notes: [n('C#5', 'hd')] },
  { measure: 5, slurStart: 0, slurEnd: 2, notes: [n('C#5', 'ed'), n('D5', 's'), n('C#5', 'h')] },
  { measure: 6, slurStart: 0, slurEnd: 2, notes: [n('B4', 'ed'), n('C#5', 's'), n('A4', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...b2('A4', 'G#4'), ...b2('F#4', 'E#4'), ...b2('D#4', 'E#4')] },
  { measure: 8, slurEnd: 0, notes: [n('C#4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('C#5', 'q', { tieStart: true }), ...t3('C#5', 'B4', 'A4'), ...t3('G#4', 'F#4', 'E#4')] },
  { measure: 10, slurEnd: 1, notes: [n('G#4', 'q'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...t3('A4', 'G#4', 'F#4'), ...t3('E#4', 'D#4', 'C#4')] },
  { measure: 12, slurEnd: 1, notes: [n('E#4', 'q'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, slurEnd: 2, notes: [n('F#4', 'ed'), n('E#4', 's'), n('F#4', 'h')] },
  { measure: 14, slurStart: 0, slurEnd: 2, notes: [n('G#4', 'ed'), n('A4', 's'), n('B4', 'h', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [n('B4', 'q'), ...b2('An4', 'G#4'), ...b2('F#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('F#4', 'q', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE14_EX10_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'F#m', notes: [n('REST', 'r4'), n('C#5', 'q', { tieStart: true }), ...b4('C#5', 'A4', 'G#4', 'F#4')] },
  { measure: 2, slurStart: 0, slurEnd: 2, notes: [n('E#4', 'qdd'), n('C#4', 's'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('C#4', 'q'), n('E#4', 'q'), n('G#4', 'q'), n('B4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('C#5', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, slurEnd: 2, notes: [n('A4', 'qd'), ...s2('G#4', 'F#4'), n('G#4', 'q'), n('E#4', 'q')] },
  { measure: 6, slurStart: 0, slurEnd: 3, notes: [n('B4', 'qd'), ...s2('A4', 'G#4'), n('B4', 'q', { tieStart: true }), n('B4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'q', { tieStop: true }), ...b4('B4', 'A4', 'G#4', 'F#4'), n('E#4', 'ed'), n('D#4', 's')] },
  { measure: 8, slurEnd: 1, notes: [n('C#4', 'q', { tieStart: true }), n('C#4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, notes: [n('REST', 'r4'), n('C#5', 'q', { tieStart: true }), n('C#5', 'ed'), n('G#4', 's'), n('A4', 'ed'), n('B4', 's')] },
  { measure: 10, notes: [n('A4', 'qd'), ...s2('C#4', 'C#4'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, notes: [n('REST', 'r4'), n('A4', 'q', { tieStart: true }), ...b4('A4', 'G#4', 'F#4', 'F#4')] },
  { measure: 12, notes: [n('F#4', 'qd'), ...s2('F#4', 'F#4'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, notes: [n('REST', 'r8'), n('F#4', 'q'), n('E#4', 'q'), n('F#4', 'e'), n('G#4', 'ed'), n('A4', 's')] },
  { measure: 14, slurStart: 0, notes: [n('B4', 'h', { tieStart: true }), ...b4('B4', 'C#4', 'D#4', 'E#4')] },
  { measure: 15, slurEnd: 3, notes: [n('F#4', 'ed'), n('G#4', 's'), n('A4', 'ed'), n('B4', 's'), ...b4('F#4', 'G#4', 'A4', 'B4')] },
  { measure: 16, notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE14_EX11_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Em', notes: [...eds('B4', 'C5'), n('B4', 'e'), ...eds('B4', 'C5'), n('B4', 'e')] },
  { measure: 2, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, notes: [...eds('A4', 'B4'), n('A4', 'e'), ...eds('A4', 'B4'), n('A4', 'e')] },
  { measure: 4, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, notes: [...eds('G4', 'A4'), n('G4', 'e'), n('C5', 'qd')] },
  { measure: 6, notes: [...eds('F#4', 'G4'), n('F#4', 'e'), n('B4', 'qd')] },
  { measure: 7, notes: [...eds('E4', 'F#4'), n('E4', 'e'), ...eds('D4', 'E4'), n('D4', 'e')] },
  { measure: 8, notes: [...b3('C#4', 'E4', 'A#3'), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, notes: [n('B4', 'ed'), n('Cn5', 's'), n('B4', 'e'), ...eds('B4', 'C5'), n('B4', 'e')] },
  { measure: 10, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, notes: [...eds('A4', 'B4'), n('A4', 'e'), ...eds('Gn4', 'A4'), n('G4', 'e')] },
  { measure: 12, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, notes: [...eds('G4', 'A4'), n('G4', 'e'), ...eds('F#4', 'G4'), n('F#4', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('E4', 'qd'), ...s4('E#4', 'F#4', 'G4', 'A4'), n('B4', 's'), n('C#5', 's')] },
  { measure: 15, slurEnd: 2, notes: [n('D5', 'qd'), ...eds('F#4', 'D#4'), n('E4', 'e')] },
  { measure: 16, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX12_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Em', notes: [n('E4', 'e'), ...s2('F#4', 'G4'), n('E4', 'e'), n('E4', 'e'), ...s2('F#4', 'G4'), n('E4', 'e')] },
  { measure: 2, notes: [n('E4', 'e'), ...s4('D#4', 'C#4', 'D#4', 'B3'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, notes: [n('E4', 'e'), ...s2('F#4', 'G4'), n('E4', 'e'), n('E4', 'e'), ...s2('F#4', 'G4'), n('E4', 'e')] },
  { measure: 4, notes: [n('E4', 'e'), ...s4('D4', 'C4', 'D4', 'B3'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'qd'), ...s4('B4', 'A#4', 'B4', 'C#5'), n('D5', 's'), n('E5', 's')] },
  { measure: 6, slurEnd: 3, notes: [...b3('D#5', 'B4', 'F#4'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, notes: [n('REST', 'r8'), ...s2('B4', 'A4'), n('G4', 'e'), n('REST', 'r8'), ...s2('G4', 'F#4'), n('E4', 'e')] },
  { measure: 8, notes: [n('REST', 'r8'), ...s2('E4', 'D#4'), n('C#4', 'e'), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, notes: [n('E4', 'e'), ...s2('F#4', 'G4'), n('E4', 'e'), n('E4', 'e'), ...s2('F#4', 'G4'), n('E4', 'e')] },
  { measure: 10, notes: [n('E4', 'e'), ...s4('D#4', 'C#4', 'D#4', 'B3'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, notes: [n('E4', 'e'), ...s2('F#4', 'Gn4'), n('E4', 'e'), n('E4', 'e'), ...s2('F#4', 'G4'), n('E4', 'e')] },
  { measure: 12, notes: [n('E4', 'e'), ...s4('D#4', 'C#4', 'D#4', 'B3'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'qd'), ...s4('B4', 'A4', 'G4', 'F#4'), n('E4', 's'), n('F#4', 's')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, notes: [n('REST', 'r8'), ...s2('E4', 'F#4'), n('G4', 'e'), n('REST', 'r8'), ...s2('G4', 'A4'), n('B4', 'e')] },
  { measure: 16, notes: [n('REST', 'r8'), ...s2('B4', 'C#5'), n('D#5', 'e'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX13_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Em', slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'G4', 'B4'), ...b3('E5', 'B4', 'D#5')] },
  { measure: 2, slurEnd: 1, notes: [n('E5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'G4', 'B4'), ...b3('E5', 'B4', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('E5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 4, notes: [...eds('B4', 'A#4'), n('B4', 'e'), n('C#5', 'qd'), n('A4', 'qd')] },
  { measure: 6, slurStart: 0, slurEnd: 4, notes: [...eds('D#5', 'C#5'), n('D#5', 'e'), n('E5', 'qd'), n('B4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...eds('B4', 'C5'), n('B4', 'e'), ...eds('A4', 'G4'), n('F#4', 'e'), ...eds('E4', 'D#4'), n('C#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('B3', 'hd', { tieStart: true }), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('B3', 'qd', { tieStart: true }), ...b3('B3', 'E4', 'G4'), ...b3('B4', 'A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('B3', 'qd', { tieStart: true }), ...b3('B3', 'D#4', 'F#4'), ...b3('A4', 'G4', 'F#4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, slurEnd: 4, notes: [...eds('E4', 'D#4'), n('E4', 'e'), n('G4', 'qd'), n('B3', 'qd')] },
  { measure: 14, slurStart: 0, slurEnd: 3, notes: [...eds('E4', 'F#4'), n('G4', 'e'), n('A4', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...eds('G4', 'A4'), n('B4', 'e'), ...eds('C5', 'B4'), n('A4', 'e'), ...eds('B4', 'C#5'), n('D#5', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX14_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'Em', notes: [...eds('E4', 'D#4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4'), ...eds('E4', 'D#4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 2, slurStart: 0, slurEnd: 7, notes: [n('B4', 'q', { tieStart: true }), ...s2('B4', 'C5'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'E5'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, notes: [...eds('G4', 'F#4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4'), ...eds('G4', 'F#4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 4, slurStart: 0, slurEnd: 7, notes: [n('B4', 'q', { tieStart: true }), ...s2('B4', 'C5'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'E4'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'qd'), ...b3('E4', 'B4', 'G4')] },
  { measure: 6, slurEnd: 4, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), ...s2('G4', 'F#4'), n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'qd'), ...b3('D#4', 'F#4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('D#4', 'hd', { tieStart: true }), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, notes: [n('B4', 'q', { tieStart: true }), ...s2('B4', 'A#4'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C#5', 'q', { tieStart: true }), ...s2('C#5', 'B4'), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, slurStart: 0, slurEnd: 7, notes: [n('D5', 'qd'), ...b3('C#5', 'B4', 'C#5'), n('D5', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, notes: [n('E4', 'q', { tieStart: true }), ...s2('E4', 'D#4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F#4', 'q', { tieStart: true }), ...s2('F#4', 'G4'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, slurStart: 0, slurEnd: 7, notes: [n('G#4', 'qd'), ...b3('G#4', 'A4', 'G#4'), n('A4', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, slurEnd: 9, notes: [n('B4', 'q', { tieStart: true }), ...s2('B4', 'A4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'F#4'), n('E4', 'q', { tieStart: true }), ...s2('E4', 'D#4'), n('C#4', 'qd')] },
  { measure: 14, slurStart: 0, slurEnd: 9, notes: [n('G4', 'q', { tieStart: true }), ...s2('G4', 'F#4'), n('E4', 'q', { tieStart: true }), ...s2('E4', 'D#4'), n('C#4', 'q', { tieStart: true }), ...s2('C#4', 'B3'), n('B3', 'qd')] },
  { measure: 15, notes: [...eds('E4', 'D#4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4'), ...eds('B3', 'C#4'), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 16, slurStart: 0, slurEnd: 7, notes: [n('B3', 'q', { tieStart: true }), ...s2('B3', 'C#4'), n('B3', 'q', { tieStart: true }), ...s2('B3', 'D#4'), n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX15_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Bm', notes: [n('REST', 'r8'), n('B3', 'e'), n('D4', 'e', { tieStart: true }), n('D4', 'e'), n('F#4', 'e'), n('B4', 'e')] },
  { measure: 2, notes: [...b3('B4', 'A#4', 'D5'), n('F#4', 'qd')] },
  { measure: 3, notes: [n('REST', 'r8'), n('F#4', 'e'), n('G#4', 'e', { tieStart: true }), ...b3('G#4', 'B4', 'E5')] },
  { measure: 4, notes: [...b3('E5', 'D5', 'C#5'), n('B4', 'qd')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...s4('D5', 'C#5', 'B4', 'A4'), n('G4', 's'), n('F#4', 's')] },
  { measure: 6, slurEnd: 2, notes: [n('E4', 'q', { tieStart: true }), ...s2('E4', 'F#4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('C#5', 'qd', { tieStart: true }), ...s4('C#5', 'B4', 'A4', 'G4'), n('F#4', 's'), n('E4', 's')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r8'), n('D4', 'e'), n('E4', 'e', { tieStart: true }), ...b3('E4', 'G4', 'Cn5')] },
  { measure: 10, notes: [...b3('B4', 'A4', 'D5'), n('G4', 'qd')] },
  { measure: 11, notes: [n('REST', 'r8'), n('E4', 'e'), n('F#4', 'e', { tieStart: true }), ...b3('F#4', 'B4', 'D5')] },
  { measure: 12, notes: [...b3('D5', 'C#5', 'G4'), n('F#4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...s4('B4', 'An4', 'G4', 'F#4'), n('E4', 's'), n('D4', 's')] },
  { measure: 14, slurEnd: 2, notes: [n('C#4', 'qd', { tieStart: true }), ...s2('C#4', 'D4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...s4('G4', 'F#4', 'E4', 'D4'), n('C#4', 's'), n('A#3', 's')] },
  { measure: 16, slurEnd: 1, notes: [n('B3', 'qd', { tieStart: true }), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX16_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Bm', slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), ...s2('G4', 'F#4'), n('E4', 'q'), ...s2('D4', 'E4')] },
  { measure: 2, slurEnd: 1, notes: [n('F#4', 'hd', { tieStart: true }), n('F#4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('B3', 'qd', { tieStart: true }), ...b3('B3', 'C#4', 'D4'), ...b3('F#4', 'B4', 'D5')] },
  { measure: 4, slurEnd: 2, notes: [n('C#5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), ...s2('G4', 'F#4'), n('E4', 'q'), ...s2('D4', 'E4')] },
  { measure: 6, slurEnd: 1, notes: [n('F#4', 'hd', { tieStart: true }), n('F#4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('C#4', 'qd', { tieStart: true }), ...b3('C#4', 'E4', 'G4'), ...b3('B4', 'D5', 'F#5')] },
  { measure: 8, slurEnd: 2, notes: [n('E5', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...eds('D5', 'C#5'), n('B4', 'e'), ...eds('A#4', 'G#4'), n('B4', 'e')] },
  { measure: 10, slurEnd: 2, notes: [n('B4', 'qd'), n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('Gn4', 'qd', { tieStart: true }), ...eds('G4', 'F#4'), n('E4', 'e'), ...eds('D#4', 'C#4'), n('E4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'q'), ...s2('G4', 'F#4'), n('F#4', 'qd')] },
  { measure: 14, slurEnd: 4, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), ...s2('B4', 'C#5'), n('D5', 'qd')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b2('F#4', 'G#4'), ...b3('A#4', 'B4', 'C#5'), ...b3('D5', 'C#5', 'E5')] },
  { measure: 16, slurEnd: 2, notes: [n('C#5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX17_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'Bm', slurStart: 0, notes: [n('B3', 'hd', { tieStart: true }), ...b3('B3', 'D4', 'F#4'), ...b3('B4', 'A4', 'F#4')] },
  { measure: 2, slurEnd: 4, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'q'), ...s2('C#4', 'D4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C#4', 'q', { tieStart: true }), ...s2('C#4', 'D4'), n('E4', 'q', { tieStart: true }), ...s2('E4', 'F#4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'A#4'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'C#5')] },
  { measure: 4, slurEnd: 2, notes: [n('D5', 'hd'), n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('F#4', 'hd', { tieStart: true }), ...b3('F#4', 'A#4', 'C#5'), ...b3('E5', 'D5', 'Cn5')] },
  { measure: 6, slurEnd: 4, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), ...s2('E#4', 'F#4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F#4', 'q', { tieStart: true }), ...s2('F#4', 'G#4'), n('A#4', 'q', { tieStart: true }), ...s2('A#4', 'B4'), n('C#5', 'q', { tieStart: true }), n('C#5', 'e')] },
  { measure: 8, slurEnd: 2, notes: [n('D5', 'hd'), n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, slurEnd: 7, notes: [...eds('B4', 'C#5'), n('B4', 'e'), n('D5', 'qd'), ...eds('D5', 'C#5'), n('B4', 'e'), n('Cn5', 'qd')] },
  { measure: 10, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...eds('A4', 'G4'), n('F#4', 'e'), ...b3('G4', 'E4', 'C#4')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, slurEnd: 9, notes: [n('F#4', 'qd', { tieStart: true }), ...b3('F#4', 'B4', 'D5'), n('F#4', 'qd', { tieStart: true }), ...b3('F#4', 'C#5', 'E5')] },
  { measure: 13, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...eds('D5', 'C#5'), n('B4', 'e'), ...eds('D5', 'C#5'), n('A#4', 'e'), n('B4', 'qd', { tieStart: true })] },
  { measure: 14, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX18_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'F#m', slurStart: 1, notes: [n('REST', 'r4'), ...s2('F#4', 'Gn4'), n('G4', 'qd', { tieStart: true })] },
  { measure: 2, slurEnd: 3, notes: [n('G4', 'q'), n('F#4', 'e'), n('B4', 'q'), n('E#4', 'e')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), ...s2('F#4', 'G4'), n('G4', 'qd', { tieStart: true })] },
  { measure: 4, slurEnd: 3, notes: [n('G4', 'q'), n('F#4', 'e'), n('C#4', 'q'), n('E#4', 'e')] },
  { measure: 5, slurStart: 3, notes: [n('F#4', 'e'), n('REST', 'r4'), n('REST', 'r16'), n('F#4', 's'), ...s4('G#4', 'A4', 'B4', 'C#5')] },
  { measure: 6, slurEnd: 3, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'B4', 'G#4')] },
  { measure: 7, slurStart: 3, notes: [n('B4', 'e'), n('REST', 'r4'), n('REST', 'r16'), n('C#4', 's'), ...s4('D#4', 'E#4', 'F#4', 'G#4')] },
  { measure: 8, slurEnd: 3, notes: [n('A4', 'qd', { tieStart: true }), ...b3('A4', 'F#4', 'C#4')] },
  { measure: 9, slurStart: 3, slurEnd: 5, notes: [n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...eds('F#4', 'E#4'), n('F#4', 'e')] },
  { measure: 10, slurStart: 0, slurEnd: 3, notes: [n('G#4', 'qd'), ...eds('F#4', 'E#4'), n('F#4', 'e')] },
  { measure: 11, slurStart: 0, slurEnd: 3, notes: [n('A4', 'qd'), ...eds('G#4', 'F#4'), n('G#4', 'e')] },
  { measure: 12, slurStart: 0, slurEnd: 3, notes: [n('B4', 'q'), n('An4', 'e'), n('G#4', 'q'), n('C#4', 'e')] },
  { measure: 13, slurStart: 3, slurEnd: 7, notes: [n('F#4', 'e'), n('REST', 'r4'), n('REST', 'r16'), n('C#4', 's'), ...s4('D#4', 'E#4', 'F#4', 'G#4')] },
  { measure: 14, slurStart: 3, slurEnd: 7, notes: [n('A4', 'e'), n('REST', 'r4'), n('REST', 'r16'), n('C#4', 's'), ...s4('D#4', 'E#4', 'F#4', 'G#4')] },
  { measure: 15, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true })] },
  { measure: 16, slurEnd: 0, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX19_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'F#m', slurStart: 2, slurEnd: 3, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F#4', 'qd'), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, slurStart: 2, slurEnd: 3, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F#4', 'qd'), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F#4', 'q'), n('E#4', 'e'), n('G#4', 'q'), n('E#4', 'e')] },
  { measure: 4, notes: [n('F#4', 'hd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 2, slurEnd: 3, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, slurStart: 2, slurEnd: 3, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D5', 'q'), n('C#5', 'e'), n('D5', 'q'), n('B#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C#5', 'hd', { tieStart: true }), n('C#5', 'qd')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...b3('D5', 'A4', 'Gn4'), ...b3('F#4', 'G4', 'A4')] },
  { measure: 10, slurEnd: 0, notes: [n('D4', 'hd'), n('B4', 'qd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'G#4', 'F#4'), ...b3('E#4', 'F#4', 'G#4')] },
  { measure: 12, slurEnd: 1, notes: [n('C#4', 'hd', { tieStart: true }), n('C#4', 'qd')] },
  { measure: 13, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r4'), n('F#4', 'e'), n('E#4', 'q'), n('F#4', 'e'), n('D4', 'qd')] },
  { measure: 14, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r4'), n('F#4', 'e'), n('E#4', 'q'), n('F#4', 'e'), n('D4', 'qd')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b2('F#4', 'E#4'), ...b3('F#4', 'D#4', 'E#4'), ...b3('F#4', 'C#4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('F#4', 'hd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE14_EX20_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'F#m', notes: [n('REST', 'r4'), n('C#4', 'e'), n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('C#4', 'e'), n('G#4', 'q'), n('C#4', 'e')] },
  { measure: 2, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), ...s2('E#4', 'G#4'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, notes: [n('REST', 'r4'), n('F#4', 'e'), n('D5', 'qd', { tieStart: true }), n('D5', 'q'), n('B4', 'e'), n('G#4', 'q'), n('E#4', 'e')] },
  { measure: 4, notes: [n('C#5', 'qd', { tieStart: true }), n('C#5', 'q'), ...s2('A#4', 'B4'), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'q'), n('C#5', 'e'), n('Bn4', 'q'), n('A4', 'e')] },
  { measure: 6, slurEnd: 5, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'q'), n('F#4', 'e'), n('C#4', 'qd', { tieStart: true }), n('C#4', 'q'), n('C#5', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'q'), n('Gn4', 'e'), n('F#4', 'q'), n('E#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C#4', 'hd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r4'), n('C#4', 'e'), n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('C#4', 'e'), n('G#4', 'q'), n('C#4', 'e')] },
  { measure: 10, notes: [n('E#4', 'hd'), n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, notes: [n('REST', 'r4'), n('C#4', 'e'), n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('C#4', 'e'), n('G#4', 'q'), n('C#4', 'e')] },
  { measure: 12, notes: [n('F#4', 'hd'), n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r4'), n('F#4', 'e'), n('D5', 'q'), n('D5', 'e'), n('B4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('F#4', 'e')] },
  { measure: 14, slurEnd: 2, notes: [n('C#5', 'hd'), n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('C#4', 'e'), n('F#4', 'q'), n('F#4', 'e'), n('G#4', 'q'), n('A4', 'e'), n('E#4', 'q'), n('F#4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('F#4', 'hd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

// Série 15: Tonalidade dos bemóis (Fá Maior - Sib Maior - Mib Maior)
const POZZOLI_SERIE15_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'F', notes: [n('A4', 'e'), n('A4', 'q', { tieStart: true }), n('F4', 'e')] },
  { measure: 2, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...s4('C4', 'D4', 'E4', 'F4'), ...b2('G4', 'A4')] },
  { measure: 4, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'e'), n('Bb4', 'q', { tieStart: true }), n('G4', 'e')] },
  { measure: 6, slurEnd: 4, notes: [...s4('G4', 'F#4', 'G4', 'A4'), n('Bn4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'ed'), n('Bn4', 's'), ...b2('C5', 'G#4')] },
  { measure: 8, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 9, notes: [n('An4', 'e'), n('Ab4', 'q', { tieStart: true }), n('G4', 'e')] },
  { measure: 10, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 11, notes: [n('F4', 'e'), n('G4', 'q', { tieStart: true }), n('C#4', 'e')] },
  { measure: 12, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...s4('D4', 'E4', 'F4', 'G4'), ...b2('A4', 'Bb4')] },
  { measure: 14, slurStart: 0, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...s4('C4', 'D4', 'E4', 'F4'), ...b2('G4', 'A4')] },
  { measure: 16, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX2_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'F', slurStart: 0, notes: [n('C4', 'qd'), ...s2('F4', 'G4')] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'e'), n('F4', 'q', { tieStart: true }), n('F4', 'e')] },
  { measure: 3, slurStart: 0, notes: [...eds('F4', 'G4'), ...eds('G4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 2, notes: [n('F4', 'qd'), ...s2('A4', 'Bb4')] },
  { measure: 6, notes: [n('C5', 'e'), n('C5', 'q', { tieStart: true }), n('A4', 'e')] },
  { measure: 7, slurStart: 0, notes: [...eds('G4', 'C5'), n('Bn4', 'ed'), n('D5', 's')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Cb5', 'qd'), ...s2('Bb4', 'Ab4')] },
  { measure: 10, slurEnd: 2, notes: [n('G4', 'e'), n('C4', 'q', { tieStart: true }), n('F4', 'e')] },
  { measure: 11, slurStart: 0, notes: [n('Bb4', 'q', { tieStart: true }), ...s4('Bb4', 'A4', 'G4', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C#5', 'qd'), ...s2('Cn5', 'D5')] },
  { measure: 14, slurEnd: 3, notes: [...b2('E5', 'D5'), ...b2('Bb4', 'G4')] },
  { measure: 15, slurStart: 0, notes: [...eds('F4', 'G4'), ...eds('G4', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX3_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'F', slurStart: 0, notes: [n('C4', 'h'), n('G4', 'ed'), n('F4', 's')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'q'), n('F4', 'h', { tieStart: true })] },
  { measure: 3, slurStart: 1, notes: [...b4('F4', 'F4', 'A4', 'G4'), ...b2('F4', 'Bb4')] },
  { measure: 4, slurEnd: 2, notes: [n('A4', 'q'), n('C5', 'q', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('F4', 'h'), n('A4', 'ed'), n('C5', 's')] },
  { measure: 6, slurEnd: 1, notes: [n('A4', 'q'), n('G#4', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 2, notes: [...b2('G#4', 'A4'), ...t3('D5', 'Cn5', 'B4'), ...b2('C5', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), n('Bb4', 'qd'), n('F#4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'q'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), n('Bb4', 'qd'), n('E4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C4', 'h'), n('G4', 'ed'), n('Gb4', 's')] },
  { measure: 14, slurEnd: 1, notes: [n('Gb4', 'q'), n('F4', 'h', { tieStart: true })] },
  { measure: 15, slurStart: 1, notes: [...b4('F4', 'Gn4', 'Bb4', 'A4'), ...b2('C5', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE15_EX4_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Bb', slurStart: 0, slurEnd: 4, notes: [n('F4', 'h', { tieStart: true }), ...s2('F4', 'G4'), ...s2('F4', 'G4'), n('A4', 'e'), n('D4', 'e')] },
  { measure: 2, slurStart: 0, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'ed'), n('F4', 's'), n('D4', 'h')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'ed'), n('B4', 's'), n('A4', 'h'), n('A4', 'q')] },
  { measure: 5, slurStart: 0, slurEnd: 4, notes: [n('G4', 'h', { tieStart: true }), ...s2('G4', 'F#4'), ...s2('G4', 'A4'), n('Bb4', 'e'), n('C4', 'e')] },
  { measure: 6, slurStart: 0, notes: [n('C5', 'w', { tieStart: true })] },
  { measure: 7, slurEnd: 6, notes: [...s4('C5', 'Bn4', 'C5', 'D5'), ...s4('E5', 'D5', 'C5', 'Bb4'), ...b2('A4', 'G4'), n('G4', 'ed'), n('F4', 's')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, slurEnd: 4, notes: [n('F4', 'h', { tieStart: true }), ...s2('F4', 'G4'), ...s2('F4', 'G4'), n('A4', 'e'), n('G4', 'e')] },
  { measure: 10, slurStart: 0, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'ed'), n('F4', 's'), n('D4', 'h')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'ed'), n('B4', 's'), n('A4', 'h'), n('A4', 'q')] },
  { measure: 13, slurStart: 0, slurEnd: 4, notes: [n('B4', 'h', { tieStart: true }), ...s2('B4', 'A4'), ...s2('B4', 'C5'), n('B4', 'q')] },
  { measure: 14, slurStart: 0, slurEnd: 1, notes: [n('Db5', 'h', { tieStart: true }), n('Db5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('B4', 'G4'), n('D4', 'q'), n('G4', 'ed'), n('A4', 's')] },
  { measure: 16, slurStart: 0, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'q'), n('REST', 'r4')] }
];

const POZZOLI_SERIE15_EX5_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Bb', notes: [...b2('B4', 'D4'), ...b2('F4', 'B3')] },
  { measure: 2, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 3, notes: [...b2('G4', 'C5'), ...b2('F4', 'E5')] },
  { measure: 4, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, notes: [...b2('C5', 'E4'), ...b2('G4', 'C4')] },
  { measure: 6, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 7, notes: [...b2('En4', 'G4'), ...b2('C4', 'B4')] },
  { measure: 8, notes: [n('A4', 'h')] },
  { measure: 9, notes: [...b2('B4', 'G4'), n('REST', 'r8'), n('Db5', 'e')] },
  { measure: 10, notes: [...b2('C5', 'G4'), n('A4', 'q')] },
  { measure: 11, notes: [...b2('G4', 'E4'), n('REST', 'r8'), n('Bb4', 'e')] },
  { measure: 12, notes: [...b2('A4', 'F#4'), n('G4', 'q')] },
  { measure: 13, notes: [...b2('G4', 'D4'), ...b2('F4', 'C4')] },
  { measure: 14, notes: [...b2('E4', 'G4'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 15, notes: [...b2('G4', 'C5'), ...b2('F4', 'A4')] },
  { measure: 16, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX6_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Bb', slurStart: 0, notes: [n('D4', 'hd', { tieStart: true })] },
  { measure: 2, slurEnd: 3, notes: [n('D4', 'ed'), n('C4', 's'), n('G4', 'h')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'hd', { tieStart: true })] },
  { measure: 4, slurEnd: 3, notes: [n('F4', 'ed'), n('E4', 's'), n('B4', 'h')] },
  { measure: 5, slurStart: 0, slurEnd: 1, notes: [...b2('G4', 'E4'), n('REST', 'r8'), n('B4', 'e'), ...b2('G4', 'B4')] },
  { measure: 6, slurStart: 0, slurEnd: 1, notes: [...b2('G4', 'E4'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, slurEnd: 1, notes: [...b2('G4', 'En4'), n('REST', 'r8'), n('D5', 'e'), ...b2('F4', 'D5')] },
  { measure: 8, slurStart: 0, slurEnd: 1, notes: [n('C5', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('F4', 'h'), n('F#4', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 3, notes: [n('F#4', 'ed'), n('G4', 's'), n('G4', 'h')] },
  { measure: 11, slurStart: 1, notes: [n('A4', 'h'), n('C5', 'q', { tieStart: true })] },
  { measure: 12, slurEnd: 2, notes: [n('C5', 'ed'), n('B4', 's'), n('D5', 'h')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('REST', 'r16'), n('D5', 's'), n('C5', 'ed'), n('B4', 's'), n('B4', 'ed'), n('C5', 's')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'q'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('REST', 'r16'), n('A4', 's'), n('G4', 'ed'), n('F4', 's'), n('E4', 'ed'), n('D4', 's')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE15_EX7_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Bb', slurStart: 0, slurEnd: 1, notes: [n('B4', 'ed'), n('A4', 's'), n('G4', 'q', { tieStart: true }), ...b4('G4', 'G4', 'G4', 'F4')] },
  { measure: 2, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, slurEnd: 1, notes: [n('G4', 'ed'), n('F4', 's'), n('E4', 'qd', { tieStart: true }), ...s2('E4', 'D4'), n('C4', 'e'), n('B4', 'e')] },
  { measure: 4, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...s2('E4', 'En4')] },
  { measure: 5, notes: [n('G4', 'ed'), n('E4', 's'), n('E4', 'e'), n('G4', 'e'), n('A4', 'ed'), n('E4', 's'), n('E4', 'e'), n('C5', 'e')] },
  { measure: 6, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('C5', 'ed'), n('B4', 's')] },
  { measure: 7, slurStart: 0, slurEnd: 5, notes: [n('B4', 'q'), n('C5', 'ed'), n('B4', 's'), n('B4', 'ed'), n('G4', 's'), n('F4', 'q', { tieStart: true })] },
  { measure: 8, notes: [n('F4', 'qdd'), n('E4', 's'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('F4', 'ed'), n('D5', 's'), n('D5', 'qd', { tieStart: true }), ...s2('D5', 'C5'), n('B4', 'e'), n('E5', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), ...s4('G4', 'A4', 'B4', 'C5')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'h', { tieStart: true }), ...s2('D5', 'C5'), n('B4', 'e'), n('A4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('C#5', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'ed'), n('G4', 's'), n('G4', 'qd', { tieStart: true }), ...s2('G4', 'F4'), n('En4', 'e'), n('B4', 'e')] },
  { measure: 14, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('G4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'ed'), n('G4', 's'), n('G4', 'qd', { tieStart: true }), ...s2('G4', 'Gb4'), n('F4', 'e'), n('A4', 'e')] },
  { measure: 16, notes: [n('B3', 'h', { tieStart: true }), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE15_EX8_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Eb', slurStart: 0, notes: [n('B4', 'q', { tieStart: true }), ...s4('B4', 'G4', 'F4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('B4', 'q'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 3, slurStart: 0, slurEnd: 1, notes: [...eds('G4', 'B4'), ...eds('G4', 'F4')] },
  { measure: 4, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'C5', 'F4', 'G4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 7, slurStart: 0, notes: [...t3('E4', 'G4', 'F4'), ...t3('E4', 'D4', 'C4')] },
  { measure: 8, slurEnd: 1, notes: [n('B3', 'q', { tieStart: true }), n('B3', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'q', { tieStart: true }), ...s4('B4', 'C5', 'B4', 'An4')] },
  { measure: 10, slurEnd: 1, notes: [n('Bn4', 'qdd'), n('Bn4', 's')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...eds('C5', 'G4')] },
  { measure: 12, notes: [n('A4', 'q'), ...b2('A4', 'A4')] },
  { measure: 13, slurStart: 0, notes: [...t3('G4', 'B4', 'A4'), ...t3('G4', 'F4', 'E4')] },
  { measure: 14, notes: [...b2('F4', 'G4'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'q', { tieStart: true }), ...s4('E4', 'F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE15_EX9_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Eb', slurStart: 0, notes: [n('G4', 'h'), ...t3('G4', 'F4', 'D4')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('G4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h'), ...t3('A4', 'G4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'h'), n('Bn4', 'q', { tieStart: true })] },
  { measure: 6, slurEnd: 7, notes: [n('Bn4', 'q', { tieStart: true }), ...t3('C5', 'Bb4', 'Ab4'), ...t3('G4', 'F4', 'E4')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'qd'), n('B4', 'e'), ...b2('E4', 'C5')] },
  { measure: 8, notes: [n('G4', 'h'), n('F#4', 'q', { tieStart: true })] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'h'), ...t3('Gn4', 'F#4', 'D4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('Gn4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'h'), ...t3('B4', 'An4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'h'), n('Bn4', 'q', { tieStart: true })] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...t3('C5', 'B4', 'Ab4'), ...t3('G4', 'F4', 'E4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'q'), n('B4', 'e'), n('REST', 'r8'), n('B3', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [n('B3', 'h'), ...t3('G4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE15_EX10_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Eb', slurStart: 0, slurEnd: 2, notes: [n('G4', 'qdd'), n('B4', 's'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 2, slurStart: 0, slurEnd: 3, notes: [n('Fn4', 'qd'), ...s2('G4', 'A4'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, slurEnd: 2, notes: [n('G4', 'qdd'), n('B4', 's'), n('B4', 'q'), n('G4', 'q')] },
  { measure: 4, slurStart: 0, notes: [n('Gb4', 'q', { tieStart: true }), ...s4('G4', 'E4', 'G4', 'F4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b3('E4', 'F4', 'G4'), n('G4', 'h', { tieStart: true })] },
  { measure: 6, notes: [...b4('G4', 'F4', 'G4', 'B4'), n('B4', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...b4('B4', 'B4', 'C5', 'E5'), ...b4('D5', 'C5', 'An4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, slurEnd: 2, notes: [n('G4', 'qdd'), n('B4', 's'), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 10, slurStart: 0, notes: [n('G4', 'qdd'), n('B4', 's'), n('E5', 'h', { tieStart: true })] },
  { measure: 11, slurEnd: 7, notes: [...b4('E5', 'Db5', 'C5', 'B4'), ...b4('A4', 'G4', 'Fn4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'h'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, slurEnd: 2, notes: [n('B3', 'qdd'), n('G4', 's'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 14, slurStart: 0, slurEnd: 2, notes: [n('B3', 'qdd'), n('A4', 's'), n('A4', 'h', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...b4('A4', 'F4', 'D4', 'B3'), ...b4('B4', 'G4', 'F4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE15_EX11_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'F', slurStart: 0, notes: [...s4('F4', 'E4', 'D4', 'C4'), ...s2('D4', 'E4'), ...s4('F4', 'E4', 'D4', 'C4'), ...s2('D4', 'E4')] },
  { measure: 2, slurEnd: 0, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s2('G4', 'F4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'C5')] },
  { measure: 4, slurEnd: 0, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...s4('F4', 'E4', 'D4', 'C4'), ...s2('D4', 'E4'), ...s4('F4', 'E4', 'D4', 'C#4'), ...s2('D4', 'E4')] },
  { measure: 6, slurEnd: 0, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s2('G4', 'F4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'Bn4')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'qd'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...s4('E4', 'D4', 'C4', 'D4'), ...s2('E4', 'F4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, slurStart: 0, notes: [...s4('G4', 'F4', 'E4', 'F4'), ...s2('G4', 'A4'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...s4('A4', 'G4', 'F4', 'G4'), ...s2('A4', 'B4'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, slurStart: 0, notes: [...s4('F4', 'E4', 'F4', 'G4'), ...s2('A4', 'B4'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...s4('C4', 'D4', 'E4', 'F4'), ...s2('G4', 'A4'), ...s4('G4', 'A4', 'B4', 'C5'), ...s2('D5', 'E5')] },
  { measure: 16, slurEnd: 1, notes: [n('F5', 'qd', { tieStart: true }), n('F5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX12_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'F', slurStart: 0, slurEnd: 4, notes: [n('F4', 'ed'), n('G4', 's'), n('A4', 's'), n('G4', 's'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, slurStart: 0, slurEnd: 4, notes: [n('F4', 'ed'), n('E4', 's'), n('D4', 's'), n('E4', 's'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, slurEnd: 6, notes: [n('REST', 'r16'), n('C4', 's'), n('G4', 's'), n('D5', 'e'), n('C5', 's'), n('Bn4', 'qd', { tieStart: true })] },
  { measure: 4, slurStart: 0, slurEnd: 4, notes: [n('Bb4', 'ed'), n('A4', 's'), n('G4', 's'), n('A4', 's'), n('Bb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 4, notes: [n('A4', 'ed'), n('G4', 's'), n('F4', 's'), n('G4', 's'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, slurStart: 1, notes: [n('REST', 'r16'), n('D4', 's'), n('A4', 's'), n('C5', 's'), n('Bn4', 's'), n('G#4', 's'), n('A4', 'qd')] },
  { measure: 7, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 8, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'A4', 'F4')] },
  { measure: 9, slurEnd: 1, notes: [n('F#4', 'qd'), n('Eb5', 'qd', { tieStart: true })] },
  { measure: 10, slurStart: 0, notes: [n('D5', 'qd'), ...b3('D5', 'Bb4', 'G4')] },
  { measure: 11, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, slurStart: 0, slurEnd: 3, notes: [n('E4', 'ed'), n('F4', 's'), n('G4', 's'), n('F4', 's'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, slurEnd: 3, notes: [n('E4', 'ed'), n('F4', 's'), n('G4', 's'), n('F4', 's'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, slurStart: 1, notes: [n('REST', 'r16'), ...s4('C4', 'D4', 'E4', 'F4'), n('G4', 's'), ...b3('B4', 'G4', 'E4')] },
  { measure: 15, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX13_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'F', slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'e'), n('F4', 'q', { tieStart: true }), ...s2('F4', 'G4'), n('A4', 'q', { tieStart: true }), ...s2('A4', 'Bb4')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'e'), n('F4', 'q', { tieStart: true }), ...s2('F4', 'G4'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'D5')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...eds('C4', 'D4'), n('E4', 'e'), ...eds('F4', 'G4'), ...eds('A4', 'Bb4'), n('A4', 'e')] },
  { measure: 6, slurEnd: 2, notes: [n('C5', 'qd'), n('C5', 'qd'), n('A4', 'qd')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...eds('G4', 'A4'), n('Bn4', 'e'), ...eds('C5', 'D5'), n('E5', 'q'), n('G4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...eds('C5', 'Bn4'), ...eds('Bb4', 'A4'), ...eds('G#4', 'A4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...eds('D5', 'Db5'), ...eds('C5', 'B4'), ...eds('A4', 'Gn4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r4'), n('F4', 'e'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'C5'), n('B4', 'q', { tieStart: true }), n('F5', 'e', { tieStart: true })] },
  { measure: 14, slurEnd: 0, notes: [n('C5', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r4'), n('C4', 'e'), n('F4', 'q', { tieStart: true }), ...s2('F4', 'G4'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('F4', 'hd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX14_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'F', slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'q'), ...s2('C5', 'D5'), n('C5', 'qd', { tieStart: true }), n('C5', 'q'), ...s2('C5', 'D5')] },
  { measure: 2, slurEnd: 3, notes: [n('C5', 'hd'), n('A4', 'e'), n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'G4', 'F4'), n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s2('G4', 'A4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'A4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'A4'), n('G4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 6, slurStart: 0, notes: [n('E4', 'q', { tieStart: true }), ...s2('E4', 'F4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'A4'), n('B4', 'qd'), n('C5', 'qd')] },
  { measure: 7, slurEnd: 1, notes: [n('C4', 'hd', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 8, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), ...eds('C4', 'D4'), n('E4', 'e'), n('F4', 'qd', { tieStart: true }), ...eds('F4', 'G4'), n('A4', 'e')] },
  { measure: 9, slurEnd: 1, notes: [n('G4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 10, slurStart: 0, notes: [n('B3', 'qd', { tieStart: true }), ...eds('B3', 'C4'), n('D4', 'e'), n('E4', 'qd', { tieStart: true }), ...eds('E4', 'F4'), n('G4', 'e')] },
  { measure: 11, slurEnd: 1, notes: [n('A4', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 12, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s2('A4', 'B4'), n('C5', 'q', { tieStart: true }), ...s2('C5', 'D5'), n('E5', 'qd'), n('C5', 'qd')] },
  { measure: 13, slurEnd: 1, notes: [n('C5', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 14, slurStart: 0, notes: [n('Fn4', 'q', { tieStart: true }), ...s2('F4', 'G4'), n('A4', 'q', { tieStart: true }), ...s2('A4', 'B4'), n('C5', 'qd'), n('E4', 'qd')] },
  { measure: 15, slurEnd: 1, notes: [n('F4', 'hd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX15_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'F', slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...s2('C5', 'D5'), n('C5', 'q', { tieStart: true }), ...s2('C5', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), ...eds('C4', 'D4'), n('E4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...s2('C5', 'D5'), n('C5', 'q', { tieStart: true }), ...s2('C5', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('Gn4', 'qd', { tieStart: true }), ...eds('G4', 'Fn4'), n('E#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('F5', 'h', { tieStart: true }), ...s4('F5', 'En5', 'D5', 'C5')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'qd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'h', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'A4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'q', { tieStart: true }), ...s2('B4', 'Ab4'), n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...s2('C5', 'Bn4'), n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX16_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Bb', slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'q'), n('C5', 'e'), ...eds('B4', 'D5'), n('C5', 'e')] },
  { measure: 2, slurEnd: 3, notes: [n('A4', 'q'), n('F4', 'e'), n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), n('G4', 'e'), ...eds('G4', 'B4'), n('A4', 'e')] },
  { measure: 4, slurEnd: 3, notes: [n('G4', 'q'), n('D4', 'e'), n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'e', { tieStart: true }), ...eds('C4', 'D4'), n('E4', 'qd'), n('G4', 'qd')] },
  { measure: 6, slurEnd: 2, notes: [n('E4', 'qd'), n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('Fn4', 'e', { tieStart: true }), ...eds('F4', 'G4'), n('A4', 'qd'), n('C5', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'qd')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'q'), n('C5', 'e'), n('G#4', 'ed'), n('An4', 's'), n('B4', 'e')] },
  { measure: 10, slurEnd: 2, notes: [n('C5', 'qd'), n('G4', 'qd'), n('An4', 'qd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('A4', 'e'), ...eds('A4', 'C5'), n('B4', 'e')] },
  { measure: 12, slurEnd: 2, notes: [n('C5', 'qd'), n('G4', 'qd'), n('A4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'qd'), ...eds('B4', 'G4'), n('F4', 'e'), ...eds('G4', 'F4'), n('E4', 'e')] },
  { measure: 14, slurEnd: 2, notes: [n('C4', 'qd'), n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...eds('F4', 'G4'), n('F4', 'e'), n('E4', 'q'), n('F4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('B3', 'qd', { tieStart: true }), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX17_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'Bb', slurStart: 0, notes: [n('F4', 'hd', { tieStart: true }), ...eds('F4', 'G4'), n('A4', 'e'), ...eds('G4', 'A4'), n('B4', 'e')] },
  { measure: 2, slurEnd: 4, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'F5', 'D5'), n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'hd', { tieStart: true }), ...eds('F4', 'G4'), n('A4', 'e'), ...eds('G4', 'A4'), n('B4', 'e')] },
  { measure: 4, slurEnd: 3, notes: [n('C5', 'e', { tieStart: true }), ...b2('C5', 'B4'), n('C5', 'qd', { tieStart: true }), n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 7, notes: [n('D5', 'qd', { tieStart: true }), ...s4('D5', 'C5', 'B4', 'A4'), n('G4', 's'), n('F#4', 's'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 6, slurStart: 0, slurEnd: 6, notes: [...eds('G4', 'A4'), n('B4', 'e'), ...eds('G4', 'A4'), n('B4', 'e'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, slurEnd: 7, notes: [n('C5', 'qd', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'G4'), n('F4', 's'), n('En4', 's'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 8, slurStart: 0, slurEnd: 6, notes: [...eds('F4', 'G4'), n('A4', 'e'), ...eds('F4', 'G4'), n('A4', 'e'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), ...b3('D5', 'D5', 'E5'), n('D5', 'q'), n('C5', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('Ab4', 'hd', { tieStart: true }), ...eds('A4', 'B4'), n('A4', 'e'), ...eds('A4', 'B4'), n('A4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, slurEnd: 7, notes: [n('F4', 'qd', { tieStart: true }), ...s4('F4', 'G4', 'F4', 'E4'), n('F4', 's'), n('G4', 's'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 14, slurStart: 0, slurEnd: 7, notes: [n('F4', 'qd', { tieStart: true }), ...s4('F4', 'G4', 'Fn4', 'E4'), n('F4', 's'), n('G4', 's'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...eds('G4', 'A4'), n('B4', 'e'), n('C5', 'qd', { tieStart: true }), n('C5', 'q'), n('D5', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX18_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Eb', slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), ...s2('C5', 'G4'), n('E4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), ...s2('G4', 'F4'), n('D4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 2, notes: [...eds('E4', 'D4'), n('C4', 'e'), ...eds('G4', 'F4'), n('D4', 'e')] },
  { measure: 6, slurStart: 0, slurEnd: 1, notes: [n('G4', 'qd'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...s4('G4', 'An4', 'B4', 'C5'), n('Dn5', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Gb4', 'qd', { tieStart: true }), n('G4', 'e'), ...s2('C5', 'G4'), n('E4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...s2('C5', 'Db5'), n('B4', 'e'), n('G4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, slurEnd: 2, notes: [...eds('F4', 'E4'), n('F4', 'e'), ...eds('A4', 'G4'), n('A4', 'e')] },
  { measure: 14, slurStart: 0, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('B3', 'qd', { tieStart: true }), ...s4('B3', 'Cn4', 'D4', 'E4'), n('F4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX19_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Eb', slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'q'), n('D4', 'e'), n('F4', 'q'), n('C4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), n('F4', 'e'), n('A4', 'q'), n('D4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 3, notes: [n('Gb4', 'e'), n('C5', 'ed'), n('B4', 's'), n('B4', 'hd')] },
  { measure: 6, slurStart: 0, slurEnd: 3, notes: [n('F4', 'e'), n('B4', 'ed'), n('A4', 's'), n('A4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...s4('E4', 'D4', 'C4', 'D4'), n('E4', 's'), n('F4', 's'), ...s4('G4', 'F4', 'E4', 'F4'), n('G4', 's'), n('An4', 's')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...eds('C5', 'Db5'), n('Gb4', 'e'), ...eds('C4', 'G4'), n('A4', 'e')] },
  { measure: 10, slurEnd: 2, notes: [n('B4', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('Db5', 'qd', { tieStart: true }), ...eds('D5', 'C5'), n('G4', 'e'), ...eds('D4', 'A4'), n('B4', 'e')] },
  { measure: 12, slurEnd: 2, notes: [n('C5', 'qd'), n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'qd', { tieStart: true }), ...eds('D5', 'C5'), n('An4', 'e'), ...eds('E4', 'B4'), n('C5', 'e')] },
  { measure: 14, slurEnd: 2, notes: [n('D5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('B3', 'qd', { tieStart: true }), ...s4('B3', 'Cn4', 'Dn4', 'E4'), n('F4', 's'), n('G4', 's'), ...s4('A4', 'B4', 'C5', 'D5'), n('E5', 's'), n('F5', 's')] },
  { measure: 16, slurEnd: 1, notes: [n('E5', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE15_EX20_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'Eb', slurStart: 0, notes: [n('E5', 'hd', { tieStart: true }), n('E5', 'q'), n('E4', 'e'), n('D5', 'q'), n('D5', 'e')] },
  { measure: 2, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'q'), n('E4', 'e'), n('B4', 'q'), n('B4', 'e')] },
  { measure: 3, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'q'), n('C4', 'e'), n('G4', 'q'), n('C4', 'e')] },
  { measure: 4, slurEnd: 4, notes: [n('F4', 'qd', { tieStart: true }), ...eds('F4', 'G4'), n('A4', 'e'), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'q'), n('D4', 'e'), n('Cn5', 'q'), n('C5', 'e')] },
  { measure: 6, notes: [n('B4', 'hd', { tieStart: true }), n('B4', 'q'), n('D4', 'e'), n('A4', 'q'), n('A4', 'e')] },
  { measure: 7, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), n('B4', 'e'), n('F4', 'qd', { tieStart: true }), n('F4', 'q'), n('B4', 'e')] },
  { measure: 8, slurEnd: 4, notes: [n('E4', 'qd', { tieStart: true }), ...eds('E4', 'F4'), n('G4', 'e'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('C4', 'qd'), n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'E4'), ...b3('F4', 'G4', 'A4')] },
  { measure: 10, slurEnd: 2, notes: [n('Db5', 'hd', { tieStart: true }), n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd'), n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4'), ...b3('B4', 'C5', 'D5')] },
  { measure: 12, slurEnd: 2, notes: [n('Eb5', 'hd', { tieStart: true }), n('E5', 'qd', { tieStart: true }), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'q'), n('E4', 'e'), n('B4', 'q'), n('B4', 'e')] },
  { measure: 14, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'q'), n('C4', 'e'), n('G4', 'q'), n('C4', 'e')] },
  { measure: 15, notes: [n('F4', 'hd', { tieStart: true }), n('F4', 'q'), n('B3', 'e'), n('E4', 'q'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

// Série 16: Tonalidades com bemóis (Ré menor - Sol menor - Dó menor)
const POZZOLI_SERIE16_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Dm', slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s4('D5', 'A4', 'B4', 'F4')] },
  { measure: 2, slurEnd: 0, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...eds('D4', 'G4'), ...eds('E4', 'A4')] },
  { measure: 4, slurEnd: 2, notes: [...s2e('F4', 'E4', 'D4'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s4('D5', 'A4', 'B4', 'F4')] },
  { measure: 6, slurEnd: 0, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...eds('C4', 'F4'), ...eds('D4', 'A4')] },
  { measure: 8, slurEnd: 2, notes: [...s2e('G4', 'F4', 'E4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'E4', 'F4', 'D4')] },
  { measure: 10, slurEnd: 0, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'E4', 'F4', 'C#4')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('G#4', 'qd'), n('D5', 'e', { tieStart: true })] },
  { measure: 14, slurStart: 1, notes: [n('D5', 'e'), ...s2('C5', 'B4'), ...b2('A4', 'B4')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'ed'), n('Bn4', 's'), n('C#5', 'ed'), n('A4', 's')] },
  { measure: 16, slurEnd: 0, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE16_EX2_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Dm', notes: [...s2('D4', 'E4'), n('F4', 'e', { tieStart: true }), ...s4('F4', 'E4', 'C#4', 'D4')] },
  { measure: 2, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r16'), n('D4', 's'), n('A4', 's'), n('F4', 's'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 4, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r16'), n('D4', 's'), n('A4', 's'), n('F4', 's'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 5, notes: [...s2('D4', 'E4'), n('F4', 'e', { tieStart: true }), ...s4('F4', 'E4', 'G4', 'A4')] },
  { measure: 6, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r16'), n('E4', 's'), n('B4', 's'), n('G4', 's'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 8, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r16'), n('E4', 's'), n('Bn4', 's'), n('G#4', 's'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 9, notes: [...s2('A4', 'Bb4'), n('C5', 'e', { tieStart: true }), ...s4('C5', 'B4', 'G4', 'E4')] },
  { measure: 10, slurStart: 0, slurEnd: 1, notes: [n('D5', 'q'), n('F4', 'e'), n('REST', 'r8')] },
  { measure: 11, notes: [...s2('F4', 'G4'), n('A4', 'e', { tieStart: true }), ...s4('A4', 'G4', 'E4', 'D4')] },
  { measure: 12, slurStart: 0, slurEnd: 1, notes: [n('B4', 'q'), n('C#4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r16'), n('D4', 's'), n('A4', 's'), n('F4', 's'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 14, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r16'), n('D4', 's'), n('A4', 's'), n('F4', 's'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r16'), n('D4', 's'), n('A4', 's'), n('F4', 's'), ...b2('D5', 'C#5')] },
  { measure: 16, slurStart: 0, slurEnd: 1, notes: [n('D5', 'q'), n('D4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX3_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Dm', slurStart: 0, notes: [n('A4', 'h'), n('A4', 'ed'), n('F4', 's')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('B4', 'h', { tieStart: true }), ...s4('B4', 'A4', 'G4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'q'), n('C#5', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'h', { tieStart: true }), ...s4('D5', 'B4', 'A4', 'G4')] },
  { measure: 6, slurEnd: 2, notes: [n('F4', 'ed'), n('E4', 's'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...t3('F4', 'A4', 'G4'), ...t3('F4', 'A4', 'G4'), ...t3('F4', 'G#4', 'A#4')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r8'), n('A4', 'e'), n('B4', 'qd'), n('G#4', 'e')] },
  { measure: 10, notes: [n('A4', 'q'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 11, notes: [n('REST', 'r8'), ...s2('C#4', 'D4'), n('E4', 'h')] },
  { measure: 12, notes: [n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 13, notes: [n('REST', 'r8'), ...s2('F4', 'G4'), n('A4', 'h')] },
  { measure: 14, slurStart: 0, notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'ed'), n('A4', 's')] },
  { measure: 15, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'q'), n('D5', 'q')] },
  { measure: 16, slurStart: 0, notes: [...t3('C5', 'D5', 'C5'), ...t3('C5', 'B4', 'A4'), ...t3('B4', 'Bn4', 'C#5')] },
  { measure: 17, slurEnd: 1, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX4_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Dm', notes: [n('REST', 'r8'), n('D4', 'e'), n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('F4', 'e'), n('REST', 'r16'), n('A4', 's'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 2, notes: [n('A4', 'qd'), ...s2('E4', 'F4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, notes: [n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('Bn4', 'e'), n('REST', 'r16'), n('C#5', 's'), n('REST', 'r16'), n('A4', 's')] },
  { measure: 4, slurStart: 0, notes: [n('D5', 'qd'), ...s2('Bn4', 'C#5'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 5, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'ed'), n('Bn4', 's'), n('Bn4', 'ed'), n('G4', 's')] },
  { measure: 6, slurEnd: 2, notes: [n('G#4', 'h'), n('D5', 'q', { tieStart: true }), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 7, notes: [n('REST', 'r8'), n('E4', 'e'), n('REST', 'r8'), n('F4', 'e'), n('REST', 'r8'), n('F#4', 'e'), n('REST', 'r16'), n('G4', 's'), n('REST', 'r16'), n('G#4', 's')] },
  { measure: 8, slurStart: 0, slurEnd: 4, notes: [n('A4', 'q', { tieStart: true }), ...s4('A4', 'E4', 'C4', 'A3'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'h', { tieStart: true }), ...t3('A4', 'Bb4', 'C5'), ...t3('A4', 'G4', 'F4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...t3('G4', 'A4', 'B4'), ...t3('G4', 'F#4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, notes: [n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e'), n('REST', 'r8'), n('C5', 'e'), n('REST', 'r16'), n('D5', 's'), n('REST', 'r16'), n('E5', 's')] },
  { measure: 14, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 15, notes: [n('REST', 'r8'), n('B3', 'e'), n('REST', 'r8'), n('Bn3', 'e'), n('REST', 'r8'), n('C4', 'e'), n('REST', 'r16'), n('C#4', 's'), n('REST', 'r16'), n('D4', 's')] },
  { measure: 16, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE16_EX5_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Gm', slurStart: 1, slurEnd: 2, notes: [n('REST', 'r16'), n('D4', 's'), n('G4', 'qd', { tieStart: true })] },
  { measure: 2, notes: [n('G4', 'ed'), n('F#4', 's'), n('G4', 'q')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...ts3('G4', 'A4', 'B4'), ...t3('C5', 'A4', 'B4')] },
  { measure: 4, slurEnd: 0, notes: [n('D5', 'h')] },
  { measure: 5, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r16'), n('D4', 's'), n('A4', 'qd', { tieStart: true })] },
  { measure: 6, notes: [n('A4', 'ed'), n('G4', 's'), n('A4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...ts3('A4', 'F#4', 'En4'), ...t3('D4', 'E4', 'F#4')] },
  { measure: 8, slurEnd: 0, notes: [n('D4', 'h')] },
  { measure: 9, notes: [n('REST', 'r8'), n('G4', 'e'), n('B4', 'q', { tieStart: true })] },
  { measure: 10, notes: [...s2('B4', 'A4'), ...s2('B4', 'C5'), n('D5', 'q', { tieStart: true })] },
  { measure: 11, slurStart: 1, notes: [...s4('D5', 'B4', 'G4', 'A4'), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 12, slurEnd: 1, notes: [n('E5', 'q'), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r16'), n('D4', 's'), n('G4', 'qd', { tieStart: true })] },
  { measure: 14, notes: [n('G4', 'ed'), n('F#4', 's'), n('G4', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...t3('G4', 'A4', 'B4'), ...t3('A4', 'F#4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX6_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Gm', slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e'), n('En4', 'q'), n('F#4', 'e'), n('G4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'e'), n('F#4', 'e'), n('A4', 'h')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e'), n('G4', 'q', { tieStart: true }), ...b2('G4', 'B4')] },
  { measure: 4, slurEnd: 0, notes: [n('B4', 'hd')] },
  { measure: 5, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r8'), n('D5', 'e'), n('D5', 'h', { tieStart: true })] },
  { measure: 6, slurStart: 0, slurEnd: 2, notes: [n('D5', 'ed'), n('C5', 's'), n('B4', 'h')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('F#4', 's'), n('G4', 's'), n('REST', 'r8'), n('G4', 's'), n('G4', 's'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'q', { tieStart: true }), ...t3('B4', 'A4', 'B4'), ...t3('C5', 'B4', 'Ab4')] },
  { measure: 10, slurEnd: 0, notes: [n('G4', 'hd')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...t3('G4', 'F#4', 'G4'), ...t3('Ab4', 'G4', 'Fn4')] },
  { measure: 12, slurEnd: 0, notes: [n('E4', 'hd')] },
  { measure: 13, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('C4', 'e'), n('D4', 'q'), n('E4', 'e'), n('F#4', 'e')] },
  { measure: 14, slurStart: 0, slurEnd: 2, notes: [...b2('G4', 'F#4'), n('B4', 'h')] },
  { measure: 15, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), n('D4', 'e'), n('F#4', 'q'), n('A4', 'e'), n('G4', 'e')] },
  { measure: 16, slurStart: 0, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE16_EX7_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Gm', slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e'), n('B4', 'ed'), n('A4', 's'), n('G4', 'h', { tieStart: true })] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'ed'), n('B4', 's'), n('D5', 'ed'), n('B4', 's'), n('B4', 'h', { tieStart: true })] },
  { measure: 3, slurStart: 0, notes: [...b4('B4', 'G4', 'E4', 'C5'), ...b4('A4', 'F#4', 'D4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e'), n('B4', 'ed'), n('A4', 's'), n('G4', 'h', { tieStart: true })] },
  { measure: 6, slurEnd: 0, notes: [n('G4', 'ed'), n('C5', 's'), n('E5', 'ed'), n('Cn5', 's'), n('C5', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...b4('C5', 'A4', 'Fn4', 'D5'), ...b4('B4', 'G#4', 'E4', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'h'), ...b4('D5', 'C5', 'A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'h'), ...b4('A4', 'G4', 'F#4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('D4', 'e'), n('B4', 'ed'), n('A4', 's'), n('G4', 'h', { tieStart: true })] },
  { measure: 14, slurEnd: 0, notes: [n('G4', 'ed'), n('B4', 's'), n('D5', 'ed'), n('B4', 's'), n('B4', 'h', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...b4('B4', 'G4', 'E4', 'C5'), ...b4('A4', 'F#4', 'D4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE16_EX8_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Cm', slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('B4', 'C5')] },
  { measure: 2, notes: [n('Bn4', 'h')] },
  { measure: 3, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('G4', 'A4')] },
  { measure: 4, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r8'), n('C5', 'e'), ...b2('A4', 'B4')] },
  { measure: 6, notes: [n('G4', 'q'), n('F#4', 'q')] },
  { measure: 7, slurStart: 0, notes: [...s2('G4', 'D4'), n('B4', 'e', { tieStart: true }), ...s4('B4', 'E4', 'F#4', 'Gn4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), n('Ab4', 'e', { tieStart: true }), ...s2('A4', 'C5')] },
  { measure: 10, slurEnd: 0, notes: [n('G4', 'h', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [...s4('G4', 'F4', 'E4', 'F4'), ...b2('G4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...s4('Gn4', 'An4', 'B4', 'C5')] },
  { measure: 14, notes: [n('D5', 'h', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...b2('D5', 'B4'), n('G4', 'ed'), n('Bn4', 's')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX9_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Cm', slurStart: 0, slurEnd: 2, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('C4', 'e')] },
  { measure: 2, slurStart: 0, slurEnd: 1, notes: [n('REST', 'r8'), n('C5', 'e'), n('C5', 'h')] },
  { measure: 3, slurStart: 0, slurEnd: 2, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('C4', 'e')] },
  { measure: 4, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r8'), n('A4', 'e'), n('A4', 'h', { tieStart: true })] },
  { measure: 5, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('G4', 'e'), n('E4', 'ed'), n('C5', 's'), n('A4', 'q')] },
  { measure: 6, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('F4', 'e'), n('D4', 'ed'), n('B4', 's'), n('G4', 'q')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...s2('G4', 'An4'), ...s2('Bn4', 'C5'), n('D5', 'e'), ...b2('E5', 'F5')] },
  { measure: 8, slurEnd: 1, notes: [...b2('G5', 'Gn4'), n('G4', 'h')] },
  { measure: 9, slurStart: 0, slurEnd: 2, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('C4', 'e')] },
  { measure: 10, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r8'), n('A4', 'e'), n('A4', 'h', { tieStart: true })] },
  { measure: 11, slurStart: 0, slurEnd: 2, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('C4', 'e')] },
  { measure: 12, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r8'), n('Fn4', 'e'), n('F4', 'h', { tieStart: true })] },
  { measure: 13, slurStart: 1, slurEnd: 4, notes: [n('REST', 'r8'), n('G4', 'e'), n('E4', 'ed'), n('C5', 's'), n('Bn4', 'q')] },
  { measure: 14, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), n('E4', 'ed'), n('C5', 's'), n('C5', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...s4('C5', 'C5', 'Db5', 'C5'), ...b4('B4', 'A4', 'G4', 'F4')] },
  { measure: 16, slurEnd: 1, notes: [...b2('E4', 'Dn4'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE16_EX10_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Cm', slurStart: 0, slurEnd: 3, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('Bn4', 'q'), n('C5', 'e')] },
  { measure: 2, slurStart: 0, slurEnd: 1, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, slurEnd: 3, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('G4', 'q'), n('G4', 'e')] },
  { measure: 4, slurStart: 0, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('Bn3', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('E4', 'h', { tieStart: true }), ...b4('E4', 'D4', 'G4', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('Bn4', 'h', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'h', { tieStart: true }), ...b4('F4', 'E4', 'G4', 'C5')] },
  { measure: 8, slurEnd: 1, notes: [n('C5', 'h'), n('Bn4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, slurEnd: 3, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('Bn4', 'q'), n('C5', 'e')] },
  { measure: 10, slurStart: 0, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('En4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, slurEnd: 3, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('Bn4', 'q'), n('C5', 'e')] },
  { measure: 12, slurStart: 0, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'h', { tieStart: true }), ...b4('C5', 'G4', 'E4', 'D4')] },
  { measure: 14, slurEnd: 1, notes: [n('D4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...b4('G4', 'F4', 'D4', 'Bn3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE16_EX11_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Dm', slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'A4', 'F4')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'A4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), ...s4('G4', 'A4', 'F4', 'E4')] },
  { measure: 6, slurEnd: 1, notes: [n('C#4', 'qd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'q', { tieStart: true }), ...s2('F4', 'E4'), n('C#4', 'q', { tieStart: true }), ...s2('C#4', 'D4')] },
  { measure: 8, slurEnd: 1, notes: [n('A3', 'qd', { tieStart: true }), n('A3', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'A4', 'F4')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...b3('D4', 'B4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'qd'), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('Cn5', 'h', { tieStart: true }), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 14, slurEnd: 1, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), ...s2('G4', 'F4'), n('En4', 'q', { tieStart: true }), ...s2('E4', 'C#4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX12_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Dm', slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('A4', 'e'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('G#4', 'e'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('A4', 'e'), n('D4', 'e'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 4, slurStart: 0, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('A4', 'e'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r4'), n('Bn4', 'e'), n('An4', 's'), n('B4', 's'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('Bn4', 'e'), n('E4', 'e'), n('REST', 'r8'), n('G#4', 'e')] },
  { measure: 8, slurStart: 0, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('A4', 'e'), n('Bb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('F4', 'e'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('G4', 'e'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, slurStart: 1, slurEnd: 2, notes: [n('REST', 'r4'), n('E#4', 'e'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'e'), n('D5', 'qd', { tieStart: true })] },
  { measure: 14, slurEnd: 3, notes: [n('D5', 'q'), n('C#5', 's'), n('D5', 's'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, slurEnd: 3, notes: [n('REST', 'r4'), n('A4', 'e'), n('E4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 16, slurStart: 0, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX13_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Dm', slurStart: 0, notes: [...b3('D4', 'E4', 'F4'), ...b3('G4', 'A4', 'B4'), ...b3('C5', 'Dn5', 'E5')] },
  { measure: 2, slurEnd: 4, notes: [...b3('D5', 'E5', 'C5'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), ...eds('A4', 'G4'), n('F4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...b3('A3', 'Bn3', 'C#4'), ...b3('D4', 'E4', 'F4'), ...b3('G4', 'A4', 'B4')] },
  { measure: 6, slurEnd: 4, notes: [...b3('A4', 'B4', 'G4'), n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...eds('G4', 'F4'), n('E4', 'e'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...b3('D4', 'E4', 'F#4'), ...b3('G4', 'A4', 'B4'), ...b3('C5', 'B4', 'A4')] },
  { measure: 10, slurEnd: 4, notes: [...b3('B4', 'E5', 'C5'), n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b3('C4', 'D4', 'E4'), ...b3('F4', 'G4', 'A4'), ...b3('B4', 'A4', 'G4')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'qd')] },
  { measure: 13, slurStart: 0, notes: [n('C#5', 'qd'), ...b3('C5', 'D5', 'C5'), ...b3('F4', 'G4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b3('A4', 'G4', 'F4'), ...b3('G4', 'F4', 'E4'), ...b3('F4', 'E4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'hd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX14_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'Dm', notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'e'), n('F4', 'e'), n('E4', 'e'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'e'), n('G4', 'e'), n('E4', 'e'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C#5', 'qd', { tieStart: true }), ...b3('C5', 'D5', 'A4'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 4, slurEnd: 3, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'q'), ...s2('F4', 'E4'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D4', 'e'), n('A4', 'e'), n('G4', 'e'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 6, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C4', 'e'), n('A4', 'e'), n('F4', 'e'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F4', 'q', { tieStart: true }), ...s2('F4', 'G4'), n('A4', 'q', { tieStart: true }), ...s2('A4', 'B4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'hd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F4', 'e'), n('A4', 'e'), n('G4', 'e'), n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 10, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F4', 'e'), n('A4', 'e'), n('G4', 'e'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, notes: [n('REST', 'r4'), n('REST', 'r8'), n('En4', 'e'), n('A4', 'e'), n('G4', 'e'), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 12, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'e'), n('A4', 'e'), n('G4', 'e'), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D5', 'q', { tieStart: true }), ...s2('D5', 'Cn5'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'A4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'F4')] },
  { measure: 14, slurEnd: 1, notes: [n('E4', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A3', 'e'), n('F4', 'e'), n('E4', 'e'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A3', 'e'), n('F4', 'e'), n('C#4', 'e')] },
  { measure: 16, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX15_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Gm', slurStart: 0, notes: [n('D4', 'ed'), n('En4', 's'), n('F#4', 'e'), n('G4', 'ed'), n('A4', 's'), n('B4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'ed'), n('A4', 's'), n('B4', 'e'), n('C5', 'ed'), n('D5', 's'), n('E5', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 3, notes: [n('D5', 'q'), n('C#5', 's'), n('D5', 's'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, slurStart: 0, slurEnd: 3, notes: [n('D5', 'q'), n('C#5', 's'), n('D5', 's'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('D5', 'ed'), n('C#5', 's'), n('B4', 'e'), n('A4', 'ed'), n('G4', 's'), n('Fn4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...b3('E4', 'Ab4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('Gb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('Fn4', 'qd', { tieStart: true }), ...b3('F4', 'D5', 'Bn4')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), ...b3('F#4', 'D5', 'C5')] },
  { measure: 14, slurEnd: 3, notes: [...b3('B4', 'A4', 'G4'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'ed'), n('En4', 's'), n('F#4', 'e'), n('G4', 'ed'), n('A4', 's'), n('B4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX16_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Gm', slurStart: 0, notes: [n('G4', 'hd'), ...b3('F#4', 'G4', 'B4')] },
  { measure: 2, slurEnd: 2, notes: [n('D5', 'qd'), n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'hd'), ...b3('C#4', 'Dn4', 'A4')] },
  { measure: 4, slurEnd: 2, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 3, notes: [...b3('C5', 'D5', 'C5'), n('A#4', 'hd')] },
  { measure: 6, slurStart: 0, slurEnd: 3, notes: [...b3('A4', 'B4', 'C5'), n('Gn4', 'hd')] },
  { measure: 7, slurStart: 0, notes: [...b3('F#4', 'G4', 'A4'), n('G4', 'qd'), n('Gn4', 'q'), n('F4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('B3', 'hd'), ...b3('C4', 'D4', 'F4')] },
  { measure: 10, slurEnd: 2, notes: [n('B4', 'qd'), n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'hd'), ...b3('E4', 'F4', 'A4')] },
  { measure: 12, slurEnd: 2, notes: [n('C5', 'qd'), n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, slurEnd: 3, notes: [...b3('B4', 'C5', 'B4'), n('A#4', 'hd')] },
  { measure: 14, slurStart: 0, slurEnd: 3, notes: [...b3('G4', 'A4', 'B4'), n('D5', 'hd')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'q'), n('Fn4', 'e'), n('F#4', 'q'), n('G4', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX17_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'Gm', slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), ...s2('A4', 'B4'), n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), ...s2('G4', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'hd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b3('D4', 'En4', 'F#4'), ...b3('G4', 'A4', 'B4'), n('D5', 'qd', { tieStart: true }), n('D5', 'q'), n('C#5', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('D5', 'hd'), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 3, notes: [n('D5', 'ed'), n('C5', 's'), n('B4', 'e'), n('C5', 'hd', { tieStart: true }), n('C5', 'qd')] },
  { measure: 6, slurStart: 0, slurEnd: 3, notes: [n('A4', 'ed'), n('G4', 's'), n('F#4', 'e'), n('G4', 'hd', { tieStart: true }), n('G4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('Fn4', 'qd', { tieStart: true }), ...b3('F4', 'E4', 'D4'), ...b3('E4', 'D4', 'C4'), n('B3', 'qd', { tieStart: true })] },
  { measure: 8, slurEnd: 0, notes: [n('B3', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5'), n('D5', 'qd', { tieStart: true }), n('B4', 'q'), ...s2('B4', 'C5'), n('D5', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'hd'), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), ...s2('A4', 'B4'), n('G4', 'qd', { tieStart: true }), n('G4', 'q'), ...s2('A4', 'B4')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...eds('E4', 'F#4'), n('G4', 'e', { tieStart: true }), n('G4', 'hd')] },
  { measure: 14, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5'), n('D5', 'qd', { tieStart: true }), n('B4', 'q', { tieStart: true }), ...s4('B4', 'C5', 'A4', 'F#4'), ...b2('G4', 'A4')] },
  { measure: 15, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX18_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Cm', slurStart: 0, notes: [n('C5', 'qd'), ...eds('G4', 'E4'), n('F4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C5', 'qd'), ...eds('G4', 'E4'), n('F4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 4, notes: [n('C5', 'ed'), n('Bn4', 's'), n('D5', 's'), n('F4', 's'), n('E5', 'qd', { tieStart: true })] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, slurEnd: 7, notes: [n('REST', 'r16'), ...s4('D5', 'C5', 'B4', 'An4'), n('G4', 's'), ...b3('F#4', 'G4', 'A4')] },
  { measure: 8, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [...eds('G4', 'A4'), n('B4', 'e'), ...eds('G4', 'A4'), n('B4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd'), n('Bn4', 'qd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('C5', 'e', { tieStart: true }), ...s2('C5', 'Bn4'), n('C5', 'e', { tieStart: true }), n('B4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'qd'), ...eds('G4', 'E4'), n('F4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('D4', 'qd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'qd'), ...eds('G4', 'A4'), n('Bn4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX19_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Cm', slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e'), n('G4', 'e'), n('E4', 'e'), n('Bn4', 'qd', { tieStart: true })] },
  { measure: 2, slurEnd: 0, notes: [n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e'), n('G4', 'e'), n('E4', 'e'), n('C5', 'qd', { tieStart: true })] },
  { measure: 4, slurEnd: 0, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, slurEnd: 4, notes: [...b3('Db5', 'C5', 'D5'), n('G4', 'qd'), n('G4', 'qd')] },
  { measure: 6, slurStart: 0, slurEnd: 4, notes: [...b3('G4', 'A4', 'B4'), n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'Fn4', 'F#4'), ...b3('G4', 'A4', 'Bn4'), ...b3('C5', 'B4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('B4', 'e'), n('D5', 'e'), n('F5', 'qd', { tieStart: true })] },
  { measure: 10, slurEnd: 0, notes: [n('F5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('G4', 'e'), n('C5', 'e'), n('E5', 'qd', { tieStart: true })] },
  { measure: 12, slurEnd: 0, notes: [n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('F5', 'q'), n('E5', 'e'), n('D5', 'q'), n('B4', 'e'), n('G4', 'qd', { tieStart: true })] },
  { measure: 14, slurEnd: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...b3('G4', 'An4', 'Bn4'), ...b3('C5', 'D5', 'E5'), n('D5', 'qd', { tieStart: true })] },
  { measure: 16, slurEnd: 0, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE16_EX20_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'Cm', slurStart: 0, slurEnd: 1, notes: [n('E5', 'hd'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 2, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G4', 'ed'), n('F4', 's'), n('G4', 'e'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, slurEnd: 1, notes: [n('A4', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 4, slurStart: 2, slurEnd: 5, notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'ed'), n('D4', 's'), n('E4', 'e'), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'F4', 'G4'), n('A4', 'qd', { tieStart: true }), ...b3('A4', 'G4', 'A4')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'hd'), n('Bn4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), ...b3('Gn4', 'A4', 'B4'), n('C5', 'qd'), ...b3('B4', 'C5', 'D5')] },
  { measure: 8, slurEnd: 1, notes: [n('E5', 'hd'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, slurEnd: 1, notes: [n('E5', 'hd'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...eds('G4', 'F4'), n('G4', 'e')] },
  { measure: 10, slurStart: 0, slurEnd: 1, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C4', 'q'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, slurEnd: 1, notes: [n('Eb5', 'hd'), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...eds('G4', 'F4'), n('G4', 'e')] },
  { measure: 12, slurStart: 0, slurEnd: 1, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C4', 'q'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'A4'), n('G4', 'q', { tieStart: true }), ...s2('G4', 'F4'), n('E4', 'q', { tieStart: true }), ...s2('E4', 'D4')] },
  { measure: 14, slurEnd: 0, notes: [n('D4', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b2('B3', 'C4'), ...b3('D4', 'E4', 'F4'), ...b3('G4', 'An4', 'Bn4'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), ...s2('C5', 'Bn4'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

// Série 17: Várias formas de ataque in levare (anacruse)
const POZZOLI_SERIE17_EX1_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C', notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 2, notes: [...b2('A4', 'G4'), n('REST', 'r4'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 3, notes: [...b2('B4', 'G4'), n('REST', 'r4'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 4, slurStart: 0, notes: [n('E5', 'qd'), n('D5', 'e'), ...b2('C5', 'B4')] },
  { measure: 5, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 6, notes: [...b2('D5', 'E5'), n('REST', 'r4'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 7, notes: [...b2('G4', 'B4'), n('REST', 'r4'), n('REST', 'r8'), n('B4', 'e', { tieStart: true })] },
  { measure: 8, slurStart: 0, notes: [...b4('B4', 'A4', 'G#4', 'A4'), ...b2('B4', 'C5')] },
  { measure: 9, slurEnd: 1, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 10, notes: [...b2('G#4', 'A4'), n('REST', 'r4'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 11, notes: [...b2('B4', 'A4'), n('REST', 'r4'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('Bb4', 'h'), n('A4', 'ed'), n('G4', 's')] },
  { measure: 13, slurEnd: 0, notes: [n('E5', 'q'), n('REST', 'r4'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 14, notes: [...b2('Cn5', 'D5'), n('REST', 'r4'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 15, notes: [...b2('B4', 'D5'), n('REST', 'r4'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 16, notes: [...b2('G4', 'E5'), ...b2('F4', 'D5'), ...b2('E4', 'C5')] },
  { measure: 17, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE17_EX2_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'C', notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 2, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 3, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('C4', 's')] },
  { measure: 4, slurStart: 0, slurEnd: 4, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'F4', 'E4', 'G4')] },
  { measure: 5, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 6, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 7, notes: [n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 8, slurStart: 0, slurEnd: 4, notes: [n('G#4', 'q', { tieStart: true }), ...s4('G#4', 'A4', 'F#4', 'G4')] },
  { measure: 9, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 10, slurStart: 0, notes: [n('C5', 'ed'), n('D5', 's'), n('E5', 'ed'), n('F5', 's')] },
  { measure: 11, slurEnd: 1, notes: [...b2('E5', 'D5'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 12, slurStart: 0, notes: [n('C5', 'ed'), n('D5', 's'), n('E5', 'ed'), n('D5', 's')] },
  { measure: 13, slurEnd: 1, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 14, slurStart: 0, slurEnd: 4, notes: [n('G4', 'q', { tieStart: true }), ...s4('G4', 'C5', 'B4', 'A4')] },
  { measure: 15, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 16, notes: [n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('G4', 's')] },
  { measure: 17, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE17_EX3_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'F', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), ...b2('C4', 'D4')] },
  { measure: 2, notes: [...b2('E4', 'F4'), n('A4', 'q'), n('C5', 'q')] },
  { measure: 3, slurEnd: 0, notes: [n('C5', 'h'), ...b2('B4', 'A4')] },
  { measure: 4, slurStart: 0, notes: [...b2('A4', 'G4'), n('E4', 'q'), n('G4', 'q')] },
  { measure: 5, slurEnd: 0, notes: [n('C4', 'h'), ...b2('G4', 'F4')] },
  { measure: 6, notes: [n('F4', 'h'), ...b2('B4', 'A4')] },
  { measure: 7, notes: [n('A4', 'h'), ...b2('D5', 'Cn5')] },
  { measure: 8, slurStart: 0, notes: [...b4('C5', 'B4', 'A4', 'G4'), ...b2('F4', 'E4')] },
  { measure: 9, slurEnd: 1, notes: [n('C4', 'q', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), ...b2('D5', 'Db5')] },
  { measure: 10, slurStart: 0, notes: [...b2('C5', 'B4'), n('A4', 'q'), n('E5', 'q')] },
  { measure: 11, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), ...b2('G4', 'A4')] },
  { measure: 12, notes: [...b2('B4', 'A4'), n('G4', 'q'), n('D5', 'q')] },
  { measure: 13, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), ...b2('F4', 'G4')] },
  { measure: 14, notes: [...b2('G#4', 'A4'), n('C5', 'q'), ...b2('E4', 'F4')] },
  { measure: 15, notes: [...b2('Gn4', 'Gn4'), n('C5', 'q'), ...b2('D5', 'B4')] },
  { measure: 16, slurStart: 0, notes: [...b4('A4', 'G4', 'F4', 'G4'), ...b2('A4', 'G4')] },
  { measure: 17, slurEnd: 0, notes: [n('F4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE17_EX4_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'G', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4'), n('G4', 'ed'), n('B4', 's')] },
  { measure: 2, slurEnd: 0, notes: [n('D5', 'hd'), n('E4', 'ed'), n('G4', 's')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'hd'), n('B4', 'ed'), n('D5', 's')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('A4', 'q'), n('B4', 'ed'), n('D5', 's'), n('C5', 'ed'), n('E5', 's')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'h', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('D5', 'ed'), n('Fn5', 's')] },
  { measure: 6, slurEnd: 0, notes: [n('E5', 'hd'), n('G4', 'ed'), n('F#4', 's')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'hd'), n('B4', 'ed'), n('D5', 's')] },
  { measure: 8, slurEnd: 4, notes: [...b4('C5', 'B4', 'A4', 'B4'), ...b4('A4', 'G4', 'F#4', 'G4')] },
  { measure: 9, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('G4', 'ed'), n('B4', 's'), ...s4('D5', 'E5', 'D5', 'C5')] },
  { measure: 10, notes: [n('B4', 'e'), n('REST', 'r8'), n('G4', 'ed'), n('B4', 's'), n('D5', 'q', { tieStart: true }), ...s4('D5', 'E5', 'D5', 'C5')] },
  { measure: 11, notes: [n('B4', 'e'), n('REST', 'r8'), n('G4', 'ed'), n('E5', 's'), n('D5', 'qdd'), n('B4', 's')] },
  { measure: 12, notes: [n('A4', 'qdd'), n('G4', 's'), n('B4', 'q', { tieStart: true }), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 13, notes: [n('G4', 'ed'), n('B4', 's'), n('D5', 'h'), n('G4', 'ed'), n('A4', 's')] },
  { measure: 14, notes: [n('B4', 'h'), n('Gn4', 'ed'), n('A4', 's'), n('B4', 'ed'), n('D5', 's')] },
  { measure: 15, notes: [n('E5', 'q'), n('D5', 'q'), n('F#4', 'q'), n('G4', 'q', { tieStart: true })] },
  { measure: 16, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE17_EX5_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'D', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4'), ...s4('F#4', 'G4', 'A4', 'B4')] },
  { measure: 2, slurEnd: 0, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('A4', 'G4', 'F#4', 'E4')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('D4', 'C#4', 'D4', 'C#4')] },
  { measure: 4, slurEnd: 0, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'e', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('G4', 'e', { tieStart: true })] },
  { measure: 5, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), n('E4', 'q', { tieStart: true })] },
  { measure: 6, notes: [n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e'), ...b4('A4', 'G4', 'F#4', 'E4')] },
  { measure: 7, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 8, notes: [n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e'), ...b4('A4', 'G4', 'F#4', 'E4')] },
  { measure: 9, notes: [n('G#4', 'hd'), ...s4('A4', 'G#4', 'A4', 'B4')] },
  { measure: 10, notes: [n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('B4', 'A4', 'G#4', 'F#4')] },
  { measure: 11, notes: [n('E#4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('E4', 'D#4', 'E4', 'C#4')] },
  { measure: 12, notes: [n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F#4', 'e', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('D5', 'e', { tieStart: true })] },
  { measure: 13, notes: [n('D5', 'hd'), n('G#4', 'q', { tieStart: true })] },
  { measure: 14, notes: [n('B4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('Gn4', 'F#4', 'E4', 'D4')] },
  { measure: 15, notes: [n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('E4', 'D4', 'E4', 'C#4')] },
  { measure: 16, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('D4', 'C#4', 'D4', 'E4')] },
  { measure: 17, notes: [n('D4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE17_EX6_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Bb', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), ...s2('F4', 'G4')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'q', { tieStart: true }), n('REST', 'r8'), ...s2('F4', 'G4')] },
  { measure: 4, slurEnd: 3, notes: [n('F4', 'ed'), n('D4', 's'), n('B4', 'ed'), n('D4', 's')] },
  { measure: 5, notes: [n('F4', 'q'), n('REST', 'r8'), ...s2('F4', 'G4')] },
  { measure: 6, slurStart: 0, notes: [...s4('F4', 'G4', 'A4', 'B4'), ...s4('C5', 'B4', 'A4', 'G4')] },
  { measure: 7, slurEnd: 0, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...s2('G4', 'A4')] },
  { measure: 8, slurStart: 0, slurEnd: 3, notes: [n('G4', 'ed'), n('F4', 's'), n('B4', 'ed'), n('G4', 's')] },
  { measure: 9, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...s2('F4', 'G4')] },
  { measure: 10, notes: [n('A4', 'h', { tieStart: true })] },
  { measure: 11, notes: [...s2('Bn4', 'C#5'), n('D5', 'qd')] },
  { measure: 12, notes: [...s2('C#5', 'Db5'), n('C5', 'qd')] },
  { measure: 13, notes: [n('G4', 'ed'), n('F4', 's'), n('G4', 'ed'), n('En4', 's')] },
  { measure: 14, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...s2('E4', 'Eb4')] },
  { measure: 15, notes: [n('F4', 'e'), n('B4', 'q'), n('A4', 'e')] },
  { measure: 16, notes: [n('G4', 'q'), n('REST', 'r8'), ...s2('C4', 'D4')] },
  { measure: 17, notes: [...s4('F4', 'G4', 'F4', 'E4'), ...s2('D4', 'C4'), n('D4', 'e')] },
  { measure: 18, notes: [n('B3', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE17_EX7_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'G', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('G4', 'e', { tieStart: true })] },
  { measure: 2, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 3, slurEnd: 0, notes: [n('B4', 'qd'), n('D5', 'qd', { tieStart: true })] },
  { measure: 4, slurStart: 1, notes: [n('D5', 'e'), n('REST', 'r8'), n('E4', 'e'), n('F#4', 'q', { tieStart: true }), ...s2('F#4', 'B4')] },
  { measure: 5, slurEnd: 1, notes: [n('G#4', 'q', { tieStart: true }), ...s2('G#4', 'B4'), n('A4', 'qd', { tieStart: true })] },
  { measure: 6, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('B4', 'e', { tieStart: true })] },
  { measure: 7, notes: [n('D5', 'hd', { tieStart: true })] },
  { measure: 8, notes: [n('G#4', 'e'), n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 9, slurStart: 0, notes: [n('F#4', 'q', { tieStart: true }), ...s2('F#4', 'A4'), n('G#4', 'q', { tieStart: true }), ...s2('G#4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd'), n('REST', 'r8'), ...b2('F#4', 'Gn4')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), ...b3('G4', 'D4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [n('B4', 'q'), n('G4', 'e'), n('REST', 'r8'), ...s4('G4', 'F#4', 'G4', 'A4')] },
  { measure: 13, slurStart: 0, notes: [...b3('B4', 'C5', 'D5'), ...b3('E5', 'D5', 'C5')] },
  { measure: 14, slurEnd: 0, notes: [n('B4', 'qd'), n('REST', 'r8'), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 15, slurStart: 0, notes: [...b3('D5', 'B4', 'G4'), ...b3('F#4', 'A4', 'D4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE17_EX8_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'G', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), ...s2('G4', 'F#4')] },
  { measure: 2, slurEnd: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), ...s2('E4', 'D4')] },
  { measure: 3, notes: [n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), ...s2('C4', 'B3')] },
  { measure: 4, slurStart: 0, slurEnd: 5, notes: [...s4('C4', 'D4', 'E4', 'F#4'), n('G4', 's'), n('A4', 's'), ...b3('B4', 'C#5', 'D#5')] },
  { measure: 5, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), ...s2('D5', 'E5')] },
  { measure: 6, slurStart: 0, notes: [n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5'), n('B4', 'q', { tieStart: true }), ...s2('B4', 'D5')] },
  { measure: 7, slurEnd: 1, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), ...s2('G4', 'F#4')] },
  { measure: 8, slurStart: 0, slurEnd: 5, notes: [...s4('G4', 'F#4', 'G4', 'A4'), n('B4', 's'), n('C5', 's'), ...b3('D5', 'C#5', 'D#5')] },
  { measure: 9, notes: [n('E5', 'q'), n('E5', 'e'), n('REST', 'r4'), ...s2('B4', 'Cn5')] },
  { measure: 10, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...s2('C5', 'E5'), n('D5', 'qd', { tieStart: true })] },
  { measure: 11, slurEnd: 0, notes: [n('C#5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), ...s2('C5', 'Bb4')] },
  { measure: 12, slurStart: 0, notes: [n('B4', 'q', { tieStart: true }), ...s2('B4', 'D5'), n('C5', 'qd', { tieStart: true })] },
  { measure: 13, slurEnd: 0, notes: [n('Cn5', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), ...s2('B4', 'A4')] },
  { measure: 14, notes: [...s2('A4', 'G#4'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), ...s2('C4', 'B3')] },
  { measure: 15, slurStart: 0, slurEnd: 5, notes: [...s4('C4', 'D4', 'E4', 'F#4'), n('G4', 's'), n('A4', 's'), ...b3('B4', 'C#5', 'D#5')] },
  { measure: 16, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE17_EX9_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'F', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r8'), ...s4('C4', 'D4', 'E4', 'F4')] },
  { measure: 2, slurEnd: 2, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), ...s2('G4', 'G#4')] },
  { measure: 3, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), ...s4('D4', 'E4', 'F4', 'G4')] },
  { measure: 4, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q'), ...s2('A4', 'G4')] },
  { measure: 5, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), ...s2('D5', 'C#5')] },
  { measure: 6, notes: [n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), ...s2('Db5', 'Cn5')] },
  { measure: 7, slurStart: 1, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), ...s4('G4', 'A4', 'Bb4', 'C5')] },
  { measure: 8, slurEnd: 3, notes: [n('C5', 'ed'), n('B4', 's'), n('A4', 'qd'), n('G4', 'e')] },
  { measure: 9, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 10, notes: [n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 11, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('G#4', 'e'), n('REST', 'r8')] },
  { measure: 12, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'qd')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r16'), ...s4('C4', 'D4', 'E4', 'F4'), n('G4', 's'), ...b3('B4', 'A4', 'G4')] },
  { measure: 14, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE17_EX10_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'G', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r8'), ...s4('G4', 'A4', 'B4', 'C5')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), ...s4('G4', 'A4', 'B4', 'C5')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), ...s4('G4', 'A4', 'B4', 'C5')] },
  { measure: 4, slurEnd: 3, notes: [n('D5', 'q', { tieStart: true }), ...s2('D5', 'C5'), n('B4', 'q', { tieStart: true }), n('B4', 'e')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r16'), ...s4('D4', 'E4', 'F#4', 'G4'), n('A4', 's'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 6, slurEnd: 1, notes: [n('REST', 'r16'), ...s4('D#4', 'E4', 'F#4', 'G4'), n('A4', 's'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd'), ...eds('A4', 'B4'), n('G4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), ...eds('A4', 'B4')] },
  { measure: 9, notes: [n('C5', 'qd', { tieStart: true }), ...eds('C5', 'B4'), n('A4', 'e')] },
  { measure: 10, notes: [n('B4', 'qd', { tieStart: true }), ...eds('B4', 'A4'), n('G4', 'e')] },
  { measure: 11, notes: [n('A4', 'qd', { tieStart: true }), ...eds('A4', 'G4'), n('F#4', 'e')] },
  { measure: 12, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), ...s4('D5', 'C5', 'B4', 'A4')] },
  { measure: 13, slurStart: 0, notes: [...t3('G4', 'F#4', 'G4'), ...t3('A4', 'G4', 'A4'), ...t3('B4', 'A4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd'), n('B4', 'q'), n('D5', 'e')] },
  { measure: 15, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), ...eds('D#4', 'E4'), n('F#4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE17_EX11_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'D', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r8'), ...eds('F#4', 'G4'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'e'), n('D5', 'qd', { tieStart: true })] },
  { measure: 3, notes: [n('D5', 'q'), n('REST', 'r4'), n('D5', 'ed'), n('C#5', 's'), n('B4', 'ed'), n('A4', 's')] },
  { measure: 4, notes: [n('D5', 'qdd'), n('B4', 's'), n('A4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('A4', 'q'), ...t3('D5', 'C#5', 'B4'), ...t3('A4', 'G#4', 'F#4')] },
  { measure: 6, slurEnd: 1, notes: [n('G#4', 'h'), n('REST', 'r8'), ...eds('A4', 'G#4'), n('A4', 'e')] },
  { measure: 7, notes: [n('F#4', 'h'), n('REST', 'r8'), ...eds('G4', 'F#4'), n('G4', 'e')] },
  { measure: 8, notes: [n('A4', 'q'), ...t3('A4', 'B4', 'A4'), n('G#4', 'q'), ...s4('A4', 'B4', 'A4', 'G#4')] },
  { measure: 9, notes: [n('A4', 'h'), n('REST', 'r4'), ...t3('A4', 'G4', 'F#4')] },
  { measure: 10, notes: [n('G4', 'q'), ...s4('G4', 'F#4', 'E4', 'D4'), n('C#4', 'h')] },
  { measure: 11, notes: [n('REST', 'r4'), ...eds('D4', 'E4'), n('F#4', 'qdd'), n('D5', 's')] },
  { measure: 12, notes: [n('C#5', 'q'), n('REST', 'r4'), n('D5', 'ed'), n('C#5', 's'), n('B4', 'ed'), n('A4', 's')] },
  { measure: 13, notes: [n('G4', 'ed'), n('F#4', 's'), n('E4', 'q'), n('D4', 'q'), n('REST', 'r4')] }
];

const POZZOLI_SERIE17_EX12_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'G', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('E4', 'e')] },
  { measure: 2, notes: [...b3('E4', 'F#4', 'G4'), ...b3('A4', 'B4', 'C5'), n('B4', 'q'), n('G4', 'e')] },
  { measure: 3, slurEnd: 1, notes: [n('D5', 'hd', { tieStart: true }), n('D5', 'q'), n('D4', 'e')] },
  { measure: 4, slurStart: 0, notes: [...b3('D4', 'E4', 'F#4'), ...b3('G4', 'A4', 'B4'), ...b3('D5', 'C5', 'B4')] },
  { measure: 5, slurEnd: 0, notes: [n('A4', 'hd'), n('REST', 'r8'), ...s4('G4', 'F#4', 'E4', 'D#4')] },
  { measure: 6, slurStart: 0, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), ...s4('E4', 'D#4', 'E4', 'F#4')] },
  { measure: 7, slurEnd: 0, notes: [n('G4', 'hd'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 8, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'A4'), ...b3('G4', 'F#4', 'E4')] },
  { measure: 9, slurEnd: 0, notes: [n('D4', 'hd', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('C5', 'q', { tieStart: true }), ...s2('C5', 'B4'), n('B4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 11, slurEnd: 0, notes: [n('A4', 'q', { tieStart: true }), ...s2('A4', 'G4'), n('G4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('F#4', 'qd'), n('E4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('D4', 'e')] },
  { measure: 13, slurEnd: 0, notes: [...b3('D4', 'E4', 'F#4'), ...b3('G4', 'A4', 'B4'), n('D5', 'q'), n('C5', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('B4', 'qd'), n('A4', 'qd'), n('D4', 'qd')] },
  { measure: 15, slurEnd: 0, notes: [n('G4', 'qd'), n('B4', 'qd'), n('D5', 'qd')] },
  { measure: 16, notes: [n('G4', 'hd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

// Série 18: Tonalidades com sustenidos (Mi Maior - Si Maior - Fá# Maior - Dó# Maior)
const POZZOLI_SERIE18_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'E', notes: [n('REST', 'r4'), n('REST', 'r8'), n('B3', 'e', { tieStart: true })] },
  { measure: 2, notes: [n('E4', 'qd', { tieStart: true }), n('B3', 'e', { tieStart: true })] },
  { measure: 3, notes: [n('E4', 'qd', { tieStart: true }), n('D#4', 'e', { tieStart: true })] },
  { measure: 4, notes: [...b2('G#4', 'F#4'), ...b2('B4', 'G#4')] },
  { measure: 5, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A4', 'e', { tieStart: true })] },
  { measure: 6, notes: [n('B4', 'q'), ...ts3('A4', 'G#4', 'A4'), n('G#4', 'e')] },
  { measure: 7, notes: [n('REST', 'r8'), n('F#4', 'e'), n('G#4', 'q', { tieStart: true })] },
  { measure: 8, notes: [...ts3('E#4', 'F#4', 'G#4'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('F#4', 'e'), n('D#5', 'ed'), n('C#5', 's')] },
  { measure: 10, slurEnd: 1, notes: [...b2('C#5', 'B4'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 11, slurStart: 0, notes: [...eds('G#4', 'F#4'), n('E4', 'ed'), n('Dn4', 's')] },
  { measure: 12, slurEnd: 1, notes: [n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('E4', 'e', { tieStart: true })] },
  { measure: 13, notes: [n('C#4', 'qd', { tieStart: true }), n('F#4', 'e')] },
  { measure: 14, notes: [n('B3', 'h')] },
  { measure: 15, notes: [n('REST', 'r8'), ...s2('B3', 'E4'), ...b2('B3', 'G#4')] },
  { measure: 16, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE18_EX2_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'E', slurStart: 0, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'e'), n('E4', 'q'), n('E4', 'e')] },
  { measure: 2, slurEnd: 0, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'e'), n('Fx4', 'q'), n('G#4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'qdd'), n('B4', 's'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'ed'), n('A#4', 's'), n('B4', 'ed'), n('C#5', 's')] },
  { measure: 6, slurEnd: 0, notes: [n('B4', 'h'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...t3('D#4', 'E4', 'F#4'), ...t3('G#4', 'A#4', 'B4'), n('C#4', 'qdd'), n('C#4', 's')] },
  { measure: 8, slurEnd: 1, notes: [n('B3', 'h', { tieStart: true }), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'e'), n('F#4', 'q'), n('G#4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('G#4', 'q'), n('A4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('F#4', 'q'), n('D#4', 'q'), n('REST', 'r4'), n('E4', 'ed'), n('Gn4', 's')] },
  { measure: 13, slurStart: 0, notes: [n('G#4', 'ed'), n('B4', 's'), n('B4', 'hd', { tieStart: true })] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'q'), n('F#4', 'q', { tieStart: true }), n('F#4', 'h')] },
  { measure: 15, slurStart: 0, notes: [...t3('B3', 'C#4', 'D#4'), ...t3('E4', 'F#4', 'G#4'), n('A4', 'qdd'), n('F#4', 's')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE18_EX3_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'E', notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('B3', 'e')] },
  { measure: 2, slurStart: 0, notes: [n('G#4', 'ed'), n('F#4', 's'), n('G#4', 'e'), n('B4', 'e'), n('REST', 'r8'), n('B3', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('G#4', 'ed'), n('F#4', 's'), n('G#4', 'e'), n('C#5', 'e'), n('REST', 'r8'), n('B3', 'e')] },
  { measure: 4, slurStart: 0, notes: [n('G#4', 'qd', { tieStart: true }), ...b3('G#4', 'B3', 'G#4')] },
  { measure: 5, slurEnd: 1, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('B3', 'e')] },
  { measure: 6, slurStart: 0, notes: [n('F#4', 'ed'), n('E4', 's'), n('D#4', 's'), n('E4', 's'), n('F#4', 'e'), n('REST', 'r8'), n('B3', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('F#4', 'ed'), n('E4', 's'), n('D#4', 's'), n('E4', 's'), n('G#4', 'e'), n('REST', 'r8'), n('B3', 'e')] },
  { measure: 8, slurStart: 0, notes: [n('G#4', 'qd'), n('Fx4', 'qd', { tieStart: true })] },
  { measure: 9, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...eds('B4', 'A4'), n('G#4', 'e')] },
  { measure: 11, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('Dn5', 'qd', { tieStart: true }), ...eds('D5', 'C#5'), n('B4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('E5', 'hd', { tieStart: true })] },
  { measure: 14, slurStart: 0, notes: [n('E5', 'e'), n('REST', 'r8'), n('E5', 'e'), n('D#5', 'q'), n('C#5', 'e')] },
  { measure: 15, slurEnd: 3, notes: [n('G#4', 'q'), n('F#4', 'e'), n('B4', 'q'), n('B3', 'e')] },
  { measure: 16, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...eds('E4', 'F#4'), n('G#4', 'e')] },
  { measure: 17, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE18_EX4_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'E', slurStart: 0, notes: [n('E4', 's'), n('D#4', 's'), n('G#4', 'e'), n('F#4', 'e'), n('B4', 'qd'), n('E5', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('G#4', 'hd'), n('E4', 's'), n('D#4', 's'), n('G#4', 'e'), n('F#4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('D#5', 'qd'), n('B4', 'qd'), n('F#4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r4'), ...b3('F#4', 'G#4', 'A#4')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'qd'), ...b2('B4', 'C#5'), n('B4', 'e'), n('G#4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), ...b2('G#4', 'A#4'), n('G#4', 'e'), n('D#4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r4'), ...b3('B4', 'A#4', 'C#5')] },
  { measure: 8, slurEnd: 1, notes: [n('Dn5', 'qd'), n('B4', 'qd'), n('Gn4', 'qd', { tieStart: true })] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r4'), ...b3('G4', 'A4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('Cn5', 'qd'), n('G4', 'qd'), n('E4', 'qd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r4'), ...b3('E4', 'F#4', 'G#4')] },
  { measure: 12, slurEnd: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r4'), ...b3('A4', 'G#4', 'A4')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r4'), ...b3('A4', 'G#4', 'B4')] },
  { measure: 14, slurEnd: 0, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r4'), ...b3('B4', 'A4', 'F#4')] },
  { measure: 15, slurStart: 0, notes: [n('B4', 'qd'), n('A4', 'qd'), n('D#4', 'qd')] },
  { measure: 16, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE18_EX5_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'B', slurStart: 0, notes: [n('B4', 'hd'), ...s6('C#5', 'B4', 'A#4', 'G#4', 'F#4', 'E4')] },
  { measure: 2, slurEnd: 0, notes: [n('D#4', 'q'), n('REST', 'r4'), n('REST', 'r8'), ...b3('D#4', 'E4', 'F#4')] },
  { measure: 3, notes: [n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G#4', 'e'), n('A#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 4, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'hd'), ...s6('C#5', 'B4', 'A#4', 'G#4', 'F#4', 'E#4')] },
  { measure: 6, slurEnd: 0, notes: [n('D#4', 'q'), n('REST', 'r4'), n('REST', 'r8'), ...b3('D#4', 'E#4', 'G#4')] },
  { measure: 7, notes: [n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e'), n('A#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('Fx4', 'e', { tieStart: true })] },
  { measure: 8, notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('D#5', 'e', { tieStart: true })] },
  { measure: 9, slurStart: 0, notes: [n('D#5', 'h', { tieStart: true }), n('D#5', 'q'), ...t3('G#4', 'A#4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('C#5', 'h', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'hd'), ...t3('Fx4', 'Gn4', 'E#4')] },
  { measure: 12, slurEnd: 1, notes: [n('A#4', 'h', { tieStart: true }), n('A#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...b2('G#4', 'A#4'), n('B4', 'q', { tieStart: true }), ...b4('B4', 'A#4', 'G#4', 'F#4')] },
  { measure: 14, slurEnd: 1, notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('E4', 'hd'), ...s6('F#4', 'G#4', 'A#4', 'B4', 'C#5', 'D#5')] },
  { measure: 16, slurEnd: 1, notes: [n('B4', 'h'), n('B3', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE18_EX6_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'B', slurStart: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('F#4', 'e')] },
  { measure: 2, notes: [n('B4', 'qd', { tieStart: true }), ...eds('B4', 'A#4'), n('G#4', 's'), n('A#4', 's')] },
  { measure: 3, slurEnd: 1, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 4, slurStart: 1, notes: [n('REST', 'r4'), n('G#4', 's'), n('A#4', 's'), n('D#4', 'ed'), n('E#4', 's'), n('D#4', 'e')] },
  { measure: 5, slurEnd: 1, notes: [n('C#4', 'qd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('C#4', 'e')] },
  { measure: 6, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('E#4', 's'), n('F#4', 's'), n('G#4', 's'), n('A#4', 's')] },
  { measure: 7, slurEnd: 1, notes: [n('C#4', 'qd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 8, slurStart: 1, slurEnd: 7, notes: [n('REST', 'r8'), ...s4('D#4', 'E#4', 'F#4', 'G#4'), ...b3('A#4', 'B4', 'G#4')] },
  { measure: 9, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, slurStart: 1, notes: [n('REST', 'r4'), n('G#4', 's'), n('F#4', 's'), n('C#5', 'ed'), n('B4', 's'), n('A#4', 'e')] },
  { measure: 11, slurEnd: 1, notes: [n('D#5', 'qd', { tieStart: true }), n('D#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, slurStart: 1, notes: [n('REST', 'r4'), n('G#4', 's'), n('F#4', 's'), n('A#4', 'ed'), n('G#4', 's'), n('F#4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'ed'), n('A#4', 's'), n('G#4', 's'), n('F#4', 's')] },
  { measure: 15, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 16, slurStart: 1, notes: [n('REST', 'r8'), ...s4('G#4', 'A#4', 'B4', 'C#5'), ...b3('D#5', 'E5', 'C#5')] },
  { measure: 17, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE18_EX7_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'B', slurStart: 0, slurEnd: 2, notes: [n('F#4', 'ed'), n('D#4', 's'), n('D#4', 'h')] },
  { measure: 2, slurStart: 0, slurEnd: 2, notes: [n('F#4', 'ed'), n('D#4', 's'), n('D#4', 'h', { tieStart: true })] },
  { measure: 3, slurStart: 0, notes: [...b4('D#4', 'B4', 'A#4', 'B4'), ...b2('F#4', 'D#4')] },
  { measure: 4, slurEnd: 1, notes: [n('C#5', 'q', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, slurEnd: 2, notes: [n('D#5', 'ed'), n('G#4', 's'), n('G#4', 'h')] },
  { measure: 6, slurStart: 0, slurEnd: 2, notes: [n('D#5', 'ed'), n('G#4', 's'), n('G#4', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...b2('G#4', 'B4'), ...b2('A#4', 'F#4'), ...b2('G#4', 'E#4')] },
  { measure: 8, slurEnd: 1, notes: [n('F#4', 'q'), n('C#4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('G#4', 'q', { tieStart: true }), ...t3('G#4', 'F#4', 'G#4'), ...t3('A#4', 'G#4', 'A#4')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'h'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('A#4', 'qd'), ...s2('G#4', 'F#4'), ...t3('E#4', 'D#4', 'Cx4')] },
  { measure: 12, slurEnd: 0, notes: [n('D#4', 'h'), n('F#4', 'q')] },
  { measure: 13, slurStart: 0, slurEnd: 2, notes: [n('G#4', 'ed'), n('D#4', 's'), n('D#4', 'h')] },
  { measure: 14, slurStart: 0, slurEnd: 2, notes: [n('G#4', 'ed'), n('D#4', 's'), n('D#4', 'h')] },
  { measure: 15, slurStart: 0, notes: [...b2('G#4', 'A#4'), ...b2('B4', 'E4'), ...t3('G#4', 'F#4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('D#4', 'h', { tieStart: true }), n('D#4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE18_EX8_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'F#', slurStart: 0, slurEnd: 1, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, notes: [n('REST', 'r4'), n('REST', 'r8'), n('D#5', 'q', { tieStart: true }), n('D#5', 'e'), n('REST', 'r8'), n('C#5', 'e'), n('REST', 'r8')] },
  { measure: 4, notes: [n('B4', 'e'), n('REST', 'r8'), n('A#4', 'e'), n('B4', 'q'), n('C#5', 'e'), n('G#4', 'qd', { tieStart: true })] },
  { measure: 5, notes: [n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('A#4', 'e')] },
  { measure: 6, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 7, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 8, notes: [n('A#4', 'e'), n('REST', 'r8'), n('G#4', 'e'), n('F#4', 'e'), n('REST', 'r8'), n('E#4', 'e'), n('REST', 'r8'), n('F#4', 'e'), n('G#4', 'e')] },
  { measure: 9, notes: [n('C#4', 'qd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('C#5', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A#4', 'G#4'), ...b3('Fx4', 'G#4', 'A#4')] },
  { measure: 11, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('B4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('A#4', 'qd', { tieStart: true }), ...eds('A#4', 'G#4'), n('F#4', 'e'), ...eds('E#4', 'F#4'), n('G#4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('C#4', 'e')] },
  { measure: 14, notes: [n('D#4', 'e'), n('REST', 'r8'), n('F#4', 'e'), n('G#4', 'e'), n('REST', 'r8'), n('B4', 'e'), n('A#4', 'e'), n('REST', 'r8'), n('D#5', 'e')] },
  { measure: 15, notes: [n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('E#4', 'e')] },
  { measure: 16, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r4'), ...eds('G#4', 'A#4')] },
  { measure: 17, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE18_EX9_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'C#', slurStart: 1, notes: [n('C#5', 'qd'), ...ts3('B#4', 'C#5', 'D#5')] },
  { measure: 2, slurEnd: 0, notes: [...b2('C#5', 'G#4'), n('E#4', 'e'), n('REST', 'r8')] },
  { measure: 3, notes: [...s2('E#4', 'F#4'), n('G#4', 'q'), ...s2('F#4', 'E#4')] },
  { measure: 4, notes: [n('F#4', 'q', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('G#4', 'qd'), ...ts3('Fx4', 'G#4', 'A#4')] },
  { measure: 6, slurEnd: 0, notes: [...b2('G#4', 'E#4'), n('C#4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...s4('B#3', 'C#4', 'D#4', 'E#4'), ...s2('F#4', 'Gx4'), n('G#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G#4', 'qd'), n('F#4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('Fx4', 'q', { tieStart: true }), n('B#4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G#4', 'qd'), n('Gn4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('F#4', 'q'), n('B4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...s4('G#4', 'F#4', 'G#4', 'E#4'), ...s4('G#4', 'A#4', 'B#4', 'C#5')] },
  { measure: 14, slurEnd: 3, notes: [...b2('D#5', 'G#4'), ...b2('E#4', 'D#4')] },
  { measure: 15, slurStart: 1, notes: [n('C#4', 'qd'), ...ts3('C#4', 'D#4', 'E#4')] },
  { measure: 16, slurEnd: 0, notes: [n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE18_EX10_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'C#', slurStart: 0, notes: [n('C#5', 'hd', { tieStart: true })] },
  { measure: 2, slurEnd: 5, notes: [...s4('C#5', 'B#4', 'D#5', 'C#5'), n('A#4', 's'), n('G#4', 's'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, slurEnd: 5, notes: [n('REST', 'r8'), ...eds('G#4', 'A#4'), n('E#4', 'e'), ...eds('G#4', 'A#4')] },
  { measure: 4, slurStart: 0, slurEnd: 1, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('G#4', 'qd', { tieStart: true })] },
  { measure: 6, slurEnd: 6, notes: [n('G#4', 's'), n('Fx4', 's'), n('G#4', 's'), n('A#4', 's'), n('G#4', 's'), n('E#4', 's'), n('E#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, slurEnd: 5, notes: [n('REST', 'r8'), ...eds('G#4', 'F#4'), n('E#4', 'e'), ...eds('G#4', 'F#4')] },
  { measure: 8, slurStart: 0, slurEnd: 1, notes: [n('A#4', 'qd', { tieStart: true }), n('A#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('A#4', 'qd'), ...b3('A#4', 'C#5', 'A#4')] },
  { measure: 10, slurEnd: 3, notes: [n('D#5', 'e'), n('C#5', 'e'), n('B#4', 'e'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, notes: [n('REST', 'r8'), n('G#4', 'q', { tieStart: true }), n('G#4', 'e'), n('Gx4', 'q', { tieStart: true })] },
  { measure: 12, notes: [...b3('G#4', 'A#4', 'B#4'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('C#5', 'hd', { tieStart: true })] },
  { measure: 14, slurEnd: 5, notes: [...s4('C#5', 'B#4', 'D#5', 'C#5'), n('A#4', 's'), n('G#4', 's'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, slurEnd: 5, notes: [n('REST', 'r8'), ...eds('G#4', 'A#4'), n('E#4', 'e'), ...eds('G#4', 'A#4')] },
  { measure: 16, slurStart: 0, slurEnd: 1, notes: [n('C#4', 'qd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

// Série 19: Tonalidades com sustenidos (Dó# menor - Sol# menor - Ré# menor - Lá# menor)
const POZZOLI_SERIE19_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'C#m', slurStart: 1, notes: [n('REST', 'r8'), n('G#4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 0, notes: [n('G#4', 'h')] },
  { measure: 3, slurStart: 0, notes: [...t3('A4', 'G#4', 'F#4'), ...t3('E4', 'F#4', 'G#4')] },
  { measure: 4, slurEnd: 0, notes: [n('C#4', 'h')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('G#4', 'q'), n('A4', 'e')] },
  { measure: 6, slurEnd: 0, notes: [n('G#4', 'h', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [...t3('G#4', 'F#4', 'E4'), ...t3('D#4', 'E4', 'F#4')] },
  { measure: 8, slurEnd: 0, notes: [n('C#4', 'h')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), n('F#4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [...b2('E4', 'D#4'), n('E4', 'q', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [...b2('E4', 'F#4'), n('G#4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [...b2('F#4', 'E4'), n('D#4', 'q')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('C#4', 'e'), n('F#4', 'q', { tieStart: true })] },
  { measure: 14, slurEnd: 1, notes: [...b2('F#4', 'E4'), n('D#4', 'q')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'q'), n('D#4', 'e')] },
  { measure: 16, slurEnd: 1, notes: [n('C#4', 'q', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE19_EX2_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C#m', slurStart: 0, slurEnd: 2, notes: [n('G#4', 'ed'), n('A4', 's'), n('G#4', 'h')] },
  { measure: 2, slurStart: 0, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('G#4', 'ed'), n('A4', 's')] },
  { measure: 3, slurEnd: 2, notes: [n('G#4', 'q'), n('F#4', 'q'), ...b2('E4', 'D#4')] },
  { measure: 4, slurStart: 0, notes: [n('C#4', 'q'), n('Fx4', 'q'), n('G#4', 'q', { tieStart: true })] },
  { measure: 5, slurEnd: 2, notes: [n('G#4', 'ed'), n('A4', 's'), n('G#4', 'h')] },
  { measure: 6, slurStart: 0, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('G#4', 'ed'), n('A4', 's')] },
  { measure: 7, slurEnd: 2, notes: [n('G#4', 'q'), n('F#4', 'q'), n('E4', 'q')] },
  { measure: 8, notes: [n('D#4', 'h'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, slurEnd: 2, notes: [n('C#4', 'ed'), n('D#4', 's'), n('E4', 'q'), n('F#4', 'q')] },
  { measure: 10, slurStart: 0, slurEnd: 2, notes: [n('G#4', 'q'), n('REST', 'r4'), n('C#4', 'q', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('Cx4', 'q'), n('D#4', 'ed'), n('E4', 's'), n('F#4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('G#4', 'ed'), n('A4', 's'), n('G#4', 'h')] },
  { measure: 13, slurStart: 0, notes: [n('Fn4', 'q'), n('E4', 'q'), n('D#4', 'q')] },
  { measure: 14, slurEnd: 2, notes: [n('G#4', 'q'), n('G#4', 'ed'), n('A4', 's'), n('G#4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('F#4', 'q'), n('E4', 'q'), n('B#3', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('C#4', 'q', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE19_EX3_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'C#m', notes: [n('REST', 'r8'), n('C#4', 'e'), n('D#4', 'e'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, notes: [n('REST', 'r8'), n('C#4', 'e'), n('D#4', 'e'), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b2('E4', 'F#4'), n('G#4', 'e'), n('A4', 'e'), n('B#4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('C#5', 'qd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, notes: [n('REST', 'r8'), n('G#4', 'e'), n('A4', 'e'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, notes: [n('REST', 'r8'), n('F#4', 'e'), n('E4', 'e'), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('E4', 'F#4', 'G#4'), ...b3('A4', 'G#4', 'F#4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), ...s4('F#4', 'G#4', 'A4', 'B4'), n('C#5', 's'), n('D#5', 's')] },
  { measure: 10, slurEnd: 1, notes: [n('E5', 'qd', { tieStart: true }), n('E5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd'), ...s4('E#4', 'F#4', 'G#4', 'A4'), n('B4', 's'), n('C#5', 's')] },
  { measure: 12, slurEnd: 1, notes: [n('D#5', 'qd', { tieStart: true }), n('D#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, notes: [n('REST', 'r8'), n('B4', 'e'), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 14, notes: [n('REST', 'r8'), n('A4', 'e'), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b2('E4', 'D#4'), ...b3('E4', 'F#4', 'B#4')] },
  { measure: 16, slurEnd: 1, notes: [n('C#5', 'qd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE19_EX4_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'C#m', slurStart: 0, notes: [n('G#4', 'qd', { tieStart: true }), ...eds('G#4', 'F#4'), n('E4', 'e'), ...eds('F#4', 'G#4'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('G#4', 'hd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), ...eds('E4', 'D#4'), n('E4', 'e'), n('F#4', 'e'), n('Fx4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('G#4', 'e')] },
  { measure: 5, slurStart: 0, slurEnd: 3, notes: [n('G#4', 'qd', { tieStart: true }), n('G#4', 'q'), n('F#4', 'e'), n('F#4', 'qd')] },
  { measure: 6, slurStart: 0, slurEnd: 3, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), n('E4', 'e'), n('E4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'q'), n('A4', 'e'), n('G#4', 'q'), n('F#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'hd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd', { tieStart: true }), ...eds('E4', 'D#4'), n('C#4', 'e'), ...eds('D#4', 'E#4'), n('F#4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('G#4', 'hd'), n('REST', 'r8'), ...b2('F#4', 'G#4')] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('B4', 'e'), n('C#5', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('G#4', 'hd', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'A4', 'G#4'), ...b3('F#4', 'G#4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [n('G#4', 'hd'), n('REST', 'r8'), ...b2('E4', 'F#4')] },
  { measure: 15, slurStart: 0, notes: [n('G#4', 'qd'), n('E4', 'qd'), n('D#4', 'qd')] },
  { measure: 16, slurEnd: 1, notes: [n('C#4', 'hd', { tieStart: true }), n('C#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE19_EX5_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'G#m', notes: [n('D#4', 'qd'), n('Fx4', 'e')] },
  { measure: 2, notes: [n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...t3('G#4', 'A#4', 'B4'), n('A#4', 'e'), n('G#4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F#4', 'q', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8')] },
  { measure: 5, notes: [n('E4', 'q', { tieStart: true }), n('E4', 'e'), n('F#4', 'e')] },
  { measure: 6, notes: [n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...t3('C#4', 'D#4', 'E4'), n('D#4', 'e'), n('C#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [...t3('B3', 'C#4', 'D#4'), n('D#4', 'e'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r8'), n('D#4', 'e'), n('B4', 'q', { tieStart: true })] },
  { measure: 10, notes: [...b2('B4', 'A#4'), n('G#4', 'q')] },
  { measure: 11, notes: [n('REST', 'r8'), n('G#4', 'e'), n('C#5', 'q', { tieStart: true })] },
  { measure: 12, slurStart: 0, notes: [...t3('C#5', 'B4', 'A#4'), ...t3('G#4', 'A#4', 'B4')] },
  { measure: 13, slurEnd: 3, notes: [...t3('A#4', 'G#4', 'Fx4'), ...t3('G#4', 'A#4', 'Gn4')] },
  { measure: 14, notes: [...t3('F#4', 'D#4', 'E4'), n('Fx4', 'q')] },
  { measure: 15, notes: [n('G#4', 'q', { tieStart: true }), n('G#4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE19_EX6_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'G#m', slurStart: 0, notes: [...b3('D#4', 'E4', 'F#4'), ...b3('G#4', 'A#4', 'B4')] },
  { measure: 2, notes: [...b3('G#4', 'B4', 'A#4'), ...b3('G#4', 'B4', 'A#4')] },
  { measure: 3, slurEnd: 0, notes: [n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...s4('G#4', 'Fx4', 'G#4', 'A#4'), n('B4', 's'), n('C#5', 's')] },
  { measure: 4, notes: [n('D#5', 'qd'), n('Cx5', 'qd', { tieStart: true })] },
  { measure: 5, slurStart: 0, notes: [n('D#5', 'e'), n('E4', 'e'), n('F#4', 'e'), n('G#4', 'e'), n('B4', 'e'), n('D#5', 'e')] },
  { measure: 6, slurEnd: 2, notes: [...b3('B4', 'G#4', 'E4'), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), ...s4('D#4', 'E#4', 'Fx4', 'G#4'), n('A#4', 's'), n('B4', 'e')] },
  { measure: 8, slurEnd: 0, notes: [n('C#5', 'qd'), n('Cx4', 'qd')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('E4', 'e'), n('G#4', 'e'), ...b3('F#4', 'G#4', 'E#4')] },
  { measure: 10, slurEnd: 0, notes: [...b3('F#4', 'G#4', 'E#4'), ...b3('F#4', 'G#4', 'F#4')] },
  { measure: 11, slurStart: 0, notes: [...b3('E4', 'B4', 'A#4'), ...b3('G#4', 'Fn4', 'E4')] },
  { measure: 12, slurEnd: 1, notes: [...b3('D#4', 'B4', 'A#4'), n('Gx4', 'qd')] },
  { measure: 13, slurStart: 1, notes: [n('Gx4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'qd', { tieStart: true })] },
  { measure: 14, slurEnd: 3, notes: [...b3('B4', 'A#4', 'G#4'), n('G#4', 'q'), n('F#4', 'e')] },
  { measure: 15, notes: [n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

const POZZOLI_SERIE19_EX7_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'D#m', slurStart: 0, notes: [n('F#4', 'q'), n('D#4', 'q'), ...t3('G#4', 'A#4', 'B4')] },
  { measure: 2, slurEnd: 1, notes: [n('F#4', 'q'), n('D#4', 'q'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 3, slurStart: 0, notes: [...eds('F#4', 'G#4'), n('A#4', 'ed'), n('B4', 's'), n('Cx5', 'e'), n('A#4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q'), n('F#4', 'q'), n('REST', 'r8'), n('D#5', 'e')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'h'), ...t3('G#4', 'A#4', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('A#4', 'q'), n('A#4', 'e'), n('REST', 'r8'), ...b2('A#4', 'B4')] },
  { measure: 7, slurStart: 0, notes: [...t3('A#4', 'G#4', 'F#4'), ...t3('G#4', 'F#4', 'E#4'), n('F#4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'q'), n('G#4', 'e'), n('REST', 'r8'), n('F#4', 'e'), n('G#4', 'e')] },
  { measure: 9, slurStart: 0, notes: [n('F#4', 'q'), ...t3('F#4', 'G#4', 'A#4'), n('G#4', 'q')] },
  { measure: 10, slurEnd: 0, notes: [...t3('G#4', 'A#4', 'B4'), n('C#5', 'q'), n('A#4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('Bn4', 'q'), n('G#4', 'q'), n('E#4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('F#4', 'q', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F#4', 'e')] },
  { measure: 13, slurStart: 0, notes: [...eds('E#4', 'F#4'), ...eds('G#4', 'A#4'), n('B4', 'ed'), n('Cx5', 's')] },
  { measure: 14, slurEnd: 1, notes: [n('D#5', 'q'), n('A#4', 'q'), n('REST', 'r8'), n('F#4', 'e')] },
  { measure: 15, slurStart: 0, notes: [n('G#4', 'q'), ...t3('G#4', 'F#4', 'E#4'), n('Cx4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('D#4', 'q', { tieStart: true }), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE19_EX8_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'D#m', notes: [n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('D#5', 'qd', { tieStart: true }), n('Cx5', 'qd')] },
  { measure: 2, notes: [n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('Cn5', 'qd', { tieStart: true }), n('B4', 'qd')] },
  { measure: 3, slurStart: 3, notes: [n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A#4', 'qd'), ...b3('G#4', 'A#4', 'B4')] },
  { measure: 4, slurEnd: 1, notes: [n('G#4', 'hd', { tieStart: true }), n('G#4', 'qd')] },
  { measure: 5, notes: [n('REST', 'r8'), n('REST', 'r8'), n('C#5', 'e'), n('B4', 'qd', { tieStart: true }), n('B4', 'qd')] },
  { measure: 6, notes: [n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e'), n('A#4', 'qd', { tieStart: true }), n('A#4', 'qd')] },
  { measure: 7, slurStart: 3, notes: [n('REST', 'r8'), n('REST', 'r8'), n('A#4', 'e'), n('G#4', 'qd'), ...b3('Fx4', 'Gx4', 'A#4')] },
  { measure: 8, slurEnd: 1, notes: [n('G#4', 'hd', { tieStart: true }), n('G#4', 'qd')] },
  { measure: 9, notes: [n('REST', 'r8'), n('REST', 'r8'), n('B3', 'e'), n('A#3', 'qd'), n('G#3', 'qd')] },
  { measure: 10, notes: [n('REST', 'r8'), n('REST', 'r8'), n('B3', 'e'), n('Cx4', 'qd', { tieStart: true }), n('D#4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('E#4', 'qd'), ...b3('F#4', 'G#4', 'A#4'), ...b3('B4', 'Cx5', 'Dx5')] },
  { measure: 12, slurEnd: 1, notes: [n('D#5', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('D#4', 'e')] },
  { measure: 13, notes: [n('E4', 'qd'), n('F#4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('Cx4', 'e')] },
  { measure: 14, notes: [n('D#4', 'qd', { tieStart: true }), ...b3('D#4', 'E4', 'F#4'), ...b3('G#4', 'F#4', 'E4')] },
  { measure: 15, slurStart: 0, notes: [...b3('D#4', 'C#4', 'B3'), ...b3('A#3', 'G#3', 'Cx4'), n('Cx4', 'qd')] },
  { measure: 16, slurEnd: 1, notes: [n('D#4', 'hd', { tieStart: true }), n('D#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE19_EX9_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'A#m', slurStart: 0, notes: [n('A#4', 'qd'), ...s2('Gx4', 'A#4'), n('E#4', 'h')] },
  { measure: 2, slurEnd: 2, notes: [n('F#4', 'ed'), n('G#4', 's'), n('A#4', 'q', { tieStart: true }), n('A#4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('B4', 'ed'), n('C#5', 's'), n('D#5', 'ed'), n('C#5', 's'), n('Cx5', 'q'), n('D#5', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('C#5', 'h'), n('A#4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('C#5', 'h', { tieStart: true }), n('C#5', 'ed'), n('B4', 's'), n('A#4', 'q')] },
  { measure: 6, slurEnd: 2, notes: [n('G#4', 'ed'), n('A#4', 's'), n('B4', 'q', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, notes: [n('REST', 'r8'), n('A#4', 'e'), n('G#4', 'q'), n('F#4', 'q'), n('E#4', 'q')] },
  { measure: 8, notes: [n('F#4', 'h'), n('D#4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'h', { tieStart: true }), n('Bn4', 'ed'), n('C#5', 's'), n('A#4', 'q')] },
  { measure: 10, slurEnd: 2, notes: [n('G#4', 'ed'), n('A#4', 's'), n('B4', 'q', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('F#4', 'G#4', 'A#4'), ...b3('B4', 'C#5', 'D#5'), n('E#5', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('A#4', 'h'), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, slurEnd: 2, notes: [n('A#4', 'qdd'), n('Gx4', 's'), n('A#4', 'q'), n('REST', 'r4')] },
  { measure: 14, slurStart: 0, slurEnd: 2, notes: [n('G#4', 'qdd'), n('F#4', 's'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('F#4', 'qd'), ...s2('Ex4', 'Fx4'), n('G#4', 'h')] },
  { measure: 16, slurEnd: 2, notes: [n('C#4', 'q'), n('A#3', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE19_EX10_MEASURES = [
  { measure: 1, timeSignature: '12/8', keySignature: 'A#m', slurStart: 1, notes: [n('REST', 'r4'), n('REST', 'r8'), n('A#4', 'hd'), n('B4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('G#4', 'qd'), n('A#4', 'hd', { tieStart: true }), n('A#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A#4', 'qd', { tieStart: true }), ...b3('A#4', 'Gx4', 'A#4'), ...b3('B4', 'C#5', 'D#5'), n('B4', 'qd')] },
  { measure: 4, slurEnd: 0, notes: [n('C#5', 'hd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 5, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('C#5', 'hd'), n('D#5', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'qd'), n('C#5', 'hd', { tieStart: true }), n('C#5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b2('B4', 'C#5'), ...b3('D#5', 'C#5', 'B4'), ...b3('A#4', 'G#4', 'F#4'), n('E#4', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('F#4', 'hd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('F#4', 'hd'), n('G#4', 'q'), n('A#4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('E#4', 'qd'), n('F#4', 'hd', { tieStart: true }), n('F#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('Ex4', 'hd'), n('F#4', 'q'), n('G#4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('D#4', 'qd'), n('E#4', 'hd', { tieStart: true }), n('E#4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r8'), n('Gx4', 'hd'), n('A#4', 'q'), n('B4', 'e')] },
  { measure: 14, slurEnd: 0, notes: [n('C#5', 'hd', { tieStart: true }), n('C#5', 'hd')] },
  { measure: 15, slurStart: 0, notes: [...b3('D#5', 'C#5', 'B4'), ...b3('A#4', 'G#4', 'F#4'), ...b3('Gx4', 'A#4', 'B4'), ...b3('C#5', 'B4', 'G#4')] },
  { measure: 16, slurEnd: 1, notes: [n('A#4', 'hd', { tieStart: true }), n('A#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] }
];

// Série 20: Tonalidades com bemóis (Láb Maior - Réb Maior - Solb Maior - Dób Maior)
const POZZOLI_SERIE20_EX1_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Ab', notes: [n('REST', 'r8'), ...b3('Ab4', 'Ab4', 'Ab4')] },
  { measure: 2, slurStart: 0, notes: [...s4('Ab4', 'G4', 'F4', 'Eb4'), n('C5', 'e'), n('Ab4', 'e')] },
  { measure: 3, slurEnd: 2, notes: [n('Eb5', 'q'), n('Db5', 'ed'), n('Bb4', 's')] },
  { measure: 4, slurStart: 0, notes: [n('Db5', 'q'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 5, notes: [n('REST', 'r8'), ...b3('Eb5', 'Eb5', 'Eb5')] },
  { measure: 6, slurStart: 0, notes: [...s4('Eb5', 'Db5', 'C5', 'Bb4'), n('Ab4', 'e'), n('Eb5', 'e')] },
  { measure: 7, slurEnd: 2, notes: [n('C5', 'q'), n('B4', 'ed'), n('C5', 's')] },
  { measure: 8, notes: [n('Ab4', 'q'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 9, notes: [n('REST', 'r8'), ...b3('G4', 'G4', 'G4')] },
  { measure: 10, slurStart: 0, notes: [n('Ab4', 'ed'), n('G4', 's'), n('Fn4', 'q')] },
  { measure: 11, notes: [n('REST', 'r8'), ...b3('Ab4', 'Ab4', 'Ab4')] },
  { measure: 12, slurStart: 0, notes: [...t3('Bb4', 'C5', 'Db5'), n('G4', 'q', { tieStart: true })] },
  { measure: 13, slurEnd: 0, notes: [...b2('G4', 'Ab4'), ...b2('Bb4', 'C5')] },
  { measure: 14, notes: [n('Db5', 'q'), n('C5', 'e'), ...s2('B4', 'C5')] },
  { measure: 15, notes: [n('Eb4', 'qdd'), n('G4', 's')] },
  { measure: 16, notes: [n('Ab4', 'q', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE20_EX2_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Ab', slurStart: 0, notes: [n('Eb5', 'h'), n('F5', 'ed'), n('Eb5', 's')] },
  { measure: 2, slurEnd: 1, notes: [n('Ab4', 'q'), n('An4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('Db5', 'h'), n('Eb5', 'ed'), n('Db5', 's')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q'), n('Ab4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('C4', 'qd'), ...b3('Eb4', 'Ab4', 'G4')] },
  { measure: 6, slurEnd: 1, notes: [n('F4', 'q'), n('Bb4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('Bb4', 'q'), ...t3('An4', 'Bb4', 'C5'), ...t3('Db5', 'C5', 'Bb4')] },
  { measure: 8, slurEnd: 1, notes: [n('Eb5', 'h'), n('Db5', 'q', { tieStart: true })] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'h'), n('Db5', 'ed'), n('C5', 's')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'q'), n('Fn4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('Bb4', 'h'), n('C5', 'ed'), n('Bb4', 's')] },
  { measure: 12, slurEnd: 1, notes: [n('En4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('Gb4', 'qd'), ...b3('Ab4', 'Bb4', 'Ab4')] },
  { measure: 14, slurEnd: 1, notes: [n('F4', 'q'), n('Db5', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'qd'), ...b3('Db5', 'C5', 'Bb4')] },
  { measure: 16, slurEnd: 1, notes: [n('Ab4', 'h'), n('REST', 'r4')] }
];

const POZZOLI_SERIE20_EX3_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Ab', slurStart: 0, notes: [n('Eb4', 'qd', { tieStart: true }), ...b3('Eb4', 'Ab4', 'C5')] },
  { measure: 2, slurEnd: 0, notes: [n('Bb4', 'qd'), ...b3('Ab4', 'G4', 'F4')] },
  { measure: 3, slurStart: 0, notes: [n('Eb4', 'qd', { tieStart: true }), n('Eb4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('Db5', 'e'), n('Eb5', 'q'), n('C5', 'e')] },
  { measure: 5, slurStart: 0, notes: [n('Bb4', 'qd'), n('Ab4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 6, slurStart: 0, notes: [n('Eb4', 'qd', { tieStart: true }), ...eds('Eb4', 'F4'), n('G4', 'e')] },
  { measure: 7, slurEnd: 1, notes: [n('Ab4', 'qd'), n('Bb4', 'e'), n('C5', 'e'), n('Db5', 'e')] },
  { measure: 8, slurStart: 0, notes: [n('Ebb5', 'qd'), ...b3('Db5', 'C5', 'Bb4')] },
  { measure: 9, slurEnd: 1, notes: [n('Ab4', 'qd', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8'), n('Eb5', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('Db5', 'qd'), ...b3('C5', 'Bb4', 'Ab4')] },
  { measure: 11, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('Eb4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('Eb4', 'qd'), ...eds('Eb4', 'F4'), n('G4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('Ab4', 'qd', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8'), n('Eb4', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('Ab4', 'qd'), ...b3('Bb4', 'C5', 'Dn5')] },
  { measure: 15, slurEnd: 1, notes: [n('Eb5', 'qd', { tieStart: true }), n('Eb5', 'e'), n('REST', 'r8'), n('Eb4', 'e')] },
  { measure: 16, slurStart: 0, notes: [n('C5', 'qd'), ...b3('Db5', 'C5', 'Bb4')] },
  { measure: 17, slurEnd: 1, notes: [n('Ab4', 'qd', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE20_EX4_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Db', slurStart: 1, notes: [n('REST', 'r4'), n('Ab4', 'e'), n('Db5', 'qd', { tieStart: true }), n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 2, slurEnd: 2, notes: [n('REST', 'r4'), n('Ab4', 'e'), n('Eb5', 'qd', { tieStart: true }), n('Eb5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'Gb4', 'Ab4'), ...b3('Bb4', 'C5', 'Db5')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 5, slurStart: 0, slurEnd: 1, notes: [n('Db5', 'qd'), n('Bn4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 6, slurStart: 0, slurEnd: 1, notes: [n('Bb4', 'qd'), n('An4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('Bb4', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'qd'), ...eds('Bb4', 'Ab4'), n('Gn4', 'e'), ...b3('F4', 'G4', 'A4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Eb4', 'qd'), n('F4', 'qd'), n('G4', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('Ab4', 'qd'), n('Bbb4', 'qd'), n('Ab4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('Gb4', 'qd'), n('F4', 'qd'), n('Gb4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('Ab4', 'hd'), n('Ab4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'Ab4', 'Db5'), ...b3('F5', 'Eb5', 'Db5')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'qd'), n('Bb4', 'qd'), n('G4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [n('Ab4', 'qd'), n('F4', 'qd'), n('Eb4', 'qd')] },
  { measure: 16, slurEnd: 1, notes: [n('Db4', 'hd', { tieStart: true }), n('Db4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE20_EX5_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Db', slurStart: 1, notes: [n('REST', 'r8'), ...b3('Ab4', 'Gb4', 'F4'), ...b2('Bb4', 'Ab4')] },
  { measure: 2, slurEnd: 0, notes: [n('Gb4', 'hd', { tieStart: true })] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b3('Ab4', 'Gb4', 'F4'), ...b2('Cb5', 'Bb4')] },
  { measure: 4, slurEnd: 0, notes: [n('Ab4', 'hd', { tieStart: true })] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b3('Ab4', 'Gb4', 'F4'), ...b2('Db5', 'Cb5')] },
  { measure: 6, slurEnd: 0, notes: [n('Bb4', 'h'), n('Eb5', 'ed'), n('Bb4', 's')] },
  { measure: 7, slurStart: 0, notes: [n('Bb4', 'h'), n('An4', 'ed'), n('Bb4', 's')] },
  { measure: 8, slurEnd: 0, notes: [n('Ab4', 'hd')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('Ab4', 'Gb4', 'F4'), ...b2('Bb4', 'Ab4')] },
  { measure: 10, slurEnd: 0, notes: [n('Gn4', 'hd', { tieStart: true })] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('G4', 'F4', 'E4'), ...b2('C5', 'Bb4')] },
  { measure: 12, slurEnd: 0, notes: [n('An4', 'hd', { tieStart: true })] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), ...b3('Ab4', 'Gb4', 'F4'), ...b2('Db5', 'C5')] },
  { measure: 14, slurEnd: 0, notes: [n('B4', 'qd'), n('REST', 'r8'), ...b2('Ab4', 'Gb4')] },
  { measure: 15, slurStart: 0, notes: [n('F4', 'qd'), ...b3('Gb4', 'F4', 'Eb4')] },
  { measure: 16, slurEnd: 1, notes: [n('Db4', 'h', { tieStart: true }), n('Db4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE20_EX6_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Db', slurStart: 0, notes: [...b3('Db4', 'Eb4', 'F4'), ...b3('Gb4', 'Ab4', 'Bb4')] },
  { measure: 2, slurEnd: 1, notes: [n('Ab4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('C5', 'qd', { tieStart: true })] },
  { measure: 3, slurStart: 0, notes: [n('Bbb4', 'qd'), n('Ab4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 4, slurStart: 0, notes: [...b3('Eb4', 'F4', 'Gb4'), ...b3('Ab4', 'Bb4', 'C5')] },
  { measure: 5, slurEnd: 1, notes: [n('Bb4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('Ab4', 'qd', { tieStart: true })] },
  { measure: 6, slurStart: 0, notes: [n('G4', 'qd'), n('Ab4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b3('Ab4', 'Bb4', 'C5'), ...b3('Db5', 'Eb5', 'F5')] },
  { measure: 8, slurEnd: 1, notes: [n('Eb5', 'qd'), n('C5', 'qd')] },
  { measure: 9, slurStart: 0, notes: [n('Db5', 'qd'), n('Bb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, slurStart: 0, notes: [...eds('B4', 'C5'), n('B4', 'e'), n('Bb4', 'qd')] },
  { measure: 11, slurEnd: 1, notes: [n('Ab4', 'qd', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 12, slurStart: 0, notes: [...b3('F4', 'Gb4', 'Ab4'), ...b3('Bb4', 'C5', 'Db5')] },
  { measure: 13, slurEnd: 1, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...s4('Gn4', 'Ab4', 'Bb4', 'C5'), n('Db5', 's'), n('Eb5', 's')] },
  { measure: 14, slurStart: 0, notes: [n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...s4('Ab4', 'Bb4', 'C5', 'Db5'), n('Eb5', 's'), n('F5', 's')] },
  { measure: 15, slurEnd: 1, notes: [n('Eb5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('Gb4', 'qd', { tieStart: true })] },
  { measure: 16, slurStart: 0, notes: [...b3('F4', 'Eb4', 'Db4'), ...b3('C4', 'Db4', 'Eb4')] },
  { measure: 17, slurEnd: 1, notes: [n('Db4', 'qd', { tieStart: true }), n('Db4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE20_EX7_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Gb', slurStart: 1, notes: [n('REST', 'r4'), n('Db5', 'q', { tieStart: true }), ...b4('Db5', 'Cb5', 'Bb4', 'Ab4')] },
  { measure: 2, slurEnd: 3, notes: [...b4('Gb4', 'Ab4', 'Bb4', 'Gn4'), n('Bb4', 'q'), n('Ab4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), n('Ab4', 'e'), n('Gb4', 'qd', { tieStart: true }), n('Gb4', 'e'), n('REST', 'r8'), n('Ab4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('Gb4', 'qd', { tieStart: true }), n('Gb4', 'e'), n('REST', 'r8'), n('Ab4', 'e'), n('Fn4', 'q', { tieStart: true })] },
  { measure: 5, slurStart: 1, notes: [n('F4', 'e'), n('REST', 'r8'), ...s4('Db5', 'C5', 'Bb4', 'Ab4'), ...b4('Gb4', 'Fn4', 'Eb4', 'Db4')] },
  { measure: 6, slurEnd: 3, notes: [...b4('C5', 'Bb4', 'Ab4', 'G4'), n('Bb4', 'q'), n('Ab4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('Ab4', 'e'), n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('Ab4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('Ab4', 'e'), n('Bbb4', 'q')] },
  { measure: 9, slurStart: 0, notes: [n('Ab4', 'q'), n('F4', 'q'), n('REST', 'r8'), n('Ab4', 'e'), n('Eb5', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 1, notes: [n('Eb5', 'q'), n('Db5', 'h'), n('Cb5', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('Bb4', 'q'), n('Eb5', 'q', { tieStart: true }), ...b4('Eb5', 'Db5', 'Cb5', 'Bb4')] },
  { measure: 12, slurEnd: 1, notes: [n('Ab4', 'q'), n('REST', 'r8'), n('Ab4', 'e'), ...b4('Cb5', 'Bb4', 'Ab4', 'Gb4')] },
  { measure: 13, slurStart: 0, notes: [n('Fn4', 'e'), n('REST', 'r8'), n('Db5', 'q'), n('Gb4', 'q'), n('REST', 'r4')] }
];

const POZZOLI_SERIE20_EX8_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Gb', slurStart: 0, notes: [n('Gb4', 'q'), n('Gb4', 'e'), n('Gb4', 'q'), n('Gb4', 'e')] },
  { measure: 2, slurEnd: 0, notes: [n('Gb4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('Gb4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('Fn4', 'qd'), ...eds('Gb4', 'Bb4'), n('Ab4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('Db5', 'qd', { tieStart: true }), n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('Gb4', 'q'), n('Gb4', 'e'), n('Gb4', 'q'), n('Gb4', 'e')] },
  { measure: 6, slurEnd: 0, notes: [n('Gb4', 'qd'), n('REST', 'r8'), n('REST', 'r8'), n('Gb4', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('Gb4', 'ed'), n('Cb5', 's'), n('Bb4', 'e'), n('Bb4', 'qd', { tieStart: true })] },
  { measure: 8, slurEnd: 1, notes: [n('Bb4', 'e'), ...s4('Cb5', 'Bb4', 'An4', 'Bb4'), n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Cb5', 'qd'), n('Bb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 10, slurStart: 0, notes: [n('Bb4', 'qd', { tieStart: true }), ...s4('Bb4', 'Cb5', 'Bb4', 'An4'), n('Bb4', 's'), n('Cb5', 's')] },
  { measure: 11, slurEnd: 1, notes: [n('Db5', 'qd'), n('Bbb4', 'qd', { tieStart: true })] },
  { measure: 12, slurStart: 0, notes: [n('Bb4', 'qd'), ...s4('Cb5', 'Bb4', 'Ab4', 'Gb4'), n('F4', 's'), n('Eb4', 's')] },
  { measure: 13, slurEnd: 1, notes: [n('Db4', 'qd', { tieStart: true }), n('Db4', 'e'), n('REST', 'r8'), n('Gb4', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('Bb4', 'qd', { tieStart: true }), ...s4('Bb4', 'Ab4', 'Gb4', 'F4'), n('Eb4', 's'), n('Db4', 's')] },
  { measure: 15, slurEnd: 1, notes: [n('Gb4', 'qd', { tieStart: true }), n('Gb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE20_EX9_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Cb', notes: [n('REST', 'r8'), n('Eb4', 'e'), n('Ab4', 'q'), n('Bb4', 'q'), n('Cb5', 'q')] },
  { measure: 2, slurStart: 0, notes: [n('Eb5', 'h', { tieStart: true }), n('Eb5', 'q'), ...t3('Db5', 'Cb5', 'Bb4')] },
  { measure: 3, slurEnd: 0, notes: [n('Ab4', 'hd'), ...t3('Bb4', 'Cb5', 'Db5')] },
  { measure: 4, slurEnd: 0, notes: [n('Gb4', 'h', { tieStart: true }), n('Gb4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, notes: [n('REST', 'r8'), n('Gb4', 'e'), n('Bb4', 'q'), n('Cb5', 'q'), n('Db5', 'q')] },
  { measure: 6, slurStart: 0, notes: [n('Eb5', 'h', { tieStart: true }), n('Eb5', 'q'), ...t3('Db5', 'Cb5', 'Bb4')] },
  { measure: 7, slurEnd: 1, notes: [n('Ab4', 'q'), n('Gn4', 'q'), ...t3('Ab4', 'Bb4', 'Cb5'), n('Fb4', 'q')] },
  { measure: 8, notes: [n('REST', 'r8'), n('Eb4', 'e'), n('Ab4', 'q'), n('Bb4', 'q'), n('Cb5', 'q')] },
  { measure: 9, notes: [n('Db5', 'h', { tieStart: true }), n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 10, notes: [n('REST', 'r8'), n('Fb4', 'e'), n('Ab4', 'q'), n('Bb4', 'q'), n('Cb5', 'q')] },
  { measure: 11, notes: [n('Db5', 'h', { tieStart: true }), n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 12, notes: [n('REST', 'r8'), n('Gb4', 'e'), n('Cb5', 'q'), n('Db5', 'q'), n('Eb5', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('Fb5', 'h', { tieStart: true }), n('Fb5', 'q'), ...t3('Eb5', 'Db5', 'Cb5')] },
  { measure: 14, slurEnd: 0, notes: [n('Bb4', 'hd'), ...t3('Cb5', 'Db5', 'Eb5')] },
  { measure: 15, slurStart: 0, notes: [n('Cb4', 'h', { tieStart: true }), n('Cb4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE20_EX10_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Cb', notes: [n('REST', 'r8'), ...b2('Eb4', 'Fb4'), n('REST', 'r8'), ...b2('Eb4', 'Dn4'), n('REST', 'r8'), ...b2('Eb4', 'Gb4')] },
  { measure: 2, slurStart: 0, notes: [n('Cb5', 'hd', { tieStart: true }), n('Cb5', 'qd')] },
  { measure: 3, slurEnd: 4, notes: [n('REST', 'r8'), ...b2('Fb4', 'Gb4'), n('REST', 'r8'), ...b2('Fb4', 'Eb4'), n('REST', 'r8'), ...b2('Fb4', 'Ab4')] },
  { measure: 4, slurStart: 0, notes: [n('Db5', 'hd', { tieStart: true }), n('Db5', 'qd')] },
  { measure: 5, slurEnd: 3, notes: [n('Eb5', 'qd'), ...b3('Db5', 'Cb5', 'Bb4'), n('Ab4', 'qd')] },
  { measure: 6, slurStart: 0, notes: [...b3('Gb4', 'Fb4', 'Eb4'), ...b3('Db4', 'Cb4', 'Bb3'), n('Ab3', 'qd', { tieStart: true })] },
  { measure: 7, slurEnd: 1, notes: [n('Ab3', 'qd'), n('REST', 'r8'), ...b2('Eb4', 'Fb4'), n('REST', 'r8'), ...b2('Eb4', 'Gb4')] },
  { measure: 8, notes: [n('Cb5', 'hd', { tieStart: true }), n('Cb5', 'qd')] },
  { measure: 9, notes: [n('REST', 'r8'), ...b2('Gb4', 'Ab4'), n('REST', 'r8'), ...b2('Gb4', 'Fb4'), n('REST', 'r8'), ...b2('Gb4', 'Bb4')] },
  { measure: 10, notes: [n('Eb5', 'hd', { tieStart: true }), n('Eb5', 'qd')] },
  { measure: 11, notes: [n('REST', 'r8'), ...b2('Ab4', 'Bb4'), n('REST', 'r8'), ...b2('Ab4', 'Gb4'), n('REST', 'r8'), ...b2('Ab4', 'Cb5')] },
  { measure: 12, slurStart: 0, notes: [...b3('Db5', 'Cb5', 'Bb4'), ...b3('Ab4', 'Gb4', 'Fb4'), ...b3('Eb4', 'Db4', 'Cb4')] },
  { measure: 13, slurEnd: 1, notes: [n('Bb3', 'hd'), n('Cb4', 'qd', { tieStart: true })] },
  { measure: 14, notes: [n('Cb4', 'qd'), ...b3('Db4', 'Eb4', 'Fb4'), n('Gb4', 'qd', { tieStart: true })] },
  { measure: 15, notes: [n('Cb4', 'hd', { tieStart: true }), n('Cb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

// Série 21: Tonalidades com bemóis (Fá menor - Sib menor - Mib menor - Láb menor)
const POZZOLI_SERIE21_EX1_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'Fm', slurStart: 1, notes: [n('REST', 'r8'), n('C4', 'e'), n('F4', 'ed'), n('G4', 's'), n('Ab4', 'ed'), n('F4', 's')] },
  { measure: 2, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true })] },
  { measure: 3, slurStart: 0, notes: [...b2('C5', 'Db5'), ...b2('En4', 'F4'), ...b2('G4', 'Ab4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), n('C5', 'e'), n('Db5', 'ed'), n('C5', 's'), n('Bb4', 'ed'), n('Ab4', 's')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'q'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), n('C4', 'e'), n('G4', 'q'), n('E4', 'q', { tieStart: true })] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), n('C4', 'e'), n('F4', 'ed'), n('G4', 's'), n('Ab4', 'ed'), n('F4', 's')] },
  { measure: 10, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [...b2('C5', 'Db5'), ...b2('Bb4', 'Ab4'), ...b2('G4', 'F4')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'q'), n('Eb4', 'q'), n('REST', 'r4')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r8'), n('G4', 'e'), ...b2('Ab4', 'G4'), n('Bb4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'q'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), n('C4', 'e'), n('Db4', 'ed'), n('C4', 's'), n('E4', 'ed'), n('G4', 's')] },
  { measure: 16, slurEnd: 1, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE21_EX2_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Fm', slurStart: 0, notes: [...s4('F4', 'Eb4', 'Db4', 'C4'), n('F4', 'hd', { tieStart: true })] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4'), ...s4('G4', 'F4', 'Eb4', 'Db4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('Ab4', 'ed'), n('Bb4', 's')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), ...s2('C5', 'Db5'), n('C5', 'q'), n('G4', 'q')] },
  { measure: 5, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...s2('C5', 'Db5'), n('C5', 'q'), n('F4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [n('Ab4', 'qdd'), n('G4', 's'), n('F4', 'q'), n('G4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('Ab4', 'h'), n('REST', 'r4'), n('C5', 'q', { tieStart: true })] },
  { measure: 9, slurStart: 0, notes: [...t3('C5', 'Db5', 'C5'), ...t3('Bb4', 'Ab4', 'G4'), n('Ab4', 'q'), n('F4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'q'), n('C4', 'q'), n('REST', 'r4'), n('C4', 'ed'), n('Db4', 's')] },
  { measure: 11, slurStart: 0, notes: [n('En4', 'q'), n('F4', 'ed'), n('G4', 's'), n('Ab4', 'q'), n('En4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('C5', 'hd', { tieStart: true }), n('C5', 'q')] },
  { measure: 13, notes: [n('Ab4', 'q'), n('G4', 'q'), n('F4', 'q'), n('E4', 'q')] },
  { measure: 14, notes: [n('F4', 'h', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE21_EX3_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Fm', notes: [n('C5', 'q'), n('C5', 'e'), ...eds('C5', 'Bb4'), n('Ab4', 'e')] },
  { measure: 2, notes: [n('G4', 'e'), n('REST', 'r8'), n('G4', 'e'), n('G4', 'q'), n('G4', 'e')] },
  { measure: 3, slurStart: 0, notes: [...s4('F4', 'G4', 'Ab4', 'Bb4'), n('C5', 's'), n('Db5', 's'), n('C5', 'ed'), n('B4', 's'), n('C5', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('Ab4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 5, slurStart: 0, notes: [n('Db5', 'q', { tieStart: true }), ...s2('Db5', 'C5'), n('Bb4', 'q', { tieStart: true }), ...s2('Bb4', 'Ab4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, notes: [n('G4', 'q'), n('G4', 'e'), n('G4', 'q'), n('G4', 'e')] },
  { measure: 8, notes: [n('Ab4', 'q'), n('Ab4', 'e'), ...eds('Ab4', 'G4'), n('F4', 'e')] },
  { measure: 9, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'e'), n('REST', 'r8'), n('C4', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('Db4', 'qd'), ...b3('C4', 'Bb3', 'C4')] },
  { measure: 11, slurEnd: 1, notes: [n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('G4', 'q'), n('Ab4', 'e'), n('Bb4', 'q'), n('G4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8'), ...s2('C4', 'D4')] },
  { measure: 14, slurStart: 0, notes: [...s2('En4', 'F4'), n('G4', 'e'), n('REST', 'r8'), n('Ab4', 'q'), n('G4', 'e')] },
  { measure: 15, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE21_EX4_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Fm', slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...b3('F4', 'G4', 'Ab4'), ...b3('Bb4', 'Ab4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'hd'), ...eds('G4', 'Ab4'), n('Bb4', 'e')] },
  { measure: 3, slurStart: 0, notes: [...eds('Ab4', 'Bb4'), n('C5', 'e'), n('Db5', 'qd', { tieStart: true }), n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 4, slurEnd: 0, notes: [n('C5', 'qd'), ...b3('Db5', 'C5', 'Bb4'), ...b3('Ab4', 'G4', 'F4')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd'), n('Ab4', 'qd'), n('Bb4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'qd'), n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('F4', 'qd'), ...b3('G4', 'Ab4', 'Bb4'), n('C5', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('Ab4', 'qd'), n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Ab4', 'qd'), ...b3('Bb4', 'Ab4', 'G4'), n('F4', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd'), n('E4', 'qd', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...eds('F4', 'G4'), n('Ab4', 'e'), n('Bb4', 'qd'), ...eds('G4', 'Ab4'), n('Bb4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('C5', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 13, slurStart: 0, notes: [n('Db5', 'qd'), ...b3('C5', 'Bb4', 'Ab4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 14, slurEnd: 1, notes: [n('F4', 'hd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE21_EX5_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Bbm', slurStart: 0, notes: [...s4('F4', 'G4', 'Ab4', 'Bb4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 2, slurEnd: 0, notes: [...s4('Db5', 'C5', 'Bb4', 'An4'), n('Bb4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('F4', 'q', { tieStart: true }), ...s4('F4', 'G4', 'Ab4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [...s4('F4', 'Gb4', 'Ab4', 'Bb4'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 6, slurEnd: 0, notes: [...s4('Db5', 'C5', 'Bb4', 'Ab4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...s4('F4', 'G4', 'Ab4', 'Bb4'), ...s4('Cb5', 'Bb4', 'Ab4', 'Gb4')] },
  { measure: 8, slurEnd: 1, notes: [n('Fn4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('F4', 's')] },
  { measure: 9, slurStart: 0, notes: [n('Bb4', 'q', { tieStart: true }), n('Bb4', 'e'), n('REST', 'r8')] },
  { measure: 10, slurStart: 0, notes: [n('REST', 'r8'), n('REST', 'r16'), n('F4', 's'), n('Db5', 'q', { tieStart: true })] },
  { measure: 11, slurEnd: 1, notes: [n('Db5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r16'), n('F4', 's')] },
  { measure: 12, slurStart: 0, notes: [n('Eb5', 'q', { tieStart: true }), ...s4('Eb5', 'Db5', 'C5', 'Bb4')] },
  { measure: 13, slurEnd: 1, notes: [n('An4', 'e'), n('REST', 'r8'), ...s4('Bb4', 'C5', 'Db5', 'Eb5')] },
  { measure: 14, slurStart: 0, notes: [n('F5', 'q'), n('Db5', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [...s4('Gb4', 'Ab4', 'Bb4', 'C5'), n('An4', 'e'), n('REST', 'r8')] },
  { measure: 16, slurEnd: 1, notes: [n('Bb4', 'q', { tieStart: true }), n('Bb4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE21_EX6_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Bbm', slurStart: 0, notes: [...b3('F4', 'Gb4', 'Ab4'), ...b3('Bb4', 'C5', 'Db5')] },
  { measure: 2, slurEnd: 1, notes: [n('C5', 'qd'), n('An4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('Bb4', 'qd'), ...b3('Db5', 'C5', 'Bb4')] },
  { measure: 4, slurEnd: 1, notes: [n('Ab4', 'qd'), n('F4', 'qd')] },
  { measure: 5, slurStart: 0, notes: [...b3('Gb4', 'Ab4', 'Bb4'), ...b3('C5', 'Db5', 'Eb5')] },
  { measure: 6, slurEnd: 1, notes: [n('Db5', 'qd'), n('Bb4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...b3('C5', 'Bb4', 'Ab4'), ...b3('G4', 'F4', 'E4')] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('F4', 'qd'), ...b3('Gb4', 'Ab4', 'Bb4')] },
  { measure: 10, slurEnd: 1, notes: [n('Ab4', 'qd'), n('F4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('Gb4', 'qd'), ...b3('Ab4', 'Bb4', 'C5')] },
  { measure: 12, slurEnd: 1, notes: [n('Bb4', 'qd'), n('Gb4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [...b3('Ab4', 'Bb4', 'C5'), ...b3('Db5', 'C5', 'Bb4')] },
  { measure: 14, slurEnd: 1, notes: [n('An4', 'qd'), n('F4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [...b3('Gb4', 'F4', 'Eb4'), ...b3('Db4', 'C4', 'An3')] },
  { measure: 16, slurEnd: 1, notes: [n('Bb3', 'qd', { tieStart: true }), n('Bb3', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE21_EX7_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Ebm', slurStart: 0, notes: [n('Bb4', 'q'), n('Gb4', 'q'), n('Eb4', 'q'), n('Bb3', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('Db4', 'h'), n('C4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('Bb4', 'q'), n('Gb4', 'q'), n('Eb4', 'q'), n('Bb3', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('Dn4', 'h'), n('Eb4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [...b4('Gb4', 'Ab4', 'Bb4', 'Cb5'), ...b4('Db5', 'C5', 'Bb4', 'Ab4')] },
  { measure: 6, slurEnd: 1, notes: [n('Gb4', 'h'), n('F4', 'q'), n('REST', 'r4')] },
  { measure: 7, slurStart: 0, notes: [...b4('Eb4', 'F4', 'Gb4', 'Ab4'), ...b4('Bb4', 'Ab4', 'Gb4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('Eb4', 'h', { tieStart: true }), n('Eb4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('Bb4', 'qd'), ...s2('Ab4', 'Gb4'), n('F4', 'q'), n('Eb4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('Dn4', 'h'), n('Bb3', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('Cb5', 'qd'), ...s2('Bb4', 'Ab4'), n('Gb4', 'q'), n('F4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('Eb4', 'h', { tieStart: true }), n('Eb4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE21_EX8_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'Ebm', slurStart: 0, notes: [n('Bb4', 'qd'), n('Gb4', 'qd'), n('Eb4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('Dn4', 'hd'), n('Eb4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('Bb4', 'qd'), n('Ab4', 'qd'), n('Gb4', 'qd')] },
  { measure: 4, slurEnd: 1, notes: [n('F4', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('Gb4', 'qd'), ...b3('Ab4', 'Bb4', 'Cb5'), n('Bb4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('Ab4', 'qd'), ...b3('Gb4', 'F4', 'Eb4'), n('Dn4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('Eb4', 'qd'), n('Gb4', 'qd'), n('Bb4', 'qd')] },
  { measure: 8, slurEnd: 1, notes: [n('Eb5', 'hd', { tieStart: true }), n('Eb5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Db5', 'qd'), n('Cb5', 'qd'), n('Bb4', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('Ab4', 'hd'), n('Gb4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [n('F4', 'qd'), n('Gb4', 'qd'), n('Ab4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('Eb4', 'hd', { tieStart: true }), n('Eb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE21_EX9_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Abm', slurStart: 0, notes: [...s4('Eb4', 'Fb4', 'Gb4', 'Ab4'), n('Bb4', 'e'), n('REST', 'r8')] },
  { measure: 2, slurEnd: 0, notes: [...s4('Cb5', 'Bb4', 'Ab4', 'Gn4'), n('Ab4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b2('Eb5', 'Db5'), ...b2('Cb5', 'Bb4')] },
  { measure: 4, slurEnd: 1, notes: [n('Ab4', 'q', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [...s4('Ab4', 'Gb4', 'Fb4', 'Eb4'), n('Db4', 'e'), n('REST', 'r8')] },
  { measure: 6, slurEnd: 0, notes: [...s4('Eb4', 'Fb4', 'Gb4', 'Ab4'), n('Bb4', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [...b2('Cb5', 'Ab4'), ...b2('Fb4', 'Gn4')] },
  { measure: 8, slurEnd: 1, notes: [n('Ab4', 'q', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE21_EX10_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Abm', slurStart: 0, notes: [n('Eb4', 'qd'), ...b3('Ab4', 'Bb4', 'Cb5')] },
  { measure: 2, slurEnd: 1, notes: [n('Bb4', 'qd'), n('Gn4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('Ab4', 'qd'), ...b3('Cb5', 'Bb4', 'Ab4')] },
  { measure: 4, slurEnd: 1, notes: [n('Gb4', 'qd'), n('Eb4', 'qd')] },
  { measure: 5, slurStart: 0, notes: [...b3('Fb4', 'Gb4', 'Ab4'), ...b3('Bb4', 'Cb5', 'Db5')] },
  { measure: 6, slurEnd: 1, notes: [n('Cb5', 'qd'), n('Ab4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [...b3('Bb4', 'Ab4', 'Gb4'), ...b3('Fb4', 'Eb4', 'Dn4')] },
  { measure: 8, slurEnd: 1, notes: [n('Eb4', 'qd', { tieStart: true }), n('Eb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Eb4', 'qd'), ...b3('Fb4', 'Gb4', 'Ab4')] },
  { measure: 10, slurEnd: 1, notes: [n('Gb4', 'qd'), n('Eb4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [...b3('Ab4', 'Bb4', 'Cb5'), ...b3('Db5', 'Cb5', 'Bb4')] },
  { measure: 12, slurEnd: 1, notes: [n('Gn4', 'qd'), n('Eb4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [...b3('Fb4', 'Eb4', 'Db4'), ...b3('Cb4', 'Bb3', 'Gn3')] },
  { measure: 14, slurEnd: 1, notes: [n('Ab3', 'qd', { tieStart: true }), n('Ab3', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

// Série 22: Intervalos de difícil entonação
const POZZOLI_SERIE22_EX1_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'C', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 2, notes: [n('G4', 'q'), n('F#4', 'e'), n('A4', 'q'), n('G#4', 'e')] },
  { measure: 3, slurEnd: 1, notes: [n('A4', 'qd'), n('An4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 4, slurStart: 0, notes: [n('G#4', 'q'), n('A4', 'e'), n('A#4', 'q'), n('B4', 'e')] },
  { measure: 5, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('E5', 'e', { tieStart: true })] },
  { measure: 6, slurStart: 0, notes: [n('Eb5', 'qd', { tieStart: true }), ...b3('E5', 'D5', 'C5')] },
  { measure: 7, slurEnd: 3, notes: [...b3('B4', 'C5', 'C#5'), n('D5', 'e'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 8, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), ...b3('B4', 'Bb4', 'A4')] },
  { measure: 9, slurEnd: 1, notes: [n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('A4', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('G#4', 'q'), n('Gn4', 'e'), n('F4', 'q'), n('F#4', 'e')] },
  { measure: 11, slurEnd: 1, notes: [n('G4', 'qd'), n('E4', 'e'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('G#4', 'q'), n('Gn4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('A4', 'qd'), n('G4', 'e'), n('REST', 'r8'), n('C5', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), ...b3('C5', 'B4', 'Bb4')] },
  { measure: 15, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 16, slurStart: 0, notes: [...b3('G4', 'F#4', 'G4'), ...b3('G#4', 'A4', 'Bn4')] },
  { measure: 17, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE22_EX2_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'F', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), n('A4', 'q')] },
  { measure: 2, notes: [n('G#4', 'h'), n('A4', 'q')] },
  { measure: 3, slurEnd: 2, notes: [n('C5', 'ed'), n('Bn4', 's'), n('Bb4', 'e'), n('REST', 'r8'), n('A4', 'q')] },
  { measure: 4, slurStart: 0, notes: [n('G4', 'qd'), ...b3('G#4', 'A4', 'A#4')] },
  { measure: 5, slurEnd: 1, notes: [n('B4', 'q', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('D5', 'q')] },
  { measure: 6, slurStart: 0, notes: [n('Bn4', 'h'), n('C5', 'q')] },
  { measure: 7, slurEnd: 2, notes: [n('E5', 'ed'), n('Db5', 's'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 8, slurStart: 0, notes: [...b4('F#4', 'G4', 'G#4', 'A4'), ...b2('A#4', 'Bn4')] },
  { measure: 9, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('G4', 'q')] },
  { measure: 10, slurStart: 0, notes: [n('F#4', 'h'), n('G4', 'q')] },
  { measure: 11, slurEnd: 2, notes: [n('B4', 'ed'), n('G#4', 's'), n('An4', 'e'), n('REST', 'r8'), n('G4', 'q')] },
  { measure: 12, slurStart: 0, notes: [n('F#4', 'h'), n('G4', 'q')] },
  { measure: 13, slurEnd: 2, notes: [n('B4', 'ed'), n('A4', 's'), n('G4', 'e'), n('REST', 'r8'), n('A4', 'q')] },
  { measure: 14, slurStart: 0, notes: [n('D5', 'q'), ...b2('Eb5', 'D5'), n('C5', 'q')] },
  { measure: 15, slurEnd: 1, notes: [n('C5', 'q'), n('REST', 'r4'), n('F4', 'q')] },
  { measure: 16, slurStart: 0, notes: [n('B4', 'q'), ...b2('Ab4', 'G4'), n('F4', 'q', { tieStart: true })] },
  { measure: 17, slurEnd: 1, notes: [n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX3_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), n('A4', 'q')] },
  { measure: 2, notes: [n('G#4', 'h'), n('F4', 'ed'), n('E4', 's')] },
  { measure: 3, slurEnd: 1, notes: [n('E4', 'h'), n('A4', 'q')] },
  { measure: 4, slurStart: 0, notes: [n('G4', 'e'), n('G#4', 'q'), n('A4', 'e'), ...b2('A4', 'D5')] },
  { measure: 5, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'e'), n('REST', 'r8'), n('D5', 'q')] },
  { measure: 6, slurStart: 0, notes: [n('C5', 'h'), n('Bb4', 'ed'), n('A4', 's')] },
  { measure: 7, slurEnd: 3, notes: [n('A4', 'q', { tieStart: true }), ...b4('A4', 'G4', 'A4', 'B4')] },
  { measure: 8, slurStart: 0, notes: [n('Bb4', 'e'), n('C5', 'q'), n('B4', 'e'), n('C5', 'q')] },
  { measure: 9, slurEnd: 1, notes: [n('D5', 'h'), n('E5', 'q')] },
  { measure: 10, slurStart: 0, notes: [n('D#5', 'h'), ...b2('D5', 'E5')] },
  { measure: 11, slurEnd: 1, notes: [n('E5', 'q'), n('C5', 'e'), n('REST', 'r8'), n('E5', 'q')] },
  { measure: 12, slurStart: 0, notes: [...b2('D#5', 'D5'), ...b2('D5', 'D5'), ...b2('D5', 'D5')] },
  { measure: 13, slurEnd: 2, notes: [...b2('F5', 'B4'), n('C5', 'e'), n('REST', 'r8'), n('A4', 'q')] },
  { measure: 14, slurStart: 0, notes: [n('G#4', 'h'), n('F4', 'ed'), n('E4', 's')] },
  { measure: 15, slurEnd: 1, notes: [n('E4', 'h'), n('G4', 'q')] },
  { measure: 16, slurStart: 0, notes: [...b2('G4', 'G#4'), ...b2('E5', 'F4'), ...b2('G4', 'A4')] },
  { measure: 17, slurEnd: 1, notes: [n('A4', 'q', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX4_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'C', notes: [n('REST', 'r4'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 2, slurStart: 0, notes: [n('D#4', 'q'), ...b2('E4', 'E4')] },
  { measure: 3, slurEnd: 1, notes: [n('D#4', 'q'), ...b2('E4', 'E4')] },
  { measure: 4, slurStart: 0, notes: [...b2('F4', 'F#4'), ...b2('C5', 'D5')] },
  { measure: 5, slurEnd: 2, notes: [n('E5', 'q'), ...b2('C5', 'B4')] },
  { measure: 6, slurStart: 0, notes: [n('A#4', 'q'), ...b2('B4', 'A4')] },
  { measure: 7, slurEnd: 1, notes: [n('A#4', 'q'), ...b2('B4', 'A4')] },
  { measure: 8, slurStart: 0, notes: [...b2('G#4', 'A4'), ...b2('D5', 'E5')] },
  { measure: 9, slurEnd: 1, notes: [n('F5', 'qd'), n('G4', 'e')] },
  { measure: 10, slurStart: 0, notes: [...b2('G#4', 'A4'), ...b2('D5', 'E5')] },
  { measure: 11, slurEnd: 1, notes: [n('C5', 'qd'), n('E4', 'e')] },
  { measure: 12, slurStart: 0, notes: [...b2('Eb4', 'E#4'), ...b2('C5', 'D5')] },
  { measure: 13, slurEnd: 1, notes: [n('C5', 'q'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('G#4', 'q'), ...b2('C5', 'B4')] },
  { measure: 15, slurEnd: 1, notes: [n('B4', 'q'), ...b2('C5', 'G4')] },
  { measure: 16, slurStart: 0, notes: [...b2('F#4', 'G4'), ...b2('E5', 'D5')] },
  { measure: 17, slurEnd: 1, notes: [n('C5', 'q', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] }
];

const POZZOLI_SERIE22_EX5_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'F', notes: [n('REST', 'r4'), n('REST', 'r8'), n('REST', 'r4'), n('A4', 'e')] },
  { measure: 2, slurStart: 0, notes: [n('Bn4', 'qd', { tieStart: true }), n('B4', 'q'), n('A4', 'e')] },
  { measure: 3, slurEnd: 1, notes: [n('D5', 'qd', { tieStart: true }), n('D5', 'q'), n('A4', 'e')] },
  { measure: 4, slurStart: 0, notes: [n('Bn4', 'q'), n('A4', 'e'), n('Bb4', 'q'), n('A4', 'e')] },
  { measure: 5, slurEnd: 2, notes: [n('C5', 'q'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 6, slurStart: 0, notes: [n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), n('E4', 'e')] },
  { measure: 7, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('E4', 'e')] },
  { measure: 8, slurStart: 0, notes: [n('F#4', 'e'), n('E4', 'e'), n('A4', 'e'), n('G4', 'e'), n('E4', 'e'), n('A4', 'e')] },
  { measure: 9, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('Gn4', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('An4', 'qd', { tieStart: true }), n('A4', 'q'), n('G4', 'e')] },
  { measure: 11, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'q'), n('Gb4', 'e')] },
  { measure: 12, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('F4', 'e')] },
  { measure: 13, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'q'), n('E4', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('G#4', 'q'), n('E4', 'e'), n('A4', 'q'), n('F4', 'e')] },
  { measure: 15, slurEnd: 1, notes: [n('B4', 'q'), n('D4', 'e'), n('G4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 16, slurStart: 0, notes: [n('Bn4', 'q'), n('C5', 'e'), ...b3('Bb4', 'E4', 'G4')] },
  { measure: 17, slurEnd: 1, notes: [n('F4', 'qd', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE22_EX6_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'C', slurStart: 0, notes: [n('A4', 'h'), n('G#4', 'q'), n('A4', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'hd'), ...b2('G4', 'F4')] },
  { measure: 3, slurStart: 0, notes: [n('E4', 'qd'), n('D#4', 'e'), n('E4', 'h')] },
  { measure: 4, slurEnd: 0, notes: [n('A4', 'h'), n('E5', 'h', { tieStart: true })] },
  { measure: 5, slurStart: 0, notes: [n('E5', 'e'), n('D#5', 'e'), n('E5', 'q'), n('C5', 'q'), n('A4', 'q')] },
  { measure: 6, slurEnd: 0, notes: [n('B4', 'h'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'h'), n('E4', 'q'), n('REST', 'r4')] },
  { measure: 8, slurStart: 0, notes: [n('C5', 'h'), n('F#4', 'q'), n('G4', 'q')] },
  { measure: 9, slurEnd: 0, notes: [n('A4', 'hd'), n('B4', 'q')] },
  { measure: 10, slurStart: 0, notes: [n('C5', 'h'), n('G#4', 'q'), n('A4', 'q')] },
  { measure: 11, slurEnd: 0, notes: [n('B4', 'hd'), n('C5', 'q')] },
  { measure: 12, slurStart: 0, notes: [n('D5', 'q'), n('C#5', 'q'), n('D5', 'q'), n('E5', 'q')] },
  { measure: 13, slurEnd: 1, notes: [n('F5', 'q'), n('D5', 'q'), n('REST', 'r4'), n('C5', 'q')] },
  { measure: 14, slurStart: 0, notes: [n('B4', 'h'), n('G#4', 'q'), n('A4', 'q')] },
  { measure: 15, slurEnd: 0, notes: [n('F#4', 'q'), n('G4', 'q'), n('E4', 'q'), n('F4', 'q')] },
  { measure: 16, slurEnd: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX7_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'C', slurStart: 0, notes: [n('E5', 'q'), n('G#4', 'e'), n('A4', 'q'), n('G4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('F4', 'q'), n('D#4', 'e'), n('E4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('E5', 'q'), n('G#4', 'e'), n('A4', 'q'), n('G#4', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('F#4', 'q'), n('D#4', 'e'), n('E4', 'qd')] },
  { measure: 5, slurStart: 0, notes: [n('REST', 'r8'), ...b2('E5', 'D5'), n('C5', 'q'), n('B4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('REST', 'r8'), ...b2('A4', 'G#4'), n('A4', 'q'), n('E4', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('REST', 'r8'), ...b2('E5', 'D5'), n('C5', 'q'), n('D#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'qd'), n('C#4', 'qd')] },
  { measure: 9, slurStart: 0, notes: [n('REST', 'r8'), n('A4', 'e'), n('G4', 'e'), n('F4', 'q'), n('E4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('F4', 'q'), n('D#4', 'e'), n('E4', 'q'), n('B4', 'e')] },
  { measure: 11, slurStart: 0, notes: [n('E5', 'q'), n('G#4', 'e'), n('A4', 'q'), n('G4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('F4', 'q'), n('D#4', 'e'), n('E4', 'qd')] },
  { measure: 13, slurStart: 0, notes: [n('REST', 'r8'), n('C5', 'e'), n('B4', 'e'), n('A4', 'q'), n('G#4', 'e')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'q'), n('F#4', 'e'), n('G#4', 'q'), n('E4', 'e')] },
  { measure: 15, slurStart: 0, notes: [n('REST', 'r8'), ...b2('C5', 'B4'), n('A4', 'e'), ...b2('E4', 'F#4')] },
  { measure: 16, slurEnd: 1, notes: [n('G#4', 'qd'), n('A4', 'qd')] }
];

const POZZOLI_SERIE22_EX8_MEASURES = [
  { measure: 1, timeSignature: '9/8', keySignature: 'C', slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('F#4', 'qd', { tieStart: true }), n('F#4', 'q'), n('A4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('G#4', 'qd'), n('B4', 'hd', { tieStart: true })] },
  { measure: 3, slurStart: 0, notes: [n('B4', 'q'), n('A4', 'e'), n('G4', 'qd', { tieStart: true }), ...b3('G4', 'E4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('G4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('F4', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('F4', 'e')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'q'), n('F#4', 'e'), n('G4', 'q'), n('F4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'hd'), n('REST', 'r8'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 9, slurStart: 0, notes: [n('F4', 'qd', { tieStart: true }), ...d2('F4', 'G#4'), n('A4', 'qd', { tieStart: true })] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('G#4', 'qd'), n('A4', 'qd', { tieStart: true })] },
  { measure: 11, slurStart: 0, notes: [n('A4', 'q'), n('G#4', 'e'), n('A4', 'q'), n('F#4', 'e'), n('G#4', 'qd', { tieStart: true })] },
  { measure: 12, slurEnd: 1, notes: [n('G#4', 'e'), n('REST', 'r8'), n('REST', 'r8'), ...d2('B4', 'C5'), ...d2('B4', 'C5')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'hd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE22_EX9_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'F', slurStart: 0, notes: [n('E4', 'ed'), n('F4', 's'), n('C#5', 'h', { tieStart: true })] },
  { measure: 2, slurEnd: 1, notes: [n('C#5', 'q'), ...b2('D5', 'B4'), n('A4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('REST', 'r8'), n('D4', 's'), n('E4', 's'), n('Bn4', 'h', { tieStart: true })] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q'), ...b2('C5', 'A4'), n('G4', 'q', { tieStart: true })] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'e'), n('REST', 'r8'), n('Bb4', 'h', { tieStart: true })] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'q'), n('G#4', 'q'), n('A4', 'q', { tieStart: true })] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'e'), n('B4', 's'), n('G4', 's'), ...b2('F#4', 'G4'), ...b2('E4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'h'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('C#4', 'qd'), n('D4', 'e'), n('B4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('C#4', 'qd'), n('D4', 'e'), n('B4', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('E4', 'qd'), n('F4', 'e'), n('D5', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('E4', 'qd'), n('F4', 'e'), n('C#5', 'q')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'ed'), n('G4', 's'), ...b2('E5', 'D5'), ...b2('C#5', 'Bn4')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'h'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX10_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'Eb', notes: [n('REST', 'r4'), n('G4', 'q'), n('Ab4', 'q'), n('Bn3', 'q', { tieStart: true })] },
  { measure: 2, notes: [n('B3', 'e'), n('G4', 'e'), n('F4', 'q'), n('REST', 'r4'), n('F4', 'q')] },
  { measure: 3, slurStart: 0, notes: [n('B4', 'h', { tieStart: true }), n('F#4', 'qd'), n('G4', 'e')] },
  { measure: 4, slurEnd: 2, notes: [n('G4', 'e'), n('REST', 'r8'), ...t3('C5', 'B4', 'C5'), n('G4', 'q'), n('Ab4', 'q')] },
  { measure: 5, notes: [n('Bn3', 'h', { tieStart: true }), n('B3', 'e'), n('G4', 'e'), n('F4', 'q')] },
  { measure: 6, notes: [n('REST', 'r4'), n('G4', 'q'), n('Ab4', 'q'), n('Bn3', 'q', { tieStart: true })] },
  { measure: 7, notes: [n('B3', 'e'), n('G4', 'e'), n('F4', 'h'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 8, notes: [n('Eb4', 'q', { tieStart: true }), n('Eb4', 'e'), n('REST', 'r8'), n('Bb4', 'q'), n('Cb5', 'q')] },
  { measure: 9, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'e'), n('B4', 'e'), n('Ab4', 'q')] },
  { measure: 10, notes: [n('REST', 'r4'), n('B4', 'q'), n('Db5', 'q'), n('E4', 'q', { tieStart: true })] },
  { measure: 11, notes: [n('E4', 'e'), n('Db5', 'e'), n('Cb5', 'q'), n('REST', 'r4'), n('C5', 'q')] },
  { measure: 12, notes: [n('Eb5', 'h'), n('F#4', 'qd'), n('G4', 'e')] },
  { measure: 13, notes: [n('G4', 'e'), n('REST', 'r8'), n('G4', 'q'), n('Bn3', 'qd'), n('C4', 'e')] },
  { measure: 14, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX11_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 0, notes: [n('C4', 'q'), n('D5', 'q'), n('C5', 'ed'), n('B4', 's')] },
  { measure: 2, slurEnd: 0, notes: [n('B4', 'h', { tieStart: true }), ...s4('B4', 'C5', 'D5', 'E5')] },
  { measure: 3, slurStart: 0, notes: [n('F5', 'q'), ...t3('E5', 'D5', 'C5'), n('B4', 'q', { tieStart: true })] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'q'), n('C5', 'e'), n('REST', 'r8'), n('C5', 'q')] },
  { measure: 5, slurStart: 0, notes: [n('D#5', 'q'), n('E5', 'ed'), n('F#4', 's'), n('G#4', 'q')] },
  { measure: 6, slurEnd: 0, notes: [...s4('A4', 'B4', 'C5', 'D5'), n('E5', 'q'), n('F5', 'q')] },
  { measure: 7, slurStart: 0, notes: [...s4('D5', 'C5', 'B4', 'A4'), n('G#4', 'q'), n('REST', 'r4')] },
  { measure: 8, slurStart: 0, notes: [n('A4', 'h'), n('Bb4', 'q')] },
  { measure: 9, slurEnd: 1, notes: [...s4('A4', 'B4', 'C5', 'D5'), n('E5', 'e'), n('E5', 'e'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('F5', 'h'), ...s4('G#4', 'A4', 'B4', 'C5')] },
  { measure: 11, slurEnd: 1, notes: [n('D5', 'q'), ...s4('E5', 'D5', 'C5', 'B4'), n('A4', 'q')] },
  { measure: 12, slurStart: 0, notes: [...s4('F5', 'E5', 'D5', 'C5'), n('B4', 'q'), ...s4('E5', 'D5', 'C5', 'B4')] },
  { measure: 13, slurEnd: 1, notes: [...b2('A4', 'B4'), ...b2('G4', 'A4'), ...b2('F4', 'G4')] },
  { measure: 14, slurStart: 0, notes: [n('E4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX12_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'C', slurStart: 0, notes: [n('E4', 'qd'), ...eds('G#4', 'Fn5'), n('E5', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd'), ...eds('F#4', 'Eb5'), n('D5', 'e')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 5, slurStart: 0, notes: [n('G#4', 'e'), n('REST', 'r8'), ...s4('E4', 'F#4', 'G#4', 'A#4'), n('B4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'e'), n('REST', 'r8'), n('G#4', 'e'), n('A4', 'e'), ...s4('B4', 'C#5', 'D#5', 'E5')] },
  { measure: 7, slurStart: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('F#4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd'), n('G4', 'ed'), n('E4', 's'), n('F4', 'e')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'e'), n('Bb4', 'e'), n('A4', 'e'), n('G4', 'e'), n('REST', 'r8'), n('G4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('B4', 'q'), n('A4', 'e'), n('C5', 'q'), n('F#4', 'e')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'q'), n('E5', 'e'), n('REST', 'r8'), ...s4('B4', 'C5', 'D5', 'C#5')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'qd'), n('REST', 'r8'), ...s4('E4', 'D#4', 'E4', 'F#4')] },
  { measure: 13, slurStart: 0, notes: [n('G#4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE22_EX13_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 1, notes: [n('REST', 'r8'), n('A4', 'e'), n('E5', 'q'), n('REST', 'r8'), n('G#4', 's', { eighthDur: 1/3, tuplet: 3 }), n('A4', 's', { eighthDur: 1/3, tuplet: 3 }), n('Bb4', 's', { eighthDur: 1/3, tuplet: 3 })] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 3, slurStart: 0, notes: [n('C5', 'q'), n('REST', 'r8'), n('F#4', 's', { eighthDur: 1/3, tuplet: 3 }), n('G#4', 's', { eighthDur: 1/3, tuplet: 3 }), n('A4', 's', { eighthDur: 1/3, tuplet: 3 }), n('G4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'q'), n('REST', 'r8'), n('G4', 'e'), n('D5', 'q')] },
  { measure: 5, slurStart: 0, notes: [n('E5', 'q'), n('REST', 'r8'), n('E4', 'e'), n('F5', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('E5', 'ed'), n('D#5', 's'), n('E5', 'ed'), n('G#4', 's'), n('A4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('REST', 'r8'), n('REST', 'r8'), n('Bb4', 'h')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'q'), n('E5', 'q'), n('REST', 'r8'), n('E5', 'e')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'qd'), n('G#4', 'e'), n('F5', 'q', { tieStart: true })] },
  { measure: 10, slurEnd: 1, notes: [n('F5', 'q'), n('REST', 'r8'), n('A4', 'e'), n('F5', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('E5', 'q'), n('REST', 'r8'), n('G4', 'e'), n('E5', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('D5', 'q'), n('C5', 'q'), ...t3('B4', 'C5', 'Bb4')] },
  { measure: 13, slurStart: 0, notes: [n('A4', 'q'), n('REST', 'r8'), n('G#4', 's', { eighthDur: 1/3, tuplet: 3 }), n('A4', 's', { eighthDur: 1/3, tuplet: 3 }), n('Bb4', 's', { eighthDur: 1/3, tuplet: 3 }), n('A4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('A4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX14_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'G', slurStart: 0, notes: [n('B4', 'q'), n('F#4', 'qd'), n('G4', 'e')] },
  { measure: 2, slurEnd: 2, notes: [...t3('G4', 'A4', 'C#4'), n('E4', 'q'), ...b2('E4', 'F#4')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), n('A#4', 'e'), n('B4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('C5', 'q'), n('B4', 'q'), ...t3('G#4', 'A4', 'B4')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'e'), n('REST', 'r8'), ...s4('E4', 'F#4', 'G#4', 'A4'), ...b2('A4', 'B4')] },
  { measure: 6, slurEnd: 1, notes: [n('C5', 'h'), n('A4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('D4', 'qd'), n('G#4', 'e'), n('A4', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'q'), n('E4', 'q'), n('Fx4', 'q')] },
  { measure: 9, slurStart: 0, notes: [...s4('G#4', 'A4', 'B4', 'C5'), n('D5', 'q'), n('Fx4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [...t3('G#4', 'A4', 'B4'), n('C5', 'h')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'q'), n('E5', 'q'), ...t3('B4', 'A#4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q'), n('G4', 'q'), n('REST', 'r4')] }
];

const POZZOLI_SERIE22_EX15_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'C', slurStart: 1, notes: [n('REST', 'r8'), ...b2('E4', 'B4'), n('REST', 'r8'), ...b2('C5', 'A4')] },
  { measure: 2, slurEnd: 1, notes: [n('REST', 'r8'), ...b2('G#4', 'E5'), n('REST', 'r8'), ...b2('D5', 'G#4')] },
  { measure: 3, slurStart: 0, notes: [...b3('A4', 'B4', 'C5'), ...b3('D5', 'E5', 'F#5')] },
  { measure: 4, slurEnd: 1, notes: [n('G5', 'qd', { tieStart: true }), n('G5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r8'), ...b2('E5', 'D#5'), n('REST', 'r8'), ...b2('E5', 'C#5')] },
  { measure: 6, slurEnd: 1, notes: [n('REST', 'r8'), ...b2('D5', 'F#4'), ...b3('G4', 'A4', 'B4')] },
  { measure: 7, slurStart: 0, notes: [...b3('C5', 'Gn4', 'A4'), n('F4', 'qd', { tieStart: true })] },
  { measure: 8, slurEnd: 1, notes: [n('F4', 'e'), n('REST', 'r8'), n('G#4', 'e'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'qd', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('G#4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('F#4', 'e')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('Bb4', 'e')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [...b3('D#4', 'E4', 'F#4'), ...b3('G#4', 'A4', 'B4')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

// Série 23: Modulação a tom afastado
const POZZOLI_SERIE23_EX1_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 0, notes: [n('C4', 'ed'), n('D4', 's'), n('D#4', 'ed'), n('E4', 's'), n('G4', 'q')] },
  { measure: 2, slurEnd: 0, notes: [n('C4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [n('D4', 'ed'), n('E4', 's'), n('F#4', 'ed'), n('G4', 's'), n('B4', 'q')] },
  { measure: 4, slurEnd: 0, notes: [n('D4', 'q'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('Eb4', 'ed'), n('Bb4', 's'), n('C5', 'ed'), n('Bb4', 's'), n('Ab4', 'ed'), n('Bb4', 's')] },
  { measure: 6, slurEnd: 2, notes: [...t3('G4', 'Ab4', 'Bb4'), ...t3('C5', 'Db5', 'Eb5'), n('Ab4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('Bb4', 'h', { tieStart: true }), n('Bb4', 'e'), n('REST', 'r8')] },
  { measure: 8, slurEnd: 0, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('Ab4', 'ed'), n('G4', 's'), n('Ab4', 'ed'), n('Bn4', 's'), n('C5', 'q')] },
  { measure: 10, slurEnd: 0, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('Bb4', 'ed'), n('A4', 's'), n('Bb4', 'ed'), n('C#5', 's'), n('D5', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [n('C5', 'ed'), n('Bb4', 's'), n('Ab4', 'ed'), n('G4', 's'), n('F4', 'ed'), n('G4', 's')] },
  { measure: 14, slurEnd: 2, notes: [...t3('E4', 'F4', 'G4'), ...t3('A4', 'Bn4', 'C5'), n('G4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('C5', 'h'), n('REST', 'r4')] }
];

const POZZOLI_SERIE23_EX2_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'C', slurStart: 0, notes: [...b4('G4', 'E4', 'F4', 'D4'), ...b4('E4', 'C4', 'D4', 'B3')] },
  { measure: 2, slurEnd: 1, notes: [n('C4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...b4('G4', 'Eb4', 'F4', 'D4'), ...b4('Eb4', 'C4', 'D4', 'B3')] },
  { measure: 4, slurEnd: 1, notes: [n('C4', 'h'), n('C5', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [...b4('Ab4', 'F4', 'G4', 'Eb4'), ...b4('F4', 'Db4', 'Eb4', 'C4')] },
  { measure: 6, slurEnd: 1, notes: [n('Db4', 'h', { tieStart: true }), n('Db4', 'e'), n('REST', 'r8'), n('Bn4', 'q')] },
  { measure: 7, slurStart: 0, notes: [...b4('Bn4', 'G4', 'A4', 'F#4'), ...b4('G4', 'E4', 'F#4', 'D#4')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'h', { tieStart: true }), n('E4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [...b4('E5', 'C5', 'D5', 'B4'), ...b4('C5', 'A4', 'B4', 'G4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [...b4('Eb5', 'C5', 'Db5', 'Bb4'), ...b4('C5', 'Ab4', 'Bb4', 'G4')] },
  { measure: 12, slurEnd: 1, notes: [n('Ab4', 'h', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 13, slurStart: 0, notes: [...b4('D5', 'Bn4', 'C5', 'A4'), ...b4('B4', 'G4', 'A4', 'F#4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'h'), n('REST', 'r4'), n('Ab4', 'q', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [...b4('Ab4', 'G4', 'F4', 'E4'), ...b4('F4', 'D4', 'E4', 'B3')] },
  { measure: 16, slurEnd: 1, notes: [n('C4', 'h', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE23_EX3_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'G', slurStart: 0, notes: [n('D4', 'q'), ...b2('G4', 'B4'), n('D5', 'q'), ...b2('B4', 'G4')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'h'), n('B4', 'h')] },
  { measure: 3, slurStart: 0, notes: [...b4('G4', 'A4', 'B4', 'C5'), ...b4('D5', 'B4', 'G4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('D4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D4', 'q'), ...b2('Gb4', 'Bb4'), n('Db5', 'q'), ...b2('Bb4', 'G4')] },
  { measure: 6, slurEnd: 0, notes: [n('D5', 'h', { tieStart: true }), n('Db5', 'h')] },
  { measure: 7, slurStart: 0, notes: [...b4('Bn4', 'An4', 'G#4', 'A4'), ...b4('B4', 'C#5', 'D5', 'E5')] },
  { measure: 8, slurEnd: 1, notes: [n('A4', 'h'), n('Bb4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 1, notes: [n('REST', 'r8'), ...b3('Bb4', 'C5', 'D5'), ...b3('Eb5', 'D5', 'C#5'), n('D5', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('Bb4', 'h'), n('G4', 'q'), n('REST', 'r4')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r8'), ...b3('Bb4', 'A4', 'G4'), ...b4('F#4', 'G4', 'A4', 'D4')] },
  { measure: 12, slurEnd: 0, notes: [n('G4', 'h'), n('D#4', 'h')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'q'), ...b2('G4', 'Bn4'), n('D5', 'q'), ...b2('B4', 'G4')] },
  { measure: 14, slurEnd: 0, notes: [n('C5', 'h'), n('E5', 'h')] },
  { measure: 15, slurStart: 0, notes: [...b4('E5', 'D5', 'C5', 'B4'), ...b4('A4', 'G4', 'F#4', 'A4')] },
  { measure: 16, slurEnd: 1, notes: [n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE23_EX4_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'C', slurStart: 0, notes: [n('G4', 'q'), n('G4', 'q'), n('G#4', 'q')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [n('A4', 'qd'), n('E4', 'e'), ...b2('F#4', 'G#4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('A4', 'q'), n('A4', 'q'), n('A#4', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('B4', 'qd'), n('G#4', 'e'), n('E4', 'q')] },
  { measure: 7, slurStart: 0, notes: [n('A4', 'q'), n('F#4', 'q'), n('REST', 'r8'), n('E4', 'e')] },
  { measure: 8, slurEnd: 1, notes: [n('E4', 'h'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('A4', 'q'), n('A4', 'q'), n('Bb4', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('Db5', 'q'), n('Bb4', 'q'), n('Ab4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('G4', 'h'), n('REST', 'r8'), n('Eb4', 'e')] },
  { measure: 13, slurStart: 0, notes: [n('F4', 'q'), n('D#4', 'q'), n('E4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('C5', 'h', { tieStart: true }), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'h'), n('B4', 'q')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'h'), n('REST', 'r4')] }
];

const POZZOLI_SERIE23_EX5_MEASURES = [
  { measure: 1, timeSignature: '4/4', keySignature: 'D', notes: [n('REST', 'r8'), n('A4', 'e'), n('D5', 'h', { tieStart: true }), ...eds('D5', 'E5')] },
  { measure: 2, notes: [n('F#5', 'h'), n('D5', 'q'), n('REST', 'r4')] },
  { measure: 3, slurStart: 0, notes: [...b4('G4', 'A4', 'B4', 'C#5'), ...b4('D5', 'B4', 'G4', 'E4')] },
  { measure: 4, slurEnd: 1, notes: [n('A4', 'h', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4')] },
  { measure: 5, notes: [n('REST', 'r8'), n('A4', 'e'), n('Bb4', 'ed'), n('C5', 's'), n('Db5', 'h')] },
  { measure: 6, notes: [n('REST', 'r8'), n('Bb4', 'e'), n('Cn5', 'ed'), n('D5', 's'), n('Eb5', 'h')] },
  { measure: 7, slurStart: 0, notes: [n('G#4', 'h'), ...t3('A4', 'B4', 'C#5'), n('D5', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('F#4', 'h', { tieStart: true }), n('F#4', 'q'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [...t3('E4', 'F#4', 'G#4'), n('A4', 'q'), n('B4', 'q'), n('C#5', 'q')] },
  { measure: 10, slurEnd: 1, notes: [n('D5', 'h'), n('REST', 'r8'), ...b3('C#5', 'B4', 'A4')] },
  { measure: 11, slurStart: 0, notes: [n('G#4', 'q'), ...b4('A4', 'B4', 'C#5', 'D5'), n('E5', 'q')] },
  { measure: 12, slurEnd: 1, notes: [n('F#4', 'q'), ...b4('G4', 'F#4', 'E4', 'D4'), n('C#4', 'q')] },
  { measure: 13, notes: [n('D4', 'h', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE23_EX6_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'Bb', slurStart: 0, notes: [n('D5', 'q'), n('Db5', 'e'), n('C5', 'e'), n('B4', 'e'), n('Bb4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 3, slurStart: 0, notes: [...b3('Bb4', 'A4', 'An4'), ...b3('Ab4', 'G4', 'F4')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'qd'), ...b3('G4', 'A4', 'B4')] },
  { measure: 6, slurEnd: 0, notes: [n('C5', 'qd'), n('C5', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('Db5', 'qd'), ...b3('Ab4', 'Bb4', 'Cb5')] },
  { measure: 8, slurEnd: 0, notes: [n('Db5', 'qd'), n('D5', 'qd')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'q'), n('Db5', 'e'), n('C5', 'e'), n('B4', 'e'), n('Bb4', 'e')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'qd', { tieStart: true }), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [...b3('G#4', 'F#4', 'G#4'), ...b3('A#4', 'Bn4', 'C#5')] },
  { measure: 12, slurEnd: 0, notes: [n('D#5', 'qd'), n('F#5', 'qd')] },
  { measure: 13, slurStart: 0, notes: [...b3('E5', 'D#5', 'E5'), ...b3('C#5', 'G#4', 'A#4')] },
  { measure: 14, slurEnd: 0, notes: [n('B4', 'qd'), n('B4', 'qd')] },
  { measure: 15, slurStart: 0, notes: [...b3('Bb4', 'A4', 'Ab4'), ...b3('Gn4', 'C5', 'B4')] },
  { measure: 16, slurEnd: 1, notes: [n('Bb4', 'qd', { tieStart: true }), n('Bb4', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE23_EX7_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'A', slurStart: 0, notes: [n('C#5', 'h'), ...s4('B4', 'C#5', 'D5', 'E5')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'q'), n('B4', 'q'), n('REST', 'r8'), ...s2('A4', 'G#4')] },
  { measure: 3, slurStart: 0, notes: [n('G#4', 'h', { tieStart: true }), n('G#4', 'ed'), n('F#4', 's')] },
  { measure: 4, slurEnd: 1, notes: [...b2('E#4', 'F#4'), n('C#5', 'ed'), n('B4', 's'), n('B4', 'q')] },
  { measure: 5, slurStart: 0, notes: [n('B4', 'e'), n('REST', 'r8'), n('A4', 'q'), ...s4('Gn4', 'A4', 'Bb4', 'C5')] },
  { measure: 6, slurEnd: 1, notes: [n('Bb4', 'q'), n('Gn4', 'q'), n('REST', 'r8'), ...s2('F4', 'E4')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'q'), n('D4', 'q'), ...s4('Bb4', 'Ab4', 'G4', 'F4')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'q'), n('REST', 'r8'), n('Gn4', 'e'), ...s4('F#4', 'G4', 'A4', 'B4')] },
  { measure: 9, slurStart: 0, notes: [n('C5', 'q'), n('B4', 'q'), n('REST', 'r8'), ...s2('A4', 'G4')] },
  { measure: 10, slurEnd: 0, notes: [n('Gn4', 'ed'), n('A4', 's'), ...s4('F#4', 'G#4', 'A4', 'B4'), n('C#5', 'q')] },
  { measure: 11, slurStart: 0, notes: [n('B4', 'e'), n('REST', 'r8'), n('E#4', 'q'), n('F#4', 'q')] },
  { measure: 12, slurEnd: 0, notes: [n('A4', 'h', { tieStart: true }), ...s4('G#4', 'A4', 'B4', 'C#5')] },
  { measure: 13, slurStart: 0, notes: [n('E4', 'h', { tieStart: true }), ...s4('E4', 'F#4', 'G#4', 'A4')] },
  { measure: 14, slurEnd: 1, notes: [...b2('B4', 'Gn4'), ...b2('F#4', 'B4'), n('A4', 'q', { tieStart: true })] },
  { measure: 15, notes: [n('A4', 'e'), n('REST', 'r8'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE23_EX8_MEASURES = [
  { measure: 1, timeSignature: '6/8', keySignature: 'C', slurStart: 0, notes: [n('C5', 'qd'), ...eds('G4', 'A4'), n('G4', 'e')] },
  { measure: 2, slurEnd: 1, notes: [n('G4', 'qd'), n('F#4', 'qd')] },
  { measure: 3, slurStart: 1, notes: [n('REST', 'r8'), ...b2('F#4', 'G#4'), ...b3('A4', 'B4', 'D5')] },
  { measure: 4, slurEnd: 0, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('C5', 'qd'), ...eds('G4', 'A4'), n('G4', 'e')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'qd'), n('Gb4', 'qd')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r8'), ...b2('F#4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 8, slurEnd: 0, notes: [n('Db5', 'qd', { tieStart: true }), n('D5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Db5', 'qd'), ...b3('C5', 'Bb4', 'Ab4')] },
  { measure: 10, slurEnd: 1, notes: [n('G4', 'qd', { tieStart: true }), n('G4', 'qd')] },
  { measure: 11, slurStart: 0, notes: [...b3('Ab4', 'G4', 'F4'), ...b3('Eb4', 'Db4', 'C4')] },
  { measure: 12, slurEnd: 1, notes: [n('C4', 'qd', { tieStart: true }), n('C4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('Db4', 'qd'), ...b3('E4', 'F4', 'G4')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd'), n('G#4', 'qd')] },
  { measure: 15, slurStart: 1, notes: [n('REST', 'r8'), ...b2('A4', 'G#4'), ...b3('A4', 'B4', 'C5')] },
  { measure: 16, slurEnd: 1, notes: [n('C5', 'qd', { tieStart: true }), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] }
];

const POZZOLI_SERIE23_EX9_MEASURES = [
  { measure: 1, timeSignature: '3/4', keySignature: 'F', notes: [n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 2, slurStart: 0, notes: [n('D5', 'h'), ...b2('C5', 'C#5')] },
  { measure: 3, slurEnd: 0, notes: [n('Bb4', 'hd')] },
  { measure: 4, notes: [n('REST', 'r8'), n('F4', 'e'), n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 5, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 6, slurStart: 0, notes: [n('D5', 'h'), ...b2('C5', 'B4')] },
  { measure: 7, slurEnd: 0, notes: [n('G#4', 'hd')] },
  { measure: 8, notes: [n('REST', 'r8'), ...s2('F#4', 'G#4'), n('REST', 'r8'), n('A4', 'e'), n('REST', 'r8'), n('B4', 'e')] },
  { measure: 9, notes: [n('C#5', 'q'), n('A4', 'e'), n('REST', 'r8'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 10, slurStart: 0, notes: [n('G#4', 'q', { tieStart: true }), ...b2('G#4', 'F#4'), ...b2('F#4', 'G#4')] },
  { measure: 11, slurEnd: 0, notes: [n('A4', 'hd')] },
  { measure: 12, slurStart: 0, notes: [...b2('Bb4', 'A4'), ...b2('G4', 'F4'), ...b2('G4', 'A4')] },
  { measure: 13, slurEnd: 0, notes: [n('Bb4', 'h'), n('REST', 'r8'), n('D5', 'e')] },
  { measure: 14, slurStart: 0, notes: [n('D5', 'h'), n('C5', 'q')] },
  { measure: 15, slurEnd: 0, notes: [...b2('G4', 'A4'), n('Bb4', 'h')] },
  { measure: 16, notes: [n('REST', 'r8'), n('F4', 'e'), n('REST', 'r8'), n('G4', 'e'), n('REST', 'r8'), n('A4', 'e')] },
  { measure: 17, notes: [n('F4', 'q', { tieStart: true }), n('F4', 'e'), n('REST', 'r8'), n('REST', 'r4')] }
];

const POZZOLI_SERIE23_EX10_MEASURES = [
  { measure: 1, timeSignature: '2/4', keySignature: 'Cm', notes: [n('G4', 'e'), n('F4', 'q'), ...s2('G4', 'Ab4')] },
  { measure: 2, notes: [...b2('F4', 'G4'), n('E4', 'e'), n('REST', 'r8')] },
  { measure: 3, notes: [n('G4', 'e'), n('F#4', 'q'), n('G4', 'e')] },
  { measure: 4, notes: [n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 5, notes: [n('G4', 'e'), n('G4', 'q'), n('Ab4', 'e')] },
  { measure: 6, notes: [n('Bb4', 'e', { tieStart: true }), ...s2('Bb4', 'Ab4'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 7, notes: [n('C5', 'e'), n('Bn4', 'q'), n('C5', 'e')] },
  { measure: 8, notes: [n('D5', 'q', { tieStart: true }), n('D5', 'e'), n('REST', 'r8')] },
  { measure: 9, notes: [n('Eb5', 'ed'), n('Db5', 's'), n('C5', 'e'), n('Bb4', 'e')] },
  { measure: 10, notes: [n('Bb4', 'q', { tieStart: true }), n('Bb4', 'e'), n('REST', 'r8')] },
  { measure: 11, notes: [n('Bn4', 'ed'), n('G#4', 's'), n('An4', 'e'), n('F#4', 'e')] },
  { measure: 12, notes: [n('Ab4', 'q', { tieStart: true }), n('Ab4', 'e'), n('REST', 'r8')] },
  { measure: 13, notes: [n('G4', 'e'), n('F4', 'q'), ...s2('E4', 'F4')] },
  { measure: 14, notes: [...b2('D4', 'E4'), n('C4', 'e'), n('REST', 'r8')] },
  { measure: 15, notes: [n('G4', 'e'), n('F#4', 'q'), n('G4', 'e')] },
  { measure: 16, notes: [n('C4', 'q'), n('REST', 'r8'), n('REST', 'r8')] }
];

// Série 24: Exemplos de compassos pouco usados
const POZZOLI_SERIE24_EX1_MEASURES = [
  { measure: 1, timeSignature: '5/4', keySignature: 'Bb', notes: [n('G4', 'q'), ...b2('A4', 'G4'), n('F#4', 'q'), n('D4', 'h')] },
  { measure: 2, slurStart: 1, notes: [n('REST', 'r4'), ...b4('D4', 'E4', 'F#4', 'G4'), n('A4', 'h')] },
  { measure: 3, slurEnd: 0, notes: [n('G4', 'q'), ...b2('A4', 'G4'), n('F#4', 'q'), n('D4', 'h')] },
  { measure: 4, slurStart: 1, notes: [n('REST', 'r4'), ...b4('D4', 'E4', 'F#4', 'G4'), n('A4', 'h')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'q'), ...b2('F#4', 'G#4'), n('A4', 'q'), n('B4', 'q'), n('Cn5', 'q')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'qd'), n('C5', 'e'), n('Bn4', 'h'), n('C5', 'e'), n('REST', 'r8')] },
  { measure: 7, slurStart: 0, notes: [n('G4', 'q'), ...b2('F#4', 'G#4'), n('A4', 'q'), n('B4', 'q'), n('C5', 'q')] },
  { measure: 8, slurEnd: 1, notes: [n('G4', 'qd'), n('E4', 'e'), n('C4', 'h'), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('G4', 'q'), ...b2('A4', 'G4'), ...t3('F#4', 'G4', 'F#4'), n('E4', 'h')] },
  { measure: 10, slurEnd: 1, notes: [...t3('F4', 'G4', 'F4'), ...t3('E4', 'F4', 'E4'), n('D4', 'h', { tieStart: true }), n('D4', 'e'), n('REST', 'r8')] },
  { measure: 11, slurStart: 0, notes: [n('G4', 'q'), ...b2('An4', 'B4'), n('C5', 'q'), ...t3('B4', 'C5', 'B4'), n('A4', 'q')] },
  { measure: 12, slurEnd: 1, notes: [...t3('B4', 'C5', 'B4'), ...t3('A4', 'B4', 'A4'), n('G4', 'h', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 13, slurStart: 0, notes: [n('G4', 'qd'), n('A4', 'e'), n('F#4', 'q'), n('D4', 'h')] },
  { measure: 14, slurEnd: 1, notes: [n('B4', 'q'), n('G4', 'q'), ...b2('A4', 'B4'), n('G4', 'q', { tieStart: true }), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 15, slurStart: 0, notes: [n('B4', 'q'), ...b2('C5', 'B4'), n('A4', 'q'), n('F#4', 'h')] },
  { measure: 16, slurEnd: 1, notes: [n('REST', 'r4'), ...b4('D4', 'E4', 'F#4', 'G4'), n('A4', 'h')] },
  { measure: 17, slurStart: 0, notes: [n('G4', 'q'), ...b2('F#4', 'En4'), n('D4', 'q'), n('C#4', 'h')] },
  { measure: 18, slurEnd: 1, notes: [n('REST', 'r4'), ...b4('D4', 'E4', 'F#4', 'G4'), n('G4', 'qd'), n('REST', 'r8')] }
];

const POZZOLI_SERIE24_EX2_MEASURES = [
  { measure: 1, timeSignature: '5/4', keySignature: 'D', slurStart: 2, notes: [n('REST', 'r4'), n('REST', 'r4'), ...s4('A4', 'B4', 'A4', 'G#4'), ...b4('A4', 'E4', 'F#4', 'E4')] },
  { measure: 2, slurEnd: 1, notes: [n('D4', 'q', { tieStart: true }), n('D4', 'q'), ...s4('A4', 'B4', 'A4', 'G#4'), ...b4('A4', 'E4', 'F#4', 'E4')] },
  { measure: 3, slurStart: 0, notes: [n('F#4', 'h'), n('F#4', 'e'), n('REST', 'r8'), n('D4', 'ed'), n('E4', 's'), ...b2('F#4', 'A4')] },
  { measure: 4, slurEnd: 1, notes: [n('E4', 'h'), n('E4', 'e'), n('REST', 'r8'), n('E4', 'ed'), n('F#4', 's'), ...b2('G4', 'E#4')] },
  { measure: 5, slurStart: 0, notes: [n('F#4', 'q'), n('F#4', 'e'), n('REST', 'r8'), ...s4('B4', 'C#5', 'B4', 'A#4'), ...b4('B4', 'F#4', 'G4', 'F#4')] },
  { measure: 6, slurEnd: 1, notes: [n('G4', 'q'), n('G4', 'e'), n('REST', 'r8'), ...s4('C#5', 'D5', 'C#5', 'B#4'), ...b4('C#5', 'G#4', 'A4', 'G#4')] },
  { measure: 7, slurStart: 0, notes: [n('A#4', 'h'), n('A#4', 'e'), n('REST', 'r8'), n('D5', 'ed'), n('E5', 's'), ...b2('D5', 'B4')] },
  { measure: 8, slurEnd: 1, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('D5', 'ed'), n('E5', 's'), ...b2('D5', 'B4')] },
  { measure: 9, slurStart: 0, notes: [n('B4', 'h', { tieStart: true }), n('B4', 'e'), n('REST', 'r8'), n('A4', 'ed'), n('F#4', 's'), ...b2('G4', 'B4')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'ed'), n('F#4', 's'), ...b2('G4', 'B4'), n('A4', 'q'), ...b4('E#4', 'F#4', 'G4', 'A4')] },
  { measure: 11, slurStart: 0, notes: [n('D4', 'qd', { tieStart: true }), n('E#4', 'ed'), n('F#4', 'qd', { tieStart: true }), n('F#4', 's'), n('G4', 'e'), n('REST', 'r8')] },
  { measure: 12, slurEnd: 1, notes: [n('REST', 'r4'), n('REST', 'r4'), ...s4('A4', 'B4', 'A4', 'G#4'), ...b4('A4', 'E4', 'F#4', 'E4')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'q'), n('D4', 'q'), ...s4('A4', 'B4', 'A4', 'G#4'), ...b4('A4', 'E4', 'F#4', 'E4')] },
  { measure: 14, slurEnd: 1, notes: [n('F#4', 'h'), n('F#4', 'e'), n('REST', 'r8'), n('E4', 'ed'), n('F#4', 's'), ...b2('G4', 'A4')] },
  { measure: 15, slurStart: 0, notes: [n('D5', 'h'), ...s4('C#5', 'D5', 'C#5', 'B4'), ...b4('A4', 'F#4', 'G4', 'E4')] },
  { measure: 16, slurEnd: 1, notes: [n('D4', 'hd'), n('D4', 'q'), n('REST', 'r4')] }
];

const POZZOLI_SERIE24_EX3_MEASURES = [
  { measure: 1, timeSignature: '5/4', keySignature: 'Bb', slurStart: 0, notes: [n('G4', 'hd'), n('A4', 'e'), n('B4', 'qd')] },
  { measure: 2, slurEnd: 1, notes: [n('D5', 'hd'), n('C5', 'e'), n('B4', 'qd')] },
  { measure: 3, slurStart: 0, notes: [n('G4', 'qd'), n('F4', 'e'), n('G4', 'q'), n('A4', 'q'), n('B4', 'q')] },
  { measure: 4, slurEnd: 1, notes: [n('G4', 'hd'), n('A4', 'e'), n('G4', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 5, slurStart: 0, notes: [n('G4', 'hd'), n('A4', 'e'), n('B4', 'qd')] },
  { measure: 6, slurEnd: 1, notes: [n('D5', 'hd'), n('C5', 'e'), n('B4', 'qd')] },
  { measure: 7, slurStart: 0, notes: [n('F#4', 'qd'), n('G4', 'e'), n('A4', 'hd')] },
  { measure: 8, slurEnd: 1, notes: [n('D4', 'h'), n('D5', 'qd'), n('C5', 'e'), n('REST', 'r8'), n('REST', 'r8')] },
  { measure: 9, slurStart: 0, notes: [n('Db5', 'hd'), n('C5', 'e'), n('B4', 'qd')] },
  { measure: 10, slurEnd: 1, notes: [n('A4', 'hd'), n('F#4', 'e'), ...b2('G4', 'A4'), n('B4', 'e')] },
  { measure: 11, slurStart: 0, notes: [n('Db5', 'hd'), n('C5', 'e'), n('B4', 'qd')] },
  { measure: 12, slurEnd: 1, notes: [n('A4', 'q'), ...b4('Fn4', 'G4', 'A4', 'B4'), n('C5', 'h', { tieStart: true })] },
  { measure: 13, slurStart: 0, notes: [...b4('C5', 'B4', 'A4', 'G4'), n('F4', 'qd'), n('G4', 'e'), n('A4', 'q')] },
  { measure: 14, slurEnd: 1, notes: [n('G4', 'qd'), n('A4', 'e'), n('B4', 'q'), n('D5', 'h', { tieStart: true })] },
  { measure: 15, slurStart: 0, notes: [n('D5', 'h'), n('B3', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE24_EX4_MEASURES = [
  { measure: 1, timeSignature: '7/4', keySignature: 'Bb', slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('G4', 'q'), ...b4('G4', 'A4', 'G4', 'F#4'), n('G4', 'h')] },
  { measure: 2, slurEnd: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('B4', 'q'), ...b4('B4', 'C5', 'B4', 'A4'), n('B4', 'h')] },
  { measure: 3, slurStart: 0, notes: [n('D5', 'h', { tieStart: true }), ...b4('D5', 'C5', 'D5', 'C5'), ...b2('B4', 'A4'), n('G4', 'h')] },
  { measure: 4, slurEnd: 1, notes: [n('B4', 'qd'), n('A4', 'e'), ...b4('G4', 'F#4', 'G4', 'A4'), n('G4', 'h'), n('REST', 'r4')] },
  { measure: 5, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('Bb4', 'q'), ...b4('Ab4', 'G4', 'Ab4', 'G4'), n('F4', 'h')] },
  { measure: 6, slurEnd: 1, notes: [n('Ab4', 'q'), ...b4('G4', 'F4', 'G4', 'F4'), n('E4', 'q'), n('G4', 'hd')] },
  { measure: 7, slurStart: 1, notes: [n('REST', 'r4'), n('Bb4', 'q'), n('B4', 'q'), ...b4('B4', 'C5', 'B4', 'A4'), n('G4', 'h')] },
  { measure: 8, slurEnd: 1, notes: [n('Bb4', 'h'), ...b4('Ab4', 'G4', 'Ab4', 'G4'), n('Eb4', 'hd')] },
  { measure: 9, slurStart: 0, notes: [...b4('En4', 'F#4', 'G4', 'F#4'), ...b4('G4', 'A4', 'G4', 'F#4'), n('G4', 'hd')] },
  { measure: 10, slurEnd: 1, notes: [...b4('G4', 'A4', 'G4', 'F#4'), ...b4('G4', 'A4', 'B4', 'C5'), ...b4('D5', 'C5', 'B4', 'A4'), n('G4', 'q')] },
  { measure: 11, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('G4', 'q'), ...b4('G4', 'A4', 'G4', 'F#4'), n('G4', 'h')] },
  { measure: 12, slurEnd: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('B4', 'q'), ...b4('B4', 'C5', 'B4', 'A4'), n('B4', 'h')] },
  { measure: 13, slurStart: 1, notes: [n('REST', 'r4'), n('G4', 'q'), n('D5', 'q'), ...b4('D5', 'C5', 'B4', 'A4'), n('G4', 'h', { tieStart: true })] },
  { measure: 14, slurEnd: 1, notes: [...b4('G4', 'A4', 'B4', 'Cn5'), ...b2('B4', 'A4'), n('G4', 'e'), n('REST', 'r8'), ...b4('G4', 'F#4', 'G4', 'A4'), n('G4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('B4', 'q'), n('G4', 'hd', { tieStart: true }), n('G4', 'q'), n('REST', 'r4'), n('REST', 'r4')] }
];

const POZZOLI_SERIE24_EX5_MEASURES = [
  { measure: 1, timeSignature: '7/4', keySignature: 'Bb', slurStart: 0, notes: [n('D5', 'hd'), ...b4('C5', 'B4', 'A4', 'G4'), ...b2('F#4', 'G4'), n('A4', 'q')] },
  { measure: 2, slurEnd: 2, notes: [n('A4', 'h'), ...b2('B4', 'G4'), n('D4', 'hd', { tieStart: true }), ...b2('D4', 'E4')] },
  { measure: 3, slurStart: 0, notes: [n('F#4', 'qd'), n('G4', 'e'), n('A4', 'qd'), n('B4', 'e'), n('G4', 'qd'), n('A4', 'e'), n('B4', 'q')] },
  { measure: 4, slurEnd: 2, notes: [n('B4', 'qd'), n('C#5', 'e'), n('D5', 'h', { tieStart: true }), n('D5', 'h'), n('REST', 'r4')] },
  { measure: 5, slurStart: 0, notes: [n('D5', 'hd'), ...b4('Eb5', 'D5', 'C5', 'B4'), ...b2('A4', 'G4'), n('A4', 'q')] },
  { measure: 6, slurEnd: 2, notes: [n('A4', 'h'), ...b2('B4', 'G4'), n('D4', 'h'), n('C#4', 'h')] },
  { measure: 7, slurStart: 0, notes: [n('E4', 'qd'), ...b2('F#4', 'G#4'), n('A4', 'qd'), ...b2('Bn4', 'C#5'), ...b4('D5', 'C#5', 'B4', 'A4')] },
  { measure: 8, slurEnd: 2, notes: [n('B4', 'h'), n('G#4', 'h'), n('A4', 'h'), n('REST', 'r4')] },
  { measure: 9, slurStart: 0, notes: [n('D5', 'hd'), ...b4('Eb5', 'D5', 'C#5', 'D5'), ...b2('B4', 'G4'), n('A4', 'q')] },
  { measure: 10, slurEnd: 2, notes: [n('E4', 'h'), ...b2('F#4', 'G4'), n('A4', 'h'), n('REST', 'r4'), n('REST', 'r4')] },
  { measure: 11, slurStart: 0, notes: [n('D5', 'hd'), ...b4('C5', 'B4', 'A4', 'G4'), ...b2('F#4', 'G4'), n('A4', 'q')] },
  { measure: 12, slurEnd: 2, notes: [n('A4', 'qd'), n('G4', 'q'), n('D4', 'hd', { tieStart: true }), n('REST', 'r4'), n('D4', 'e')] },
  { measure: 13, slurStart: 0, notes: [n('D4', 'q'), ...b2('G4', 'F#4'), n('G4', 'q'), ...b2('A4', 'B4'), n('C5', 'hd')] },
  { measure: 14, slurEnd: 2, notes: [n('Eb5', 'q'), ...b2('D5', 'C5'), ...b4('Bn4', 'C5', 'D5', 'C5'), ...b4('B4', 'A4', 'G4', 'F4'), n('E4', 'q')] },
  { measure: 15, slurStart: 0, notes: [n('G4', 'qd'), n('F4', 'hd'), n('REST', 'r4'), n('REST', 'r4'), n('REST', 'r8')] }
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
  'serie-11-ex-24': POZZOLI_SERIE11_EX24_MEASURES,
  'serie-12-ex-1': POZZOLI_SERIE12_EX1_MEASURES,
  'serie-12-ex-2': POZZOLI_SERIE12_EX2_MEASURES,
  'serie-12-ex-3': POZZOLI_SERIE12_EX3_MEASURES,
  'serie-12-ex-4': POZZOLI_SERIE12_EX4_MEASURES,
  'serie-12-ex-5': POZZOLI_SERIE12_EX5_MEASURES,
  'serie-12-ex-6': POZZOLI_SERIE12_EX6_MEASURES,
  'serie-12-ex-7': POZZOLI_SERIE12_EX7_MEASURES,
  'serie-12-ex-8': POZZOLI_SERIE12_EX8_MEASURES,
  'serie-12-ex-9': POZZOLI_SERIE12_EX9_MEASURES,
  'serie-12-ex-10': POZZOLI_SERIE12_EX10_MEASURES,
  'serie-13-ex-1': POZZOLI_SERIE13_EX1_MEASURES,
  'serie-13-ex-2': POZZOLI_SERIE13_EX2_MEASURES,
  'serie-13-ex-3': POZZOLI_SERIE13_EX3_MEASURES,
  'serie-13-ex-4': POZZOLI_SERIE13_EX4_MEASURES,
  'serie-13-ex-5': POZZOLI_SERIE13_EX5_MEASURES,
  'serie-13-ex-6': POZZOLI_SERIE13_EX6_MEASURES,
  'serie-13-ex-7': POZZOLI_SERIE13_EX7_MEASURES,
  'serie-13-ex-8': POZZOLI_SERIE13_EX8_MEASURES,
  'serie-13-ex-9': POZZOLI_SERIE13_EX9_MEASURES,
  'serie-13-ex-10': POZZOLI_SERIE13_EX10_MEASURES,
  'serie-13-ex-11': POZZOLI_SERIE13_EX11_MEASURES,
  'serie-13-ex-12': POZZOLI_SERIE13_EX12_MEASURES,
  'serie-13-ex-13': POZZOLI_SERIE13_EX13_MEASURES,
  'serie-13-ex-14': POZZOLI_SERIE13_EX14_MEASURES,
  'serie-13-ex-15': POZZOLI_SERIE13_EX15_MEASURES,
  'serie-13-ex-16': POZZOLI_SERIE13_EX16_MEASURES,
  'serie-13-ex-17': POZZOLI_SERIE13_EX17_MEASURES,
  'serie-13-ex-18': POZZOLI_SERIE13_EX18_MEASURES,
  'serie-13-ex-19': POZZOLI_SERIE13_EX19_MEASURES,
  'serie-13-ex-20': POZZOLI_SERIE13_EX20_MEASURES,
  'serie-14-ex-1': POZZOLI_SERIE14_EX1_MEASURES,
  'serie-14-ex-2': POZZOLI_SERIE14_EX2_MEASURES,
  'serie-14-ex-3': POZZOLI_SERIE14_EX3_MEASURES,
  'serie-14-ex-4': POZZOLI_SERIE14_EX4_MEASURES,
  'serie-14-ex-5': POZZOLI_SERIE14_EX5_MEASURES,
  'serie-14-ex-6': POZZOLI_SERIE14_EX6_MEASURES,
  'serie-14-ex-7': POZZOLI_SERIE14_EX7_MEASURES,
  'serie-14-ex-8': POZZOLI_SERIE14_EX8_MEASURES,
  'serie-14-ex-9': POZZOLI_SERIE14_EX9_MEASURES,
  'serie-14-ex-10': POZZOLI_SERIE14_EX10_MEASURES,
  'serie-14-ex-11': POZZOLI_SERIE14_EX11_MEASURES,
  'serie-14-ex-12': POZZOLI_SERIE14_EX12_MEASURES,
  'serie-14-ex-13': POZZOLI_SERIE14_EX13_MEASURES,
  'serie-14-ex-14': POZZOLI_SERIE14_EX14_MEASURES,
  'serie-14-ex-15': POZZOLI_SERIE14_EX15_MEASURES,
  'serie-14-ex-16': POZZOLI_SERIE14_EX16_MEASURES,
  'serie-14-ex-17': POZZOLI_SERIE14_EX17_MEASURES,
  'serie-14-ex-18': POZZOLI_SERIE14_EX18_MEASURES,
  'serie-14-ex-19': POZZOLI_SERIE14_EX19_MEASURES,
  'serie-14-ex-20': POZZOLI_SERIE14_EX20_MEASURES,
  'serie-15-ex-1': POZZOLI_SERIE15_EX1_MEASURES,
  'serie-15-ex-2': POZZOLI_SERIE15_EX2_MEASURES,
  'serie-15-ex-3': POZZOLI_SERIE15_EX3_MEASURES,
  'serie-15-ex-4': POZZOLI_SERIE15_EX4_MEASURES,
  'serie-15-ex-5': POZZOLI_SERIE15_EX5_MEASURES,
  'serie-15-ex-6': POZZOLI_SERIE15_EX6_MEASURES,
  'serie-15-ex-7': POZZOLI_SERIE15_EX7_MEASURES,
  'serie-15-ex-8': POZZOLI_SERIE15_EX8_MEASURES,
  'serie-15-ex-9': POZZOLI_SERIE15_EX9_MEASURES,
  'serie-15-ex-10': POZZOLI_SERIE15_EX10_MEASURES,
  'serie-15-ex-11': POZZOLI_SERIE15_EX11_MEASURES,
  'serie-15-ex-12': POZZOLI_SERIE15_EX12_MEASURES,
  'serie-15-ex-13': POZZOLI_SERIE15_EX13_MEASURES,
  'serie-15-ex-14': POZZOLI_SERIE15_EX14_MEASURES,
  'serie-15-ex-15': POZZOLI_SERIE15_EX15_MEASURES,
  'serie-15-ex-16': POZZOLI_SERIE15_EX16_MEASURES,
  'serie-15-ex-17': POZZOLI_SERIE15_EX17_MEASURES,
  'serie-15-ex-18': POZZOLI_SERIE15_EX18_MEASURES,
  'serie-15-ex-19': POZZOLI_SERIE15_EX19_MEASURES,
  'serie-15-ex-20': POZZOLI_SERIE15_EX20_MEASURES,
  'serie-16-ex-1': POZZOLI_SERIE16_EX1_MEASURES,
  'serie-16-ex-2': POZZOLI_SERIE16_EX2_MEASURES,
  'serie-16-ex-3': POZZOLI_SERIE16_EX3_MEASURES,
  'serie-16-ex-4': POZZOLI_SERIE16_EX4_MEASURES,
  'serie-16-ex-5': POZZOLI_SERIE16_EX5_MEASURES,
  'serie-16-ex-6': POZZOLI_SERIE16_EX6_MEASURES,
  'serie-16-ex-7': POZZOLI_SERIE16_EX7_MEASURES,
  'serie-16-ex-8': POZZOLI_SERIE16_EX8_MEASURES,
  'serie-16-ex-9': POZZOLI_SERIE16_EX9_MEASURES,
  'serie-16-ex-10': POZZOLI_SERIE16_EX10_MEASURES,
  'serie-16-ex-11': POZZOLI_SERIE16_EX11_MEASURES,
  'serie-16-ex-12': POZZOLI_SERIE16_EX12_MEASURES,
  'serie-16-ex-13': POZZOLI_SERIE16_EX13_MEASURES,
  'serie-16-ex-14': POZZOLI_SERIE16_EX14_MEASURES,
  'serie-16-ex-15': POZZOLI_SERIE16_EX15_MEASURES,
  'serie-16-ex-16': POZZOLI_SERIE16_EX16_MEASURES,
  'serie-16-ex-17': POZZOLI_SERIE16_EX17_MEASURES,
  'serie-16-ex-18': POZZOLI_SERIE16_EX18_MEASURES,
  'serie-16-ex-19': POZZOLI_SERIE16_EX19_MEASURES,
  'serie-16-ex-20': POZZOLI_SERIE16_EX20_MEASURES,
  'serie-17-ex-1': POZZOLI_SERIE17_EX1_MEASURES,
  'serie-17-ex-2': POZZOLI_SERIE17_EX2_MEASURES,
  'serie-17-ex-3': POZZOLI_SERIE17_EX3_MEASURES,
  'serie-17-ex-4': POZZOLI_SERIE17_EX4_MEASURES,
  'serie-17-ex-5': POZZOLI_SERIE17_EX5_MEASURES,
  'serie-17-ex-6': POZZOLI_SERIE17_EX6_MEASURES,
  'serie-17-ex-7': POZZOLI_SERIE17_EX7_MEASURES,
  'serie-17-ex-8': POZZOLI_SERIE17_EX8_MEASURES,
  'serie-17-ex-9': POZZOLI_SERIE17_EX9_MEASURES,
  'serie-17-ex-10': POZZOLI_SERIE17_EX10_MEASURES,
  'serie-17-ex-11': POZZOLI_SERIE17_EX11_MEASURES,
  'serie-17-ex-12': POZZOLI_SERIE17_EX12_MEASURES,
  'serie-18-ex-1': POZZOLI_SERIE18_EX1_MEASURES,
  'serie-18-ex-2': POZZOLI_SERIE18_EX2_MEASURES,
  'serie-18-ex-3': POZZOLI_SERIE18_EX3_MEASURES,
  'serie-18-ex-4': POZZOLI_SERIE18_EX4_MEASURES,
  'serie-18-ex-5': POZZOLI_SERIE18_EX5_MEASURES,
  'serie-18-ex-6': POZZOLI_SERIE18_EX6_MEASURES,
  'serie-18-ex-7': POZZOLI_SERIE18_EX7_MEASURES,
  'serie-18-ex-8': POZZOLI_SERIE18_EX8_MEASURES,
  'serie-18-ex-9': POZZOLI_SERIE18_EX9_MEASURES,
  'serie-18-ex-10': POZZOLI_SERIE18_EX10_MEASURES,
  'serie-19-ex-1': POZZOLI_SERIE19_EX1_MEASURES,
  'serie-19-ex-2': POZZOLI_SERIE19_EX2_MEASURES,
  'serie-19-ex-3': POZZOLI_SERIE19_EX3_MEASURES,
  'serie-19-ex-4': POZZOLI_SERIE19_EX4_MEASURES,
  'serie-19-ex-5': POZZOLI_SERIE19_EX5_MEASURES,
  'serie-19-ex-6': POZZOLI_SERIE19_EX6_MEASURES,
  'serie-19-ex-7': POZZOLI_SERIE19_EX7_MEASURES,
  'serie-19-ex-8': POZZOLI_SERIE19_EX8_MEASURES,
  'serie-19-ex-9': POZZOLI_SERIE19_EX9_MEASURES,
  'serie-19-ex-10': POZZOLI_SERIE19_EX10_MEASURES,
  'serie-20-ex-1': POZZOLI_SERIE20_EX1_MEASURES,
  'serie-20-ex-2': POZZOLI_SERIE20_EX2_MEASURES,
  'serie-20-ex-3': POZZOLI_SERIE20_EX3_MEASURES,
  'serie-20-ex-4': POZZOLI_SERIE20_EX4_MEASURES,
  'serie-20-ex-5': POZZOLI_SERIE20_EX5_MEASURES,
  'serie-20-ex-6': POZZOLI_SERIE20_EX6_MEASURES,
  'serie-20-ex-7': POZZOLI_SERIE20_EX7_MEASURES,
  'serie-20-ex-8': POZZOLI_SERIE20_EX8_MEASURES,
  'serie-20-ex-9': POZZOLI_SERIE20_EX9_MEASURES,
  'serie-20-ex-10': POZZOLI_SERIE20_EX10_MEASURES,
  'serie-21-ex-1': POZZOLI_SERIE21_EX1_MEASURES,
  'serie-21-ex-2': POZZOLI_SERIE21_EX2_MEASURES,
  'serie-21-ex-3': POZZOLI_SERIE21_EX3_MEASURES,
  'serie-21-ex-4': POZZOLI_SERIE21_EX4_MEASURES,
  'serie-21-ex-5': POZZOLI_SERIE21_EX5_MEASURES,
  'serie-21-ex-6': POZZOLI_SERIE21_EX6_MEASURES,
  'serie-21-ex-7': POZZOLI_SERIE21_EX7_MEASURES,
  'serie-21-ex-8': POZZOLI_SERIE21_EX8_MEASURES,
  'serie-21-ex-9': POZZOLI_SERIE21_EX9_MEASURES,
  'serie-21-ex-10': POZZOLI_SERIE21_EX10_MEASURES,
  'serie-22-ex-1': POZZOLI_SERIE22_EX1_MEASURES,
  'serie-22-ex-2': POZZOLI_SERIE22_EX2_MEASURES,
  'serie-22-ex-3': POZZOLI_SERIE22_EX3_MEASURES,
  'serie-22-ex-4': POZZOLI_SERIE22_EX4_MEASURES,
  'serie-22-ex-5': POZZOLI_SERIE22_EX5_MEASURES,
  'serie-22-ex-6': POZZOLI_SERIE22_EX6_MEASURES,
  'serie-22-ex-7': POZZOLI_SERIE22_EX7_MEASURES,
  'serie-22-ex-8': POZZOLI_SERIE22_EX8_MEASURES,
  'serie-22-ex-9': POZZOLI_SERIE22_EX9_MEASURES,
  'serie-22-ex-10': POZZOLI_SERIE22_EX10_MEASURES,
  'serie-22-ex-11': POZZOLI_SERIE22_EX11_MEASURES,
  'serie-22-ex-12': POZZOLI_SERIE22_EX12_MEASURES,
  'serie-22-ex-13': POZZOLI_SERIE22_EX13_MEASURES,
  'serie-22-ex-14': POZZOLI_SERIE22_EX14_MEASURES,
  'serie-22-ex-15': POZZOLI_SERIE22_EX15_MEASURES,
  'serie-23-ex-1': POZZOLI_SERIE23_EX1_MEASURES,
  'serie-23-ex-2': POZZOLI_SERIE23_EX2_MEASURES,
  'serie-23-ex-3': POZZOLI_SERIE23_EX3_MEASURES,
  'serie-23-ex-4': POZZOLI_SERIE23_EX4_MEASURES,
  'serie-23-ex-5': POZZOLI_SERIE23_EX5_MEASURES,
  'serie-23-ex-6': POZZOLI_SERIE23_EX6_MEASURES,
  'serie-23-ex-7': POZZOLI_SERIE23_EX7_MEASURES,
  'serie-23-ex-8': POZZOLI_SERIE23_EX8_MEASURES,
  'serie-23-ex-9': POZZOLI_SERIE23_EX9_MEASURES,
  'serie-23-ex-10': POZZOLI_SERIE23_EX10_MEASURES,
  'serie-24-ex-1': POZZOLI_SERIE24_EX1_MEASURES,
  'serie-24-ex-2': POZZOLI_SERIE24_EX2_MEASURES,
  'serie-24-ex-3': POZZOLI_SERIE24_EX3_MEASURES,
  'serie-24-ex-4': POZZOLI_SERIE24_EX4_MEASURES,
  'serie-24-ex-5': POZZOLI_SERIE24_EX5_MEASURES
};

// Posição vertical diatônica na pauta (Clave de Sol e Clave de Fá na 4ª linha):
// Clave de Sol: E4 (1ª linha de baixo) = step 0; cada linha/espaço acima soma +1 (stepSpacing = 5px)
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

// Mapeamento transposto real para Clave de Fá (oitava grave confortável para voz/baixo):
// G2 (1ª linha de baixo) = step 0; F3 (4ª linha de Fá) = step 6; C4 (Dó central - 1ª linha sup.) = step 10
const BASS_CLEF_DIATONIC_STEP = {
  G3: 0,  // 1ª linha de baixo (G2)
  A3: 1,  // 1º espaço (A2)
  B3: 2,  // 2ª linha (B2)
  C4: 3,  // 2º espaço (C3)
  D4: 4,  // 3ª linha (D3)
  E4: 5,  // 3º espaço (E3)
  F4: 6,  // 4ª linha de Fá (F3)
  G4: 7,  // 4º espaço (G3)
  A4: 8,  // 5ª linha (A3)
  B4: 9,  // Espaço acima da 5ª linha (B3)
  C5: 10, // 1ª linha suplementar superior (C4 - Dó central)
  D5: 11, // Espaço acima da 1ª sup. (D4)
  E5: 12, // 2ª linha suplementar superior (E4)
  F5: 13, // Espaço acima da 2ª sup. (F4)
  G5: 14, // 3ª linha suplementar superior (G4)
  A5: 15  // Espaço acima da 3ª sup. (A4)
};

function midiToFreq(midi) {
  if (!midi) return null;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Detecta se uma partitura possui compassos densos (muitas notas, semicolcheias ou compassos amplos 5/4, 7/4, 9/8, 12/8)
 * que exigem 1 compasso por linha para máxima legibilidade e evitar qualquer proximidade excessiva de notas.
 */
export function shouldExerciseUseSingleMeasureRow(measures, currentSeries) {
  if (currentSeries?.measuresPerRow === 1) return true;
  if (!Array.isArray(measures) || measures.length === 0) {
    return currentSeries?.measuresPerRow === 1;
  }

  const timeSig = measures[0]?.timeSignature || currentSeries?.timeSignature || currentSeries?.subtitle;
  // Compassos com 5 ou mais tempos/pulsos ou compassos compostos de 3 ou 4 tempos (5/4, 7/4, 9/8, 12/8, 5/8, 7/8)
  if (['5/4', '7/4', '9/8', '12/8', '5/8', '7/8'].includes(timeSig)) {
    return true;
  }

  for (const m of measures) {
    const notes = m?.notes || [];
    const count = notes.length;
    // 8 ou mais notas/pausas num único compasso em 2 por linha deixa menos de 20px por nota
    if (count >= 8) return true;

    // Contagem de semicolcheias e acidentes
    let sixteenths = 0;
    let accidentals = 0;
    for (let i = 0; i < count; i++) {
      const n = notes[i];
      if (n.type === 's' || (n.eighthDur && n.eighthDur <= 0.5)) sixteenths++;
      if (n.accidental) accidentals++;
    }

    // Se tiver 4 ou mais semicolcheias ou 6+ notas com semicolcheias
    if (sixteenths >= 4 && count >= 6) return true;
    if (count >= 7 && (sixteenths >= 2 || accidentals >= 2)) return true;
  }

  return false;
}

export default function InteractiveScorePlayer({
  currentSeries,
  bpm = 60,
  onBpmChange = null,
  isDesktopMode = false,
  onVideoRef = null,
  onTimeUpdate = null,
  onToggleMenu = null,
  playerControls = null
}) {
  const [userLayoutPerRow, setUserLayoutPerRow] = useState(null);

  useEffect(() => {
    setUserLayoutPerRow(null);
  }, [currentSeries?.id]);

  const defaultBpm = currentSeries?.defaultBpm || 60;
  const [localBpm, setLocalBpm] = useState(() => bpm || defaultBpm || 60);

  useEffect(() => {
    if (bpm) {
      setLocalBpm(bpm);
    }
  }, [bpm]);

  useEffect(() => {
    if (currentSeries?.defaultBpm) {
      setLocalBpm(currentSeries.defaultBpm);
    }
  }, [currentSeries?.id, currentSeries?.defaultBpm]);

  const currentBpm = localBpm;

  const handleBpmChange = useCallback(
    (newVal) => {
      const clamped = Math.max(30, Math.min(220, Math.round(newVal)));
      setLocalBpm(clamped);
      if (typeof onBpmChange === 'function') {
        onBpmChange(clamped);
      }
    },
    [onBpmChange]
  );

  const [activeClef, setActiveClef] = useState(() => {
    try {
      return localStorage.getItem('pozzoli_active_clef') || 'G';
    } catch {
      return 'G';
    }
  });

  const toggleClef = () => {
    setActiveClef((prev) => {
      const next = prev === 'G' ? 'F' : 'G';
      try {
        localStorage.setItem('pozzoli_active_clef', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

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

        const isBass = activeClef === 'F';
        const noteMidi = isBass ? (nItem.midi ? nItem.midi - 12 : null) : nItem.midi;
        const visualItem = {
          id: `m${mObj.measure}_n${nIdx}`,
          globalIndex: vList.length,
          measureNumber: mObj.measure,
          measureIndex: mIdx,
          noteIndexInMeasure: nIdx,
          pitch: nItem.pitch,
          solfege: nItem.solfege,
          midi: noteMidi,
          freq: midiToFreq(noteMidi),
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
  }, [measures, baseEighthDurationSec, activeClef]);

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
  const masterCompressorRef = useRef(null);
  const masterGainRef = useRef(null);
  const activeNodesRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const playbackRateRef = useRef(currentBpm / defaultBpm);
  const isMutedRef = useRef(false);
  const loopRef = useRef(false);
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
    playbackRateRef.current = Math.max(0.3, Math.min(3.0, currentBpm / defaultBpm));
  }, [currentBpm, defaultBpm]);

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
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // Master Limiter / Compressor transparente para eliminar estalos e distorção por clipping
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-1.5, ctx.currentTime);
        comp.knee.setValueAtTime(6, ctx.currentTime);
        comp.ratio.setValueAtTime(14, ctx.currentTime);
        comp.attack.setValueAtTime(0.003, ctx.currentTime);
        comp.release.setValueAtTime(0.05, ctx.currentTime);

        const mGain = ctx.createGain();
        mGain.gain.setValueAtTime(0.88, ctx.currentTime);

        comp.connect(mGain);
        mGain.connect(ctx.destination);

        masterCompressorRef.current = comp;
        masterGainRef.current = mGain;
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopAllActiveSoundNodes = useCallback(() => {
    const ctx = audioCtxRef.current;
    const now = ctx ? ctx.currentTime : 0;
    activeNodesRef.current.forEach((item) => {
      try {
        if (item && item.gainNode && ctx) {
          // Fade-out anti-estalo suave em 10ms antes do stop
          item.gainNode.gain.cancelScheduledValues(now);
          item.gainNode.gain.setValueAtTime(item.gainNode.gain.value, now);
          item.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.010);
        }
        if (item && item.oscNodes) {
          item.oscNodes.forEach((osc) => {
            try {
              if (ctx) {
                osc.stop(now + 0.014);
              } else {
                osc.stop();
              }
            } catch {}
          });
        } else if (item && typeof item.stop === 'function') {
          if (ctx) {
            item.stop(now + 0.014);
          } else {
            item.stop();
          }
        }
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
      bodyFormant1.frequency.setValueAtTime(320, safeStart);
      bodyFormant1.Q.setValueAtTime(1.5, safeStart);
      bodyFormant1.gain.setValueAtTime(3.2, safeStart);

      const bodyFormant2 = ctx.createBiquadFilter();
      bodyFormant2.type = 'peaking';
      bodyFormant2.frequency.setValueAtTime(1100, safeStart);
      bodyFormant2.Q.setValueAtTime(1.6, safeStart);
      bodyFormant2.gain.setValueAtTime(2.6, safeStart);

      const warmLowpass = ctx.createBiquadFilter();
      warmLowpass.type = 'lowpass';
      warmLowpass.frequency.setValueAtTime(Math.min(3400, freq * 5.8), safeStart);
      warmLowpass.Q.setValueAtTime(0.7, safeStart);

      // Mixagem entre as cordas e o corpo fundamental
      const bowGain = ctx.createGain();
      bowGain.gain.setValueAtTime(0.18, safeStart);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.26, safeStart);

      // 4. Envelope de Arco de Violino (ataque macio de arco, sustentação contínua cantabile e saída suave)
      const masterGain = ctx.createGain();
      const attack = Math.min(0.065, Math.max(0.025, realDurationSec * 0.16));
      const swell = Math.min(0.14, Math.max(0.03, realDurationSec * 0.22));
      const peakLevel = 0.38;
      const sustainLevel = 0.32;
      const release = 0.085;
      const noteEnd = Math.max(
        safeStart + attack + swell + 0.01,
        safeStart + Math.max(0.07, realDurationSec - 0.01)
      );

      masterGain.gain.setValueAtTime(0.0001, safeStart);
      masterGain.gain.linearRampToValueAtTime(peakLevel * 0.82, safeStart + attack);
      masterGain.gain.linearRampToValueAtTime(peakLevel, safeStart + attack + swell);
      masterGain.gain.linearRampToValueAtTime(sustainLevel, noteEnd);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd + release);

      oscBow1.connect(bowGain);
      oscBow2.connect(bowGain);
      oscBody.connect(bodyGain);

      bowGain.connect(bodyFormant1);
      bodyGain.connect(bodyFormant1);
      bodyFormant1.connect(bodyFormant2);
      bodyFormant2.connect(warmLowpass);
      warmLowpass.connect(masterGain);

      const destinationNode = masterCompressorRef.current || ctx.destination;
      masterGain.connect(destinationNode);

      const stopAt = noteEnd + release + 0.03;
      oscBow1.start(safeStart);
      oscBow2.start(safeStart);
      oscBody.start(safeStart);
      vibratoLfo.start(safeStart);

      oscBow1.stop(stopAt);
      oscBow2.stop(stopAt);
      oscBody.stop(stopAt);
      vibratoLfo.stop(stopAt);

      activeNodesRef.current.push({
        gainNode: masterGain,
        oscNodes: [oscBow1, oscBow2, oscBody, vibratoLfo]
      });
    } catch (err) {
      console.warn('Erro ao tocar nota de violino:', err);
    }
  }, []);

  // Clique do metrônomo nítido de alta presença (woodblock macio sem estalos nem distorções)
  const playMetronomeClick = useCallback((beatInMeasure1to9, startWallTime, isCountIn = false) => {
    const ctx = audioCtxRef.current;
    if (!ctx || isMutedRef.current) return;
    if (!metronomeEnabledRef.current && !isCountIn) return;

    try {
      const safeStart = Math.max(ctx.currentTime + 0.005, startWallTime);
      const oscPrimary = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const bandpass = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const isDownbeat = beatInMeasure1to9 === 1;
      const isCompoundBeat =
        beatInMeasure1to9 === 4 || beatInMeasure1to9 === 7 || beatInMeasure1to9 === 10;

      // Frequências para ataque percussivo de woodblock acústico limpo
      const startFreq = isDownbeat ? 1680 : isCompoundBeat ? 1280 : 960;
      const endFreq = isDownbeat ? 920 : isCompoundBeat ? 740 : 580;
      const clickDur = isDownbeat ? 0.048 : isCompoundBeat ? 0.038 : 0.028;

      oscPrimary.type = 'sine';
      oscPrimary.frequency.setValueAtTime(startFreq, safeStart);
      oscPrimary.frequency.exponentialRampToValueAtTime(endFreq, safeStart + clickDur);

      // Harmônico superior suave para dar o "tock" nítido de madeira sem o ruído áspero de onda quadrada
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(startFreq * 1.5, safeStart);
      oscHarmonic.frequency.exponentialRampToValueAtTime(endFreq * 1.2, safeStart + 0.016);

      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(isDownbeat ? 1350 : 1050, safeStart);
      bandpass.Q.setValueAtTime(1.2, safeStart);

      // Volume controlado pelo usuário (0% a 150%)
      const userVolMultiplier = metronomeVolumeRef.current;
      if (userVolMultiplier <= 0.001) return;

      const baseVol = (isDownbeat ? 0.44 : isCompoundBeat ? 0.33 : 0.22) * userVolMultiplier;
      const vol = Math.min(0.62, isCountIn ? baseVol * 1.08 : baseVol);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.0001, safeStart);
      harmonicGain.gain.linearRampToValueAtTime(vol * 0.28, safeStart + 0.001);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, safeStart + 0.014);

      gain.gain.setValueAtTime(0.0001, safeStart);
      gain.gain.linearRampToValueAtTime(vol, safeStart + 0.0015);
      gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + clickDur);

      oscPrimary.connect(bandpass);
      oscHarmonic.connect(harmonicGain);
      harmonicGain.connect(bandpass);
      bandpass.connect(gain);

      const destinationNode = masterCompressorRef.current || ctx.destination;
      gain.connect(destinationNode);

      oscPrimary.start(safeStart);
      oscHarmonic.start(safeStart);
      oscPrimary.stop(safeStart + clickDur + 0.006);
      oscHarmonic.stop(safeStart + 0.018);

      activeNodesRef.current.push({
        gainNode: gain,
        oscNodes: [oscPrimary, oscHarmonic]
      });
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
        if (loopRef.current) {
          currentTimeRef.current = 0;
          setCurrentTimeSec(0);
          scheduledAudioIdsRef.current.clear();
          scheduledTicksRef.current.clear();
          stopAllActiveSoundNodes();
          scheduleLookahead(0);
          emitMediaEvent('timeupdate');
          if (onTimeUpdateRef.current) onTimeUpdateRef.current(0);
          animFrameRef.current = requestAnimationFrame(step);
          return;
        }
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
      },
      loop: {
        get: () => loopRef.current,
        set: (val) => {
          loopRef.current = !!val;
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

  // Detecta se a partitura tem compassos densos para usar automaticamente 1 compasso por linha
  const autoPerRow = useMemo(() => {
    return shouldExerciseUseSingleMeasureRow(measures, currentSeries) ? 1 : 2;
  }, [measures, currentSeries]);

  const activePerRow = userLayoutPerRow ?? autoPerRow;

  // Formato vertical para mobile: 1 ou 2 compassos por linha (adaptativo para notas legíveis e sem aperto)
  const measureRows = useMemo(() => {
    const rows = [];
    const perRow = activePerRow;
    for (let i = 0; i < measures.length; i += perRow) {
      rows.push(measures.slice(i, i + perRow));
    }
    return rows;
  }, [measures, activePerRow]);

  // Rola suavemente a tela verticalmente para acompanhar a linha do compasso ativo
  const activeRowIndex = useMemo(() => {
    if (!activeMeasureNumber) return 0;
    const idx = measureRows.findIndex((row) => row.some((m) => m.measure === activeMeasureNumber));
    return idx >= 0 ? idx : 0;
  }, [measureRows, activeMeasureNumber]);

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
              {/* Seletor de Clave (Clave de Sol 𝄞 / Clave de Fá 𝄢) */}
              <button
                type="button"
                onClick={toggleClef}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeClef === 'F' ? '1.5px solid #2563eb' : '1px solid #d4c4ac',
                  background: activeClef === 'F' ? 'rgba(37, 99, 235, 0.12)' : '#ffffff',
                  color: activeClef === 'F' ? '#1d4ed8' : '#574635'
                }}
                title={activeClef === 'F' ? "Clave de Fá ativa (clique para alternar para Clave de Sol)" : "Clave de Sol ativa (clique para alternar para Clave de Fá)"}
              >
                <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{activeClef === 'F' ? '𝄢' : '𝄞'}</span>
                <span>{activeClef === 'F' ? 'Clave de Fá' : 'Clave de Sol'}</span>
              </button>

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

              {/* Alternador de Layout: 1 ou 2 compassos por linha */}
              <button
                type="button"
                onClick={() => setUserLayoutPerRow((prev) => ((prev ?? autoPerRow) === 1 ? 2 : 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 9px',
                  borderRadius: '8px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activePerRow === 1 ? '1.5px solid #d97706' : '1px solid #d4c4ac',
                  background: activePerRow === 1 ? 'rgba(217, 119, 6, 0.12)' : '#ffffff',
                  color: activePerRow === 1 ? '#b45309' : '#574635'
                }}
                title={
                  activePerRow === 1
                    ? 'Exibindo 1 compasso por linha (modo expandido para notas espaçadas). Clique para alternar para 2 compassos por linha.'
                    : 'Exibindo 2 compassos por linha. Clique para alternar para 1 compasso por linha (expandido).'
                }
              >
                <span style={{ fontSize: '0.82rem', lineHeight: 1 }}>{activePerRow === 1 ? '❚' : '❚❚'}</span>
                <span>{activePerRow === 1 ? '1 comp / linha' : '2 comp / linha'}</span>
              </button>

              {/* Controle de Volume do Metrônomo (- / slider / +) com tamanho e visual idênticos ao BPM */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  border:
                    metronomeEnabled && metronomeVolume > 0
                      ? '1.5px solid #d97706'
                      : '1px solid #d4c4ac',
                  background:
                    metronomeEnabled && metronomeVolume > 0
                      ? 'rgba(217, 119, 6, 0.09)'
                      : '#ffffff',
                  minWidth: '220px'
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
                  title="Ativar / desativar som do metrônomo"
                >
                  {metronomeEnabled && metronomeVolume > 0 ? (
                    <Volume2 size={14} />
                  ) : (
                    <VolumeX size={14} />
                  )}
                  <span>Volume</span>
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
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid #dccbb3',
                    background: '#fffaf2',
                    color: '#574635',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Diminuir volume (-10%)"
                >
                  <Minus size={13} />
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
                    flex: 1,
                    minWidth: '95px',
                    maxWidth: '130px',
                    height: '5px',
                    accentColor: '#d97706',
                    cursor: 'pointer'
                  }}
                  title={`Volume do metrônomo: ${metronomeEnabled ? Math.round(metronomeVolume * 100) : 0}%`}
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
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid #dccbb3',
                    background: '#fffaf2',
                    color: '#574635',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Aumentar volume (+10%)"
                >
                  <Plus size={13} />
                </button>

                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: metronomeEnabled && metronomeVolume > 0 ? '#b45309' : '#8a7968',
                    minWidth: '28px',
                    textAlign: 'right'
                  }}
                >
                  {metronomeEnabled ? `${Math.round(metronomeVolume * 100)}%` : '0%'}
                </span>
              </div>

              {/* Controle de BPM (- / slider / +) para subir e diminuir o andamento */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  border: '1.5px solid #d97706',
                  background: 'rgba(217, 119, 6, 0.09)',
                  minWidth: '220px'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const ctx = ensureAudioContext();
                    if (ctx) playMetronomeClick(1, ctx.currentTime + 0.01, false);
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
                    color: '#b45309'
                  }}
                  title="Andamento (BPM) - clique para ouvir o beat"
                >
                  <Timer size={14} />
                  <span>BPM</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleBpmChange(currentBpm - 5);
                    const ctx = ensureAudioContext();
                    if (ctx) playMetronomeClick(1, ctx.currentTime + 0.01, false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid #dccbb3',
                    background: '#fffaf2',
                    color: '#574635',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Diminuir andamento (-5 BPM)"
                >
                  <Minus size={13} />
                </button>

                <input
                  type="range"
                  min={35}
                  max={200}
                  step={1}
                  value={currentBpm}
                  onChange={(e) => {
                    handleBpmChange(parseInt(e.target.value, 10));
                    const ctx = ensureAudioContext();
                    if (ctx) playMetronomeClick(1, ctx.currentTime + 0.01, false);
                  }}
                  style={{
                    flex: 1,
                    minWidth: '95px',
                    maxWidth: '130px',
                    height: '5px',
                    accentColor: '#d97706',
                    cursor: 'pointer'
                  }}
                  title={`Andamento: ${currentBpm} BPM`}
                />

                <button
                  type="button"
                  onClick={() => {
                    handleBpmChange(currentBpm + 5);
                    const ctx = ensureAudioContext();
                    if (ctx) playMetronomeClick(1, ctx.currentTime + 0.01, false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid #dccbb3',
                    background: '#fffaf2',
                    color: '#574635',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Aumentar andamento (+5 BPM)"
                >
                  <Plus size={13} />
                </button>

                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#b45309',
                    minWidth: '28px',
                    textAlign: 'right'
                  }}
                >
                  {currentBpm}
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

                    // Calcula posicionamento óptico musical e prevenção de colisão de notas e acidentes
                    const weights = mObj.notes.map((n) => {
                      let w = 1.0;
                      if (n.type === 's') w = 1.0;
                      else if (n.type === 'e') w = 1.35;
                      else if (n.type === 'ed') w = 1.6;
                      else if (n.type === 'q' || n.type === 'r4') w = 1.85;
                      else if (n.type === 'qd') w = 2.15;
                      else if (n.type === 'h' || n.type === 'r2') w = 2.5;
                      else if (n.type === 'hd') w = 2.9;
                      else if (n.type === 'w') w = 3.6;
                      else w = Math.max(1.0, Math.sqrt(n.eighthDur || 1) * 1.3);

                      // Folga extra para acidente musical (#, b, n) para nunca sobrepor à nota anterior
                      if (n.accidental) {
                        w += 0.55;
                      }
                      return w;
                    });

                    const totalWeight = weights.reduce((acc, v) => acc + v, 0);

                    let accumW = 0;
                    const notePositions = [];

                    for (let nIdx = 0; nIdx < mObj.notes.length; nIdx++) {
                      const n = mObj.notes[nIdx];
                      const item = noteLookup.get(`${mObj.measure}_${nIdx}`);
                      const w = weights[nIdx];

                      // Posicionamento óptico dentro do compasso
                      const slotStart = (accumW / totalWeight) * innerW;
                      const slotW = (w / totalWeight) * innerW;
                      let nx = mX + padLeft + slotStart + slotW * 0.42;

                      // Garante folga mínima da nota anterior para total legibilidade
                      if (nIdx > 0) {
                        const prevNx = notePositions[nIdx - 1].nx;
                        const minGap = n.accidental ? 24 : 17;
                        if (nx - prevNx < minGap) {
                          nx = prevNx + minGap;
                        }
                      }

                      const stepFromE4 = activeClef === 'F'
                        ? (BASS_CLEF_DIATONIC_STEP[n.pitch] ?? 3)
                        : (DIATONIC_STEP_FROM_E4[n.pitch] ?? 2);
                      const ny = staffBottomY - stepFromE4 * stepSpacing;

                      accumW += w;

                      const posObj = {
                        n,
                        nIdx,
                        item,
                        nx,
                        ny,
                        stepFromE4,
                        measureNumber: mObj.measure
                      };
                      notePositions.push(posObj);
                      renderedNotesInRow.push(posObj);
                    }

                    // Se o ajuste de folgas mínimas empurrou a última nota além da margem direita, ajusta proporcionalmente
                    const maxAllowedNx = mX + measureWidth - padRight;
                    const lastNx = notePositions[notePositions.length - 1]?.nx;
                    if (lastNx && lastNx > maxAllowedNx && notePositions.length > 1) {
                      const firstNx = notePositions[0].nx;
                      const span = lastNx - firstNx;
                      const targetSpan = maxAllowedNx - firstNx;
                      const scale = targetSpan / span;
                      notePositions.forEach((pos, idx) => {
                        if (idx > 0) {
                          pos.nx = firstNx + (pos.nx - firstNx) * scale;
                        }
                      });
                    }

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

                  {/* Clave estilizada (Sol ou Fá) */}
                  <text
                    x={activeClef === 'F' ? 16 : 18}
                    y={activeClef === 'F' ? staffTopY + 28 : staffBottomY - 6}
                    fontSize={activeClef === 'F' ? '38' : '46'}
                    fontFamily="Georgia, serif"
                    fill="#1f1610"
                    style={{ userSelect: 'none' }}
                  >
                    {activeClef === 'F' ? '𝄢' : '𝄞'}
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
                    const isCrossSystemTieEnd = pos.n.tieStart && !renderedNotesInRow[idx + 1];
                    const isCrossSystemTieStart =
                      pos.n.tieStop &&
                      (!renderedNotesInRow[idx - 1] ||
                        renderedNotesInRow[idx - 1].measureNumber !== pos.measureNumber);

                    // 1) Ligadura normal dentro da mesma linha
                    if (pos.n.tieStart && renderedNotesInRow[idx + 1]) {
                      const nextPos = renderedNotesInRow[idx + 1];
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
                    }

                    // 2) Ligadura saindo no final do sistema (última nota da linha ligada à primeira da próxima)
                    if (isCrossSystemTieEnd) {
                      const x1 = pos.nx + 5;
                      const x2 = svgWidth - rightMargin - 2;
                      const tieBelow = pos.stepFromE4 <= 4;
                      const y = tieBelow ? pos.ny + 7 : pos.ny - 7;
                      const ctrlY = y + (tieBelow ? 8 : -8);
                      return (
                        <path
                          key={`tie_out_${pos.item?.id}`}
                          d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${ctrlY} ${x2} ${y}`}
                          fill="none"
                          stroke="#1f1610"
                          strokeWidth="1.8"
                        />
                      );
                    }

                    // 3) Ligadura entrando no início do sistema (primeira nota da linha vinda da anterior)
                    if (isCrossSystemTieStart) {
                      const x1 = leftHeaderWidth + 2;
                      const x2 = pos.nx - 5;
                      const tieBelow = pos.stepFromE4 <= 4;
                      const y = tieBelow ? pos.ny + 7 : pos.ny - 7;
                      const ctrlY = y + (tieBelow ? 8 : -8);
                      return (
                        <path
                          key={`tie_in_${pos.item?.id}`}
                          d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${ctrlY} ${x2} ${y}`}
                          fill="none"
                          stroke="#1f1610"
                          strokeWidth="1.8"
                        />
                      );
                    }

                    return null;
                  })}

                  {/* Ligaduras de Expressão entre 2 compassos (slurStart -> slurEnd) */}
                  {rowMeasures.map((mObj, mColIdx) => {
                    const nextMeasureObj = rowMeasures[mColIdx + 1];

                    // 1) Ambos compassos na mesma linha
                    if (typeof mObj.slurStart === 'number' && nextMeasureObj && typeof nextMeasureObj.slurEnd === 'number') {
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
                    }

                    // 2) Compasso tem slurStart mas o próximo compasso está na linha seguinte
                    if (typeof mObj.slurStart === 'number' && !nextMeasureObj) {
                      const startNotePos = renderedNotesInRow.find(
                        (p) => p.measureNumber === mObj.measure && p.nIdx === mObj.slurStart
                      );
                      if (!startNotePos) return null;
                      const slurBelow = startNotePos.stepFromE4 <= 3.5;
                      const x1 = startNotePos.nx;
                      const x2 = svgWidth - rightMargin - 4;
                      const y1 = slurBelow ? startNotePos.ny + 11 : startNotePos.ny - 11;
                      const y2 = y1 + (slurBelow ? 6 : -6);
                      const midX = (x1 + x2) / 2;
                      const midY = y1 + (slurBelow ? 16 : -16);
                      return (
                        <path
                          key={`slur_out_${mObj.measure}`}
                          d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                          fill="none"
                          stroke="#37291d"
                          strokeWidth="1.6"
                        />
                      );
                    }

                    // 3) Compasso tem slurEnd e é o primeiro da linha vindo da linha anterior
                    if (typeof mObj.slurEnd === 'number' && mColIdx === 0 && rowIdx > 0) {
                      const endNotePos = renderedNotesInRow.find(
                        (p) => p.measureNumber === mObj.measure && p.nIdx === mObj.slurEnd
                      );
                      if (!endNotePos) return null;
                      const slurBelow = endNotePos.stepFromE4 <= 3.5;
                      const x1 = leftHeaderWidth + 4;
                      const x2 = endNotePos.nx;
                      const y2 = slurBelow ? endNotePos.ny + 11 : endNotePos.ny - 11;
                      const y1 = y2 + (slurBelow ? 6 : -6);
                      const midX = (x1 + x2) / 2;
                      const midY = y2 + (slurBelow ? 16 : -16);
                      return (
                        <path
                          key={`slur_in_${mObj.measure}`}
                          d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                          fill="none"
                          stroke="#37291d"
                          strokeWidth="1.6"
                        />
                      );
                    }

                    return null;
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

                        {/* Linhas suplementares (Clave de Sol) */}
                        {activeClef !== 'F' && (
                          <>
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
                          </>
                        )}

                        {/* Linhas suplementares (Clave de Fá) */}
                        {activeClef === 'F' && (
                          <>
                            {/* 1ª linha suplementar superior para C5 (Dó central - C4), D5 e E5 */}
                            {(n.pitch === 'C5' || n.pitch === 'D5' || n.pitch === 'E5' || n.pitch === 'F5' || n.pitch === 'G5' || n.pitch === 'A5') && (
                              <line
                                x1={nx - 11}
                                y1={staffTopY - lineSpacing}
                                x2={nx + 11}
                                y2={staffTopY - lineSpacing}
                                stroke={noteColor}
                                strokeWidth="1.6"
                              />
                            )}

                            {/* 2ª linha suplementar superior para E5, F5, G5 e A5 */}
                            {(n.pitch === 'E5' || n.pitch === 'F5' || n.pitch === 'G5' || n.pitch === 'A5') && (
                              <line
                                x1={nx - 11}
                                y1={staffTopY - 2 * lineSpacing}
                                x2={nx + 11}
                                y2={staffTopY - 2 * lineSpacing}
                                stroke={noteColor}
                                strokeWidth="1.6"
                              />
                            )}

                            {/* 3ª linha suplementar superior para G5 e A5 */}
                            {(n.pitch === 'G5' || n.pitch === 'A5') && (
                              <line
                                x1={nx - 11}
                                y1={staffTopY - 3 * lineSpacing}
                                x2={nx + 11}
                                y2={staffTopY - 3 * lineSpacing}
                                stroke={noteColor}
                                strokeWidth="1.6"
                              />
                            )}
                          </>
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

                        {/* Colchete individual (flag) para colcheia ('e'/'ed') ou semicolcheia ('s', duas bandeirolas) sem barra */}
                        {(n.type === 'e' || n.type === 'ed' || n.type === 's') && !n.beam && (
                          <>
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
                            {n.type === 's' && (
                              <path
                                d={
                                  stemUp
                                    ? `M ${stemX} ${stemY2 + 6} Q ${stemX + 10} ${stemY2 + 13} ${stemX + 6} ${stemY2 + 23}`
                                    : `M ${stemX} ${stemY2 - 6} Q ${stemX + 10} ${stemY2 - 13} ${stemX + 6} ${stemY2 - 23}`
                                }
                                fill="none"
                                stroke={noteColor}
                                strokeWidth="2.2"
                                strokeLinecap="round"
                              />
                            )}
                          </>
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
