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
  loadUserDataFromSupabase,
  verifyCurrentDeviceIsActive,
  getDeviceId
} from './utils/storage';
import { supabase, isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const [authUser, setAuthUser] = useState(() => getAuthUser());
  const [isCreatePasswordUrl, setIsCreatePasswordUrl] = useState(() => {
    try {
      return window.location.pathname.toLowerCase().includes('/criar-senha');
    } catch {
      return false;
    }
  });
  const [allSeries, setAllSeries] = useState(() => {
    const custom = getCustomSeries();
    return [...INITIAL_SERIES, ...custom];
  });

  const [currentSeriesIndex, setCurrentSeriesIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('pozzoli_last_series_idx');
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [studied, setStudied] = useState(() => getStudied());
  const [favorites, setFavorites] = useState(() => getFavorites());
  const [profile, setProfile] = useState(() => getProfile());
  const [stats, setStats] = useState(() => getStats());
  const [bpm, setBpm] = useState(60);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pozzoli_app_theme_v2') || 'modern';
  });
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('pozzoli_last_active_tab');
      return saved || 'library';
    } catch {
      return 'library';
    }
  });
  const [videoElement, setVideoElement] = useState(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [activeNoteInfo, setActiveNoteInfo] = useState(null);

  // Lembra a última série e aba acessadas para retornar ao mesmo ponto ao reconectar
  useEffect(() => {
    try {
      localStorage.setItem('pozzoli_last_series_idx', String(currentSeriesIndex));
    } catch {
      // ignore
    }
  }, [currentSeriesIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('pozzoli_last_active_tab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  // Apply theme to document body and root
  useEffect(() => {
    document.body.classList.remove('theme-modern', 'theme-baroque');
    document.body.classList.add(`theme-${theme}`);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pozzoli_app_theme_v2', theme);
  }, [theme]);

  // Escuta sessão do Supabase Auth e sincroniza dados da nuvem
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const kickToLogin = async (reasonText, replacedBy = 'outro dispositivo') => {
      try {
        if (reasonText) {
          sessionStorage.setItem('pozzoli_kicked_reason', reasonText);
        }
      } catch {
        // ignore
      }
      await clearAuthUser(false, replacedBy);
      setAuthUser(null);
    };

    const hydrateFromSession = async (session) => {
      if (!session?.user) return;
      // Só hidrata automaticamente se o usuário já concluiu o login neste aparelho
      if (!getAuthUser()) return;

      const sbUser = session.user;

      // 1. Verifica se a compra foi reembolsada ou se outro dispositivo assumiu a sessão
      const deviceCheck = await verifyCurrentDeviceIsActive(sbUser.id);
      if (!deviceCheck.isValid) {
        if (deviceCheck.isRevoked) {
          try {
            sessionStorage.setItem(
              'pozzoli_kicked_reason',
              'O acesso desta compra foi encerrado devido ao reembolso ou cancelamento.'
            );
          } catch {
            // ignore
          }
          await clearAuthUser(true);
          setAuthUser(null);
          return;
        }
        await kickToLogin(
          null,
          deviceCheck.replacedBy
        );
        return;
      }

      // 2. Valida se o plano do usuário continua ativo na rota protegida
      const { data: userPlano } = await supabase
        .from('users_plano')
        .select('id, status, data_final')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (
        userPlano?.status === 'cancelado' ||
        (userPlano?.data_final && new Date(userPlano.data_final) < new Date())
      ) {
        try {
          sessionStorage.setItem(
            'pozzoli_kicked_reason',
            userPlano?.status === 'cancelado'
              ? 'O acesso desta compra foi encerrado devido ao reembolso ou cancelamento.'
              : 'Seu plano anual expirou. Renove sua assinatura para continuar acessando.'
          );
        } catch {
          // ignore
        }
        await clearAuthUser(true);
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
      if (session?.user && navigator.onLine) {
        hydrateFromSession(session);
      }
      // Se estiver offline ou sem sessão temporária da rede, mantém o usuário logado localmente
      // para que ele nunca seja desconectado ao estudar os exercícios salvos em modo offline.
    }).catch(() => {
      // Ignora falhas de rede quando offline e mantém o authUser local intacto
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Se estiver offline, nunca desconecta o usuário automaticamente
      if (!navigator.onLine) return;
      if (session?.user && getAuthUser()) {
        hydrateFromSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Monitoramento em tempo real de Sessão Única (desconecta se entrar em outro aparelho)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !authUser?.id) return;

    let isCancelled = false;

    const checkSessionLock = async () => {
      if (isCancelled || !navigator.onLine) return;
      const result = await verifyCurrentDeviceIsActive(authUser.id);
      if (!isCancelled && navigator.onLine && !result.isValid) {
        if (syncEngineRef.current) {
          try {
            syncEngineRef.current.stop();
          } catch {
            // ignore
          }
        }
        if (result.isRevoked) {
          try {
            sessionStorage.setItem(
              'pozzoli_kicked_reason',
              'O acesso desta compra foi encerrado devido ao reembolso ou cancelamento.'
            );
          } catch {
            // ignore
          }
          await clearAuthUser(true);
          setAuthUser(null);
          return;
        }
        await clearAuthUser(false, result.replacedBy);
        setAuthUser(null);
      }
    };

    // Verifica e registra imediatamente ao abrir o app
    checkSessionLock();

    // Escuta em tempo real qualquer atualização na linha do usuário em public.profiles
    const channel = supabase
      .channel(`single_device_${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${authUser.id}`
        },
        (payload) => {
          const newDevice = payload?.new?.stats?.activeDeviceSession;
          const isRevokedNow =
            payload?.new?.plan === 'cancelado' || payload?.new?.stats?.accessRevoked === true;
          if (isRevokedNow || (newDevice?.deviceId && newDevice.deviceId !== getDeviceId())) {
            checkSessionLock();
          }
        }
      )
      .subscribe();

    const intervalId = setInterval(checkSessionLock, 1500);
    const handleFocus = () => checkSessionLock();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

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

  if (!authUser || isCreatePasswordUrl) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setIsCreatePasswordUrl(false);
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
            onBpmChange={(newBpm) => setBpm(newBpm)}
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
