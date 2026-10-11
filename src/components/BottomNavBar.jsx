import React from 'react';
import { Library, BarChart2, User } from 'lucide-react';

export default function BottomNavBar({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav-container">
      <div className="bottom-nav-pill" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <button
          className={`nav-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => onTabChange('library')}
          style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
        >
          <Library size={16} />
          <span>Biblioteca</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => onTabChange('stats')}
          style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
        >
          <BarChart2 size={16} />
          <span>Progresso</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onTabChange('profile')}
          style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
        >
          <User size={16} />
          <span>Perfil</span>
        </button>
      </div>
    </nav>
  );
}

