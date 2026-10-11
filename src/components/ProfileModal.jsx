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
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '94px',
                height: '94px',
                borderRadius: '50%',
                background: photoUrl ? `url(${photoUrl}) center/cover` : 'rgba(255, 255, 255, 0.06)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                color: 'var(--text-muted)',
                overflow: 'hidden'
              }}
            >
              {!photoUrl && <User size={48} color="var(--text-muted)" />}
            </div>
            <label
              htmlFor="profile-photo-input"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)'
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
                color: 'var(--text-main)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px'
              }}
            >
              <Upload size={16} color="var(--text-muted)" /> Carregar foto de perfil
            </label>
          </div>
        </div>

        {/* Aviso de Sincronização na Nuvem (Diretamente Abaixo da Foto do Usuário) */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}
        >
          <Cloud size={26} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '1.12rem', fontWeight: 700, color: 'var(--text-main)' }}>
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
            gap: '16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}
        >
          {/* E-mail do Usuário */}
          <div>
            <label style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              E-mail do usuário:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <Mail size={20} color="var(--text-muted)" />
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              <ShieldCheck size={20} color="var(--text-muted)" />
              <span>Conta conectada</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
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
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: 'var(--text-main)',
            fontWeight: 700,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          <RotateCw size={20} color="var(--text-muted)" />
          Recarregar App
        </button>

        {/* Botão Sair da Conta */}
        <button
          onClick={handleLogout}
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontWeight: 700,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
        >
          <LogOut size={20} color="#f87171" />
          Sair da Conta
        </button>
      </div>
    </div>
  );
}

