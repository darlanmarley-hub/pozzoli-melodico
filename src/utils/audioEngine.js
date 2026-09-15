/**
 * Web Audio API Metronome Engine & PozoleMetronomeEngine for Pozzoli Melódico
 */
export class PozoleMetronomeEngine {
  constructor(audioBuffer = null, audioContext = null, originalBpm = 90) {
    this.audioBuffer = audioBuffer;
    this.audioCtx = audioContext;
    this.originalBpm = originalBpm;
    this.currentBpm = originalBpm;

    this.sourceNode = null;
    this.isPlaying = false;
    
    // Controle do Tempo do Metrônomo
    this.nextNoteTime = 0.0; // Próximo pulso no audioCtx.currentTime
    this.currentBeat = 0;    // Em qual compasso/pulso estamos
    this.timerId = null;
    this.lookahead = 25.0;   // Em milissegundos (olha à frente para agendar com precisão)
    this.scheduleAheadTime = 0.1; // Em segundos

    this.beatsPerMeasure = 4;
    this.soundType = 'wood';
    this.onBeatCallback = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  start(bpm = this.currentBpm) {
    this.init();
    if (this.isPlaying) return;

    this.currentBpm = bpm;
    this.isPlaying = true;
    this.currentBeat = 0;

    const rate = this.currentBpm / this.originalBpm;

    // Se houver áudio de fundo carregado, toca com playbackRate ajustado
    if (this.audioBuffer) {
      try {
        this.sourceNode = this.audioCtx.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.playbackRate.value = rate;
        this.sourceNode.connect(this.audioCtx.destination);
        this.sourceNode.start(0);
      } catch (e) {
        console.warn('Erro ao disparar áudio do buffer:', e);
      }
    }

    // Inicializa o relógio mestre do metrônomo
    this.nextNoteTime = this.audioCtx.currentTime;
    this.schedulerLoop();
  }

  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {}
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
    return this.isPlaying;
  }

  setBpm(novoBpm) {
    this.currentBpm = Math.max(30, Math.min(280, novoBpm));
    
    // Atualiza a velocidade em tempo real se o áudio estiver tocando
    if (this.isPlaying && this.sourceNode && this.sourceNode.playbackRate) {
      const rate = this.currentBpm / this.originalBpm;
      this.sourceNode.playbackRate.setValueAtTime(rate, this.audioCtx.currentTime);
    }
  }

  setBeatsPerMeasure(beats) {
    this.beatsPerMeasure = beats;
  }

  setSoundType(type) {
    this.soundType = type;
  }

  setOnBeatCallback(cb) {
    this.onBeatCallback = cb;
  }

  schedulerLoop() {
    if (!this.isPlaying) return;

    // Enquanto houver pulsos para agendar no horizonte de tempo, processe
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.agendarPassoCursor(this.currentBeat, this.nextNoteTime);
      this.avancarProximoPulso();
    }

    this.timerId = setTimeout(() => this.schedulerLoop(), this.lookahead);
  }

  avancarProximoPulso() {
    const segundosPorBatida = 60.0 / this.currentBpm;
    this.nextNoteTime += segundosPorBatida;
    this.currentBeat++;
  }

  agendarPassoCursor(beat, time) {
    const isFirstBeat = beat % (this.beatsPerMeasure || 4) === 0;

    // Síntese sonora da batida do metrônomo (click)
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (this.soundType === 'beep') {
        osc.type = 'sine';
        osc.frequency.value = isFirstBeat ? 1000 : 750;
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.start(time);
        osc.stop(time + 0.05);
      } else {
        // Timbre de madeira (Woodblock)
        osc.type = 'sine';
        osc.frequency.value = isFirstBeat ? 1200 : 800;
        gain.gain.setValueAtTime(0.9, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.start(time);
        osc.stop(time + 0.04);
      }
    } catch (e) {
      // Ignora erro de contexto
    }

    // Agenda visualmente a mudança exata do cursor no tempo certo do áudio
    const tempoAteExecutar = (time - this.audioCtx.currentTime) * 1000;
    setTimeout(() => {
      if (!this.isPlaying) return;
      if (this.onBeatCallback) {
        this.onBeatCallback(beat, isFirstBeat);
      }
      this.moverCursorVisualParaBeat(beat);
    }, Math.max(0, tempoAteExecutar));
  }

  moverCursorVisualParaBeat(beat) {
    const cursor = document.getElementById('cursor-partitura');
    if (cursor) {
      const larguraPasso = 50;
      const posicaoX = (beat % 8) * larguraPasso;
      cursor.style.transform = `translate3d(${posicaoX}px, 0, 0)`;
      cursor.style.display = 'block';
    }
  }
}

// Instância mestre exportada por padrão para compatibilidade com os componentes do React
export const metronome = new PozoleMetronomeEngine();
