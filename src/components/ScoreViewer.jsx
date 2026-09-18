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
  highlightCurrentMeasure = true,
  onVideoRef = null,
  onTimeUpdate = null,
  isPlaying = false,
  onTogglePlay = null
}) {
  const targetUrl = scoreUrl || mxlUrl;
  const activeEmbedUrl = embedUrl || 'https://www.soundslice.com/slices/2gm7c/embed/';

  const containerRef = useRef(null);
  const osmdRef = useRef(null);
  
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

          const baseZoom = isDesktopMode ? 1.15 : 0.85;
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
          console.error('Erro de renderização OSMD:', renderErr);
          setError(`Falha ao renderizar a partitura em SVG: ${renderErr.message}`);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Erro ao extrair arquivo de partitura:', err);
      setError(`Falha ao carregar arquivo de partitura: ${err.message}`);
      setLoading(false);
    }
  }, [targetUrl, isDesktopMode, syncEngine, zoomLevel]);

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

  return (
    <div
      className={`score-view-wrapper ${isDesktopMode ? 'desktop-mode' : 'mobile-mode'}`}
      style={{
        width: width || '100%',
        height: 'calc(100vh - 175px)',
        minHeight: 'calc(100vh - 175px)',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Cabeçalho de Destaque no Topo */}
      <div
        className="reader-top-header"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 16px',
          background: 'rgba(19, 25, 39, 0.98)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-orange)',
          zIndex: 50,
          flexShrink: 0,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
        }}
      >
        <span
          style={{
            fontSize: '1.05rem',
            fontWeight: 900,
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(135deg, #ffffff 40%, #ff944d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1px',
            textAlign: 'center',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <span>POZZOLI MELÓDICO</span>
          <span>1ª SÉRIE</span>
        </span>
      </div>

      {/* Banner de Contagem de Entrada (Lead-In) */}
      {playbackPhase === 'count-in' && countInTick && (
        <div
          style={{
            position: 'relative',
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

      {/* Conteúdo do Leitor com Fundo em Modo Desktop/Mobile */}
      <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', background: '#000000', overflow: 'hidden' }}>
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
        />
      </div>
    </div>
  );
}

export default MusicXMLViewer;
