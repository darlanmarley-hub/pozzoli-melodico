import React, { useState } from 'react';
import { User, Upload, Cloud, LogOut, CheckCircle2, ShieldCheck, Mail, Star, Save, RotateCw } from 'lucide-react';
import { saveProfile } from '../utils/storage';

export default function ProfileModal({ profile = {}, onClose, onSave }) {
  const [name, setName] = useState(profile.name || 'Estudante Pozzoli');
  const [email, setEmail] = useState(profile.email || 'aluno@pozzolimelodico.com');
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl || null);
  const [plan, setPlan] = useState(profile.plan || 'vitalicio'); // 'vitalicio' | 'anual'

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const updated = saveProfile({
      ...profile,
      name,
      email,
      photoUrl,
      plan
    });
    if (onSave) onSave(updated);
    alert('Perfil atualizado com sucesso!');
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) {
      alert('Você saiu da sua conta.');
    }
  };

  return (
    <div className="profile-page-container" style={{ paddingBottom: '60px', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Título & Subtítulo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Seu Perfil
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
          Gerencie sua conta
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px', margin: '0 auto' }}>
        {/* Foto de Perfil & Upload */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-orange)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '94px',
                height: '94px',
                borderRadius: '50%',
                background: photoUrl ? `url(${photoUrl}) center/cover` : 'rgba(255, 102, 0, 0.15)',
                border: '3px solid var(--accent-orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                color: 'var(--accent-orange)',
                overflow: 'hidden'
              }}
            >
              {!photoUrl && <User size={48} />}
            </div>
            <label
              htmlFor="profile-photo-input"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--accent-orange)',
                color: '#fff',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
              }}
              title="Carregar nova foto"
            >
              <Upload size={18} />
            </label>
            <input
              id="profile-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <label
              htmlFor="profile-photo-input"
              style={{
                fontSize: '1.02rem',
                color: 'var(--accent-orange)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px'
              }}
            >
              <Upload size={16} /> Carregar foto de perfil
            </label>
          </div>
        </div>

        {/* Aviso de Sincronização na Nuvem (Diretamente Abaixo da Foto do Usuário) */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 102, 0, 0.1) 0%, rgba(19, 25, 39, 0.6) 100%)',
            border: '1px solid var(--border-orange)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <Cloud size={26} style={{ color: 'var(--accent-orange)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Sincronização na nuvem
            </h4>
            <p style={{ fontSize: '1.02rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
              Sua conta está pronta para salvar e sincronizar sessões de estudos.
            </p>
          </div>
        </div>

        {/* Informações da Conta */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* E-mail do Usuário */}
          <div>
            <label style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              E-mail do usuário:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <Mail size={20} color="var(--accent-orange)" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '1.08rem',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Status: Conta Conectada - Online */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              <ShieldCheck size={20} color="#10b981" />
              <span>Conta conectada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.98rem', fontWeight: 700, color: '#10b981' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
              Online
            </div>
          </div>
        </div>

        {/* Botão Recarregar App */}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid #3b82f6',
            color: '#60a5fa',
            fontWeight: 800,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          <RotateCw size={20} />
          Recarregar App
        </button>

        {/* Botão Sair da Conta */}
        <button
          onClick={handleLogout}
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            fontWeight: 800,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          <LogOut size={20} />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}

