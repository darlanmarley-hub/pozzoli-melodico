import React, { useState } from 'react';
import { Folder, FolderOpen, Play, Heart, Wifi, ChevronDown, ChevronUp, Trash2, Video, Sparkles, Music, CheckCircle2, Monitor } from 'lucide-react';
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

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const favCount = favorites.length;
  const savedSeries = allSeries.filter((s) => isItemFavorite(favorites, s));

  return (
    <div className="library-view-container" style={{ paddingTop: '12px', paddingBottom: '30px' }}>
      {/* Cabeçalho Limpo sem Moldura para Mobile */}
      <div
        style={{
          textAlign: 'center',
          padding: '10px 16px 4px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <h1
          className="library-main-title"
          style={{
            fontSize: '1.45rem',
            fontWeight: 900,
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.5px',
            lineHeight: 1.2,
            margin: 0
          }}
        >
          POZZOLI MELÓDICO NO BOLSO
        </h1>


        <div
          className="wifi-tip-badge"
          style={{
            background: 'rgba(255, 102, 0, 0.14)',
            border: '1px solid rgba(255, 102, 0, 0.4)',
            color: '#ff944d',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '4px',
            marginBottom: '6px',
            lineHeight: 1.35,
            textAlign: 'center'
          }}
        >
          <Wifi size={16} style={{ flexShrink: 0 }} />
          <span>Conecte-se ao Wi-Fi para economizar seus dados móveis</span>
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
            <div className="header-left" style={{ gap: '10px' }}>
              <div
                className="icon-badge-box"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(244, 63, 94, 0.2)',
                  border: '1px solid var(--accent-rose)'
                }}
              >
                <Heart size={20} fill="var(--accent-rose)" style={{ color: 'var(--accent-rose)' }} />
              </div>

              <div className="card-title-group">
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
                          <div className="exercise-name" style={{ fontSize: '0.95rem', fontWeight: series.isDesktopMode ? 800 : 700, color: series.isDesktopMode ? '#ffffff' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                              <span className="studied-badge" style={{ background: '#10b981', color: '#ffffff', fontSize: '0.95rem', fontWeight: 800, padding: '3px 10px', borderRadius: '8px' }}>
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
                <div className="header-left" style={{ gap: '12px' }}>
                  <div
                    className="icon-badge-box"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: isFolderComplete ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 102, 0, 0.2)',
                      border: isFolderComplete ? '1px solid #10b981' : '1px solid var(--accent-orange)'
                    }}
                  >
                    {isExpanded ? (
                      <FolderOpen size={22} style={{ color: isFolderComplete ? '#10b981' : 'var(--accent-orange)' }} />
                    ) : (
                      <Folder size={22} style={{ color: isFolderComplete ? '#10b981' : 'var(--accent-orange)' }} />
                    )}
                  </div>

                  <div className="card-title-group">
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                  fontSize: '0.95rem',
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
                                      fontSize: '0.95rem',
                                      fontWeight: 800,
                                      padding: '3px 10px',
                                      borderRadius: '8px'
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
    </div>
  );
}



