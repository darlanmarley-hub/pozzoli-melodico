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
          className="library-sub-title"
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--accent-orange)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}
        >
          {theme === 'baroque' ? '❦ Metodo di Solfeggio Melodico · Ettore Pozzoli ❦' : 'Leitura & Solfejo Musical'}
        </div>

        {/* Seletor de Modelo de Design: Barroco Clássico vs Moderno Escuro */}
        {onThemeChange && (
          <div className="theme-switcher-bar">
            <button
              type="button"
              className={`theme-pill-btn ${theme === 'baroque' ? 'active' : ''}`}
              onClick={() => onThemeChange('baroque')}
              title="Ativar Estilo Barroco Clássico (Pergaminho nobre, ouro antigo e tipografia clássica)"
            >
              🏛️ Barroco Clássico
            </button>
            <button
              type="button"
              className={`theme-pill-btn ${theme === 'modern' ? 'active' : ''}`}
              onClick={() => onThemeChange('modern')}
              title="Ativar Estilo Moderno Escuro"
            >
              ⚡ Moderno Escuro
            </button>
          </div>
        )}

        <div
          className="wifi-tip-badge"
          style={{
            background: 'rgba(255, 102, 0, 0.14)',
            border: '1px solid rgba(255, 102, 0, 0.4)',
            color: '#ff944d',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.92rem',
            fontWeight: 700,
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
          <Wifi size={17} style={{ flexShrink: 0 }} />
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
                <h3 style={{ fontSize: '1.10rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  FAVORITOS
                </h3>
                <p className="favorites-folder-subtitle" style={{ fontSize: '0.98rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                  {favCount === 0 ? 'Nenhum exercício salvo' : `${favCount} exercício(s) salvo(s)`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: 'rgba(244, 63, 94, 0.2)',
                  color: 'var(--accent-rose)',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--accent-rose)'
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
                <div style={{ textAlign: 'center', padding: '16px 12px', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.45 }}>
                  Nenhum exercício salvo em Favoritos ainda.<br />
                  Toque no ícone de coração ♡ em qualquer exercício para salvá-lo aqui.
                </div>
              ) : (
                savedSeries.map((series) => {
                  const isSeriesStudied = isItemStudied(studied, series);
                  return (
                    <div
                      key={series.id}
                      className="favorite-row-card"
                      style={{
                        background: isSeriesStudied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSeriesStudied ? '1px solid #10b981' : '1px solid var(--accent-rose-glow)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="exercise-badge-number"
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '11px',
                            background: isSeriesStudied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSeriesStudied ? '#10b981' : 'var(--accent-rose)',
                            border: isSeriesStudied ? '1px solid #10b981' : '1px solid var(--accent-rose-glow)',
                            flexShrink: 0
                          }}
                        >
                          {isSeriesStudied ? <CheckCircle2 size={20} /> : (
                            <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                              {series.displayOrder > 0 ? series.displayOrder : <Video size={16} />}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="exercise-name" style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{series.seriesTitle ? `${series.seriesTitle} - ${series.title}` : series.title}</span>
                            {isSeriesStudied && (
                              <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.80rem', fontWeight: 800, padding: '2px 8px', borderRadius: '8px' }}>
                                Estudado ✓
                              </span>
                            )}
                          </div>
                          {series.subtitle && (
                            <div className="exercise-subtitle" style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 500 }}>
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
                          <Trash2 size={16} color="#ef4444" />
                        </button>

                        <button
                          className="circle-play-btn"
                          onClick={() => onSelectSeries && onSelectSeries(series)}
                          title="Abrir Vídeo"
                          style={{
                            width: '32px',
                            height: '32px',
                            background: isSeriesStudied ? '#10b981' : 'var(--accent-rose)',
                            boxShadow: isSeriesStudied ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 2px 8px var(--accent-rose-glow)'
                          }}
                        >
                          <Play size={14} style={{ marginLeft: '1px' }} />
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
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {folder.title.toUpperCase()}
                      </h3>
                      {isFolderComplete && (
                        <span
                          style={{
                            background: '#10b981',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}
                        >
                          Concluído ✓
                        </span>
                      )}
                    </div>
                    {folder.subtitle && (
                      <p className="series-folder-subtitle" style={{ fontSize: '0.98rem', color: 'var(--text-muted)', margin: '3px 0 0 0', fontWeight: 600 }}>
                        {folder.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: isFolderComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 102, 0, 0.15)',
                      color: isFolderComplete ? '#10b981' : 'var(--accent-orange)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      padding: '3px 9px',
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
                    <div style={{ textAlign: 'center', padding: '16px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Em breve novos exercícios serão adicionados a esta série.
                    </div>
                  ) : (
                    folderExercises.map((exercise) => {
                      const isExStudied = isItemStudied(studied, exercise);
                      const isExFav = isItemFavorite(favorites, exercise);

                      return (
                        <div
                          key={exercise.id}
                          className="exercise-row-card"
                          onClick={() => onSelectSeries && onSelectSeries(exercise)}
                          style={{
                            cursor: 'pointer',
                            background: exercise.isDesktopMode
                              ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.18) 0%, rgba(19, 25, 39, 0.95) 100%)'
                              : isExStudied
                              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: exercise.isDesktopMode
                              ? '1px solid #3b82f6'
                              : isExStudied
                              ? '1px solid #10b981'
                              : '1px solid rgba(255, 102, 0, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              className="exercise-badge-number"
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: exercise.isDesktopMode
                                  ? 'rgba(37, 99, 235, 0.25)'
                                  : isExStudied
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(255, 102, 0, 0.15)',
                                border: exercise.isDesktopMode
                                  ? '1px solid #3b82f6'
                                  : isExStudied
                                  ? '1px solid #10b981'
                                  : '1px solid rgba(255, 102, 0, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: exercise.isDesktopMode
                                  ? '#60a5fa'
                                  : isExStudied
                                  ? '#10b981'
                                  : 'var(--accent-orange)',
                                flexShrink: 0
                              }}
                            >
                              {exercise.isDesktopMode ? (
                                <Monitor size={22} />
                              ) : isExStudied ? (
                                <CheckCircle2 size={22} />
                              ) : (
                                <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                                  {exercise.displayOrder > 0 ? exercise.displayOrder : <Music size={18} />}
                                </span>
                              )}
                            </div>

                            <div>
                              <div className="exercise-name" style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>{exercise.title}</span>
                                {exercise.isDesktopMode && (
                                  <span
                                    style={{
                                      background: 'rgba(37, 99, 235, 0.25)',
                                      border: '1px solid #3b82f6',
                                      color: '#60a5fa',
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: '8px'
                                    }}
                                  >
                                    🖥️ Formato PC
                                  </span>
                                )}
                                {isExStudied && (
                                  <span
                                    style={{
                                      background: '#10b981',
                                      color: '#ffffff',
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      padding: '1px 6px',
                                      borderRadius: '8px'
                                    }}
                                  >
                                    Estudado ✓
                                  </span>
                                )}
                              </div>
                              {exercise.subtitle || (!exercise.isDesktopMode && `⏱ ${exercise.defaultBpm || 60} BPM`) ? (
                                <div className="exercise-subtitle" style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
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
                                fill={isExFav ? '#ff6600' : 'none'}
                                color={isExFav ? '#ff6600' : 'var(--text-dim)'}
                              />
                            </button>

                            <button
                              className="circle-play-btn"
                              onClick={() => onSelectSeries && onSelectSeries(exercise)}
                              title={`Estudar ${exercise.title}`}
                              style={{
                                width: '36px',
                                height: '36px',
                                background: isExStudied ? '#10b981' : 'var(--accent-orange)',
                                boxShadow: isExStudied ? '0 3px 10px rgba(16, 185, 129, 0.4)' : '0 3px 10px var(--accent-orange-glow)'
                              }}
                            >
                              <Play size={18} style={{ marginLeft: '1px' }} />
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



