import React from 'react';
import { Heart, Play, Video, Music, Trash2, CheckCircle2, Bookmark, ArrowLeft } from 'lucide-react';
import { isItemFavorite, isItemStudied } from '../utils/storage';

/**
 * SavedExercisesView Component
 * Exibe a área dedicada de exercícios salvos/favoritos pelo aluno,
 * com atalho direto para reprodução no player com vídeo do Google Drive / Dropbox.
 */
export default function SavedExercisesView({
  allSeries,
  favorites,
  studied,
  onSelectSeries,
  onToggleFavorite,
  onGoBack
}) {
  const savedExercises = allSeries.filter((s) => isItemFavorite(favorites, s));

  return (
    <div className="library-view-container" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      {/* Botão de Voltar para a Tela Principal */}
      {onGoBack && (
        <button
          onClick={onGoBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-rose)',
            fontSize: '1.08rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            cursor: 'pointer',
            padding: '4px 0'
          }}
        >
          <ArrowLeft size={20} />
          Voltar para a Biblioteca
        </button>
      )}

      {/* Banner da Pasta Favoritos */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(19, 25, 39, 0.9) 100%)',
          border: '1px solid var(--accent-rose-glow)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(244, 63, 94, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(244, 63, 94, 0.2)',
              border: '1px solid var(--accent-rose)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-rose)'
            }}
          >
            <Heart size={24} fill="var(--accent-rose)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Pasta Favoritos
            </h2>
            <p style={{ fontSize: '1.18rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Seus exercícios marcados com o coração para estudo direto
            </p>
          </div>
        </div>

        <span
          style={{
            background: 'var(--accent-rose)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            fontWeight: 800,
            fontSize: '1.12rem'
          }}
        >
          {savedExercises.length} favoritos
        </span>
      </div>

      {/* Lista de Exercícios Favoritos */}
      {savedExercises.length === 0 ? (
        <div
          className="empty-favorites-card"
          style={{
            textAlign: 'center',
            padding: '36px 20px',
            background: 'rgba(244, 63, 94, 0.07)',
            border: '1px dashed rgba(244, 63, 94, 0.35)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            margin: '8px 0'
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-rose)'
            }}
          >
            <Heart size={26} fill="rgba(244, 63, 94, 0.3)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '340px' }}>
            <p style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
              Nenhum exercício salvo ainda
            </p>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0, fontFamily: "'Inter', -apple-system, sans-serif" }}>
              Toque no ícone de coração <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>♡</span> em qualquer exercício para adicioná-lo aos seus favoritos.
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {savedExercises.map((series) => {
            const isCompleted = isItemStudied(studied, series);

            return (
              <div
                key={series.id}
                className="exercise-item-card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--accent-rose-glow)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}
              >
                <div className="exercise-left-info" style={{ gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-rose)',
                      flexShrink: 0
                    }}
                  >
                    <Video size={22} />
                  </div>

                  <div>
                    <div className="exercise-name" style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
                      {series.isDesktopMode && series.seriesTitle
                        ? `${series.seriesTitle} - ${series.title}`
                        : series.title?.toLowerCase().includes('série')
                        ? series.title
                        : series.seriesTitle
                        ? `${series.seriesTitle} - ${series.title}`
                        : series.title}
                    </div>
                    <div className="exercise-subtitle" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: "'Inter', -apple-system, sans-serif", marginTop: '2px', fontWeight: 500 }}>
                      {series.subtitle || series.moduleName || 'Pozzoli Melódico'}
                    </div>
                    <div className="exercise-meta-badges" style={{ marginTop: '6px' }}>
                      <span className="meta-pill" style={{ fontSize: '1.05rem', padding: '4px 10px' }}>⏱ {series.defaultBpm || 60} BPM</span>
                      {isCompleted && <span className="meta-pill green" style={{ fontSize: '1.05rem', padding: '4px 10px' }}>✔ Concluído</span>}
                    </div>
                  </div>
                </div>

                <div className="exercise-actions" style={{ gap: '12px' }}>
                  <button
                    className="heart-toggle-btn"
                    onClick={() => onToggleFavorite(series.id)}
                    title="Remover dos Salvos"
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </button>

                  <button
                    className="circle-play-btn"
                    onClick={() => onSelectSeries(series)}
                    title="Estudar Exercício"
                    style={{
                      background: 'var(--accent-rose)',
                      boxShadow: '0 3px 10px var(--accent-rose-glow)'
                    }}
                  >
                    <Play size={18} style={{ marginLeft: '2px' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
