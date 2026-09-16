import React, { useState, useRef, useEffect } from 'react';
import ScoreViewer from './components/ScoreViewer';
import AudioPlayerControls from './components/AudioPlayerControls';
import SeriesLibraryView from './components/SeriesLibraryModal';
import SavedExercisesView from './components/SavedExercisesView';
import ProfileModal from './components/ProfileModal';
import StatsModal from './components/StatsModal';
import BottomNavBar from './components/BottomNavBar';
import { AudioSyncEngine } from './utils/AudioSyncEngine';

import {
  INITIAL_SERIES,
  getFavorites,
  toggleFavorite,
  getStudied,
  toggleStudied,
  getProfile,
  getStats,
  getCustomSeries,
  addCustomSeries
} from './utils/storage';

export default function App() {
  const [allSeries, setAllSeries] = useState(() => {
    const custom = getCustomSeries();
    return [...INITIAL_SERIES, ...custom];
  });

  const [currentSeriesIndex, setCurrentSeriesIndex] = useState(0);
  const [studied, setStudied] = useState(() => getStudied());
  const [favorites, setFavorites] = useState(() => getFavorites());
  const [profile, setProfile] = useState(() => getProfile());
  const [stats, setStats] = useState(() => getStats());
  const [bpm, setBpm] = useState(60);
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [activeTab, setActiveTab] = useState('library'); // 'library', 'saved', 'reader', 'stats', 'profile'
  const [videoElement, setVideoElement] = useState(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [activeNoteInfo, setActiveNoteInfo] = useState(null);

  // Playback Phase state: "idle" | "loading" | "countIn" | "playing" | "paused" | "ended"
  const [playbackPhase, setPlaybackPhase] = useState('idle');
  const [countInTick, setCountInTick] = useState(null);

  const currentSeries = allSeries[currentSeriesIndex] || allSeries[0];
  const isCurrentStudied = studied.includes(currentSeries?.id);

  // High-precision Audio-Driven Sync Engine singleton with Count-In
  const syncEngineRef = useRef(null);
  if (!syncEngineRef.current) {
    syncEngineRef.current = new AudioSyncEngine(null, null, currentSeries?.defaultBpm || 60);
  }

  useEffect(() => {
    if (syncEngineRef.current) {
      syncEngineRef.current.setCallbacks({
        onNoteChange: (note) => setActiveNoteInfo(note),
        onProgress: (timeSec) => setAudioCurrentTime(timeSec),
        onPhaseChange: (phase) => setPlaybackPhase(phase),
        onCountInTick: (currentBeat, totalBeats) => setCountInTick({ currentBeat, totalBeats })
      });
    }
  }, []);

  useEffect(() => {
    if (syncEngineRef.current && currentSeries) {
      syncEngineRef.current.setSyncConfig(currentSeries.syncConfig || null);
    }
  }, [currentSeries]);

  const handlePreviousScore = () => {
    if (currentSeriesIndex > 0) {
      if (syncEngineRef.current) syncEngineRef.current.stop();
      setCurrentSeriesIndex(currentSeriesIndex - 1);
    }
  };

  const handleNextScore = () => {
    if (currentSeriesIndex < allSeries.length - 1) {
      if (syncEngineRef.current) syncEngineRef.current.stop();
      setCurrentSeriesIndex(currentSeriesIndex + 1);
    }
  };

  const handleToggleFavorite = (seriesOrExerciseId) => {
    const updated = toggleFavorite(seriesOrExerciseId);
    setFavorites([...updated]);
  };

  const handleToggleStudiedCurrent = () => {
    if (!currentSeries) return;
    const { studied: updated } = toggleStudied(currentSeries.id);
    setStudied([...updated]);
    setStats(getStats());
  };

  const handleAddExercise = (newExercise) => {
    const updatedCustom = addCustomSeries(newExercise);
    setAllSeries([...INITIAL_SERIES, ...updatedCustom]);
  };

  return (
    <div className="app-container">
      {/* Tab View: Partitura / Leitura / Player em Formato Vertical */}
      {activeTab === 'reader' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden', background: '#ffffff' }}>
          <ScoreViewer
            mxlUrl={currentSeries.mxlUrl}
            videoUrl={currentSeries.videoUrl}
            currentSeries={currentSeries}
            isDesktopMode={isDesktopMode}
            syncEngine={syncEngineRef.current}
            activeNoteInfo={activeNoteInfo}
            currentBpm={bpm}
            playbackPhase={playbackPhase}
            countInTick={countInTick}
            onVideoRef={(el) => {
              setVideoElement(el);
              if (syncEngineRef.current && el) {
                syncEngineRef.current.setAudioElement(el);
              }
            }}
          />

          {/* Bottom Dock Player */}
          <AudioPlayerControls
            videoElement={videoElement}
            currentSeries={currentSeries}
            audioUrl={currentSeries.audioUrl}
            bpm={bpm}
            syncEngine={syncEngineRef.current}
            playbackPhase={playbackPhase}
            onBpmChange={(newBpm) => setBpm(newBpm)}
            onPreviousScore={handlePreviousScore}
            onNextScore={handleNextScore}
            hasPrevious={currentSeriesIndex > 0}
            hasNext={currentSeriesIndex < allSeries.length - 1}
            isStudied={isCurrentStudied}
            onToggleStudied={handleToggleStudiedCurrent}
            onTimeUpdate={(t) => setAudioCurrentTime(t)}
            onToggleDesktopMode={() => setIsDesktopMode(!isDesktopMode)}
            isDesktopMode={isDesktopMode}
            onGoHome={() => setActiveTab('library')}
          />
        </div>
      )}

      {/* Tab View: Biblioteca / Tela Principal */}
      {activeTab === 'library' && (
        <SeriesLibraryView
          allSeries={allSeries}
          studied={studied}
          favorites={favorites}
          onSelectSeries={(selected) => {
            const idx = allSeries.findIndex((s) => s.id === selected.id);
            if (idx >= 0) setCurrentSeriesIndex(idx);
            setActiveTab('reader');
          }}
          onOpenSaved={() => setActiveTab('saved')}
          onToggleFavorite={handleToggleFavorite}
          onAddExercise={handleAddExercise}
        />
      )}

      {/* Tab View: Exercícios Salvos (Favoritos) */}
      {activeTab === 'saved' && (
        <SavedExercisesView
          allSeries={allSeries}
          favorites={favorites}
          studied={studied}
          onSelectSeries={(selected) => {
            const idx = allSeries.findIndex((s) => s.id === selected.id);
            if (idx >= 0) setCurrentSeriesIndex(idx);
            setActiveTab('reader');
          }}
          onToggleFavorite={handleToggleFavorite}
          onGoBack={() => setActiveTab('library')}
        />
      )}

      {/* Tab View: Estatísticas e Progresso */}
      {activeTab === 'stats' && (
        <div style={{ padding: '16px' }}>
          <StatsModal
            stats={stats}
            studied={studied}
            favorites={favorites}
            allSeries={allSeries}
            onClose={() => setActiveTab('library')}
            onSelectSeries={(selected) => {
              const idx = allSeries.findIndex((s) => s.id === selected.id);
              if (idx >= 0) setCurrentSeriesIndex(idx);
              setActiveTab('reader');
            }}
          />
        </div>
      )}

      {/* Tab View: Perfil */}
      {activeTab === 'profile' && (
        <div style={{ padding: '16px' }}>
          <ProfileModal
            profile={profile}
            onClose={() => setActiveTab('library')}
            onSave={(updated) => setProfile(updated)}
          />
        </div>
      )}

      {/* Floating Orange Bottom Navigation Dock */}
      {activeTab !== 'reader' && (
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      )}
    </div>
  );
}
