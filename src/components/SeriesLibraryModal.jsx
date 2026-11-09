import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, Play, Heart, Wifi, ChevronDown, ChevronUp, Trash2, Video, Sparkles, Music, CheckCircle2, Monitor, Smartphone, Download, Share, PlusSquare, MoreVertical, X } from 'lucide-react';
import { SERIES_FOLDERS, isItemStudied, isItemFavorite } from '../utils/storage';

export default function SeriesLibraryView({
  allSeries = [],
  studied = [],
  favorites = [],
  onSelectSeries,
  onToggleFavorite,
  theme = 'baroque',
  onThemeChange = null
}) {
  const [isFavExpanded, setIsFavExpanded] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [deferredPrompt, setDeferredPrompt] = useState(() =>
    typeof window !== 'undefined' ? window.__deferredPwaPrompt : null
  );
  const [showIosModal, setShowIosModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);

  useEffect(() => {
    const syncPrompt = () => {
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt);
      }
    };
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.__deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('pwa-prompt-ready', syncPrompt);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('pwa-prompt-ready', syncPrompt);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleAndroidInstall = async () => {
    const promptEvent = deferredPrompt || window.__deferredPwaPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          window.__deferredPwaPrompt = null;
          setDeferredPrompt(null);
        }
        return;
      } catch (err) {
        console.warn('Falha ao abrir prompt nativo Android:', err);
      }
    }
    setShowAndroidModal(true);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const favCount = favorites.length;
  const savedSeries = allSeries.filter((s) => isItemFavorite(favorites, s));

  return (
    <div className="library-view-container" style={{ paddingTop: '22px', paddingBottom: '30px' }}>
      {/* Cabeçalho Limpo sem Moldura para Mobile */}
      <div
        className="library-top-header"
        style={{
          textAlign: 'center',
          padding: '16px 16px 6px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <h1
          className="library-main-title"
          style={{
            fontSize: '1.48rem',
            fontWeight: 900,
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.5px',
            lineHeight: 1.25,
            margin: 0
          }}
        >
          POZZOLI <span className="melodico-highlight-lib">MELÓDICO</span> NO BOLSO
        </h1>


        <div
          className="wifi-tip-badge"
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.14) 0%, rgba(245, 158, 11, 0.04) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.22)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: '10px',
            color: '#efe6d5',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            padding: '7px 14px 7px 10px',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '9px',
            marginTop: '6px',
            marginBottom: '2px',
            lineHeight: 1.35,
            textAlign: 'left',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)'
          }}
        >
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Wifi size={13} style={{ color: '#fbbf24' }} />
          </span>
          <span>
            Conecte-se ao <strong style={{ color: '#fbbf24', fontWeight: 700 }}>Wi-Fi</strong> para economizar seus dados
          </span>
        </div>

        {/* Título + 2 Botões: Adicionar App na Tela Inicial (Android & iOS) */}
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            marginTop: '16px',
            marginBottom: '14px',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#dfcfbd',
              letterSpacing: '0.02em',
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
            }}
          >
            Instale o App na Tela Inicial
          </span>

          <div
            className="install-app-buttons-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              width: '100%',
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
            }}
          >
          {/* Botão Android */}
          <button
            type="button"
            onClick={handleAndroidInstall}
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.12) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.55)',
              color: '#6ee7b7',
              borderRadius: '12px',
              padding: '9px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(0, 0, 0, 0.25)',
              lineHeight: 1.2,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
            }}
          >
            <Download size={15} style={{ flexShrink: 0, color: '#34d399' }} />
            <span>Baixar App (Android)</span>
          </button>

          {/* Botão iOS (iPhone / iPad) */}
          <button
            type="button"
            onClick={() => setShowIosModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(212, 163, 75, 0.2) 0%, rgba(162, 116, 41, 0.12) 100%)',
              border: '1px solid rgba(212, 163, 75, 0.55)',
              color: '#f3cf88',
              borderRadius: '12px',
              padding: '9px 10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(0, 0, 0, 0.25)',
              lineHeight: 1.2,
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
            }}
          >
            <Smartphone size={15} style={{ flexShrink: 0, color: '#dfb76c' }} />
            <span>Instalar no iPhone (iOS)</span>
          </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 12px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Pasta Accordion: FAVORITOS */}
        <div
          className="accordion-card"
          style={{
            background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, var(--bg-card) 100%)',
            border: '1px solid var(--accent-rose-glow)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 20px rgba(244, 63, 94, 0.15)',
            overflow: 'hidden',
            transition: 'border-color 0.2s ease'
          }}
        >
          {/* Header da Pasta Favoritos */}
          <div
            onClick={() => setIsFavExpanded(!isFavExpanded)}
            style={{
              cursor: 'pointer',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="header-left" style={{ gap: '10px', flex: 1, minWidth: 0 }}>
              <div
                className="icon-badge-box"
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  flexShrink: 0,
                  borderRadius: '12px',
                  background: 'rgba(244, 63, 94, 0.2)',
                  border: '1px solid var(--accent-rose)'
                }}
              >
                <Heart size={20} fill="var(--accent-rose)" style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
              </div>

              <div className="card-title-group" style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  FAVORITOS
                </h3>
                <p className="favorites-folder-subtitle" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontFamily: "'Inter', -apple-system, sans-serif", marginTop: '2px', fontWeight: 500 }}>
                  {favCount === 0 ? 'Nenhum exercício salvo' : `${favCount} exercício(s) salvo(s)`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="folder-count-badge favorites-count-badge"
                style={{
                  background: 'rgba(244, 63, 94, 0.2)',
                  color: 'var(--accent-rose)',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--accent-rose)',
                  minWidth: '22px',
                  height: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {favCount}
              </span>

              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {isFavExpanded ? (
                  <ChevronUp size={20} color="var(--accent-rose)" />
                ) : (
                  <ChevronDown size={20} color="var(--accent-rose)" />
                )}
              </button>
            </div>
          </div>

          {/* Conteúdo Expandido dos Favoritos */}
          {isFavExpanded && (
            <div
              style={{
                padding: '0 12px 12px 12px',
                borderTop: '1px solid rgba(244, 63, 94, 0.25)',
                background: 'rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '10px'
              }}
            >
              {savedSeries.length === 0 ? (
                <div
                  className="empty-favorites-card"
                  style={{
                    textAlign: 'center',
                    padding: '20px 16px',
                    margin: '4px 0',
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px dashed rgba(244, 63, 94, 0.35)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-rose)'
                    }}
                  >
                    <Heart size={20} fill="rgba(244, 63, 94, 0.35)" />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '320px' }}>
                    <span
                      style={{
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        fontFamily: "'Inter', -apple-system, sans-serif"
                      }}
                    >
                      Nenhum exercício salvo ainda
                    </span>
                    <span
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.45,
                        fontFamily: "'Inter', -apple-system, sans-serif"
                      }}
                    >
                      Toque no ícone de coração <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>♡</span> em qualquer exercício para salvá-lo aqui.
                    </span>
                  </div>
                </div>
              ) : (
                savedSeries.map((series) => {
                  const isSeriesStudied = isItemStudied(studied, series);
                  return (
                    <div
                      key={series.id}
                      className={`favorite-row-card ${series.isDesktopMode ? 'desktop-card-highlight' : ''}`}
                      style={{
                        background: series.isDesktopMode
                          ? 'linear-gradient(135deg, #2f3440 0%, #22262f 100%)'
                          : isSeriesStudied
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: series.isDesktopMode
                          ? '1.5px solid rgba(255, 255, 255, 0.45)'
                          : isSeriesStudied
                          ? '1px solid #10b981'
                          : '1px solid var(--accent-rose-glow)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        boxShadow: series.isDesktopMode
                          ? '0 4px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                          : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="exercise-badge-number favorite-badge-number"
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: series.isDesktopMode
                              ? 'rgba(0, 0, 0, 0.35)'
                              : isSeriesStudied
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(244, 63, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: series.isDesktopMode
                              ? '#ffffff'
                              : isSeriesStudied
                              ? '#10b981'
                              : 'var(--accent-rose)',
                            border: series.isDesktopMode
                              ? '1.5px solid #ffffff'
                              : isSeriesStudied
                              ? '1px solid #10b981'
                              : '1px solid var(--accent-rose-glow)',
                            flexShrink: 0
                          }}
                        >
                          {series.isDesktopMode ? (
                            <Monitor size={22} color="#ffffff" />
                          ) : isSeriesStudied ? (
                            <CheckCircle2 size={22} />
                          ) : (
                            <span style={{ fontSize: '1.28rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                              {series.displayOrder > 0 ? series.displayOrder : <Video size={18} />}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="exercise-name" style={{ fontSize: '0.84rem', fontWeight: series.isDesktopMode ? 800 : 700, color: series.isDesktopMode ? '#ffffff' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>
                              {series.isDesktopMode && series.seriesTitle
                                ? `${series.seriesTitle} - ${series.title}`
                                : series.title?.toLowerCase().includes('série')
                                ? series.title
                                : series.seriesTitle
                                ? `${series.seriesTitle} - ${series.title}`
                                : series.title}
                            </span>
                            {isSeriesStudied && (
                              <span className="studied-badge" style={{ background: '#10b981', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                                Estudado ✓
                              </span>
                            )}
                          </div>
                          {series.subtitle && (
                            <div className="exercise-subtitle" style={{ fontSize: '0.76rem', color: series.isDesktopMode ? 'rgba(255, 255, 255, 0.72)' : 'var(--text-muted)', fontFamily: "'Inter', -apple-system, sans-serif", marginTop: '2px', fontWeight: 500 }}>
                              {series.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="heart-toggle-btn"
                          onClick={() => onToggleFavorite && onToggleFavorite(series.id)}
                          title="Remover dos Salvos"
                          style={{ padding: '4px' }}
                        >
                          <Trash2 size={16} color={series.isDesktopMode ? '#ffffff' : '#ef4444'} />
                        </button>

                        <button
                          className="circle-play-btn"
                          onClick={() => onSelectSeries && onSelectSeries(series)}
                          title="Abrir Vídeo"
                          style={{
                            width: '32px',
                            height: '32px',
                            background: isSeriesStudied
                              ? '#10b981'
                              : series.isDesktopMode
                              ? '#ffffff'
                              : 'var(--accent-rose)',
                            color: series.isDesktopMode && !isSeriesStudied ? '#000000' : '#ffffff',
                            border: series.isDesktopMode && !isSeriesStudied ? '1px solid #ffffff' : 'none',
                            boxShadow: isSeriesStudied
                              ? '0 2px 8px rgba(16, 185, 129, 0.4)'
                              : series.isDesktopMode
                              ? '0 2px 12px rgba(255, 255, 255, 0.45)'
                              : '0 2px 8px var(--accent-rose-glow)'
                          }}
                        >
                          <Play
                            size={14}
                            style={{ marginLeft: '1px' }}
                            fill={series.isDesktopMode && !isSeriesStudied ? '#000000' : 'none'}
                            color={series.isDesktopMode && !isSeriesStudied ? '#000000' : '#ffffff'}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* PASTAS DAS SÉRIES (1ª SÉRIE, 2ª SÉRIE, 3ª SÉRIE) */}
        {SERIES_FOLDERS.map((folder) => {
          const isExpanded = !!expandedFolders[folder.id];
          const folderExercises = folder.exercises || [];
          const completedCount = folderExercises.filter((ex) => isItemStudied(studied, ex)).length;
          const isFolderComplete = folderExercises.length > 0 && completedCount === folderExercises.length;

          return (
            <div
              key={folder.id}
              className={`accordion-card ${isFolderComplete ? 'folder-completed' : ''}`}
              style={{
                background: 'var(--bg-card)',
                border: isFolderComplete ? '2px solid #10b981' : '1px solid var(--border-orange)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease'
              }}
            >
              {/* Header da Pasta da Série */}
              <div
                onClick={() => toggleFolder(folder.id)}
                style={{
                  cursor: 'pointer',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isFolderComplete
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(19, 25, 39, 0.95) 100%)'
                    : 'transparent'
                }}
              >
                <div className="header-left" style={{ gap: '12px', flex: 1, minWidth: 0 }}>
                  <div
                    className="icon-badge-box"
                    style={{
                      width: '44px',
                      height: '44px',
                      minWidth: '44px',
                      minHeight: '44px',
                      flexShrink: 0,
                      borderRadius: '12px',
                      background: isFolderComplete ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 102, 0, 0.2)',
                      border: isFolderComplete ? '1px solid #10b981' : '1px solid var(--accent-orange)'
                    }}
                  >
                    {isExpanded ? (
                      <FolderOpen size={22} style={{ color: isFolderComplete ? '#10b981' : 'var(--accent-orange)', flexShrink: 0 }} />
                    ) : (
                      <Folder size={22} style={{ color: isFolderComplete ? '#10b981' : 'var(--accent-orange)', flexShrink: 0 }} />
                    )}
                  </div>

                  <div className="card-title-group" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: "'Inter', -apple-system, sans-serif", letterSpacing: '0.2px' }}>
                        {folder.title.toUpperCase()}
                      </h3>
                      {isFolderComplete && (
                        <span
                          className="status-badge-complete"
                          style={{
                            background: '#10b981',
                            color: '#ffffff',
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontFamily: "'Inter', -apple-system, sans-serif"
                          }}
                        >
                          Concluído ✓
                        </span>
                      )}
                    </div>
                    {folder.subtitle && (
                      <p className="series-folder-subtitle" style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontFamily: "'Inter', -apple-system, sans-serif", margin: '3px 0 0 0', fontWeight: 500 }}>
                        {folder.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span
                    className="folder-count-badge"
                    style={{
                      background: isFolderComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 102, 0, 0.15)',
                      color: isFolderComplete ? '#10b981' : 'var(--accent-orange)',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      padding: '3px 10px',
                      borderRadius: '10px',
                      border: isFolderComplete ? '1px solid #10b981' : '1px solid rgba(255, 102, 0, 0.4)'
                    }}
                  >
                    {completedCount}/{folderExercises.length}
                  </span>

                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp size={20} color="var(--accent-orange)" />
                    ) : (
                      <ChevronDown size={20} color="var(--accent-orange)" />
                    )}
                  </button>
                </div>
              </div>

              {/* Exercícios contidos dentro desta Série (Folder Content) */}
              {isExpanded && (
                <div
                  style={{
                    padding: '10px 12px 14px 12px',
                    borderTop: '1px solid var(--border-color)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {folderExercises.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 12px', color: 'var(--text-muted)', fontSize: '1.02rem', lineHeight: 1.45 }}>
                      Em breve novos exercícios serão adicionados a esta série.
                    </div>
                  ) : (
                    folderExercises.map((exercise) => {
                      const isExStudied = isItemStudied(studied, exercise);
                      const isExFav = isItemFavorite(favorites, exercise);

                      return (
                        <div
                          key={exercise.id}
                          className={`exercise-row-card ${exercise.isDesktopMode ? 'desktop-card-highlight' : ''}`}
                          onClick={() => onSelectSeries && onSelectSeries(exercise)}
                          style={{
                            cursor: 'pointer',
                            background: exercise.isDesktopMode
                              ? 'linear-gradient(135deg, #2f3440 0%, #22262f 100%)'
                              : isExStudied
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: exercise.isDesktopMode
                              ? '1.5px solid rgba(255, 255, 255, 0.45)'
                              : isExStudied
                              ? '1px solid #10b981'
                              : '1px solid rgba(255, 102, 0, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            boxShadow: exercise.isDesktopMode
                              ? '0 4px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                              : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              className="exercise-badge-number"
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: exercise.isDesktopMode
                                  ? 'rgba(0, 0, 0, 0.35)'
                                  : isExStudied
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(255, 102, 0, 0.15)',
                                border: exercise.isDesktopMode
                                  ? '1.5px solid rgba(255, 255, 255, 0.6)'
                                  : isExStudied
                                  ? '1px solid #10b981'
                                  : '1px solid rgba(255, 102, 0, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: exercise.isDesktopMode
                                  ? '#ffffff'
                                  : isExStudied
                                  ? '#10b981'
                                  : 'var(--accent-orange)',
                                boxShadow: exercise.isDesktopMode
                                  ? '0 0 10px rgba(255, 255, 255, 0.15)'
                                  : 'none',
                                flexShrink: 0
                              }}
                            >
                              {exercise.isDesktopMode ? (
                                <Monitor size={22} color="#ffffff" />
                              ) : isExStudied ? (
                                <CheckCircle2 size={22} />
                              ) : (
                                <span style={{ fontSize: '1.20rem', fontWeight: 800, fontFamily: "'Inter', -apple-system, sans-serif" }}>
                                  {exercise.displayOrder > 0 ? exercise.displayOrder : <Music size={18} />}
                                </span>
                              )}
                            </div>

                            <div>
                              <div
                                className="exercise-name"
                                style={{
                                  fontSize: '0.84rem',
                                  fontWeight: exercise.isDesktopMode ? 800 : 700,
                                  color: exercise.isDesktopMode ? '#ffffff' : 'var(--text-main)',
                                  fontFamily: "'Inter', -apple-system, sans-serif",
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <span>{exercise.title}</span>
                                {isExStudied && (
                                  <span
                                    className="studied-badge"
                                    style={{
                                      background: '#10b981',
                                      color: '#ffffff',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '6px'
                                    }}
                                  >
                                    Estudado ✓
                                  </span>
                                )}
                              </div>
                              {exercise.subtitle || (!exercise.isDesktopMode && `⏱ ${exercise.defaultBpm || 60} BPM`) ? (
                                <div
                                  className="exercise-subtitle"
                                  style={{
                                    fontSize: '0.76rem',
                                    color: exercise.isDesktopMode ? 'rgba(255, 255, 255, 0.72)' : 'var(--text-muted)',
                                    fontFamily: "'Inter', -apple-system, sans-serif",
                                    marginTop: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: 400
                                  }}
                                >
                                  <span>{exercise.subtitle || (!exercise.isDesktopMode ? `⏱ ${exercise.defaultBpm || 60} BPM` : '')}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="heart-toggle-btn"
                              onClick={() => onToggleFavorite && onToggleFavorite(exercise.id)}
                              title={isExFav ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
                              style={{ padding: '6px' }}
                            >
                              <Heart
                                size={20}
                                fill={isExFav ? (exercise.isDesktopMode ? '#ffffff' : '#ff6600') : 'none'}
                                color={exercise.isDesktopMode ? '#ffffff' : (isExFav ? '#ff6600' : 'var(--text-dim)')}
                              />
                            </button>

                            <button
                              className="circle-play-btn"
                              onClick={() => onSelectSeries && onSelectSeries(exercise)}
                              title={`Estudar ${exercise.title}`}
                              style={{
                                width: '36px',
                                height: '36px',
                                background: isExStudied
                                  ? '#10b981'
                                  : exercise.isDesktopMode
                                  ? '#ffffff'
                                  : 'var(--accent-orange)',
                                color: exercise.isDesktopMode && !isExStudied ? '#000000' : '#ffffff',
                                border: exercise.isDesktopMode && !isExStudied ? '1px solid #ffffff' : 'none',
                                boxShadow: isExStudied
                                  ? '0 3px 10px rgba(16, 185, 129, 0.4)'
                                  : exercise.isDesktopMode
                                  ? '0 2px 14px rgba(255, 255, 255, 0.45)'
                                  : '0 3px 10px var(--accent-orange-glow)'
                              }}
                            >
                              <Play
                                size={18}
                                style={{ marginLeft: '1px' }}
                                fill={exercise.isDesktopMode && !isExStudied ? '#000000' : 'none'}
                                color={exercise.isDesktopMode && !isExStudied ? '#000000' : '#ffffff'}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Pequeno Manual para Adicionar na Tela Inicial do iPhone (iOS) */}
      {showIosModal && (
        <div
          className="login-modal-overlay"
          onClick={() => setShowIosModal(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="login-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            <div className="login-modal-header">
              <div className="login-modal-header-title">
                <Smartphone size={22} className="modal-icon-orange" />
                <h3 style={{ fontSize: '1.1rem' }}>Instalar no iPhone / iPad</h3>
              </div>
              <button
                type="button"
                className="login-modal-close"
                onClick={() => setShowIosModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="login-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.9rem', color: '#dfcfbd', lineHeight: 1.45, margin: 0 }}>
                Siga estes <strong>3 passos rápidos</strong> no navegador <strong>Safari</strong> para deixar o aplicativo na tela inicial do seu iPhone:
              </p>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(212, 163, 75, 0.25)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(212, 163, 75, 0.25)', color: '#f3cf88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  1
                </div>
                <div style={{ fontSize: '0.88rem', color: '#fdf8ee', lineHeight: 1.4 }}>
                  Toque no botão <strong>Compartilhar</strong> <Share size={15} style={{ display: 'inline', verticalAlign: 'middle', color: '#60a5fa' }} /> na barra inferior do Safari.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(212, 163, 75, 0.25)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(212, 163, 75, 0.25)', color: '#f3cf88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  2
                </div>
                <div style={{ fontSize: '0.88rem', color: '#fdf8ee', lineHeight: 1.4 }}>
                  Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> <PlusSquare size={15} style={{ display: 'inline', verticalAlign: 'middle', color: '#f3cf88' }} />.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(212, 163, 75, 0.25)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(212, 163, 75, 0.25)', color: '#f3cf88', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  3
                </div>
                <div style={{ fontSize: '0.88rem', color: '#fdf8ee', lineHeight: 1.4 }}>
                  Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito.
                </div>
              </div>

              <button
                type="button"
                className="login-submit-btn"
                style={{ marginTop: '4px', height: '46px', fontSize: '0.95rem' }}
                onClick={() => setShowIosModal(false)}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Auxiliar Android (caso o navegador não abra o pop-up automático ou já esteja instalado) */}
      {showAndroidModal && (
        <div
          className="login-modal-overlay"
          onClick={() => setShowAndroidModal(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="login-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            <div className="login-modal-header">
              <div className="login-modal-header-title">
                <Download size={22} style={{ color: '#34d399' }} />
                <h3 style={{ fontSize: '1.1rem' }}>Adicionar no Android</h3>
              </div>
              <button
                type="button"
                className="login-modal-close"
                onClick={() => setShowAndroidModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="login-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.9rem', color: '#dfcfbd', lineHeight: 1.45, margin: 0 }}>
                Para instalar o aplicativo na tela inicial do seu Android:
              </p>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  1
                </div>
                <div style={{ fontSize: '0.88rem', color: '#fdf8ee', lineHeight: 1.4 }}>
                  Toque nos <strong>3 pontinhos</strong> <MoreVertical size={15} style={{ display: 'inline', verticalAlign: 'middle', color: '#34d399' }} /> no canto superior direito do navegador Chrome.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                  2
                </div>
                <div style={{ fontSize: '0.88rem', color: '#fdf8ee', lineHeight: 1.4 }}>
                  Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong> e confirme.
                </div>
              </div>

              <button
                type="button"
                className="login-submit-btn"
                style={{ marginTop: '4px', height: '46px', fontSize: '0.95rem' }}
                onClick={() => setShowAndroidModal(false)}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



