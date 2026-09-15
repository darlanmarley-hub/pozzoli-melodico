import React from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Star, Download, Share2 } from 'lucide-react';

export default function ScoreActionBar({
  isStudied,
  isFavorite,
  onToggleStudied,
  onToggleFavorite,
  isOfflineReady
}) {

  const handleStudiedClick = () => {
    onToggleStudied();
    if (!isStudied) {
      // Trigger festive confetti animation!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 }
      });
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '16px' }}>
      <div className="action-buttons-grid">
        <button
          className={`action-btn studied ${isStudied ? 'active' : ''}`}
          onClick={handleStudiedClick}
          title="Marcar esta série como Estudada / Concluída"
        >
          <CheckCircle2 size={18} />
          <span>{isStudied ? 'Estudada ✓' : 'Marcar Estudada'}</span>
        </button>

        <button
          className={`action-btn favorite ${isFavorite ? 'active' : ''}`}
          onClick={onToggleFavorite}
          title="Adicionar ou remover dos Favoritos"
        >
          <Star size={18} fill={isFavorite ? '#f59e0b' : 'none'} />
          <span>{isFavorite ? 'Favorita' : 'Favoritar'}</span>
        </button>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={16} color={isOfflineReady ? '#34d399' : 'var(--text-muted)'} />
          <span>{isOfflineReady ? 'Disponível Offline' : 'Salvo em Cache'}</span>
        </div>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Pozzoli Melódico',
                text: 'Estou estudando solfejo e leitura de partitura no aplicativo Pozzoli Melódico!',
                url: window.location.href
              }).catch(() => {});
            } else {
              alert('Link do aplicativo copiado para a área de transferência!');
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem'
          }}
        >
          <Share2 size={14} /> Compartilhar
        </button>
      </div>
    </div>
  );
}
