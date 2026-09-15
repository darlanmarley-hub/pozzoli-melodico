import React from 'react';
import { Heart, Play, Video, Music, Trash2, CheckCircle2, Bookmark, ArrowLeft } from 'lucide-react';

/**
 * SavedExercisesView Component
 * Exibe a área dedicada de exercícios salvos/favoritos pelo aluno,
 * com atalho direto para reprodução no player com vídeo do Google Drive.
 */
export default function SavedExercisesView({
  allSeries,
  favorites,
  studied,
  onSelectSeries,
  onToggleFavorite,
  onGoBack
}) {
  const savedExercises = allSeries.filter((s) => favorites.includes(s.id));

  return (
    <div className="library-view-container" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      {/* Botão de Voltar para a Tela Principal */}
      {onGoBack && (
        <button
          onClick={onGoBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-orange)',
            fontSize: '0.95rem',
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
          background: 'linear-gradient(135deg, rgba(255, 102, 0, 0.15) 0%, rgba(19, 25, 39, 0.8) 100%)',
          border: '1px solid var(--border-orange)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(255, 102, 0, 0.2)',
              border: '1px solid var(--accent-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-orange)'
            }}
          >
            <Heart size={24} fill="var(--accent-orange)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              Pasta Favoritos
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Seus exercícios marcados com o coração para estudo direto
            </p>
          </div>
        </div>

        <span
          style={{
            background: 'var(--accent-orange)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}
        >
          {savedExercises.length} favoritos
        </span>
      </div>

      {/* Lista de Exercícios Favoritos */}
      {savedExercises.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Heart size={36} style={{ color: 'var(--accent-orange)', opacity: 0.8 }} fill="var(--accent-orange)" />
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>Nenhum exercício na pasta Favoritos</p>
          <span style={{ fontSize: '0.85rem', maxWidth: '340px' }}>
            Marque o ícone de coração nos exercícios da biblioteca para enviá-los diretamente para esta pasta Favoritos.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {savedExercises.map((series) => {
            const isCompleted = studied.includes(series.id);

            return (
              <div
                key={series.id}
                className="exercise-item-card"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-orange)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}
              >
                <div className="exercise-left-info" style={{ gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
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
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                      {series.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {series.moduleName || series.subtitle}
                    </div>
                    <div className="exercise-meta-badges" style={{ marginTop: '6px' }}>
                      <span className="meta-pill">⏱ {series.defaultBpm || 90} BPM</span>
                      {isCompleted && <span className="meta-pill green">✔ Concluído</span>}
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
