import React, { useRef, useEffect, useState } from 'react';
import { Video, Music, Zap, Volume2, VolumeX, RefreshCw, Play } from 'lucide-react';
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
  onTogglePlay = null,
  onToggleMenu = null
}) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const defaultBpm = currentSeries?.defaultBpm || 90;
  const speedRatio = bpm / defaultBpm;

  const isDesktop = currentSeries?.isDesktopMode || isDesktopMode;
  const scale = currentSeries?.videoScale ?? 0.90;
  const translateY = currentSeries?.videoTranslateY ?? '0px';
  const videoTransform = isDesktop
    ? `translateY(${translateY})`
    : `translateY(${translateY}) scale(${scale})`;

  const pcUrl = currentSeries?.videoPcUrl || currentSeries?.videoUrlPc || 'https://www.dropbox.com/scl/fi/yx5razo8j6h0evevubpf5/desktop.mp4?rlkey=zrvdkbyotqwgswjtcowvd50sr&st=225dx2cj&dl=0';
  const mobileUrl = videoUrl || currentSeries?.videoUrl || 'https://www.dropbox.com/scl/fi/rxev122eb1g94koyxqfef/serie1.mp4?rlkey=hxeihz1dob8bfacmggdncb1an&st=u5h136ev&dl=0';
  const rawUrl = isDesktop ? pcUrl : mobileUrl;
  const directVideoSrc = getDirectVideoUrl(rawUrl);

  const prevSrcRef = useRef(directVideoSrc);

  useEffect(() => {
    setIsVideoLoading(true);
    setUseIframeFallback(false);

    if (videoRef.current) {
      if (prevSrcRef.current !== directVideoSrc) {
        videoRef.current.src = directVideoSrc;
        videoRef.current.load();
        try {
          videoRef.current.currentTime = 0;
        } catch (e) {}
        prevSrcRef.current = directVideoSrc;
      }
    }

    const timer = setTimeout(() => {
      setIsVideoLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
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
    if (onToggleMenu) {
      onToggleMenu();
    }
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch((e) => console.warn(e));
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className={`vertical-video-wrapper ${isDesktop ? 'desktop-mode' : 'mobile-mode'}`}>
      {/* Frame de Vídeo em Formato Celular / Computador (Clique na tela para Tocar/Pausar) */}
      <div
        className={`vertical-video-frame ${isDesktop ? 'desktop-mode' : 'mobile-mode'}`}
        onClick={handleContainerClick}
        style={{ cursor: 'pointer', position: 'relative' }}
        title="Toque na tela para Tocar / Pausar"
      >
        {!isDesktop && <div className="desktop-device-notch" />}
        {/* Overlay de Ícone Carregando Vídeo */}
        {isVideoLoading && !useIframeFallback && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(11, 16, 29, 0.88)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              zIndex: 35,
              color: '#ffffff',
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                background: 'rgba(255, 102, 0, 0.15)',
                border: '2px solid var(--accent-orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(255, 102, 0, 0.4)'
              }}
            >
              <RefreshCw size={30} className="spin-icon" style={{ color: 'var(--accent-orange)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.6px', display: 'block', color: '#ffffff' }}>
                Carregando exercício...
              </span>
            </div>
          </div>
        )}



        {!useIframeFallback ? (
          <video
            ref={videoRef}
            src={directVideoSrc}
            className="vertical-video-element"
            style={{ transform: videoTransform, transformOrigin: 'top center', cursor: 'pointer', pointerEvents: 'auto' }}
            playsInline
            controls={false}
            preload="auto"
            onLoadStart={() => setIsVideoLoading(true)}
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
              console.warn('Alternando para player de streaming embutido (iframe):', directVideoSrc);
              setIsVideoLoading(false);
              setUseIframeFallback(true);
            }}
          />
        ) : (
          <iframe
            src={directVideoSrc}
            title={currentSeries?.title || 'Vídeo Pozzoli'}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '350px',
              border: 'none',
              borderRadius: 0,
              background: '#000000'
            }}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
