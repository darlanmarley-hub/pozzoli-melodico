import { PitchShifter } from 'soundtouchjs';

/**
 * TimeStretchAudioEngine
 * Processador de áudio profissional em Web Audio API utilizando o algoritmo WSOLA (SoundTouchJS).
 * Garante preservação de timbre e afinação cristalina sem distorções ao acelerar ou desacelerar o BPM.
 */
export class TimeStretchAudioEngine {
  constructor(defaultBpm = 90) {
    this.audioCtx = null;
    this.audioBuffer = null;
    this.pitchShifter = null;
    this.defaultBpm = defaultBpm;
    this.currentBpm = defaultBpm;
    
    this.isPlaying = false;
    this.currentTimeSec = 0;
    this.onProgressCallback = null;
    this.onEndedCallback = null;
    this.timerId = null;
    this.audioUrlLoaded = null;
    this.isMuted = false;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Carrega e decodifica o arquivo de áudio (MP3/WAV) para um AudioBuffer na memória
   */
  async loadAudio(audioUrl) {
    if (!audioUrl) return false;
    if (this.audioUrlLoaded === audioUrl && this.audioBuffer) return true;

    this.initContext();

    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.audioUrlLoaded = audioUrl;

      // Recriar o PitchShifter para o novo buffer
      this.setupPitchShifter();
      return true;
    } catch (err) {
      console.warn('Erro ao carregar e decodificar buffer de áudio para TimeStretch:', err);
      return false;
    }
  }

  setupPitchShifter() {
    if (!this.audioCtx || !this.audioBuffer) return;

    if (this.pitchShifter) {
      try {
        this.pitchShifter.disconnect();
      } catch (e) {}
    }

    const bufferSize = 4096;
    this.pitchShifter = new PitchShifter(this.audioCtx, this.audioBuffer, bufferSize);
    
    // Configurar pitch constante (1.0 = afinação original) e tempo relativo ao BPM
    const speedRatio = this.currentBpm / (this.defaultBpm || 90);
    this.pitchShifter.tempo = Math.max(0.3, Math.min(3.0, speedRatio));
    this.pitchShifter.pitch = 1.0; // Preserva a afinação e o timbre 100% original

    // Conectar à saída de áudio
    if (!this.isMuted) {
      this.pitchShifter.connect(this.audioCtx.destination);
    }
  }

  setBpm(bpm, defaultBpm = this.defaultBpm) {
    this.currentBpm = Math.max(30, Math.min(280, bpm));
    this.defaultBpm = defaultBpm || 90;

    const speedRatio = this.currentBpm / this.defaultBpm;

    if (this.pitchShifter) {
      this.pitchShifter.tempo = Math.max(0.3, Math.min(3.0, speedRatio));
      this.pitchShifter.pitch = 1.0; // Preserva o timbre sem efeitos de "esquilo" ou "grave"
    }
  }

  play() {
    this.initContext();
    if (!this.pitchShifter || !this.audioBuffer) return;

    if (this.isPlaying) return;

    this.isPlaying = true;
    this.startTrackingProgress();
  }

  pause() {
    this.isPlaying = false;
    this.stopTrackingProgress();
    if (this.pitchShifter) {
      try {
        this.pitchShifter.disconnect();
      } catch (e) {}
    }
  }

  stop() {
    this.pause();
    this.currentTimeSec = 0;
    if (this.pitchShifter) {
      this.pitchShifter.percentagePlayed = 0;
    }
  }

  seek(seconds) {
    if (!this.audioBuffer || !this.pitchShifter) return;
    const duration = this.audioBuffer.duration || 1;
    const pct = Math.max(0, Math.min(1, seconds / duration));
    this.pitchShifter.percentagePlayed = pct;
    this.currentTimeSec = seconds;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (!this.pitchShifter) return;
    try {
      if (muted) {
        this.pitchShifter.disconnect();
      } else {
        this.pitchShifter.connect(this.audioCtx.destination);
      }
    } catch (e) {}
  }

  startTrackingProgress() {
    this.stopTrackingProgress();
    const update = () => {
      if (!this.isPlaying || !this.pitchShifter || !this.audioBuffer) return;

      const duration = this.audioBuffer.duration || 1;
      this.currentTimeSec = (this.pitchShifter.percentagePlayed || 0) * duration;

      if (this.onProgressCallback) {
        this.onProgressCallback(this.currentTimeSec, duration);
      }

      if (this.currentTimeSec >= duration) {
        this.stop();
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
        return;
      }

      this.timerId = requestAnimationFrame(update);
    };

    this.timerId = requestAnimationFrame(update);
  }

  stopTrackingProgress() {
    if (this.timerId) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }
}

export const timeStretchEngine = new TimeStretchAudioEngine();
