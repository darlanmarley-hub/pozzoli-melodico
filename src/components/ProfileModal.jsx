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
    <div className="profile-page-container" style={{ paddingBottom: '60px' }}>
      {/* Título & Subtítulo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
          Seu Perfil
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
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
                width: '90px',
                height: '90px',
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
              {!photoUrl && <User size={44} />}
            </div>
            <label
              htmlFor="profile-photo-input"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'var(--accent-orange)',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
              }}
              title="Carregar nova foto"
            >
              <Upload size={16} />
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
                fontSize: '0.85rem',
                color: 'var(--accent-orange)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Upload size={14} /> Carregar foto de perfil
            </label>
          </div>
        </div>

        {/* Aviso de Sincronização na Nuvem (Diretamente Abaixo da Foto do Usuário) */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 102, 0, 0.1) 0%, rgba(19, 25, 39, 0.6) 100%)',
            border: '1px solid var(--border-orange)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <Cloud size={24} style={{ color: 'var(--accent-orange)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
              Sincronização na nuvem
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
              sua conta está pronta para salvar sessões de estudos.
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
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              E-mail do usuário:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
              <Mail size={18} color="var(--accent-orange)" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  width: '100%',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Status: Conta Conectada - Online */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
              <ShieldCheck size={18} color="#10b981" />
              <span>Conta conectada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
              Online
            </div>
          </div>
        </div>

        {/* Botão Recarregar App */}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid #3b82f6',
            color: '#60a5fa',
            fontWeight: 800,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          <RotateCw size={18} />
          Recarregar App
        </button>

        {/* Botão Sair da Conta */}
        <button
          onClick={handleLogout}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            fontWeight: 800,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          <LogOut size={18} />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}

