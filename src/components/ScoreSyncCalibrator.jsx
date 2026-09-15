import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Play, Pause, Save, RotateCcw, X, Plus, Trash2, Check } from 'lucide-react';

/**
 * ScoreSyncCalibrator Component
 * Ferramenta de diagnóstico e calibração de alta precisão para sincronização de áudio e partitura.
 */
export default function ScoreSyncCalibrator({
  currentSeries,
  syncEngine,
  audioRef,
  onClose,
  onSaveSyncConfig
}) {
  const [audioTime, setAudioTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(currentSeries?.syncConfig?.bpm || currentSeries?.defaultBpm || 60);
  const [audioOffset, setAudioOffset] = useState(currentSeries?.syncConfig?.audioOffset || 0.0);
  const [syncPoints, setSyncPoints] = useState(currentSeries?.syncConfig?.syncPoints || []);

  const [selectedMeasure, setSelectedMeasure] = useState(1);
  const [selectedBeat, setSelectedBeat] = useState(1);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Animação 60fps para monitorar audioTime real sem relógio paralelo
  useEffect(() => {
    let animId;
    const updateTime = () => {
      if (audioRef && audioRef.current) {
        setAudioTime(audioRef.current.currentTime);
        setIsPlaying(!audioRef.current.paused);
      }
      animId = requestAnimationFrame(updateTime);
    };
    animId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animId);
  }, [audioRef]);

  const togglePlayPause = () => {
    if (!audioRef || !audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const handleAddSyncPoint = () => {
    const currentTimeFixed = parseFloat(audioTime.toFixed(3));
    const newPoints = [...syncPoints.filter(p => !(p.measure === selectedMeasure && p.beat === selectedBeat))];
    newPoints.push({
      measure: selectedMeasure,
      beat: selectedBeat,
      audioTime: currentTimeFixed
    });

    newPoints.sort((a, b) => (a.measure - b.measure) || (a.beat - b.beat));
    setSyncPoints(newPoints);
  };

  const handleRemoveSyncPoint = (index) => {
    const updated = [...syncPoints];
    updated.splice(index, 1);
    setSyncPoints(updated);
  };

  const handleApplyToEngine = () => {
    const config = {
      audioFile: currentSeries?.audioUrl || 'exercicio.mp3',
      bpm,
      countInBeats: currentSeries?.syncConfig?.countInBeats || 4,
      audioOffset,
      syncPoints
    };

    if (syncEngine) {
      syncEngine.setSyncConfig(config);
    }
    if (onSaveSyncConfig) {
      onSaveSyncConfig(config);
    }

    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const jsonExportString = JSON.stringify(
    {
      audioFile: currentSeries?.audioUrl || 'exercicio.mp3',
      bpm,
      countInBeats: 4,
      audioOffset,
      syncPoints
    },
    null,
    2
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 16, 29, 0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        overflowY: 'auto',
        color: '#ffffff',
        fontFamily: 'var(--font-family)'
      }}
    >
      {/* Header do Calibrador */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={24} color="var(--accent-orange)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Ferramenta de Diagnóstico & Calibração de Áudio
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#fff',
            padding: '6px',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Painel Central com Monitor Temporal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Lado Esquerdo: Controles em Tempo Real */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RELÓGIO DE ÁUDIO MESTRE</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
              {audioTime.toFixed(3)}s
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '12px' }}>
              <button
                onClick={togglePlayPause}
                style={{
                  background: 'var(--accent-orange)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pausar Áudio' : 'Tocar Áudio'}
              </button>
            </div>
          </div>

          {/* Ajuste do Offset Inicial (audioOffset) */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Deslocamento Inicial do Áudio (<code style={{ color: 'var(--accent-orange)' }}>audioOffset</code> em segundos):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setAudioOffset(prev => Math.max(0, parseFloat((prev - 0.05).toFixed(3))))}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                -50ms
              </button>
              <input
                type="number"
                step="0.005"
                value={audioOffset}
                onChange={(e) => setAudioOffset(parseFloat(e.target.value) || 0)}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  padding: '8px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}
              />
              <button
                onClick={() => setAudioOffset(prev => parseFloat((prev + 0.05).toFixed(3)))}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                +50ms
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Utilize para compensar o silêncio inicial do arquivo de áudio ou contagem embutida.
            </span>
          </div>

          {/* Adicionar Ponto de Sincronização */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Marcar Ponto de Sincronização (`syncPoint`):</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Compasso:</label>
                <input
                  type="number"
                  min="1"
                  value={selectedMeasure}
                  onChange={(e) => setSelectedMeasure(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', padding: '6px', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tempo/Batida:</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={selectedBeat}
                  onChange={(e) => setSelectedBeat(parseInt(e.target.value, 10) || 1)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', padding: '6px', borderRadius: '6px' }}
                />
              </div>
            </div>

            <button
              onClick={handleAddSyncPoint}
              style={{
                background: 'rgba(255, 102, 0, 0.2)',
                border: '1px solid var(--accent-orange)',
                color: 'var(--accent-orange)',
                padding: '8px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Ancorar Tempo Atual ({audioTime.toFixed(3)}s) no Compasso {selectedMeasure}, Batida {selectedBeat}
            </button>
          </div>
        </div>

        {/* Lado Direito: Tabela de Diagnóstico e Exportação JSON */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tabela de Diagnóstico */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              maxHeight: '260px',
              overflowY: 'auto'
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
              Tabela de Diagnóstico (`AUDIO TIME | COMPASSO | BATIDA`)
            </span>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Compasso</th>
                  <th style={{ padding: '6px' }}>Batida</th>
                  <th style={{ padding: '6px' }}>Tempo do Áudio</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {syncPoints.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhum ponto de sincronização ancorado ainda.
                    </td>
                  </tr>
                ) : (
                  syncPoints.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '6px' }}>{p.measure}</td>
                      <td style={{ padding: '6px' }}>{p.beat}</td>
                      <td style={{ padding: '6px', color: 'var(--accent-orange)', fontWeight: 700 }}>{p.audioTime.toFixed(3)}s</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRemoveSyncPoint(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Área de JSON Exportável */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Configuração JSON Gerada:</span>
              <button
                onClick={handleApplyToEngine}
                style={{
                  background: copiedSuccess ? '#059669' : 'var(--accent-orange)',
                  border: 'none',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copiedSuccess ? <Check size={14} /> : <Save size={14} />}
                {copiedSuccess ? 'Aplicado!' : 'Aplicar ao Player'}
              </button>
            </div>
            <textarea
              readOnly
              rows={6}
              value={jsonExportString}
              style={{
                width: '100%',
                background: '#0b101d',
                border: '1px solid var(--border-color)',
                color: '#34d399',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                padding: '8px',
                borderRadius: '6px',
                resize: 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
