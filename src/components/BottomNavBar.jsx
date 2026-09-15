import React from 'react';
import { Library, BarChart2, User } from 'lucide-react';

export default function BottomNavBar({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav-container">
      <div className="bottom-nav-pill">
        <button
          className={`nav-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => onTabChange('library')}
        >
          <Library size={18} />
          <span>Biblioteca</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => onTabChange('stats')}
        >
          <BarChart2 size={18} />
          <span>Progresso</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onTabChange('profile')}
        >
          <User size={18} />
          <span>Perfil</span>
        </button>
      </div>
    </nav>
  );
}

