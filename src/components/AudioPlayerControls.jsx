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

      {/* Row 1: Action Buttons above Scrubber */}
      <div className="player-actions-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '2px 0' }}>
        <button
          className="action-pill-btn"
          onClick={onToggleDesktopMode}
          title="Alternar para formato computador"
          style={{ padding: '5px 12px', fontSize: '0.75rem' }}
        >
          <Monitor size={14} />
          <span>Versão computador</span>
        </button>

        <button
          className={`action-pill-btn ${isOfflineSaved ? 'green' : ''}`}
          onClick={() => setIsOfflineSaved(!isOfflineSaved)}
          title="Salvar para uso offline"
          style={{ padding: '5px 12px', fontSize: '0.75rem' }}
        >
          <Download size={14} />
          <span>{isOfflineSaved ? 'Baixado ✓' : 'Baixar para offline'}</span>
        </button>
      </div>

      {/* Row 3: Scrubber Slider */}
      <div className="scrubber-container" style={{ padding: '6px 4px' }}>
        <input
          type="range"
          className="scrubber-slider"
          min={0}
          max={duration || 100}
          step={0.001}
          value={currentTime}
          onChange={handleSeek}
          onInput={handleSeek}
        />
      </div>

      {/* Row 4: Main Controls Row */}
      <div className="controls-dock-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
        {/* Combined Home & BPM Control Pill */}
        <div className="bpm-pill-control" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '14px', padding: '4px 10px' }}>
          <button className="dock-icon-btn" onClick={onGoHome} title="Ir para Biblioteca" style={{ width: '28px', height: '28px', padding: 0 }}>
            <Home size={18} />
          </button>

          <button
            className="bpm-step-btn"
            onMouseDown={() => startBpmChange(-1)}
            onMouseUp={stopBpmChange}
            onMouseLeave={stopBpmChange}
            onTouchStart={() => startBpmChange(-1)}
            onTouchEnd={stopBpmChange}
            onClick={() => onBpmChange((prev) => Math.max(30, prev - 1))}
            title="Diminuir BPM (segure para diminuir rápido)"
            style={{ padding: '0 4px', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            -
          </button>

          <span style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{bpm} BPM</span>

          <button
            className="bpm-step-btn"
            onMouseDown={() => startBpmChange(1)}
            onMouseUp={stopBpmChange}
            onMouseLeave={stopBpmChange}
            onTouchStart={() => startBpmChange(1)}
            onTouchEnd={stopBpmChange}
            onClick={() => onBpmChange((prev) => Math.min(240, prev + 1))}
            title="Aumentar BPM (segure para aumentar rápido)"
            style={{ padding: '0 4px', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            +
          </button>
        </div>

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
          <Square size={18} fill="#9ca3af" />
        </button>

        {/* Large Orange Play Button */}
        <button className="orange-play-btn" onClick={togglePlayPause} title="Tocar / Pausar">
          {isPlaying ? <Pause size={24} fill="#ffffff" /> : <Play size={24} fill="#ffffff" style={{ marginLeft: '3px' }} />}
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
          style={{ color: isStudied ? '#10b981' : '#9ca3af' }}
        >
          <CheckCircle2 size={22} />
        </button>
      </div>
    </div>
  );
}
