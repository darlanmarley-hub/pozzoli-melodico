import React, { useState } from 'react';
import { Folder, Play, Heart, Wifi, ChevronDown, ChevronUp, Trash2, Video, Sparkles, Music, CheckCircle2 } from 'lucide-react';

export default function SeriesLibraryView({
  allSeries = [],
  studied = [],
  favorites = [],
  onSelectSeries,
  onToggleFavorite
}) {
  const [isFavExpanded, setIsFavExpanded] = useState(false);

  const firstSeries = allSeries[0] || {};
  const isFav = favorites.includes(firstSeries.id);
  const isFirstStudied = studied.includes(firstSeries.id);
  const favCount = favorites.length;

  const savedSeries = allSeries.filter((s) => favorites.includes(s.id));

  return (
    <div className="library-view-container" style={{ paddingTop: '12px', paddingBottom: '30px' }}>
      {/* Cabeçalho Compacto da Tela Inicial */}
      <div
        style={{
          textAlign: 'center',
          padding: '8px 12px 10px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(135deg, #ffffff 40%, #ff944d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.3px',
            lineHeight: 1.2
          }}
        >
          POZZOLI MELÓDICO NO BOLSO
        </h1>

        <div
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            color: '#fbbf24',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            maxWidth: '96%',
            lineHeight: 1.2
          }}
        >
          <Wifi size={12} style={{ flexShrink: 0 }} />
          <span>Conecte-se ao Wi-Fi para economizar dados</span>
        </div>
      </div>

      <div style={{ padding: '0 12px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Pasta Accordion: FAVORITOS (Acima da PRIMEIRA SÉRIE) */}
        <div
          className="accordion-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-orange)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
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
                className="icon-badge-box orange"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(255, 102, 0, 0.2)',
                  border: '1px solid var(--accent-orange)'
                }}
              >
                <Heart size={20} fill="var(--accent-orange)" style={{ color: 'var(--accent-orange)' }} />
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
                  background: 'rgba(255, 102, 0, 0.2)',
                  color: '#ff6600',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid var(--accent-orange)'
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
                  <ChevronUp size={20} color="var(--accent-orange)" />
                ) : (
                  <ChevronDown size={20} color="var(--accent-orange)" />
                )}
              </button>
            </div>
          </div>

          {/* Conteúdo Expandido dos Favoritos */}
          {isFavExpanded && (
            <div
              style={{
                padding: '0 12px 12px 12px',
                borderTop: '1px solid var(--border-color)',
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
                  const isSeriesStudied = studied.includes(series.id);
                  return (
                    <div
                      key={series.id}
                      style={{
                        background: isSeriesStudied ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSeriesStudied ? '1px solid #10b981' : '1px solid var(--border-orange)',
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
                            background: isSeriesStudied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 102, 0, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSeriesStudied ? '#10b981' : 'var(--accent-orange)'
                          }}
                        >
                          {isSeriesStudied ? <CheckCircle2 size={18} /> : <Video size={16} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{series.title}</span>
                            {isSeriesStudied && (
                              <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '8px' }}>
                                Estudado ✓
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {series.moduleName || series.subtitle}
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
                            background: isSeriesStudied ? '#10b981' : 'var(--accent-orange)',
                            boxShadow: isSeriesStudied ? '0 2px 8px rgba(16, 185, 129, 0.4)' : '0 2px 8px var(--accent-orange-glow)'
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

        {/* Pasta Única de Exercício: PRIMEIRA SÉRIE (Muda de Cor quando Estudado) */}
        <div
          className="accordion-card"
          onClick={() => firstSeries && onSelectSeries && onSelectSeries(firstSeries)}
          style={{
            cursor: 'pointer',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isFirstStudied
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(19, 25, 39, 0.96) 100%)'
              : 'var(--bg-card)',
            border: isFirstStudied ? '2px solid #10b981' : '1px solid var(--border-orange)',
            borderRadius: 'var(--radius-md)',
            boxShadow: isFirstStudied ? '0 4px 16px rgba(16, 185, 129, 0.35)' : '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          <div className="header-left" style={{ gap: '12px' }}>
            <div
              className="icon-badge-box"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: isFirstStudied ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 102, 0, 0.2)',
                border: isFirstStudied ? '1px solid #10b981' : '1px solid var(--accent-orange)'
              }}
            >
              {isFirstStudied ? (
                <CheckCircle2 size={24} style={{ color: '#10b981' }} />
              ) : (
                <Music size={22} style={{ color: 'var(--accent-orange)' }} />
              )}
            </div>

            <div className="card-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                  PRIMEIRA SÉRIE
                </h3>
                {isFirstStudied && (
                  <span
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    Estudado ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
            <button
              className="heart-toggle-btn"
              onClick={() => onToggleFavorite && onToggleFavorite(firstSeries.id)}
              title={isFav ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
              style={{ padding: '6px' }}
            >
              <Heart
                size={20}
                fill={isFav ? '#ff6600' : 'none'}
                color={isFav ? '#ff6600' : '#ffffff'}
              />
            </button>

            <button
              className="circle-play-btn"
              onClick={() => onSelectSeries && onSelectSeries(firstSeries)}
              title="Abrir Vídeo PRIMEIRA SÉRIE"
              style={{
                width: '36px',
                height: '36px',
                background: isFirstStudied ? '#10b981' : 'var(--accent-orange)',
                boxShadow: isFirstStudied ? '0 3px 10px rgba(16, 185, 129, 0.5)' : '0 3px 10px var(--accent-orange-glow)'
              }}
            >
              <Play size={18} style={{ marginLeft: '1px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



