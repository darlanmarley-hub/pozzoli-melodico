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
      className={`score-view-wrapper ${isDesktopMode ? 'desktop-mode' : ''}`}
      style={{
        width: width || '100%',
        height: 'calc(100vh - 175px)',
        minHeight: 'calc(100vh - 175px)',
        background: '#0b101d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Banner de Contagem de Entrada (Lead-In) */}
      {playbackPhase === 'count-in' && countInTick && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 60,
            background: 'linear-gradient(90deg, #e55c00 0%, #ff6600 100%)',
            color: '#ffffff',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '1rem',
            boxShadow: '0 4px 15px rgba(255, 102, 0, 0.4)',
            animation: 'pulse 0.5s infinite alternate'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Timer size={22} className="spin-icon" />
            <span>CONTAGEM DE ENTRADA (LEAD-IN)</span>
          </div>
          <div
            style={{
              fontSize: '1.25rem',
              background: '#ffffff',
              color: '#e55c00',
              padding: '2px 14px',
              borderRadius: '20px',
              fontWeight: 800
            }}
          >
            Pulso: {countInTick.currentBeat} / {countInTick.totalBeats}
          </div>
        </div>
      )}



      {/* MODO VÍDEO VERTICAL: Renderiza apenas o Player de Vídeo em tela cheia */}
      <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '0px', background: '#000000', padding: '0px' }}>
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
