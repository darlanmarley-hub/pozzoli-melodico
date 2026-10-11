import React from 'react';
import { BarChart2, CheckCircle2, Star, Clock, Trophy, Calendar, Flame, Play } from 'lucide-react';

export default function StatsModal({
  stats,
  studied = [],
  favorites = [],
  allSeries = [],
  onClose,
  onSelectSeries
}) {
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weeklyPractice = stats?.weeklyPractice || [15, 20, 30, 25, 40, 10, 35];
  const maxWeeklyMinutes = Math.max(30, ...weeklyPractice);

  const completedCount = studied.length;
  const totalCount = allSeries.length;
  const completionPercent = Math.round((completedCount / (totalCount || 1)) * 100);

  return (
    <div className="stats-page-container" style={{ paddingBottom: '60px', maxWidth: '520px', margin: '0 auto', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Título & Subtítulo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Seu Progresso
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
          Acompanhe suas estatísticas de estudo do Pozzoli
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-orange)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 10px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
            }}
          >
            <Clock size={24} color="var(--accent-orange)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats?.totalPracticeMinutes || 45} min
            </div>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Tempo Total</div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-orange)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 10px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
            }}
          >
            <Trophy size={24} color="#fbbf24" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {completionPercent}%
            </div>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Concluído</div>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-orange)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 10px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
            }}
          >
            <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {completedCount}/{totalCount}
            </div>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Exercícios</div>
          </div>
        </div>

        {/* Weekly Practice Bar Chart */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
          }}
        >
          <h4
            style={{
              fontSize: '1.10rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Calendar size={20} color="var(--accent-orange)" />
            <span>Prática Semanal (Minutos por dia)</span>
          </h4>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '115px', padding: '0 8px' }}>
            {weeklyPractice.map((mins, idx) => {
              const heightPercent = Math.round((mins / maxWeeklyMinutes) * 100);
              const isToday = idx === new Date().getDay();

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {mins > 0 ? `${mins}m` : ''}
                  </span>
                  <div
                    style={{
                      width: '22px',
                      height: `${Math.max(8, heightPercent)}%`,
                      background: isToday
                        ? 'linear-gradient(to top, #ff6600, #ff8533)'
                        : mins > 0
                        ? 'linear-gradient(to top, rgba(255, 102, 0, 0.4), rgba(255, 102, 0, 0.8))'
                        : 'rgba(255,255,255,0.06)',
                      borderRadius: '6px',
                      boxShadow: isToday ? '0 0 12px var(--accent-orange-glow)' : 'none',
                      transition: 'height 0.3s ease'
                    }}
                  />
                  <span style={{ fontSize: '0.90rem', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                    {daysOfWeek[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exercícios Estudados e Favoritos */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px'
          }}
        >
          <h4
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Star size={20} color="#fbbf24" fill="#fbbf24" />
            <span>Sua Lista de Exercícios</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {allSeries.map((item) => {
              const isItemStudied = studied.includes(item.id);
              const isItemFavorite = favorites.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectSeries && onSelectSeries(item)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(255, 102, 0, 0.15)',
                        color: 'var(--accent-orange)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Play size={18} style={{ marginLeft: '2px' }} />
                    </div>
                    <div>
                      <div className="exercise-name" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{item.seriesTitle ? `${item.seriesTitle} - ${item.title}` : item.title}</span>
                        {isItemStudied && <CheckCircle2 size={16} color="#10b981" />}
                        {isItemFavorite && <Star size={16} color="#fbbf24" fill="#fbbf24" />}
                      </div>
                      <div className="exercise-subtitle" style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
                        {item.moduleName || item.subtitle}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.90rem',
                      fontWeight: 700,
                      color: 'var(--accent-orange)',
                      background: 'rgba(255, 102, 0, 0.12)',
                      padding: '6px 14px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-orange)',
                      flexShrink: 0
                    }}
                  >
                    Estudar
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

