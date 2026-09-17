import { CountInEngine } from './CountInEngine';
import * as ToneMidiModule from '@tonejs/midi';

const Midi = ToneMidiModule.Midi || ToneMidiModule.default?.Midi || ToneMidiModule.default || ToneMidiModule;

/**
 * Audio-Driven Synchronization & Master Clock Engine para Pozzoli Melódico
 * Suporta Execução de Áudio MP3, Síntese MIDI via Web Audio API e Sincronização em tempo real com OpenSheetMusicDisplay (OSMD).
 * 
 * Estados Suportados:
 * "idle" | "preparing" | "count-in" | "playing" | "paused" | "stopped" | "finished" | "error"
 */
export class AudioSyncEngine {
  constructor(audioElement = null, osmdInstance = null, originalBpm = 60, syncConfig = null) {
    this.audioElement = audioElement;
    this.osmd = osmdInstance;
    this.originalBpm = originalBpm;
    this.currentBpm = originalBpm;
    this.syncConfig = syncConfig;

    this.playbackPhase = 'idle'; 
    this.countInEngine = new CountInEngine();
    this.countInBeats = syncConfig?.countInBeats || 4;
    this.audioOffsetSec = syncConfig?.audioOffset || 0;

    this.timeSignature = '2/4';
    this.scoreMap = [];
    this.musicalNotesData = [];
    this.midiNotes = [];
    this.midiData = null;
    this.currentIndex = 0;
    this.lastJumpedIndex = -1;
    this.animFrameId = null;

    // Web Audio API Context para Síntese MIDI
    this.audioCtx = null;
    this.midiStartTime = 0;
    this.midiPauseTime = 0;
    this.scheduledNoteIndices = new Set();
    this.useMidiAudio = false; // Áudio MP3 habilitado por padrão para tocar o arquivo Pozzoli

    // Configurações de Loop
    this.isLoopActive = false;
    this.loopStartMeasure = null;
    this.loopEndMeasure = null;

    // Callbacks de evento
    this.onNoteChangeCallback = null;
    this.onProgressCallback = null;
    this.onPhaseChangeCallback = null;
    this.onCountInTickCallback = null;
    this.onErrorCallback = null;

    if (this.audioElement) {
      this.setupAudioElement();
    }
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setupAudioElement() {
    if (!this.audioElement) return;
    this.audioElement.preservesPitch = true;
    if ('webkitPreservesPitch' in this.audioElement) {
      this.audioElement.webkitPreservesPitch = true;
    }
    if ('mozPreservesPitch' in this.audioElement) {
      this.audioElement.mozPreservesPitch = true;
    }
  }

  setAudioElement(audioElement) {
    this.audioElement = audioElement;
    this.setupAudioElement();
  }

  setOsmdInstance(osmdInstance) {
    this.osmd = osmdInstance;
    this.buildScoreMap();
  }

  /**
   * Carrega e decodifica o arquivo MIDI (.mid)
   */
  async loadMidi(midiUrl = '/partituras/Pozzolli--1-PRIMEIRA-SERIE-mxl.mid') {
    try {
      const res = await fetch(midiUrl);
      if (!res.ok) return null;

      const arrayBuffer = await res.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      this.midiData = midi;

      if (midi.tracks && midi.tracks.length > 0) {
        const track = midi.tracks.find(t => t.notes && t.notes.length > 0) || midi.tracks[0];
        this.midiNotes = track.notes.map((n, idx) => ({
          stepIndex: idx,
          midi: n.midi,
          noteName: n.name,
          timeSec: n.time,
          durationSec: n.duration,
          pitchFreq: 440 * Math.pow(2, (n.midi - 69) / 12)
        }));
      }

      return this.midiNotes;
    } catch (err) {
      console.warn('Erro ao carregar MIDI no AudioSyncEngine:', err);
      return null;
    }
  }

  setSyncConfig(syncConfig) {
    this.syncConfig = syncConfig;
    if (syncConfig) {
      if (syncConfig.bpm) {
        this.originalBpm = syncConfig.bpm;
        this.currentBpm = syncConfig.bpm;
      }
      if (typeof syncConfig.countInBeats === 'number') {
        this.countInBeats = syncConfig.countInBeats;
      }
      if (typeof syncConfig.audioOffset === 'number') {
        this.audioOffsetSec = syncConfig.audioOffset;
      }
    }
    if (this.osmd) {
      this.buildScoreMap();
    }
  }

  setCallbacks({ onNoteChange, onProgress, onPhaseChange, onCountInTick, onError }) {
    if (onNoteChange) this.onNoteChangeCallback = onNoteChange;
    if (onProgress) this.onProgressCallback = onProgress;
    if (onPhaseChange) this.onPhaseChangeCallback = onPhaseChange;
    if (onCountInTick) this.onCountInTickCallback = onCountInTick;
    if (onError) this.onErrorCallback = onError;
  }

  setPhase(newPhase) {
    this.playbackPhase = newPhase;
    if (this.onPhaseChangeCallback) {
      this.onPhaseChangeCallback(newPhase);
    }
  }

  setLoop(enabled, startMeasure = null, endMeasure = null) {
    this.isLoopActive = enabled;
    this.loopStartMeasure = startMeasure;
    this.loopEndMeasure = endMeasure;
  }

  /**
   * Extrai a estrutura intermediária de dados musicais do MusicXML via OSMD
   */
  buildScoreMap() {
    if (!this.osmd || !this.osmd.cursor) return [];

    const map = [];
    const intermediateData = [];
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    try {
      const cursor = this.osmd.cursor;
      cursor.reset();
      let step = 0;
      let cumulativeTimeMs = (this.audioOffsetSec || 0) * 1000;
      let cumulativeBeats = 0;
      const msPerQuarterAtOriginalBpm = (60.0 / Math.max(30, this.originalBpm)) * 1000;

      if (this.osmd.Sheet && this.osmd.Sheet.SourceMeasures && this.osmd.Sheet.SourceMeasures.length > 0) {
        const firstMeasure = this.osmd.Sheet.SourceMeasures[0];
        if (firstMeasure.duration) {
          const num = firstMeasure.duration.Numerator || 2;
          const den = firstMeasure.duration.Denominator || 4;
          this.timeSignature = `${num}/${den}`;
        }
      }

      let currentMeasureNum = 1;
      let cumulativeQuartersInMeasure = 0;

      while (!cursor.Iterator.EndReached) {
        const iterator = cursor.Iterator;
        const measureNumber = iterator.CurrentMeasure ? iterator.CurrentMeasure.MeasureNumber : 1;

        if (measureNumber !== currentMeasureNum) {
          currentMeasureNum = measureNumber;
          cumulativeQuartersInMeasure = 0;
        }

        let pitchStr = 'Rest';
        let pitchFreq = null;
        let isRest = true;
        let noteName = 'Pausa';
        let durationQuarters = 1.0;
        let voiceId = 1;

        if (iterator.CurrentVoiceEntries && iterator.CurrentVoiceEntries.length > 0) {
          const voiceEntry = iterator.CurrentVoiceEntries[0];
          if (voiceEntry.ParentVoice) {
            voiceId = voiceEntry.ParentVoice.VoiceId || 1;
          }

          if (voiceEntry.Notes && voiceEntry.Notes.length > 0) {
            const note = voiceEntry.Notes[0];
            isRest = note.isRest ? note.isRest() : false;

            if (!isRest && note.Pitch) {
              const halfTone = typeof note.Pitch.halfTone !== 'undefined'
                ? note.Pitch.halfTone
                : (note.Pitch.octave - 4) * 12 + note.Pitch.fundamentalNote;
              
              const midi = halfTone + 60;
              pitchFreq = 440 * Math.pow(2, (midi - 69) / 12);
              
              const noteIdx = (midi % 12 + 12) % 12;
              const octave = Math.floor(midi / 12) - 1;
              noteName = `${noteNames[noteIdx]}${octave}`;
              pitchStr = noteName;
            }

            if (note.Length) {
              durationQuarters = Math.max(0.125, note.Length.RealValue * 4);
            }
          }
        }

        const beatInMeasure = Math.floor(cumulativeQuartersInMeasure) + 1;
        cumulativeQuartersInMeasure += durationQuarters;

        let startTimeMs = cumulativeTimeMs;
        let durationMs = durationQuarters * msPerQuarterAtOriginalBpm;
        const endTimeMs = startTimeMs + durationMs;

        const noteObj = {
          stepIndex: step,
          measureNumber,
          beatInMeasure,
          voice: voiceId,
          pitchFreq,
          isRest,
          noteName,
          durationQuarters,
          durationMs,
          startTimeMs,
          endTimeMs
        };

        map.push(noteObj);

        intermediateData.push({
          measure: measureNumber,
          voice: voiceId,
          noteIndex: step,
          pitch: pitchStr,
          startBeat: cumulativeBeats,
          durationBeats: durationQuarters,
          startSeconds: startTimeMs / 1000,
          durationSeconds: durationMs / 1000
        });

        cumulativeBeats += durationQuarters;
        cumulativeTimeMs = endTimeMs;
        step++;
        cursor.next();
      }

      cursor.reset();
      if (this.osmd.cursor) {
        this.osmd.cursor.show();
      }
    } catch (e) {
      console.warn('Erro ao construir mapa de sincronização:', e);
    }

    this.scoreMap = map;
    this.musicalNotesData = intermediateData;
    this.currentIndex = 0;
    return map;
  }

  setBpm(newBpm) {
    this.currentBpm = Math.max(30, Math.min(280, newBpm));

    if (this.audioElement) {
      const speedRatio = this.currentBpm / this.originalBpm;
      this.audioElement.playbackRate = Math.max(0.4, Math.min(2.5, speedRatio));
    }
  }

  /**
   * Síntese sonora de uma nota MIDI via Web Audio API
   */
  playMidiSoundNote(pitchFreq, startTimeCtx, durationSec, velocity = 0.7) {
    if (!this.audioCtx || !pitchFreq) return;

    try {
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(pitchFreq, startTimeCtx);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(pitchFreq, startTimeCtx);

      const vol = Math.min(1.0, Math.max(0.1, velocity)) * 0.4;
      const attackTime = 0.008;
      const releaseTime = Math.min(0.2, durationSec * 0.4);

      gainNode.gain.setValueAtTime(0, startTimeCtx);
      gainNode.gain.linearRampToValueAtTime(vol, startTimeCtx + attackTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTimeCtx + durationSec + releaseTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start(startTimeCtx);
      osc2.start(startTimeCtx);

      osc1.stop(startTimeCtx + durationSec + releaseTime);
      osc2.stop(startTimeCtx + durationSec + releaseTime);
    } catch (e) {
      console.warn('Erro ao sintetizar nota MIDI:', e);
    }
  }

  /**
   * Dispara a reprodução sincronizada
   */
  play() {
    this.initAudioContext();
    this.setBpm(this.currentBpm);

    if (!this.useMidiAudio && this.audioElement) {
      this.startMusicalAudioPlayback();
    } else if (this.useMidiAudio && (this.midiNotes.length > 0 || this.scoreMap.length > 0)) {
      this.startMidiAudioPlayback();
    } else if (this.audioElement) {
      this.startMusicalAudioPlayback();
    }
  }

  startMidiAudioPlayback() {
    this.setPhase('playing');
    this.scheduledNoteIndices.clear();

    const bpmRatio = this.originalBpm / this.currentBpm;
    this.midiStartTime = this.audioCtx.currentTime - (this.midiPauseTime * bpmRatio);

    this.startSyncLoop();
  }

  startMusicalAudioPlayback() {
    if (!this.audioElement) return;

    this.setPhase('playing');
    this.audioElement.play()
      .then(() => {
        this.startSyncLoop();
      })
      .catch((err) => {
        console.warn('Erro ao reproduzir áudio:', err);
        this.setPhase('error');
        if (this.onErrorCallback) {
          this.onErrorCallback(`Falha ao reproduzir o áudio: ${err.message}`);
        }
      });
  }

  pause() {
    this.countInEngine.stop();
    if (this.audioElement) {
      this.audioElement.pause();
    }

    if (this.audioCtx && this.playbackPhase === 'playing') {
      const bpmRatio = this.currentBpm / this.originalBpm;
      this.midiPauseTime = (this.audioCtx.currentTime - this.midiStartTime) * bpmRatio;
    }

    this.stopSyncLoop();
    this.setPhase('paused');
  }

  resume() {
    if (this.playbackPhase === 'paused') {
      this.play();
    } else {
      this.play();
    }
  }

  stop() {
    this.countInEngine.stop();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.midiPauseTime = 0;
    this.scheduledNoteIndices.clear();
    this.stopSyncLoop();
    this.setPhase('stopped');
    this.jumpToStep(0);
  }

  restart() {
    this.stop();
    this.play();
  }

  seek(seconds) {
    this.midiPauseTime = Math.max(0, seconds);
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(0, seconds);
    }
    this.scheduledNoteIndices.clear();

    if (this.playbackPhase === 'playing') {
      const bpmRatio = this.originalBpm / this.currentBpm;
      this.midiStartTime = this.audioCtx.currentTime - (this.midiPauseTime * bpmRatio);
    }

    this.syncCursorToCurrentTime();
  }

  startSyncLoop() {
    this.stopSyncLoop();
    const loop = () => {
      if (this.playbackPhase !== 'playing') return;
      this.syncCursorToCurrentTime();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopSyncLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Sincronização em tempo real do cursor OSMD e da síntese Web Audio MIDI
   */
  syncCursorToCurrentTime() {
    let currentSec = 0;

    if (this.useMidiAudio && this.audioCtx) {
      const bpmRatio = this.currentBpm / this.originalBpm;
      const rawElapsed = Math.max(0, this.audioCtx.currentTime - this.midiStartTime);
      currentSec = rawElapsed * bpmRatio;

      // Agendar notas MIDI com antecedência
      const notes = this.scoreMap;
      const lookaheadSec = 0.2;
      
      notes.forEach((note, idx) => {
        const noteStartSec = note.startTimeMs / 1000;
        const noteDurationSec = note.durationMs / 1000;

        if (
          !this.scheduledNoteIndices.has(idx) &&
          noteStartSec >= currentSec &&
          noteStartSec <= currentSec + lookaheadSec
        ) {
          this.scheduledNoteIndices.add(idx);
          if (!note.isRest && note.pitchFreq) {
            const timeUntilNote = (noteStartSec - currentSec) / bpmRatio;
            const audioCtxTargetTime = this.audioCtx.currentTime + timeUntilNote;
            const scaledDuration = noteDurationSec / bpmRatio;
            this.playMidiSoundNote(note.pitchFreq, audioCtxTargetTime, scaledDuration);
          }
        }
      });
    } else if (this.audioElement) {
      currentSec = this.audioElement.currentTime;
    }

    const totalDurationSec = this.getTotalDurationSec();

    if (this.onProgressCallback) {
      this.onProgressCallback(currentSec, totalDurationSec > 0 ? currentSec / totalDurationSec : 0);
    }

    // Condição de término
    if (totalDurationSec > 0 && currentSec >= totalDurationSec) {
      if (this.isLoopActive) {
        this.seek(0);
      } else {
        this.setPhase('finished');
        this.stopSyncLoop();
      }
      return;
    }

    // Localizar a nota ativa no mapa de partitura
    const notes = this.scoreMap;
    if (notes.length === 0) return;

    const currentMs = currentSec * 1000;

    while (
      this.currentIndex < notes.length - 1 &&
      currentMs >= notes[this.currentIndex].endTimeMs
    ) {
      this.currentIndex++;
    }

    while (
      this.currentIndex > 0 &&
      currentMs < notes[this.currentIndex].startTimeMs
    ) {
      this.currentIndex--;
    }

    if (this.lastJumpedIndex !== this.currentIndex) {
      this.lastJumpedIndex = this.currentIndex;
      this.jumpToStep(this.currentIndex);
    }
  }

  getTotalDurationSec() {
    if (this.scoreMap.length > 0) {
      const lastNote = this.scoreMap[this.scoreMap.length - 1];
      return lastNote.endTimeMs / 1000;
    }
    if (this.audioElement && this.audioElement.duration) {
      return this.audioElement.duration;
    }
    return 60;
  }

  scrollToCursorSafely() {
    if (!this.osmd || !this.osmd.cursor || !this.osmd.cursor.cursorElement) return;

    try {
      const cursorEl = this.osmd.cursor.cursorElement;
      const container = cursorEl.closest('.osmd-scroll-container') || cursorEl.closest('#osmd-container') || cursorEl.parentElement;
      if (!container) return;

      const headerEl = document.querySelector('.reader-top-header') || document.querySelector('.screen-header');
      const headerHeight = headerEl ? headerEl.offsetHeight : 0;
      const safeTopPadding = headerHeight + 24;

      const cursorRect = cursorEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const relativeCursorTop = cursorRect.top - containerRect.top + container.scrollTop;

      const currentScroll = container.scrollTop;
      const visibleTopBoundary = currentScroll + safeTopPadding;
      const visibleBottomBoundary = currentScroll + containerRect.height - 80;

      if (relativeCursorTop < visibleTopBoundary) {
        const targetScroll = Math.max(0, relativeCursorTop - safeTopPadding);
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      } else if (relativeCursorTop > visibleBottomBoundary) {
        const targetScroll = relativeCursorTop - safeTopPadding - 30;
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    } catch (err) {
      console.warn('Erro na rolagem automática da partitura:', err);
    }
  }

  jumpToStep(targetIndex) {
    if (!this.osmd || !this.osmd.cursor) return;
    const cursor = this.osmd.cursor;

    try {
      cursor.reset();
      for (let i = 0; i < targetIndex; i++) {
        if (cursor.Iterator.EndReached) break;
        cursor.next();
      }
      cursor.show();

      this.scrollToCursorSafely();

      const activeNote = this.scoreMap[targetIndex];
      if (activeNote && this.onNoteChangeCallback) {
        this.onNoteChangeCallback(activeNote, targetIndex);
      }
    } catch (e) {
      console.warn('Erro ao posicionar cursor:', e);
    }
  }
}
