import React, { useState, useRef, useEffect } from 'react';
import ScoreViewer from './components/ScoreViewer';
import AudioPlayerControls from './components/AudioPlayerControls';
import SeriesLibraryView from './components/SeriesLibraryModal';
import SavedExercisesView from './components/SavedExercisesView';
import ProfileModal from './components/ProfileModal';
import StatsModal from './components/StatsModal';
import BottomNavBar from './components/BottomNavBar';
import LoginPage from './components/LoginPage';
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
  addCustomSeries,
  getAuthUser,
  saveAuthUser,
  clearAuthUser,
  loadUserDataFromSupabase
} from './utils/storage';
import { supabase, isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const [authUser, setAuthUser] = useState(() => getAuthUser());
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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pozzoli_app_theme') || 'baroque';
  });
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('library'); // 'library', 'saved', 'reader', 'stats', 'profile'
  const [videoElement, setVideoElement] = useState(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [activeNoteInfo, setActiveNoteInfo] = useState(null);

  // Apply theme to document body and root
  useEffect(() => {
    document.body.classList.remove('theme-modern', 'theme-baroque');
    document.body.classList.add(`theme-${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pozzoli_app_theme', theme);
  }, [theme]);

  // Escuta sessão do Supabase Auth e sincroniza dados da nuvem
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const hydrateFromSession = async (session) => {
      if (!session?.user) return;
      const sbUser = session.user;

      // Valida se o plano do usuário continua ativo na rota protegida
      const { data: userPlano } = await supabase
        .from('users_plano')
        .select('id, status, data_final')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (
        userPlano?.status === 'cancelado' ||
        (userPlano?.data_final && new Date(userPlano.data_final) < new Date())
      ) {
        await supabase.auth.signOut();
        clearAuthUser();
        setAuthUser(null);
        return;
      }

      const mappedUser = {
        id: sbUser.id,
        email: sbUser.email,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Estudante',
        provider: sbUser.app_metadata?.provider || 'supabase',
        avatar: sbUser.user_metadata?.avatar_url || '🎵',
        loginTime: new Date().toISOString()
      };
      saveAuthUser(mappedUser);
      setAuthUser(mappedUser);

      const cloudData = await loadUserDataFromSupabase(sbUser.id);
      if (cloudData) {
        setProfile(cloudData.profile);
        setFavorites(cloudData.favorites);
        setStudied(cloudData.studied);
        setStats(cloudData.stats);
        setAllSeries([...INITIAL_SERIES, ...cloudData.customSeries]);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        hydrateFromSession(session);
      } else {
        const stored = getAuthUser();
        if (stored?.provider === 'supabase') {
          clearAuthUser();
          setAuthUser(null);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAuthUser();
        setAuthUser(null);
      } else if (session?.user) {
        hydrateFromSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const handleSelectSeries = (selected) => {
    if (!selected) return;
    if (syncEngineRef.current) syncEngineRef.current.stop();
    const currentList = [...INITIAL_SERIES, ...getCustomSeries()];
    setAllSeries(currentList);
    let idx = currentList.findIndex((s) => s.id === selected.id);
    if (idx < 0) idx = 0;
    setCurrentSeriesIndex(idx);
    setIsMenuVisible(true);
    setActiveTab('reader');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handlePreviousScore = () => {
    if (currentSeriesIndex > 0) {
      if (syncEngineRef.current) syncEngineRef.current.stop();
      setCurrentSeriesIndex(currentSeriesIndex - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleNextScore = () => {
    if (currentSeriesIndex < allSeries.length - 1) {
      if (syncEngineRef.current) syncEngineRef.current.stop();
      setCurrentSeriesIndex(currentSeriesIndex + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
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

  if (!authUser) {
    return (
      <LoginPage 
        onLoginSuccess={(user) => {
          setAuthUser(user);
          setProfile(getProfile());
          setFavorites(getFavorites());
          setStudied(getStudied());
          setStats(getStats());
          setAllSeries([...INITIAL_SERIES, ...getCustomSeries()]);
        }} 
      />
    );
  }

  return (
    <div className={`app-container ${activeTab === 'reader' ? 'reader-active' : ''}`}>
      {/* Tab View: Partitura / Leitura / Player em Formato Vertical */}
      {activeTab === 'reader' && (
        <div 
          className="score-reader-page-bg"
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flex: 1, 
            height: '100dvh', 
            maxHeight: '100dvh',
            overflow: 'hidden', 
            background: '#ffffff', 
            position: 'relative' 
          }}
        >
          <ScoreViewer
            mxlUrl={currentSeries.mxlUrl}
            videoUrl={currentSeries.videoUrl}
            currentSeries={currentSeries}
            isDesktopMode={currentSeries?.isDesktopMode || isDesktopMode}
            syncEngine={syncEngineRef.current}
            activeNoteInfo={activeNoteInfo}
            currentBpm={bpm}
            playbackPhase={playbackPhase}
            countInTick={countInTick}
            isMenuVisible={isMenuVisible}
            onToggleMenu={() => setIsMenuVisible((prev) => !prev)}
            onVideoRef={(el) => {
              setVideoElement(el);
              if (syncEngineRef.current && el) {
                syncEngineRef.current.setAudioElement(el);
              }
            }}
            playerControls={
              <AudioPlayerControls
                theme={theme}
                onThemeChange={(newTheme) => setTheme(newTheme)}
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
                isMenuVisible={isMenuVisible}
                onHideMenu={() => setIsMenuVisible(false)}
                onShowMenu={() => setIsMenuVisible(true)}
              />
            }
          />
        </div>
      )}

      {/* Tab View: Biblioteca / Tela Principal */}
      {activeTab === 'library' && (
        <SeriesLibraryView
          theme={theme}
          onThemeChange={(newTheme) => setTheme(newTheme)}
          allSeries={allSeries}
          studied={studied}
          favorites={favorites}
          onSelectSeries={handleSelectSeries}
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
          onSelectSeries={handleSelectSeries}
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
            onSelectSeries={handleSelectSeries}
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
            onLogout={() => {
              setAuthUser(null);
              setActiveTab('library');
            }}
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
