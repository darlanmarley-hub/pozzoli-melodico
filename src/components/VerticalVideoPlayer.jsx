import React, { useRef, useEffect, useState } from 'react';
import { Video, Music, Zap, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { getDirectVideoUrl } from '../utils/storage';

/**
 * VerticalVideoPlayer Component
 * Reproduz o vídeo da 1ª Série do Pozzoli em formato vertical (9:16 portrait) via link direto MP4 (Dropbox / Google Drive).
 * Sincroniza o áudio e vídeo em tempo real com o botão de velocidade (playbackRate) sem sintetizador interno.
 */
export default function VerticalVideoPlayer({
  videoUrl,
  currentSeries,
  bpm = 90,
  isDesktopMode = false,
  syncEngine = null,
  onVideoRef = null,
  onTimeUpdate = null,
  onEnded = null,
  isPlaying = false,
  onTogglePlay = null
}) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const defaultBpm = currentSeries?.defaultBpm || 90;
  const speedRatio = bpm / defaultBpm;

  const pcUrl = currentSeries?.videoPcUrl || currentSeries?.videoUrlPc || 'https://www.dropbox.com/scl/fi/rl01vjkvq4sq1cvld2gpr/serie1-pc.mp4?rlkey=a0uau8q887anbdh0hlgv3qnga&st=sbn05j3n&dl=0';
  const mobileUrl = videoUrl || currentSeries?.videoUrl || 'https://www.dropbox.com/scl/fi/rxev122eb1g94koyxqfef/serie1.mp4?rlkey=hxeihz1dob8bfacmggdncb1an&st=y2ce0vpf&dl=0';
  const rawUrl = isDesktopMode ? pcUrl : mobileUrl;
  const directVideoSrc = getDirectVideoUrl(rawUrl);

  const prevSrcRef = useRef(directVideoSrc);

  useEffect(() => {
    if (prevSrcRef.current !== directVideoSrc && videoRef.current) {
      const currentTime = videoRef.current.currentTime || 0;
      const wasPlaying = !videoRef.current.paused;

      videoRef.current.src = directVideoSrc;
      videoRef.current.load();

      const handleCanPlay = () => {
        if (videoRef.current) {
          if (currentTime > 0) {
            try {
              videoRef.current.currentTime = currentTime;
            } catch (e) {}
          }
          if (wasPlaying) {
            videoRef.current.play().catch(console.warn);
          }
        }
      };

      videoRef.current.addEventListener('canplay', handleCanPlay, { once: true });
      prevSrcRef.current = directVideoSrc;
    }
  }, [directVideoSrc]);

  // Expor o elemento vídeo para o AudioSyncEngine
  useEffect(() => {
    if (videoRef.current) {
      if (onVideoRef) onVideoRef(videoRef.current);
      if (syncEngine) syncEngine.setAudioElement(videoRef.current);
    }
  }, [videoRef, syncEngine, onVideoRef]);

  // Atualiza a velocidade do vídeo e do seu áudio sempre que o BPM for alterado
  useEffect(() => {
    if (videoRef.current) {
      const rate = Math.max(0.3, Math.min(3.0, speedRatio));
      videoRef.current.playbackRate = rate;
      videoRef.current.preservesPitch = true;
      if ('webkitPreservesPitch' in videoRef.current) {
        videoRef.current.webkitPreservesPitch = true;
      }
      if ('mozPreservesPitch' in videoRef.current) {
        videoRef.current.mozPreservesPitch = true;
      }
    }

    if (syncEngine) {
      syncEngine.setBpm(bpm);
    }
  }, [bpm, speedRatio, syncEngine]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleContainerClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch((e) => console.warn(e));
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className={`vertical-video-wrapper ${isDesktopMode ? 'desktop-mode' : 'mobile-mode'}`}>
      {/* Frame de Vídeo em Formato Celular / Computador (Clique na tela para Tocar/Pausar) */}
      <div
        className={`vertical-video-frame ${isDesktopMode ? 'desktop-mode' : 'mobile-mode'}`}
        onClick={handleContainerClick}
        style={{ cursor: 'pointer', position: 'relative' }}
        title="Toque na tela para Tocar / Pausar"
      >
        {/* Overlay de Ícone Carregando Vídeo */}
        {isVideoLoading && !useIframeFallback && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(11, 16, 29, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              zIndex: 30,
              color: '#ffffff',
              pointerEvents: 'none'
            }}
          >
            <RefreshCw size={36} className="spin-icon" style={{ color: 'var(--accent-orange)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              Carregando exercício
            </span>
          </div>
        )}

        {!useIframeFallback ? (
          <video
            ref={videoRef}
            src={directVideoSrc}
            className="vertical-video-element"
            playsInline
            controls={false}
            preload="auto"
            onLoadStart={() => setIsVideoLoading(true)}
            onWaiting={() => setIsVideoLoading(true)}
            onCanPlay={() => setIsVideoLoading(false)}
            onPlaying={() => setIsVideoLoading(false)}
            onLoadedData={() => setIsVideoLoading(false)}
            onTimeUpdate={() => {
              if (videoRef.current && onTimeUpdate) {
                onTimeUpdate(videoRef.current.currentTime);
              }
            }}
            onEnded={() => {
              if (onEnded) onEnded();
            }}
            onError={() => {
              console.warn('Erro ao carregar vídeo do Dropbox:', directVideoSrc);
              setIsVideoLoading(false);
              setUseIframeFallback(true);
            }}
          />
        ) : (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#ffffff',
              background: '#1a1d24',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              height: '100%',
              minHeight: '300px'
            }}
          >
            <Video size={48} style={{ color: 'var(--accent-orange)' }} />
            <p style={{ fontWeight: 700, margin: 0 }}>Não foi possível carregar o vídeo diretamente.</p>
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#ff6600',
                textDecoration: 'underline',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              Abrir vídeo no Dropbox
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
