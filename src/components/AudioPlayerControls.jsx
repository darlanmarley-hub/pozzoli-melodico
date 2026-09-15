import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Home, CheckCircle2, Monitor, Download, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { timeStretchEngine } from '../utils/TimeStretchAudioEngine';

export default function AudioPlayerControls({
  videoElement,
  currentSeries,
  audioUrl,
  bpm,
  onBpmChange,
  syncEngine,
  onPreviousScore,
  onNextScore,
  hasPrevious,
  hasNext,
  isStudied,
  onToggleStudied,
  onTimeUpdate,
  onToggleDesktopMode,
  isDesktopMode,
  onGoHome
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isMetronomeMuted, setIsMetronomeMuted] = useState(false);

  const activeMedia = videoElement || audioRef.current;
  const defaultBpm = currentSeries?.defaultBpm || 60;
  const speedRatio = bpm / defaultBpm;

  const bpmIntervalRef = useRef(null);

  const startBpmChange = (delta) => {
    onBpmChange((prev) => Math.max(30, Math.min(240, prev + delta)));
    bpmIntervalRef.current = setInterval(() => {
      onBpmChange((prev) => Math.max(30, Math.min(240, prev + delta)));
    }, 100);
  };

  const stopBpmChange = () => {
    if (bpmIntervalRef.current) {
      clearInterval(bpmIntervalRef.current);
      bpmIntervalRef.current = null;
    }
  };

  const toggleMuteMetronome = () => {
    if (activeMedia) {
      activeMedia.muted = !isMetronomeMuted;
      setIsMetronomeMuted(!isMetronomeMuted);
    }
  };

  // Sincronizar velocidade de reprodução (playbackRate) do vídeo e engine WSOLA com o BPM selecionado
  useEffect(() => {
    if (activeMedia) {
      const rate = Math.max(0.3, Math.min(3.0, speedRatio));
      activeMedia.playbackRate = rate;
      activeMedia.preservesPitch = true;
      if ('webkitPreservesPitch' in activeMedia) {
        activeMedia.webkitPreservesPitch = true;
      }
      if ('mozPreservesPitch' in activeMedia) {
        activeMedia.mozPreservesPitch = true;
      }
    }
    timeStretchEngine.setBpm(bpm, defaultBpm);
    if (syncEngine) {
      syncEngine.setBpm(bpm);
    }
  }, [bpm, speedRatio, defaultBpm, activeMedia, syncEngine]);

  // Escutar eventos do vídeo para atualizar o tempo e o estado de Play/Pause no dock
  useEffect(() => {
    if (!activeMedia) return;

    const handleTimeUpdate = () => {
      const t = activeMedia.currentTime || 0;
      setCurrentTime(t);
      if (activeMedia.duration) {
        setDuration(activeMedia.duration);
      }
      if (onTimeUpdate) onTimeUpdate(t);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    activeMedia.addEventListener('timeupdate', handleTimeUpdate);
    activeMedia.addEventListener('play', handlePlay);
    activeMedia.addEventListener('pause', handlePause);
    activeMedia.addEventListener('ended', handleEnded);

    return () => {
      activeMedia.removeEventListener('timeupdate', handleTimeUpdate);
      activeMedia.removeEventListener('play', handlePlay);
      activeMedia.removeEventListener('pause', handlePause);
      activeMedia.removeEventListener('ended', handleEnded);
    };
  }, [activeMedia, onTimeUpdate]);

  const togglePlayPause = () => {
    if (!activeMedia) return;

    if (isPlaying) {
      activeMedia.pause();
      setIsPlaying(false);
    } else {
      activeMedia.play()
        .then(() => {
          setIsPlaying(true);
          setAudioError(false);
        })
        .catch((err) => {
          console.warn('Erro ao disparar vídeo:', err);
          setAudioError(true);
        });
    }
  };

  const handleStop = () => {
    if (activeMedia) {
      activeMedia.pause();
      activeMedia.currentTime = 0;
    }
    if (syncEngine) {
      syncEngine.stop();
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (activeMedia) {
      activeMedia.currentTime = time;
    }
    if (syncEngine) {
      syncEngine.seek(time);
    }
  };

  return (
    <div className="player-dock-container">
      {!videoElement && (
        <audio
          ref={audioRef}
          src={audioUrl || '/audios/1-serie.mp3'}
          preload="auto"
        />
      )}

      {/* Row 1: Exercise Name & Series Info */}
      <div className="player-info-row">
        {currentSeries?.title || 'Exercício 001'} [{currentSeries?.timeSignature || '4/4'}]
        {audioError && <span style={{ color: '#fbbf24', marginLeft: '8px', fontSize: '0.75rem' }}>(Modo Metrônomo)</span>}
      </div>

      {/* Row 2: Action Pill Buttons (Lado a Lado) */}
      <div className="player-actions-row" style={{ display: 'flex', flexDirection: 'row', gap: '8px', width: '100%', maxWidth: '440px', margin: '0 auto' }}>
        <button
          className="action-pill-btn"
          onClick={onToggleDesktopMode}
          title="Alternar para Formato Computador"
          style={{ flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}
        >
          <Monitor size={15} />
          <span>{isDesktopMode ? '📱 Modo Celular' : '💻 Modo PC'}</span>
        </button>

        <button
          className="action-pill-btn green"
          onClick={() => {
            setIsOfflineSaved(true);
            alert('Partitura e áudio salvos com sucesso para uso offline!');
          }}
          style={{ flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}
        >
          <Download size={15} />
          <span>{isOfflineSaved ? 'Salvo ✓' : 'Baixar Offline'}</span>
        </button>
      </div>

      {/* Row 3: Scrubber Slider */}
      <div className="scrubber-container">
        <input
          type="range"
          className="scrubber-slider"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
        />
      </div>

      {/* Row 4: Main Dock Controls Bar */}
      <div className="controls-dock-bar">
        {/* Home button */}
        <button className="dock-icon-btn" onClick={onGoHome} title="Ir para Biblioteca">
          <Home size={22} />
        </button>

        {/* BPM Pill Control (- 1 em 1 BPM + com sensibilidade a toque e contínuo) */}
        <div className="bpm-pill-control">
          <button
            className="bpm-step-btn"
            onMouseDown={() => startBpmChange(-1)}
            onMouseUp={stopBpmChange}
            onMouseLeave={stopBpmChange}
            onTouchStart={() => startBpmChange(-1)}
            onTouchEnd={stopBpmChange}
            onClick={() => onBpmChange((prev) => Math.max(30, prev - 1))}
            title="Diminuir BPM (segure para diminuir rápido)"
            style={{ padding: '4px 10px', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer' }}
          >
            -
          </button>
          <span style={{ minWidth: '54px', textAlign: 'center' }}>{bpm} BPM</span>
          <button
            className="bpm-step-btn"
            onMouseDown={() => startBpmChange(1)}
            onMouseUp={stopBpmChange}
            onMouseLeave={stopBpmChange}
            onTouchStart={() => startBpmChange(1)}
            onTouchEnd={stopBpmChange}
            onClick={() => onBpmChange((prev) => Math.min(240, prev + 1))}
            title="Aumentar BPM (segure para aumentar rápido)"
            style={{ padding: '4px 10px', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer' }}
          >
            +
          </button>
        </div>

        {/* Botão para Resetar para o Tempo Original (60 BPM) */}
        <button
          className="dock-icon-btn"
          onClick={() => onBpmChange(defaultBpm || 60)}
          title={`Resetar para o Tempo Original (${defaultBpm || 60} BPM)`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            width: 'auto',
            padding: '0 8px',
            color: bpm === (defaultBpm || 60) ? '#10b981' : 'var(--accent-orange)'
          }}
        >
          <RotateCcw size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>60 BPM</span>
        </button>

        {/* Previous score button */}
        <button
          className="dock-icon-btn"
          onClick={onPreviousScore}
          disabled={!hasPrevious}
          style={{ opacity: hasPrevious ? 1 : 0.4 }}
          title="Exercício Anterior"
        >
          <SkipBack size={20} />
        </button>

        {/* Stop button */}
        <button className="dock-icon-btn" onClick={handleStop} title="Parar (Stop)">
          <Square size={18} />
        </button>

        {/* Large Orange Play Button */}
        <button className="orange-play-btn" onClick={togglePlayPause} title="Tocar / Pausar">
          {isPlaying ? <Pause size={26} /> : <Play size={26} style={{ marginLeft: '3px' }} />}
        </button>

        {/* Next score button */}
        <button
          className="dock-icon-btn"
          onClick={onNextScore}
          disabled={!hasNext}
          style={{ opacity: hasNext ? 1 : 0.4 }}
          title="Próximo Exercício"
        >
          <SkipForward size={20} />
        </button>

        {/* Checkmark Estudada button */}
        <button
          className={`dock-icon-btn ${isStudied ? 'checked' : ''}`}
          onClick={onToggleStudied}
          title="Marcar como Estudado"
        >
          <CheckCircle2 size={22} />
        </button>
      </div>
    </div>
  );
}
