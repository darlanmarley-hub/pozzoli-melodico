import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Eye, Image as ImageIcon, Sparkles, Music } from 'lucide-react';

/**
 * Dados musicais exatos do Exercício Nº 7 da 4ª Série do Pozzoli Melódico
 * Compasso: 9/8 (9 colcheias por compasso = 3 tempos compostos de semínima pontuada)
 * Tonalidade: Dó Maior (Clave de Sol)
 *
 * Tipos de figura (type):
 * - 'hd': mínima pontuada (6 colcheias)
 * - 'qd': semínima pontuada (3 colcheias)
 * - 'q' : semínima (2 colcheias)
 * - 'e' : colcheia (1 colcheia)
 * - 'r8': pausa de colcheia (1 colcheia)
 */
export const POZZOLI_SERIE4_EX7_MEASURES = [
  // ================= SISTEMA 1 (Compassos 1 a 8) =================
  {
    measure: 1,
    slurStart: 0,
    notes: [
      { pitch: 'G4', solfege: 'Sol', midi: 67, eighthDur: 6, type: 'hd', dotted: true },
      { pitch: 'A4', solfege: 'Lá', midi: 69, eighthDur: 3, type: 'qd', dotted: true }
    ]
  },
  {
    measure: 2,
    slurEnd: 1,
    notes: [
      { pitch: 'B4', solfege: 'Si', midi: 71, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'C5', solfege: 'Dó', midi: 72, eighthDur: 6, type: 'hd', dotted: true }
    ]
  },
  {
    measure: 3,
    slurStart: 0,
    notes: [
      { pitch: 'B4', solfege: 'Si', midi: 71, eighthDur: 6, type: 'hd', dotted: true },
      { pitch: 'A4', solfege: 'Lá', midi: 69, eighthDur: 3, type: 'qd', dotted: true }
    ]
  },
  {
    measure: 4,
    slurEnd: 1,
    notes: [
      { pitch: 'G4', solfege: 'Sol', midi: 67, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'E4', solfege: 'Mi', midi: 64, eighthDur: 6, type: 'hd', dotted: true }
    ]
  },
  {
    measure: 5,
    slurStart: 0,
    notes: [
      { pitch: 'D4', solfege: 'Ré', midi: 62, eighthDur: 6, type: 'hd', dotted: true },
      { pitch: 'F4', solfege: 'Fá', midi: 65, eighthDur: 3, type: 'qd', dotted: true }
    ]
  },
  {
    measure: 6,
    slurEnd: 2,
    notes: [
      { pitch: 'E4', solfege: 'Mi', midi: 64, eighthDur: 2, type: 'q', dotted: false },
      { pitch: 'F4', solfege: 'Fá', midi: 65, eighthDur: 1, type: 'e', dotted: false },
      { pitch: 'G4', solfege: 'Sol', midi: 67, eighthDur: 6, type: 'hd', dotted: true }
    ]
  },
  {
    measure: 7,
    slurStart: 0,
    notes: [
      { pitch: 'F4', solfege: 'Fá', midi: 65, eighthDur: 6, type: 'hd', dotted: true },
      { pitch: 'A4', solfege: 'Lá', midi: 69, eighthDur: 3, type: 'qd', dotted: true }
    ]
  },
  {
    measure: 8,
    slurEnd: 2,
    notes: [
      { pitch: 'G4', solfege: 'Sol', midi: 67, eighthDur: 2, type: 'q', dotted: false },
      { pitch: 'A4', solfege: 'Lá', midi: 69, eighthDur: 1, type: 'e', dotted: false },
      { pitch: 'B4', solfege: 'Si', midi: 71, eighthDur: 6, type: 'hd', dotted: true }
    ]
  },

  // ================= SISTEMA 2 (Compassos 9 a 16) =================
  {
    measure: 9,
    slurStart: 0,
    notes: [
      { pitch: 'C5', solfege: 'Dó', midi: 72, eighthDur: 6, type: 'hd', dotted: true },
      { pitch: 'B4', solfege: 'Si', midi: 71, eighthDur: 3, type: 'qd', dotted: true }
    ]
  },
  {
    measure: 10,
    slurEnd: 1,
    notes: [
      { pitch: 'D5', solfege: 'Ré', midi: 74, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'C5', solfege: 'Dó', midi: 72, eighthDur: 6, type: 'hd', dotted: true }
    ]
  },
  {
    measure: 11,
    slurStart: 0,
    notes: [
      { pitch: 'B4', solfege: 'Si', midi: 71, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'C5', solfege: 'Dó', midi: 72, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'B4', solfege: 'Si', midi: 71, eighthDur: 3, type: 'qd', dotted: true }
    ]
  },
  {
    measure: 12,
    slurEnd: 1,
    notes: [
      { pitch: 'A4', solfege: 'Lá', midi: 69, eighthDur: 6, type: 'hd', dotted: true, tieStart: true },
      { pitch: 'A4', solfege: 'Lá', midi: 69, eighthDur: 3, type: 'qd', dotted: true, tieStop: true }
    ]
  },
  {
    measure: 13,
    slurStart: 0,
    notes: [
      { pitch: 'G4', solfege: 'Sol', midi: 67, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'A4', solfege: 'Lá', midi: 69, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'F4', solfege: 'Fá', midi: 65, eighthDur: 3, type: 'qd', dotted: true }
    ]
  },
  {
    measure: 14,
    slurEnd: 2,
    notes: [
      { pitch: 'E4', solfege: 'Mi', midi: 64, eighthDur: 2, type: 'q', dotted: false },
      { pitch: 'F4', solfege: 'Fá', midi: 65, eighthDur: 1, type: 'e', dotted: false },
      { pitch: 'G4', solfege: 'Sol', midi: 67, eighthDur: 6, type: 'hd', dotted: true }
    ]
  },
  {
    measure: 15,
    slurStart: 0,
    notes: [
      { pitch: 'E4', solfege: 'Mi', midi: 64, eighthDur: 6, type: 'hd', dotted: true },
      { pitch: 'D4', solfege: 'Ré', midi: 62, eighthDur: 2, type: 'q', dotted: false },
      { pitch: 'E4', solfege: 'Mi', midi: 64, eighthDur: 1, type: 'e', dotted: false }
    ]
  },
  {
    measure: 16,
    slurEnd: 2,
    notes: [
      { pitch: 'D4', solfege: 'Ré', midi: 62, eighthDur: 3, type: 'qd', dotted: true },
      { pitch: 'C4', solfege: 'Dó', midi: 60, eighthDur: 3, type: 'qd', dotted: true, tieStart: true },
      { pitch: 'C4', solfege: 'Dó', midi: 60, eighthDur: 1, type: 'e', dotted: false, tieStop: true },
      { pitch: 'REST', solfege: 'Pausa', midi: null, eighthDur: 1, type: 'r8', isRest: true },
      { pitch: 'REST', solfege: 'Pausa', midi: null, eighthDur: 1, type: 'r8', isRest: true }
    ]
  }
];

