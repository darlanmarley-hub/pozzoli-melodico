import { CountInEngine } from './CountInEngine';

/**
 * Audio-Driven Synchronization & Master Clock Engine para Pozzoli Melódico
 * 
 * Estados Suportados:
 * "idle" | "preparing" | "count-in" | "playing" | "paused" | "stopped" | "finished" | "error"
 */
export class AudioSyncEngine {
  constructor(audioElement = null, osmdInstance = null, originalBpm = 90, syncConfig = null) {
    this.audioElement = audioElement;
    this.osmd = osmdInstance;
    this.originalBpm = originalBpm;
    this.currentBpm = originalBpm;
    this.syncConfig = syncConfig;

    this.playbackPhase = 'idle'; 
    this.countInEngine = new CountInEngine();
    this.countInBeats = syncConfig?.countInBeats || 4;
    this.audioOffsetSec = syncConfig?.audioOffset || 0;

    this.timeSignature = '4/4';
    this.scoreMap = [];
    this.musicalNotesData = []; // Estrutura intermediária legível para análise musical
    this.currentIndex = 0;
    this.animFrameId = null;

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
   * Interpola o tempo exato em áudio (em milissegundos) a partir de syncPoints em JSON
   */
  getAudioTimeForMeasureBeat(measureNumber, beatInMeasure = 1) {
    if (!this.syncConfig || !this.syncConfig.syncPoints || this.syncConfig.syncPoints.length === 0) {
      return null;
    }

    const points = this.syncConfig.syncPoints;
    const beatsPerMeasure = parseInt(this.timeSignature.split('/')[0]) || 4;

    const targetAbsBeat = (measureNumber - 1) * beatsPerMeasure + (beatInMeasure - 1);

    const mapped = points.map((p) => ({
      absBeat: (p.measure - 1) * beatsPerMeasure + (p.beat - 1),
      timeMs: p.audioTime * 1000
    })).sort((a, b) => a.absBeat - b.absBeat);

    if (targetAbsBeat <= mapped[0].absBeat) {
      const diffBeats = mapped[0].absBeat - targetAbsBeat;
      const msPerBeat = (60.0 / Math.max(30, this.originalBpm)) * 1000;
      return Math.max(0, mapped[0].timeMs - diffBeats * msPerBeat);
    }

    if (targetAbsBeat >= mapped[mapped.length - 1].absBeat) {
      const last = mapped[mapped.length - 1];
      const diffBeats = targetAbsBeat - last.absBeat;
      const msPerBeat = (60.0 / Math.max(30, this.originalBpm)) * 1000;
      return last.timeMs + diffBeats * msPerBeat;
    }

    for (let i = 0; i < mapped.length - 1; i++) {
      const p1 = mapped[i];
      const p2 = mapped[i + 1];
      if (targetAbsBeat >= p1.absBeat && targetAbsBeat <= p2.absBeat) {
        const ratio = (targetAbsBeat - p1.absBeat) / (p2.absBeat - p1.absBeat || 1);
        return p1.timeMs + ratio * (p2.timeMs - p1.timeMs);
      }
    }

    return null;
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

      // Extrair Fórmula de Compasso
      if (this.osmd.Sheet && this.osmd.Sheet.SourceMeasures && this.osmd.Sheet.SourceMeasures.length > 0) {
        const firstMeasure = this.osmd.Sheet.SourceMeasures[0];
        if (firstMeasure.duration) {
          const num = firstMeasure.duration.Numerator || 4;
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
              
              const midi = halfTone + 60; // C4 = 60
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

        const syncStartTimeMs = this.getAudioTimeForMeasureBeat(measureNumber, beatInMeasure);

        let startTimeMs = cumulativeTimeMs;
        let durationMs = durationQuarters * msPerQuarterAtOriginalBpm;

        if (syncStartTimeMs !== null) {
          startTimeMs = syncStartTimeMs;
        }

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

        // Estrutura Intermediária Específica
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
   * Dispara a reprodução direta do áudio do vídeo Pozzoli
   */
  play() {
    if (!this.audioElement) return;
    this.setBpm(this.currentBpm);
    this.startMusicalAudioPlayback();
  }

  startMusicalAudioPlayback() {
    if (!this.audioElement) return;

    this.setPhase('playing');
    this.audioElement.play()
      .then(() => {
        this.startSyncLoop();
      })
      .catch((err) => {
        console.warn('Erro ao reproduzir áudio musical:', err);
        this.setPhase('error');
        if (this.onErrorCallback) {
          this.onErrorCallback(`O navegador bloqueou ou falhou ao reproduzir o áudio: ${err.message}`);
        }
      });
  }

  pause() {
    this.countInEngine.stop();
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopSyncLoop();
    this.setPhase('paused');
  }

  resume() {
    if (this.playbackPhase === 'paused') {
      this.startMusicalAudioPlayback();
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
    this.stopSyncLoop();
    this.setPhase('stopped');
    this.jumpToStep(0);
  }

  restart() {
    this.stop();
    this.play();
  }

  seek(seconds) {
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(0, seconds);
    }
    this.syncCursorToAudioTime();
  }

  startSyncLoop() {
    this.stopSyncLoop();
    const loop = () => {
      if (this.playbackPhase !== 'playing') return;
      this.syncCursorToAudioTime();
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
   * Atualização contínua do cursor em tempo real baseada na posição do áudio mestre
   */
  syncCursorToAudioTime() {
    if (!this.audioElement || this.scoreMap.length === 0) return;

    const audioSec = this.audioElement.currentTime;
    const duration = this.audioElement.duration || 1;
    const speedRatio = this.audioElement.playbackRate || (this.currentBpm / this.originalBpm);

    if (this.onProgressCallback) {
      this.onProgressCallback(audioSec, audioSec / duration);
    }

    // Suporte ao modo Loop por compassos/trecho
    if (this.isLoopActive && this.loopEndMeasure) {
      const endNote = this.scoreMap.find(n => n.measureNumber > this.loopEndMeasure);
      if (endNote && audioSec * speedRatio >= endNote.startTimeMs / 1000) {
        const startNote = this.scoreMap.find(n => n.measureNumber >= (this.loopStartMeasure || 1));
        const seekTime = startNote ? (startNote.startTimeMs / 1000) / speedRatio : 0;
        this.seek(seekTime);
        return;
      }
    }

    // Condição de término do áudio
    if (audioSec >= duration && duration > 0) {
      if (this.isLoopActive) {
        this.seek(0);
      } else {
        this.setPhase('finished');
        this.stopSyncLoop();
      }
      return;
    }

    const originalTimeMs = audioSec * speedRatio * 1000;
    const notes = this.scoreMap;

    while (
      this.currentIndex < notes.length - 1 &&
      originalTimeMs >= notes[this.currentIndex].endTimeMs
    ) {
      this.currentIndex++;
    }

    while (
      this.currentIndex > 0 &&
      originalTimeMs < notes[this.currentIndex].startTimeMs
    ) {
      this.currentIndex--;
    }

    this.jumpToStep(this.currentIndex);
  }

  scrollToCursorSafely() {
    if (!this.osmd || !this.osmd.cursor || !this.osmd.cursor.cursorElement) return;

    try {
      const cursorEl = this.osmd.cursor.cursorElement;
      const container = cursorEl.closest('.osmd-scroll-container') || cursorEl.closest('#osmd-container') || cursorEl.parentElement;
      if (!container) return;

      // Calcular a altura real de qualquer cabeçalho fixo no topo da tela
      const headerEl = document.querySelector('.reader-top-header') || document.querySelector('.screen-header') || document.querySelector('.glass-panel');
      const headerHeight = headerEl ? headerEl.offsetHeight : 0;
      const safeTopPadding = headerHeight + 24; // Margem de segurança de 24px abaixo do cabeçalho

      const cursorRect = cursorEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const relativeCursorTop = cursorRect.top - containerRect.top + container.scrollTop;

      const currentScroll = container.scrollTop;
      const visibleTopBoundary = currentScroll + safeTopPadding;
      const visibleBottomBoundary = currentScroll + containerRect.height - 80;

      // Se o cursor estiver posicionado acima da área segura visível, rola suavemente
      if (relativeCursorTop < visibleTopBoundary) {
        const targetScroll = Math.max(0, relativeCursorTop - safeTopPadding);
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      } 
      // Se o cursor avançar para a parte inferior
      else if (relativeCursorTop > visibleBottomBoundary) {
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

      // Garantir rolagem segura que nunca esconde a partitura atrás do cabeçalho
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
