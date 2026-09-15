import React, { useState, useEffect, useRef } from 'react';
import { metronome } from '../utils/audioEngine';
import { Play, Square, Activity } from 'lucide-react';

export default function MetronomeControls({ defaultBpm = 90 }) {
  const [bpm, setBpm] = useState(defaultBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [activeBeat, setActiveBeat] = useState(-1);
  const [soundType, setSoundType] = useState('wood');
  const tapTimesRef = useRef([]);

  useEffect(() => {
    metronome.setOnBeatCallback((beatIndex) => {
      setActiveBeat(beatIndex);
    });
  }, []);

  const handleBpmChange = (newBpm) => {
    const val = Math.max(30, Math.min(280, newBpm));
    setBpm(val);
    metronome.setBpm(val);
  };

  const handleTogglePlay = () => {
    const active = metronome.toggle();
    setIsPlaying(active);
    if (!active) {
      setActiveBeat(-1);
    }
  };

  const handleBeatsChange = (num) => {
    setBeatsPerMeasure(num);
    metronome.setBeatsPerMeasure(num);
  };

  const handleSoundChange = (type) => {
    setSoundType(type);
    metronome.setSoundType(type);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const times = tapTimesRef.current;
    
    // Reset tap times if last tap was > 3 seconds ago
    if (times.length > 0 && now - times[times.length - 1] > 3000) {
      tapTimesRef.current = [];
    }

    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length > 1) {
      // Calculate average interval over last 4 taps
      const recentTaps = tapTimesRef.current.slice(-5);
      let totalInterval = 0;
      for (let i = 1; i < recentTaps.length; i++) {
        totalInterval += recentTaps[i] - recentTaps[i - 1];
      }
      const avgInterval = totalInterval / (recentTaps.length - 1);
      const calculatedBpm = Math.round(60000 / avgInterval);
      handleBpmChange(calculatedBpm);
    }
  };

  return (
    <div className="metronome-card glass-panel">
      <div className="card-title">
        <Activity size={20} color="var(--primary)" />
        <span>Metrônomo Interativo</span>
      </div>

      <div className="bpm-display-box">
        <div className="bpm-number">{bpm}</div>
        <div className="bpm-label">BPM - Andamento</div>

        <div className="beat-indicators">
          {Array.from({ length: beatsPerMeasure }).map((_, idx) => (
            <div
              key={idx}
              className={`beat-dot ${activeBeat === idx ? 'active' : ''} ${activeBeat === 0 && idx === 0 ? 'accent' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="bpm-controls">
        <button className="bpm-btn" onClick={() => handleBpmChange(bpm - 5)}>-5</button>
        <button className="bpm-btn" onClick={() => handleBpmChange(bpm - 1)}>-1</button>
        <input
          type="range"
          className="bpm-slider"
          min={30}
          max={240}
          value={bpm}
          onChange={(e) => handleBpmChange(parseInt(e.target.value))}
        />
        <button className="bpm-btn" onClick={() => handleBpmChange(bpm + 1)}>+1</button>
        <button className="bpm-btn" onClick={() => handleBpmChange(bpm + 5)}>+5</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button className="tap-tempo-btn" onClick={handleTapTempo}>
          👏 Tap Tempo
        </button>

        <select
          value={soundType}
          onChange={(e) => handleSoundChange(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-color)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            padding: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="wood" style={{ background: '#111827' }}>🪵 Bloco de Madeira</option>
          <option value="beep" style={{ background: '#111827' }}>🔔 Beep Sintético</option>
          <option value="hihat" style={{ background: '#111827' }}>🥁 Prato Hi-Hat</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
        {[2, 3, 4, 6].map((num) => (
          <button
            key={num}
            onClick={() => handleBeatsChange(num)}
            style={{
              background: beatsPerMeasure === num ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            {num}/4
          </button>
        ))}
      </div>

      <button
        className={`metronome-toggle-btn ${isPlaying ? 'active' : ''}`}
        onClick={handleTogglePlay}
      >
        {isPlaying ? (
          <>
            <Square size={18} />
            <span>Desativar Metrônomo</span>
          </>
        ) : (
          <>
            <Play size={18} />
            <span>Ativar Metrônomo ({bpm} BPM)</span>
          </>
        )}
      </button>
    </div>
  );
}