// Posição vertical diatônica na pauta (Clave de Sol):
// E4 (1ª linha de baixo) = step 0; cada linha/espaço acima soma +1 (stepSpacing = 5px)
const DIATONIC_STEP_FROM_E4 = {
  C4: -2, // Linha suplementar inferior
  D4: -1, // Espaço abaixo da 1ª linha
  E4: 0,  // 1ª linha
  F4: 1,  // 1º espaço
  G4: 2,  // 2ª linha (Sol)
  A4: 3,  // 2º espaço
  B4: 4,  // 3ª linha
  C5: 5,  // 3º espaço
  D5: 6,  // 4ª linha
  E5: 7,  // 4º espaço
  F5: 8   // 5ª linha
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
  const measures = currentSeries?.interactiveMeasures || POZZOLI_SERIE4_EX7_MEASURES;
  const defaultBpm = currentSeries?.defaultBpm || 60;

  // No compasso composto 9/8 a 60 BPM (Pozzoli), cada tempo composto (semínima pontuada = 3 colcheias)
  // dura (60 / bpm) segundos, ou seja, 1 colcheia = (60 / bpm) / 3 segundos.
  // Na velocidade base (60 BPM), 1 colcheia = 1/3 s (0.3333s) e cada compasso 9/8 dura 3.0 segundos.
  // Total de 16 compassos = 144 colcheias = 48.0 segundos na base de 60 BPM.
  const baseEighthDurationSec = (60 / defaultBpm) / 3;

  // Constrói a linha do tempo linear de todas as notas + eventos sonoros (unindo notas ligadas por tie)
  const { visualTimeline, audioEvents, totalBaseDurationSec } = useMemo(() => {
    const vList = [];
    const aList = [];
    let currentEighth = 0;

    measures.forEach((mObj, mIdx) => {
      let beatInMeasureEighth = 0;
      mObj.notes.forEach((n, nIdx) => {
        const startEighth = currentEighth;
        const endEighth = currentEighth + n.eighthDur;
        const startTimeSec = startEighth * baseEighthDurationSec;
        const endTimeSec = endEighth * baseEighthDurationSec;
        const durationSec = n.eighthDur * baseEighthDurationSec;

        const visualItem = {
          id: `m${mObj.measure}_n${nIdx}`,
          globalIndex: vList.length,
          measureNumber: mObj.measure,
          measureIndex: mIdx,
          noteIndexInMeasure: nIdx,
          pitch: n.pitch,
          solfege: n.solfege,
          midi: n.midi,
          freq: midiToFreq(n.midi),
          eighthDur: n.eighthDur,
          beatStartInMeasure: beatInMeasureEighth + 1, // 1..9
          type: n.type,
          dotted: !!n.dotted,
          isRest: !!n.isRest,
          tieStart: !!n.tieStart,
          tieStop: !!n.tieStop,
          startEighth,
          endEighth,
          startTimeSec,
          endTimeSec,
          durationSec
        };

        vList.push(visualItem);

        // Se esta nota é continuação de ligadura (tieStop), prolonga o evento de áudio anterior
        // para que o som não seja re-atacado no meio da ligadura!
        if (n.tieStop && aList.length > 0 && !n.isRest) {
          const prevAudio = aList[aList.length - 1];
          prevAudio.endEighth = endEighth;
          prevAudio.endTimeSec = endTimeSec;
          prevAudio.durationSec = prevAudio.endTimeSec - prevAudio.startTimeSec;
        } else if (!n.isRest && n.midi) {
          aList.push({
            id: visualItem.id,
            midi: n.midi,
            freq: visualItem.freq,
            solfege: n.solfege,
            startEighth,
            endEighth,
            startTimeSec,
            endTimeSec,
            durationSec
          });
        }

        currentEighth = endEighth;
        beatInMeasureEighth += n.eighthDur;
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
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const [layoutCols, setLayoutCols] = useState(() => (window.innerWidth < 768 ? 4 : 8));

  useEffect(() => {
    const handleResize = () => {
      if (!isDesktopMode && window.innerWidth < 768) {
        setLayoutCols(4);
      } else {
        setLayoutCols(8);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDesktopMode]);

  // Refs para o motor de áudio em tempo real
  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0);
  const playbackRateRef = useRef(bpm / defaultBpm);
  const isMutedRef = useRef(false);
  const metronomeEnabledRef = useRef(metronomeEnabled);
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

  // Síntese de timbre de Piano / Órgão de Solfejo suave e afinado para cantar junto
  const playMelodicNote = useCallback((freq, startWallTime, realDurationSec) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !freq || isMutedRef.current) return;

    try {
      const safeStart = Math.max(ctx.currentTime + 0.005, startWallTime);
      const oscFundamental = ctx.createOscillator();
      const oscWarm = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      oscFundamental.type = 'triangle';
      oscFundamental.frequency.setValueAtTime(freq, safeStart);

      oscWarm.type = 'sine';
      oscWarm.frequency.setValueAtTime(freq, safeStart);

      // 2º harmônico suave para corpo de piano acústico
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(freq * 2, safeStart);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.14, safeStart);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4.5, safeStart);

      const attack = 0.015;
      const decay = Math.min(0.12, Math.max(0.02, realDurationSec * 0.25));
      const sustainLevel = 0.30;
      const peakLevel = 0.45;
      const release = 0.05;
      const noteEnd = Math.max(
        safeStart + attack + decay + 0.01,
        safeStart + Math.max(0.06, realDurationSec - 0.015)
      );

      gain.gain.setValueAtTime(0.0001, safeStart);
      gain.gain.linearRampToValueAtTime(peakLevel, safeStart + attack);
      gain.gain.exponentialRampToValueAtTime(sustainLevel, safeStart + attack + decay);
      gain.gain.setValueAtTime(sustainLevel, noteEnd);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd + release);

      oscFundamental.connect(filter);
      oscWarm.connect(filter);
      oscHarmonic.connect(harmonicGain);
      harmonicGain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      oscFundamental.start(safeStart);
      oscWarm.start(safeStart);
      oscHarmonic.start(safeStart);

      const stopAt = noteEnd + release + 0.02;
      oscFundamental.stop(stopAt);
      oscWarm.stop(stopAt);
      oscHarmonic.stop(stopAt);

      activeNodesRef.current.push(oscFundamental, oscWarm, oscHarmonic);
    } catch (err) {
      console.warn('Erro ao tocar nota:', err);
    }
  }, []);

  // Clique do metrônomo 9/8 (forte no tempo 1, médio nos tempos 4 e 7, suave nas subdivisões 2, 3, 5, 6, 8, 9)
  const playMetronomeClick = useCallback((beatInMeasure1to9, startWallTime) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !metronomeEnabledRef.current || isMutedRef.current) return;

    try {
      const safeStart = Math.max(ctx.currentTime + 0.005, startWallTime);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const isDownbeat = beatInMeasure1to9 === 1;
      const isCompoundBeat = beatInMeasure1to9 === 4 || beatInMeasure1to9 === 7;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(
        isDownbeat ? 1320 : isCompoundBeat ? 980 : 720,
        safeStart
      );

      const vol = isDownbeat ? 0.16 : isCompoundBeat ? 0.10 : 0.045;
      const clickDur = isDownbeat ? 0.035 : 0.022;

      gain.gain.setValueAtTime(0.0001, safeStart);
      gain.gain.linearRampToValueAtTime(vol, safeStart + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, safeStart + clickDur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(safeStart);
      osc.stop(safeStart + clickDur + 0.005);
      activeNodesRef.current.push(osc);
    } catch {
      // ignore
    }
  }, []);

  // Agenda notas e cliques do metrônomo na janela de lookahead
  const scheduleLookahead = useCallback(
    (baseSecNow) => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const rate = playbackRateRef.current;
      const lookaheadBaseSec = 0.14 * rate;

      // 1. Agendar notas melódicas
      for (let i = 0; i < audioEvents.length; i++) {
        const ev = audioEvents[i];
        if (scheduledAudioIdsRef.current.has(ev.id)) continue;

        // Se estamos começando exatamente dentro desta nota ou ela começa na janela de lookahead
        const startsInWindow =
          ev.startTimeSec >= baseSecNow - 0.02 && ev.startTimeSec <= baseSecNow + lookaheadBaseSec;
        const alreadyStartedButOngoing =
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

      // 2. Agendar cliques de colcheia do compasso 9/8
      const currentEighthFloat = baseSecNow / baseEighthDurationSec;
      const maxEighthFloat = (baseSecNow + lookaheadBaseSec) / baseEighthDurationSec;
      const startTick = Math.max(0, Math.floor(currentEighthFloat));
      const endTick = Math.min(143, Math.floor(maxEighthFloat));

      for (let tick = startTick; tick <= endTick; tick++) {
        if (scheduledTicksRef.current.has(tick)) continue;
        const tickBaseSec = tick * baseEighthDurationSec;
        if (tickBaseSec >= baseSecNow - 0.025 && tickBaseSec <= baseSecNow + lookaheadBaseSec) {
          scheduledTicksRef.current.add(tick);
          const delayWallSec = Math.max(0, (tickBaseSec - baseSecNow) / rate);
          const beat1to9 = (tick % 9) + 1;
          playMetronomeClick(beat1to9, ctx.currentTime + delayWallSec);
        }
      }
    },
    [audioEvents, baseEighthDurationSec, playMelodicNote, playMetronomeClick]
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

    if (currentTimeRef.current >= totalBaseDurationSec - 0.05 || currentTimeRef.current <= 0.01) {
      if (currentTimeRef.current >= totalBaseDurationSec - 0.05) {
        currentTimeRef.current = 0;
        setCurrentTimeSec(0);
      }
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
      if (onTimeUpdateRef.current) onTimeUpdateRef.current(nextBaseSec);

      animFrameRef.current = requestAnimationFrame(step);
    };

    scheduleLookahead(currentTimeRef.current);
    animFrameRef.current = requestAnimationFrame(step);
  }, [
    ensureAudioContext,
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
  useEffect(() => {
    startPlaybackRef.current = startPlayback;
    pausePlaybackRef.current = pausePlayback;
    seekToTimeRef.current = seekToTime;
  }, [startPlayback, pausePlayback, seekToTime]);

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
        get: () => currentTimeRef.current,
        set: (val) => {
          if (seekToTimeRef.current) seekToTimeRef.current(Number(val) || 0);
        }
      },
      duration: {
        get: () => totalBaseDurationSec
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

  // Determina a nota visual ativa, o compasso ativo (1..16) e a colcheia ativa (1..9)
  const activeVisualNote = useMemo(() => {
    const found = visualTimeline.find(
      (item) => currentTimeSec >= item.startTimeSec && currentTimeSec < item.endTimeSec
    );
    return found || visualTimeline[0];
  }, [visualTimeline, currentTimeSec]);

  const currentEighthGlobal = Math.min(
    143,
    Math.max(0, Math.floor(currentTimeSec / baseEighthDurationSec))
  );
  const activeMeasureNumber = Math.floor(currentEighthGlobal / 9) + 1;
  const activeBeatInMeasure = (currentEighthGlobal % 9) + 1;
  const progressInsideMeasure = (currentTimeSec / baseEighthDurationSec) % 9 / 9;

  // Ao clicar em uma nota na partitura: pula para ela, toca um preview se estiver pausado ou continua tocando
  const handleNoteClick = (noteItem, e) => {
    if (e) e.stopPropagation();
    ensureAudioContext();
    seekToTime(noteItem.startTimeSec);
    if (!isPlayingRef.current && !noteItem.isRest && noteItem.freq && audioCtxRef.current) {
      playMelodicNote(noteItem.freq, audioCtxRef.current.currentTime, 0.55);
    }
  };

  // Agrupa os 16 compassos em linhas de `layoutCols` compassos (8 por linha no modo paisagem/original, 4 por linha no celular)
  const measureRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < measures.length; i += layoutCols) {
      rows.push(measures.slice(i, i + layoutCols));
    }
    return rows;
  }, [measures, layoutCols]);

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
        userSelect: 'none'
      }}
    >
      {/* Barra Superior de Status Musical Interativo e Controles Rápidos */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '10px 16px',
          background: 'linear-gradient(180deg, #fff8ee 0%, #f7efe2 100%)',
          borderBottom: '1px solid #e5d5bc',
          position: 'sticky',
          top: 0,
          zIndex: 25,
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}
      >
        {/* Indicadores ao vivo: Compasso, Tempo 9/8 e Nota Atual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => (isPlaying ? pausePlayback() : startPlayback())}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isPlaying ? '#dc2626' : '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(234, 88, 12, 0.3)'
            }}
          >
            {isPlaying ? <Pause size={15} fill="#fff" /> : <Play size={15} fill="#fff" />}
            <span>{isPlaying ? 'PAUSAR' : 'TOCAR PARTITURA'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              pausePlayback();
              seekToTime(0);
            }}
            title="Voltar ao início"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #d6c4a8',
              background: '#ffffff',
              color: '#4b3b2a',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1.5px solid #e2cdb0',
              borderRadius: '10px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#3f2e1e'
            }}
          >
            <span>
              Compasso <strong style={{ color: '#ea580c' }}>{activeMeasureNumber}/16</strong>
            </span>
            <span style={{ color: '#cbb596' }}>|</span>
            <span>
              Tempo 9/8: <strong style={{ color: '#ea580c' }}>{activeBeatInMeasure}/9</strong>
            </span>
            <span style={{ color: '#cbb596' }}>|</span>
            <span>
              Nota:{' '}
              <strong
                style={{
                  color: activeVisualNote?.isRest ? '#6b7280' : '#ea580c',
                  fontSize: '0.88rem'
                }}
              >
                {activeVisualNote?.solfege || 'Sol'}{' '}
                {!activeVisualNote?.isRest && `(${activeVisualNote?.pitch})`}
              </strong>
            </span>
          </div>
        </div>

        {/* Botões de apoio: Nomes das Notas, Metrônomo 9/8, Layout e Imagem Original */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowSolfegeNames((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: showSolfegeNames ? '1.5px solid #ea580c' : '1px solid #d4c4ac',
              background: showSolfegeNames ? 'rgba(234, 88, 12, 0.12)' : '#ffffff',
              color: showSolfegeNames ? '#c2410c' : '#574635'
            }}
          >
            <Music size={14} />
            <span>Notas ({showSolfegeNames ? 'Sim' : 'Não'})</span>
          </button>

          <button
            type="button"
            onClick={() => setMetronomeEnabled((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: metronomeEnabled ? '1.5px solid #d97706' : '1px solid #d4c4ac',
              background: metronomeEnabled ? 'rgba(217, 119, 6, 0.12)' : '#ffffff',
              color: metronomeEnabled ? '#b45309' : '#574635'
            }}
          >
            {metronomeEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>Metrônomo 9/8</span>
          </button>

          <button
            type="button"
            onClick={() => setLayoutCols((c) => (c === 8 ? 4 : 8))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #d4c4ac',
              background: '#ffffff',
              color: '#574635'
            }}
            title="Alternar entre 4 compassos por linha (ampliado) ou 8 compassos por linha (original)"
          >
            <Eye size={14} />
            <span>{layoutCols === 8 ? 'Zoom Mobile (4/linha)' : 'Visão Completa (8/linha)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOriginalImage((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: showOriginalImage ? '1.5px solid #2563eb' : '1px solid #d4c4ac',
              background: showOriginalImage ? 'rgba(37, 99, 235, 0.1)' : '#ffffff',
              color: showOriginalImage ? '#1d4ed8' : '#574635'
            }}
          >
            <ImageIcon size={14} />
            <span>{showOriginalImage ? 'Ocultar Imagem Original' : 'Ver Imagem Original'}</span>
          </button>
        </div>
      </div>

      {/* Visualizador da Imagem Original com Cursor Sincronizado (quando ativado) */}
      {showOriginalImage && (
        <div
          style={{
            margin: '14px auto 4px auto',
            width: '96%',
            maxWidth: '1080px',
            background: '#ffffff',
            border: '1.5px solid #e2cdb0',
            borderRadius: '14px',
            padding: '12px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
          }}
        >
          <div
            style={{
              fontSize: '0.76rem',
              fontWeight: 700,
              color: '#786248',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>IMAGEM ORIGINAL DA PARTITURA (Nº. 7 — 9/8) COM CURSOR SINCRONIZADO</span>
            <span style={{ color: '#ea580c' }}>Clique em qualquer ponto da imagem para ir até o compasso</span>
          </div>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relY = (e.clientY - rect.top) / rect.height;
              const relX = (e.clientX - rect.left) / rect.width;
              const systemIdx = relY < 0.5 ? 0 : 1;
              // Na primeira linha, os compassos começam após a clave/fórmula (~12% da largura)
              const startXRatio = systemIdx === 0 ? 0.125 : 0.055;
              const normX = Math.max(0, Math.min(0.999, (relX - startXRatio) / (0.985 - startXRatio)));
              const targetMeasureIdx = systemIdx * 8 + Math.floor(normX * 8);
              const measureOffset = (normX * 8) % 1;
              const targetSec = (targetMeasureIdx * 9 + measureOffset * 9) * baseEighthDurationSec;
              seekToTime(targetSec);
            }}
            style={{
              position: 'relative',
              width: '100%',
              cursor: 'pointer',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            <img
              src="/partituras/serie4-ex7.png"
              alt="Partitura Pozzoli 4ª Série Exercício 7"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />

            {/* Cursor luminoso acompanhando exatamente os 2 sistemas da imagem original */}
            {(() => {
              const sysIdx = activeMeasureNumber <= 8 ? 0 : 1;
              const mInSys = (activeMeasureNumber - 1) % 8;
              const startPct = sysIdx === 0 ? 12.5 : 5.5;
              const endPct = 98.5;
              const measureWidthPct = (endPct - startPct) / 8;
              const cursorLeftPct =
                startPct + (mInSys + progressInsideMeasure) * measureWidthPct;
              const measureBoxLeftPct = startPct + mInSys * measureWidthPct;

              return (
                <>
                  {/* Destaque suave no compasso ativo da imagem */}
                  <div
                    style={{
                      position: 'absolute',
                      top: sysIdx === 0 ? '6%' : '54%',
                      height: '40%',
                      left: `${measureBoxLeftPct}%`,
                      width: `${measureWidthPct}%`,
                      background: 'rgba(234, 88, 12, 0.14)',
                      border: '1.5px solid rgba(234, 88, 12, 0.45)',
                      borderRadius: '4px',
                      pointerEvents: 'none',
                      transition: 'left 0.08s linear, top 0.15s ease'
                    }}
                  />
                  {/* Linha vertical do cursor em tempo real */}
                  <div
                    style={{
                      position: 'absolute',
                      top: sysIdx === 0 ? '4%' : '52%',
                      height: '44%',
                      left: `${cursorLeftPct}%`,
                      width: '3px',
                      background: '#ea580c',
                      boxShadow: '0 0 10px rgba(234, 88, 12, 0.9)',
                      borderRadius: '2px',
                      pointerEvents: 'none'
                    }}
                  />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Partitura Vetorial Interativa (SVG) */}
      <div
        onClick={() => {
          if (onToggleMenu) onToggleMenu();
        }}
        style={{
          width: '96%',
          maxWidth: '1120px',
          margin: '14px auto',
          background: '#ffffff',
          border: '1.5px solid #e4d4bc',
          borderRadius: '18px',
          padding: '20px 14px 26px 14px',
          boxShadow: '0 10px 30px rgba(30, 22, 16, 0.07)'
        }}
      >
        {/* Cabeçalho Clássico da Partitura */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            borderBottom: '1px solid #eee2cf',
            paddingBottom: '10px',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#1f1610'
              }}
            >
              Nº. 7.
            </span>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#6b563e'
              }}
            >
              4ª Série — Compassos Compostos (9/8) • Toque em qualquer nota para ouvir ou pular
            </span>
          </div>

          {/* Pulsador visual das 9 colcheias do compasso 9/8 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => {
              const isAccent = b === 1 || b === 4 || b === 7;
              const isCurrent = isPlaying && activeBeatInMeasure === b;
              return (
                <div
                  key={b}
                  style={{
                    width: isAccent ? '22px' : '18px',
                    height: '22px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: isAccent ? 800 : 600,
                    background: isCurrent
                      ? '#ea580c'
                      : isAccent
                      ? '#f5ebe0'
                      : '#faf6f0',
                    color: isCurrent ? '#ffffff' : isAccent ? '#9a3412' : '#786248',
                    border: isCurrent
                      ? '1.5px solid #ea580c'
                      : isAccent
                      ? '1px solid #d6bfa3'
                      : '1px solid #e7dac6',
                    transform: isCurrent ? 'scale(1.12)' : 'scale(1)',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {b}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sistemas da Partitura SVG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {measureRows.map((rowMeasures, rowIdx) => {
            const svgWidth = 1000;
            const svgHeight = 148;
            const staffTopY = 46;
            const lineSpacing = 10; // 5 linhas: y = 46, 56, 66, 76, 86
            const staffBottomY = staffTopY + 4 * lineSpacing; // 86 (1ª linha = E4)
            const stepSpacing = lineSpacing / 2; // 5px por grau diatônico

            const isFirstRow = rowIdx === 0;
            const leftHeaderWidth = isFirstRow ? 82 : 52;
            const rightMargin = 12;
            const usableWidth = svgWidth - leftHeaderWidth - rightMargin;
            const measureWidth = usableWidth / rowMeasures.length;

            // Coordenadas calculadas de todas as notas desta linha para desenhar ligaduras (slurs e ties)
            const renderedNotesInRow = [];

            return (
              <div key={rowIdx} style={{ width: '100%', overflowX: 'auto' }}>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    minWidth: layoutCols === 8 ? '680px' : '320px',
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
                      const centerRatio = (accumEighth + n.eighthDur * 0.42) / 9;
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

                  {/* Fórmula de Compasso 9/8 na primeira linha */}
                  {isFirstRow && (
                    <g>
                      <text
                        x={60}
                        y={staffTopY + 18}
                        fontSize="21"
                        fontWeight="800"
                        fontFamily="Georgia, serif"
                        textAnchor="middle"
                        fill="#1f1610"
                      >
                        9
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
                        8
                      </text>
                    </g>
                  )}

                  {/* Barras divisórias de compasso (e barra dupla final no compasso 16) */}
                  {rowMeasures.map((mObj, mColIdx) => {
                    const barX = leftHeaderWidth + (mColIdx + 1) * measureWidth;
                    const isFinalMeasure = mObj.measure === 16;
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

                  {/* Ligaduras de Prolongamento (Ties) — ex: Compasso 12 (Lá-Lá) e Compasso 16 (Dó-Dó) */}
                  {renderedNotesInRow.map((pos, idx) => {
                    if (!pos.n.tieStart) return null;
                    const nextPos = renderedNotesInRow[idx + 1];
                    if (!nextPos) return null;
                    const x1 = pos.nx + 6;
                    const x2 = nextPos.nx - 6;
                    const y = pos.ny + 8;
                    const ctrlY = y + 12;
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

                  {/* Ligaduras de Expressão / Fraseado (Slurs de 2 em 2 compassos conforme o original) */}
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

                  {/* Desenho de cada Nota e Pausa */}
                  {renderedNotesInRow.map((pos) => {
                    const { n, item, nx, ny, stepFromE4 } = pos;
                    const isNoteActive = activeVisualNote?.id === item?.id;
                    const noteColor = isNoteActive ? '#ea580c' : '#18120d';

                    // Pausas de colcheia no compasso 16
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
                          {/* Símbolo gráfico de pausa de colcheia */}
                          <circle cx={nx - 2} cy={restY - 4} r={2.6} fill={noteColor} />
                          <path
                            d={`M ${nx - 2} ${restY - 4} Q ${nx + 3} ${restY - 2} ${nx + 3} ${restY - 7} L ${nx - 2} ${restY + 9}`}
                            fill="none"
                            stroke={noteColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </g>
                      );
                    }

                    const isOpenHead = n.type === 'hd'; // Mínima pontuada tem cabeça aberta (branca)
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

                        {/* Linha suplementar inferior para o Dó4 (C4) no compasso 16 */}
                        {n.pitch === 'C4' && (
                          <line
                            x1={nx - 11}
                            y1={staffBottomY + lineSpacing}
                            x2={nx + 11}
                            y2={staffBottomY + lineSpacing}
                            stroke={noteColor}
                            strokeWidth="1.6"
                          />
                        )}

                        {/* Haste da nota */}
                        <line
                          x1={stemX}
                          y1={stemY1}
                          x2={stemX}
                          y2={stemY2}
                          stroke={noteColor}
                          strokeWidth="1.8"
                        />

                        {/* Colchete (flag) quando a figura for colcheia ('e') */}
                        {n.type === 'e' && (
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

                        {/* Ponto de aumento (nas mínimas pontuadas e semínimas pontuadas) */}
                        {n.dotted && (
                          <circle
                            cx={nx + 11.5}
                            cy={stepFromE4 % 2 === 0 ? ny - 3 : ny}
                            r={2.3}
                            fill={noteColor}
                          />
                        )}

                        {/* Nome da nota (Solfejo) abaixo/acima para guiar o estudo */}
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
      {playerControls}
    </div>
  );
}
