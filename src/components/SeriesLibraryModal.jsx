import React, { useState } from 'react';
import { Folder, FolderOpen, Play, Heart, Wifi, ChevronDown, ChevronUp, Trash2, Video, Sparkles, Music, CheckCircle2, Monitor } from 'lucide-react';
import { SERIES_FOLDERS, isItemStudied, isItemFavorite } from '../utils/storage';

export default function SeriesLibraryView({
  allSeries = [],
  studied = [],
  favorites = [],
  onSelectSeries,
  onToggleFavorite
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
          style={{
            fontSize: '1.45rem',
            fontWeight: 900,
            fontFamily: 'var(--font-heading)',
            color: '#ffffff',
            letterSpacing: '0.5px',
            lineHeight: 1.2,
            margin: 0
          }}
        >
          POZZOLI MELÓDICO
        </h1>

        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--accent-orange)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}
        >
          Leitura & Solfejo Musical
        </div>

        <div
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
            marginTop: '8px',
            marginBottom: '6px',
            lineHeight: 1.35,
            textAlign: 'center'
          }}
        >
          <Wifi size={17} style={{ flexShrink: 0, color: '#ff944d' }} />
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
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                  FAVORITOS
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
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
                  fontSize: '0.78rem',
                  padding: '2px 8px',
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
                <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Nenhum exercício salvo em Favoritos ainda.<br />
                  Toque no ícone de coração ♡ em qualquer exercício para salvá-lo aqui.
                </div>
              ) : (
                savedSeries.map((series) => {
                  const isSeriesStudied = isItemStudied(studied, series);
                  return (
                    <div
                      key={series.id}
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
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: isSeriesStudied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSeriesStudied ? '#10b981' : 'var(--accent-rose)'
                          }}
                        >
                          {isSeriesStudied ? <CheckCircle2 size={18} /> : <Video size={16} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{series.seriesTitle ? `${series.seriesTitle} - ${series.title}` : series.title}</span>
                            {isSeriesStudied && (
                              <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '8px' }}>
                                Estudado ✓
                              </span>
                            )}
                          </div>
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
              className="accordion-card"
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
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
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
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', margin: '2px 0 0 0', fontWeight: 500 }}>
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
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: exercise.isDesktopMode
                                  ? 'rgba(37, 99, 235, 0.25)'
                                  : isExStudied
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(255, 102, 0, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: exercise.isDesktopMode
                                  ? '#60a5fa'
                                  : isExStudied
                                  ? '#10b981'
                                  : 'var(--accent-orange)'
                              }}
                            >
                              {exercise.isDesktopMode ? (
                                <Monitor size={20} />
                              ) : isExStudied ? (
                                <CheckCircle2 size={20} />
                              ) : (
                                <Music size={18} />
                              )}
                            </div>

                            <div>
                              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{exercise.subtitle || (exercise.isDesktopMode ? 'Vídeo Horizontal (Desktop)' : `⏱ ${exercise.defaultBpm || 60} BPM`)}</span>
                              </div>
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
                                color={isExFav ? '#ff6600' : '#ffffff'}
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



