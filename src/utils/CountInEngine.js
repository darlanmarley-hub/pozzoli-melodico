/**
 * CountInEngine para Pozzoli Melódico
 * Gerencia os pulsos de contagem inicial (1-2 para 2/4, 1-2-3 para 3/4, 1-2-3-4 para 4/4, etc.)
 * utilizando agendamento de alta precisão na Web Audio API.
 * 
 * REGRA RIGOROSA:
 * Todos os cliques da contagem possuem:
 * - Mesmo timbre (onda senoidal pura)
 * - Mesmo volume (gain 0.8)
 * - Mesma frequência (1000 Hz)
 * - Nenhuma acentuação ou tempo forte no pulso 1
 * - Nenhuma alteração de velocity
 */
export class CountInEngine {
  constructor(audioCtx = null) {
    this.audioCtx = audioCtx;
    this.timerId = null;
    this.isPlaying = false;
    this.currentBeat = 0;
    this.totalBeats = 4;
    this.bpm = 90;
    this.onTickCallback = null;
    this.onCompleteCallback = null;
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Calcula quantos tempos de contagem executar com base na fórmula de compasso
   * @param {string|object} timeSig - ex: "2/4", "3/4", "4/4", "6/8"
   */
  static getCountBeatsFromTimeSig(timeSig) {
    let num = 4;
    let den = 4;

    if (typeof timeSig === 'string') {
      const parts = timeSig.split('/');
      if (parts.length === 2) {
        num = parseInt(parts[0], 10) || 4;
        den = parseInt(parts[1], 10) || 4;
      }
    } else if (timeSig && typeof timeSig === 'object') {
      num = timeSig.numerator || 4;
      den = timeSig.denominator || 4;
    }

    if (num === 6 && den === 8) {
      return { totalBeats: 6, num, den, isCompound: true };
    }

    return { totalBeats: Math.max(2, Math.min(8, num)), num, den, isCompound: false };
  }

  startCountIn({ timeSignature = '4/4', bpm = 90, onTick, onComplete }) {
    this.initAudioContext();
    this.stop();

    this.bpm = Math.max(30, Math.min(280, bpm));
    const parsed = CountInEngine.getCountBeatsFromTimeSig(timeSignature);
    this.totalBeats = parsed.totalBeats;

    this.onTickCallback = onTick;
    this.onCompleteCallback = onComplete;

    this.isPlaying = true;
    this.currentBeat = 0;

    const secondsPerBeat = 60.0 / this.bpm;
    const startTime = this.audioCtx.currentTime + 0.05;

    this.scheduleNextBeat(startTime, secondsPerBeat);
  }

  scheduleNextBeat(targetTime, secondsPerBeat) {
    if (!this.isPlaying) return;

    if (this.currentBeat >= this.totalBeats) {
      this.isPlaying = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
      return;
    }

    const beatIndex = this.currentBeat;

    // Sintetizar o clique do metrônomo rigorosamente idêntico em cada pulso
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      // Frequência idêntica para todos os pulsos (1000 Hz sem acentuação)
      osc.frequency.setValueAtTime(1000, targetTime);

      // Volume rigorosamente constante em 0.8
      gain.gain.setValueAtTime(0.8, targetTime);
      gain.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(targetTime);
      osc.stop(targetTime + 0.04);
    } catch (e) {
      console.warn('Erro ao disparar clique de áudio no count-in:', e);
    }

    // Agendar o callback de UI exatamente no momento temporal correto
    const delayMs = Math.max(0, (targetTime - this.audioCtx.currentTime) * 1000);
    this.timerId = setTimeout(() => {
      if (!this.isPlaying) return;
      if (this.onTickCallback) {
        this.onTickCallback(beatIndex + 1, this.totalBeats);
      }

      this.currentBeat++;
      this.scheduleNextBeat(targetTime + secondsPerBeat, secondsPerBeat);
    }, delayMs);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
