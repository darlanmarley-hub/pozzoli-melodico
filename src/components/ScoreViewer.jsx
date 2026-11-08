import React, { useEffect, useRef, useState, useCallback } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { extractMusicXml } from '../utils/xmlExtractor';
import { AlertCircle, RefreshCw, Zap, Music, Timer, ZoomIn, ZoomOut, Maximize2, ExternalLink, Code, Video } from 'lucide-react';
import VerticalVideoPlayer from './VerticalVideoPlayer';

/**
 * ScoreViewer / MusicXMLViewer Component
 * Renderiza partituras com suporte a Vídeo Vertical (Pozzoli 1ª Série), Embeds de Iframe (Soundslice) ou renderização vetorial SVG via OpenSheetMusicDisplay.
 */
export function MusicXMLViewer({
  scoreUrl,
  mxlUrl,
  videoUrl,
  currentSeries,
  embedUrl = 'https://www.soundslice.com/slices/2gm7c/embed/',
  width,
  height,
  zoom = 1.0,
  isDesktopMode = false,
  syncEngine = null,
  activeNoteInfo = null,
  currentBpm = 90,
  playbackPhase = 'idle',
  countInTick = null,
  isMenuVisible = true,
  onToggleMenu = null,
  highlightCurrentMeasure = true,
  onVideoRef = null,
  onTimeUpdate = null,
  isPlaying = false,
  onTogglePlay = null,
  playerControls = null
}) {
  const targetUrl = scoreUrl || mxlUrl;
  const activeEmbedUrl = embedUrl || 'https://www.soundslice.com/slices/2gm7c/embed/';

  const containerRef = useRef(null);
  const osmdRef = useRef(null);
  const isDesktop = currentSeries?.isDesktopMode || isDesktopMode;

  // Estado de modo de visualização: 'video' (Vídeo Vertical Pozzoli), 'embed' (Soundslice iframe) ou 'osmd' (MusicXML SVG)
  const [viewMode, setViewMode] = useState('video');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(zoom);

  useEffect(() => {
    if (zoom && zoom !== zoomLevel) {
      setZoomLevel(zoom);
    }
  }, [zoom]);

  // Inicializar OSMD quando o container da partitura estiver ativo
  const initAndRenderScore = useCallback(async () => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const xmlString = await extractMusicXml(targetUrl);

      requestAnimationFrame(async () => {
        if (!containerRef.current) return;
        
        containerRef.current.innerHTML = '';

        try {
          const osmd = new OpenSheetMusicDisplay(containerRef.current, {
            autoResize: true,
            drawTitle: true,
            drawSubtitle: false,
            drawComposer: false,
            drawCredits: false,
            drawPartNames: false,
            drawFingerings: false,
            drawMetronomeMark: true,
            drawingParameters: 'compact',
            renderSingleHorizontalStaffline: false,
            followCursor: true,
            cursorsOptions: [
              {
                type: 0,
                color: '#ff6600',
                alpha: 0.75,
                follow: true
              }
            ]
          });

          osmdRef.current = osmd;

          await osmd.load(xmlString);

          const baseZoom = isDesktop ? 1.15 : 0.85;
          osmd.zoom = baseZoom * zoomLevel;

          osmd.render();

          if (osmd.cursor) {
            osmd.cursor.show();
          }

          if (syncEngine) {
            syncEngine.setOsmdInstance(osmd);
          }

          setLoading(false);
        } catch (renderErr) {
          console.warn('Erro de renderização OSMD:', renderErr);
          setError(`Falha ao renderizar a partitura em SVG: ${renderErr.message}`);
          setLoading(false);
        }
      });
    } catch (err) {
      console.warn('Erro ao extrair arquivo de partitura:', err);
      setError(`Falha ao carregar arquivo de partitura: ${err.message}`);
      setLoading(false);
    }
  }, [targetUrl, isDesktop, syncEngine, zoomLevel]);

  useEffect(() => {
    initAndRenderScore();

    return () => {
      if (osmdRef.current) {
        try {
          osmdRef.current.clear();
        } catch (e) {}
      }
    };
  }, [initAndRenderScore]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, parseFloat((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.4, parseFloat((prev - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentSeries]);

  // Formata o título e a série de forma limpa e legível para mobile
  const seriesBadgeText = currentSeries?.seriesTitle || '1ª SÉRIE';
  const rawTitle = currentSeries?.title || 'Exercício Número 1';
  const cleanExerciseTitle = rawTitle
    .replace(/^(Primeira|Segunda|Terceira|Quarta|Quinta|Sexta|Sétima|Oitava|Nona|Décima)\s+Série\s*[-—]\s*/i, '')
    .trim();
  const subtitleText = currentSeries?.isDesktopMode
    ? (currentSeries?.subtitle || 'Formato computador')
    : (currentSeries?.seriesSubtitle || 'Exercícios em intervalos de segunda');

  return (
    <div
      className={`score-view-wrapper ${isDesktop ? 'desktop-mode' : 'mobile-mode'}`}
      style={{
        width: width || '100%',
        height: '100dvh',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Cabeçalho de Destaque no Topo - Com recuo seguro abaixo do relógio/bateria do celular */}
      <div
        className={`reader-top-header ${isMenuVisible ? 'visible' : 'hidden'}`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #1e1610 0%, #120d09 100%)',
          borderBottom: isMenuVisible ? '1.5px solid #d4a34b' : 'none',
          zIndex: 50,
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: isMenuVisible ? '0 4px 18px rgba(0, 0, 0, 0.45)' : 'none',
          opacity: isMenuVisible ? 1 : 0,
          pointerEvents: isMenuVisible ? 'auto' : 'none',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease'
        }}
      >
        <div className="reader-top-header-inner">
          <div className="reader-top-title-row">
            <span className="reader-series-pill">{seriesBadgeText}</span>
            <span className="reader-exercise-title">{cleanExerciseTitle}</span>
          </div>
          <span className="reader-exercise-subtitle">
            {subtitleText}
          </span>
        </div>
      </div>

      {/* Banner de Contagem de Entrada (Lead-In) */}
      {playbackPhase === 'count-in' && countInTick && (
        <div
          style={{
            width: '100%',
            zIndex: 60,
            background: 'linear-gradient(90deg, #e55c00 0%, #ff6600 100%)',
            color: '#ffffff',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={18} className="spin-icon" />
            <span>CONTAGEM DE ENTRADA (LEAD-IN)</span>
          </div>
          <div
            style={{
              fontSize: '1.1rem',
              background: '#ffffff',
              color: '#e55c00',
              padding: '2px 12px',
              borderRadius: '20px',
              fontWeight: 800
            }}
          >
            {countInTick.currentBeat} / {countInTick.totalBeats}
          </div>
        </div>
      )}

      {/* Conteúdo do Leitor com Fundo Branco (Abaixo do Texto do Topo) */}
      <div
        className={`reader-video-stage ${isDesktop ? 'desktop-stage' : 'mobile-stage'} ${isMenuVisible ? 'menu-open' : 'menu-closed'}`}
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          overflow: 'hidden'
        }}
      >
        <VerticalVideoPlayer
          videoUrl={videoUrl || currentSeries?.videoUrl}
          currentSeries={currentSeries}
          bpm={currentBpm}
          isDesktopMode={isDesktopMode}
          syncEngine={syncEngine}
          onVideoRef={onVideoRef}
          onTimeUpdate={onTimeUpdate}
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onToggleMenu={onToggleMenu}
          playerControls={playerControls}
        />
      </div>
    </div>
  );
}

export default MusicXMLViewer;
