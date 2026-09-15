import React, { useState } from 'react';
import { Folder, Play, Heart, Wifi, ChevronDown, ChevronUp, Trash2, Video, Sparkles } from 'lucide-react';

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
  const favCount = favorites.length;

  const savedSeries = allSeries.filter((s) => favorites.includes(s.id));

  return (
    <div className="library-view-container" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      {/* Cabeçalho Moderno e Organizado da Tela Inicial */}
      <div
        style={{
          textAlign: 'center',
          padding: '12px 16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <h1
          style={{
            fontSize: '1.7rem',
            fontWeight: 900,
            fontFamily: 'var(--font-heading)',
            background: 'linear-gradient(135deg, #ffffff 40%, #ff944d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px',
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
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            maxWidth: '94%',
            lineHeight: 1.3
          }}
        >
          <Wifi size={14} style={{ flexShrink: 0 }} />
          <span>Conecte-se ao Wi-Fi para economizar seus dados móveis</span>
        </div>
      </div>

      <div style={{ padding: '0 16px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Pasta Accordion: FAVORITOS (Acima da PRIMEIRA SÉRIE) */}
        <div
          className="accordion-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-orange)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            transition: 'border-color 0.2s ease'
          }}
        >
          {/* Header da Pasta Favoritos */}
          <div
            onClick={() => setIsFavExpanded(!isFavExpanded)}
            style={{
              cursor: 'pointer',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div className="header-left" style={{ gap: '16px' }}>
              <div
                className="icon-badge-box orange"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(255, 102, 0, 0.2)',
                  border: '1px solid var(--accent-orange)'
                }}
              >
                <Heart size={26} fill="var(--accent-orange)" style={{ color: 'var(--accent-orange)' }} />
              </div>

              <div className="card-title-group">
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                  FAVORITOS
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {favCount === 0 ? 'Nenhum exercício salvo' : `${favCount} exercício(s) salvo(s)`}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: 'rgba(255, 102, 0, 0.2)',
                  color: '#ff6600',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--accent-orange)'
                }}
              >
                {favCount}
              </span>

              {/* Seta Apontando para Baixo (ChevronDown) quando fechado, ou Cima quando aberto */}
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                {isFavExpanded ? (
                  <ChevronUp size={24} color="var(--accent-orange)" />
                ) : (
                  <ChevronDown size={24} color="var(--accent-orange)" />
                )}
              </button>
            </div>
          </div>

          {/* Conteúdo Expandido dos Favoritos (Mostra para baixo na mesma tela) */}
          {isFavExpanded && (
            <div
              style={{
                padding: '0 20px 20px 20px',
                borderTop: '1px solid var(--border-color)',
                background: 'rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingTop: '16px'
              }}
            >
              {savedSeries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Nenhum exercício salvo em Favoritos ainda.<br />
                  Toque no ícone de coração ♡ em qualquer exercício para salvá-lo aqui.
                </div>
              ) : (
                savedSeries.map((series) => {
                  return (
                    <div
                      key={series.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-orange)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'rgba(255, 102, 0, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-orange)'
                          }}
                        >
                          <Video size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                            {series.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {series.moduleName || series.subtitle}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          className="heart-toggle-btn"
                          onClick={() => onToggleFavorite && onToggleFavorite(series.id)}
                          title="Remover dos Salvos"
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={18} color="#ef4444" />
                        </button>

                        <button
                          className="circle-play-btn"
                          onClick={() => onSelectSeries && onSelectSeries(series)}
                          title="Abrir Vídeo"
                          style={{ width: '38px', height: '38px' }}
                        >
                          <Play size={18} style={{ marginLeft: '2px' }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Pasta Única de Exercício: PRIMEIRA SÉRIE */}
        <div
          className="accordion-card"
          onClick={() => firstSeries && onSelectSeries && onSelectSeries(firstSeries)}
          style={{
            cursor: 'pointer',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-orange)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            transition: 'transform 0.2s ease, border-color 0.2s ease'
          }}
        >
          <div className="header-left" style={{ gap: '16px' }}>
            <div
              className="icon-badge-box orange"
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'rgba(255, 102, 0, 0.2)',
                border: '1px solid var(--accent-orange)'
              }}
            >
              <Folder size={28} style={{ color: 'var(--accent-orange)' }} />
            </div>

            <div className="card-title-group">
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                PRIMEIRA SÉRIE
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Toque para abrir o vídeo e os controles de reprodução
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
            <button
              className="heart-toggle-btn"
              onClick={() => onToggleFavorite && onToggleFavorite(firstSeries.id)}
              title={isFav ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
              style={{ padding: '8px' }}
            >
              <Heart
                size={22}
                fill={isFav ? '#ff6600' : 'none'}
                color={isFav ? '#ff6600' : '#ffffff'}
              />
            </button>

            <button
              className="circle-play-btn"
              onClick={() => onSelectSeries && onSelectSeries(firstSeries)}
              title="Abrir Vídeo PRIMEIRA SÉRIE"
              style={{ width: '44px', height: '44px' }}
            >
              <Play size={20} style={{ marginLeft: '2px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



