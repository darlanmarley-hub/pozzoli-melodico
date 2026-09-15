import React from 'react';
import { Music, ChevronDown, User, BarChart2, Folder, Wifi, WifiOff } from 'lucide-react';

export default function HeaderNav({
  currentSeries,
  onOpenLibrary,
  onOpenProfile,
  onOpenStats,
  isOffline,
  onToggleOfflineMode
}) {
  return (
    <header className="header-nav glass-panel">
      <div className="brand-logo">
        <div className="brand-icon-wrapper">
          <Music size={24} color="#ffffff" />
        </div>
        <div>
          <h1 className="brand-title">Pozzoli Melódico no Bolso</h1>
          <div className="brand-subtitle">Leitura & Solfejo Musical</div>
        </div>
      </div>

      <button className="series-selector-button" onClick={onOpenLibrary}>
        <span>{currentSeries ? currentSeries.title : 'Selecione uma Série'}</span>
        <ChevronDown size={18} />
      </button>

      <div className="header-actions">
        <div 
          className={`offline-badge ${isOffline ? 'offline' : 'online'}`}
          onClick={onToggleOfflineMode}
          style={{ cursor: 'pointer' }}
          title={isOffline ? "Modo Offline Ativado (Sem internet)" : "Conectado à Internet (Modo Online)"}
        >
          {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span>{isOffline ? 'Offline' : 'Online'}</span>
        </div>

        <button 
          className="nav-icon-btn" 
          onClick={onOpenStats}
          title="Área de Estatísticas"
        >
          <BarChart2 size={20} />
        </button>

        <button 
          className="nav-icon-btn" 
          onClick={onOpenProfile}
          title="Área de Perfil"
        >
          <User size={20} />
        </button>

        <button 
          className="nav-icon-btn" 
          onClick={onOpenLibrary}
          title="Biblioteca de Partituras"
        >
          <Folder size={20} />
        </button>
      </div>
    </header>
  );
}
