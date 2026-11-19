import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  KeyRound,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import {
  saveAuthUser,
  saveProfile,
  getProfile,
  loadUserDataFromSupabase,
  syncUserDataToSupabase,
  checkActiveDeviceConflict,
  registerActiveDeviceSession,
  getPausedDeviceUser,
  clearPausedDeviceUser
} from '../utils/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function LoginPage({ onLoginSuccess }) {
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Mode & Modals state
  const [isValidationMode, setIsValidationMode] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Estado de conflito de dispositivo único (1 aparelho por vez)
  const [deviceConflictModal, setDeviceConflictModal] = useState(null);
  const [isDisconnectingDevice, setIsDisconnectingDevice] = useState(false);
  const [pausedDeviceInfo, setPausedDeviceInfo] = useState(() => getPausedDeviceUser());
  const [isQuickReconnecting, setIsQuickReconnecting] = useState(false);

  // Estado da rota /criar-senha (vinda do botão "Criar minha senha" ou "Redefinir minha senha" do e-mail da Brevo)
  const [isCreatePasswordMode, setIsCreatePasswordMode] = useState(false);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [createPwdEmail, setCreatePwdEmail] = useState('');
  const [createPwdToken, setCreatePwdToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [createPwdLoading, setCreatePwdLoading] = useState(false);
  const [createPwdError, setCreatePwdError] = useState('');
  const [createPwdSuccess, setCreatePwdSuccess] = useState(false);

  useEffect(() => {
    try {
      setPausedDeviceInfo(getPausedDeviceUser());
      const kickedReason = sessionStorage.getItem('pozzoli_kicked_reason');
      if (kickedReason) {
        if (!getPausedDeviceUser()) {
          setErrorMessage(kickedReason);
        }
        sessionStorage.removeItem('pozzoli_kicked_reason');
      }

      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email') || '';
      const tokenParam = params.get('token') || '';
      const modeParam = params.get('mode') || '';
      const hashStr = (window.location.hash || '').toLowerCase();
      if (path.includes('/criar-senha') || tokenParam || hashStr.includes('type=recovery')) {
        setIsCreatePasswordMode(true);
        if (modeParam === 'reset' || hashStr.includes('type=recovery')) {
          setIsPasswordResetMode(true);
        }
        if (tokenParam) {
          setCreatePwdToken(tokenParam);
        }
        if (emailParam) {
          setCreatePwdEmail(emailParam.trim().toLowerCase());
          setEmail(emailParam.trim().toLowerCase());
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Cadastrar ou redefinir senha pelo link enviado no e-mail da Brevo (/criar-senha)
  const handleCreatePasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setCreatePwdError('');
    setCreatePwdSuccess(false);

    const targetEmail = createPwdEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setCreatePwdError('Por favor, informe o e-mail da sua conta.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setCreatePwdError('Sua nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setCreatePwdError('As senhas digitadas não conferem.');
      return;
    }

    setCreatePwdLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        let sbUser = null;

        if (createPwdToken) {
          // 1. Valida o token único no servidor e atualiza a senha
          const edgeRes = await fetch('https://ejjemzuvyzmxyjteeonz.supabase.co/functions/v1/super-worker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'set_password',
              email: targetEmail,
              password: newPassword,
              token: createPwdToken
            })
          });
          const edgeData = await edgeRes.json().catch(() => ({}));
          if (!edgeRes.ok) {
            setCreatePwdLoading(false);
            setCreatePwdError(
              edgeData?.error || 'Link inválido ou expirado. Solicite um novo link em "Esqueceu a senha?".'
            );
            return;
          }

          const authRes = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: newPassword
          });
          if (authRes.error || !authRes.data?.user) {
            setCreatePwdLoading(false);
            setCreatePwdError('Senha salva, mas não foi possível entrar automaticamente. Faça login abaixo.');
            return;
          }
          sbUser = authRes.data.user;
        } else {
          // Fluxo alternativo: link nativo do Supabase Auth (sessão de recovery já ativa na URL)
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            setCreatePwdLoading(false);
            setCreatePwdError(
              'Link de segurança ausente ou expirado. Clique em "Esqueceu a senha?" para receber um novo link.'
            );
            return;
          }
          const { data: updatedData, error: updateErr } = await supabase.auth.updateUser({
            password: newPassword
          });
          if (updateErr || !updatedData?.user) {
            setCreatePwdLoading(false);
            setCreatePwdError(updateErr?.message || 'Não foi possível atualizar sua senha.');
            return;
          }
          sbUser = updatedData.user;
        }

        // 2. Verifica se a compra não foi reembolsada/cancelada ou expirada (plano anual)
        const { data: userPlano } = await supabase
          .from('users_plano')
          .select('id, status, data_final')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (userPlano?.status === 'cancelado') {
          await supabase.auth.signOut();
          setCreatePwdLoading(false);
          setCreatePwdError('O acesso desta compra encontra-se cancelado ou reembolsado.');
          return;
        }

        if (userPlano?.data_final && new Date(userPlano.data_final) < new Date()) {
          await supabase.auth.signOut();
          setCreatePwdLoading(false);
          setCreatePwdError('Seu plano anual expirou. Renove sua assinatura para continuar acessando.');
          return;
        }

        if (userPlano?.status === 'primeiro-acesso') {
          const nowIso = new Date().toISOString();
          await supabase
            .from('users_plano')
            .update({ status: 'ativo', updated_at: nowIso })
            .eq('id', sbUser.id);
        }

        await loadUserDataFromSupabase(sbUser.id);
        await registerActiveDeviceSession(sbUser.id);

        const nowIso = new Date().toISOString();
        const user = {
          id: sbUser.id,
          email: sbUser.email || targetEmail,
          name: sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || targetEmail.split('@')[0],
          provider: 'supabase',
          avatar: '🎵',
          loginTime: nowIso
        };

        saveAuthUser(user);
        setCreatePwdLoading(false);
        setCreatePwdSuccess(true);
        window.history.replaceState({}, '', '/');

        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user);
        }, 500);
      }
    } catch {
      setCreatePwdLoading(false);
      setCreatePwdError('Erro ao conectar ao servidor para salvar sua senha.');
    }
  };

  // Botão de 1 Clique para voltar a entrar no dispositivo que foi desconectado
  const handleQuickReconnectDevice = async () => {
    if (!pausedDeviceInfo?.user) return;
    setIsQuickReconnecting(true);
    setErrorMessage('');

    try {
      const targetUser = pausedDeviceInfo.user;

      if (isSupabaseConfigured && supabase && targetUser.id) {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          const refreshRes = await supabase.auth.refreshSession().catch(() => ({}));
          if (refreshRes?.data?.session) {
            session = refreshRes.data.session;
          }
        }
        if (!session?.user) {
          clearPausedDeviceUser();
          setPausedDeviceInfo(null);
          setIsQuickReconnecting(false);
          setErrorMessage('Sua sessão expirou neste dispositivo. Faça login abaixo com seu e-mail e senha.');
          return;
        }

        const { data: userPlano } = await supabase
          .from('users_plano')
          .select('id, status, data_final')
          .eq('id', targetUser.id)
          .maybeSingle();

        if (userPlano?.status === 'cancelado') {
          clearPausedDeviceUser();
          setPausedDeviceInfo(null);
          await supabase.auth.signOut();
          setIsQuickReconnecting(false);
          setErrorMessage('O acesso desta compra encontra-se cancelado ou reembolsado.');
          return;
        }

        if (userPlano?.data_final && new Date(userPlano.data_final) < new Date()) {
          clearPausedDeviceUser();
          setPausedDeviceInfo(null);
          await supabase.auth.signOut();
          setIsQuickReconnecting(false);
          setErrorMessage('Seu plano anual expirou. Renove sua assinatura para continuar acessando.');
          return;
        }

        await loadUserDataFromSupabase(targetUser.id);
        await registerActiveDeviceSession(targetUser.id);
      }

      clearPausedDeviceUser();
      setPausedDeviceInfo(null);
      saveAuthUser(targetUser);
      setIsQuickReconnecting(false);
      setSuccessMessage('Conectado de volta neste dispositivo! Entrando...');

      if (onLoginSuccess) {
        setTimeout(() => onLoginSuccess(targetUser), 250);
      }
    } catch {
      setIsQuickReconnecting(false);
      setErrorMessage('Não foi possível reconectar automaticamente. Faça login abaixo.');
    }
  };

  // Validation fields
  const [validationEmail, setValidationEmail] = useState('');
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [validationSuccessMsg, setValidationSuccessMsg] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Handle standard email/password login
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Por favor, digite sua senha.');
      return;
    }

    setIsLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });

        if (error) {
          setIsLoading(false);
          setErrorMessage(
            error.message === 'Invalid login credentials'
              ? 'E-mail ou senha incorretos. Se é seu primeiro acesso, clique em "Valide seu acesso aqui".'
              : error.message
          );
          return;
        }

        const sbUser = data.user;

        // Verifica status e validade do plano na tabela users_plano
        const { data: userPlano } = await supabase
          .from('users_plano')
          .select('id, status, data_inicio, data_final, plano_id')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (userPlano?.status === 'cancelado') {
          await supabase.auth.signOut();
          setIsLoading(false);
          setErrorMessage('O acesso desta compra encontra-se cancelado ou reembolsado.');
          return;
        }

        if (userPlano?.data_final && new Date(userPlano.data_final) < new Date()) {
          await supabase.auth.signOut();
          setIsLoading(false);
          setErrorMessage('Seu plano anual expirou. Renove sua assinatura para continuar acessando.');
          return;
        }

        if (userPlano?.status === 'primeiro-acesso') {
          await supabase
            .from('users_plano')
            .update({ status: 'ativo', updated_at: new Date().toISOString() })
            .eq('id', sbUser.id);
        }

        const user = {
          id: sbUser.id,
          email: sbUser.email,
          name: sbUser.user_metadata?.full_name || sbUser.email.split('@')[0],
          provider: 'supabase',
          avatar: '🎵',
          loginTime: new Date().toISOString()
        };

        // Conecta diretamente neste dispositivo e assume a sessão ativa (sem modal ou aviso bloqueante)
        await loadUserDataFromSupabase(sbUser.id);
        await registerActiveDeviceSession(sbUser.id);
        saveAuthUser(user);
        setIsLoading(false);
        setSuccessMessage('Login efetuado com sucesso!');
        if (onLoginSuccess) {
          setTimeout(() => onLoginSuccess(user), 300);
        }
        return;
      } catch (err) {
        setIsLoading(false);
        setErrorMessage('Erro ao conectar ao servidor de autenticação.');
        return;
      }
    }

    setIsLoading(false);
    setErrorMessage('Servidor de autenticação não configurado.');
  };

  // Handle Purchase Access Validation ("VALIDAR E-MAIL DE COMPRA")
  const handleValidateAccess = async (e) => {
    if (e) e.preventDefault();
    setValidationError('');
    setValidationSuccess(false);
    setValidationSuccessMsg('');

    if (!validationEmail.trim() || !validationEmail.includes('@')) {
      setValidationError('Por favor, informe um e-mail válido de compra.');
      return;
    }

    setValidationLoading(true);

    try {
      const cleanEmail = validationEmail.trim().toLowerCase();
      const res = await fetch('https://ejjemzuvyzmxyjteeonz.supabase.co/functions/v1/super-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_purchase_access',
          email: cleanEmail
        })
      });

      const data = await res.json().catch(() => ({}));
      setValidationLoading(false);

      if (!res.ok) {
        setValidationError(
          data?.error ||
            'E-mail de compra não encontrado. Verifique se digitou o mesmo e-mail usado na compra ou se o pagamento já foi aprovado.'
        );
        return;
      }

      setValidationSuccess(true);
      setValidationSuccessMsg(
        data?.message ||
          'Compra confirmada! Enviamos para o seu e-mail o link seguro para você cadastrar sua senha.'
      );
    } catch {
      setValidationLoading(false);
      setValidationError('Não foi possível validar o acesso no servidor.');
    }
  };

  // Confirmar desconexão do aparelho anterior e entrar neste dispositivo
  const handleConfirmDisconnectOtherDevice = async () => {
    if (!deviceConflictModal) return;
    setIsDisconnectingDevice(true);

    try {
      const { userId, user, planName, isFromValidation } = deviceConflictModal;

      await loadUserDataFromSupabase(userId);
      if (isFromValidation && planName) {
        const existingProfile = getProfile();
        localStorage.setItem(
          'pozzoli_profile',
          JSON.stringify({
            ...existingProfile,
            name: user.name,
            email: user.email,
            plan: planName
          })
        );
      }
      await registerActiveDeviceSession(userId);
      saveAuthUser(user);

      setIsDisconnectingDevice(false);
      setDeviceConflictModal(null);

      if (isFromValidation) {
        setValidationSuccess(true);
      } else {
        setSuccessMessage('Dispositivo anterior desconectado! Entrando...');
      }

      if (onLoginSuccess) {
        setTimeout(() => onLoginSuccess(user), 350);
      }
    } catch {
      setIsDisconnectingDevice(false);
      setDeviceConflictModal(null);
      setErrorMessage('Não foi possível desconectar o dispositivo anterior. Tente novamente.');
    }
  };

  const handleCancelDeviceConflict = async () => {
    setDeviceConflictModal(null);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ignore
      }
    }
  };

  // Handle Forgot Password (dispara e-mail de recuperação via Brevo)
  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    const targetEmail = forgotEmail.trim().toLowerCase();
    setForgotError('');
    if (!targetEmail || !targetEmail.includes('@')) {
      setForgotError('Por favor, informe um e-mail válido.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch('https://ejjemzuvyzmxyjteeonz.supabase.co/functions/v1/super-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forgot_password',
          email: targetEmail
        })
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        setForgotLoading(false);
        setForgotSent(true);
        return;
      }

      if (data?.error && res.status >= 400 && res.status < 500) {
        setForgotLoading(false);
        setForgotError(data.error);
        return;
      }

      if (isSupabaseConfigured && supabase) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${window.location.origin}/criar-senha?email=${encodeURIComponent(targetEmail)}&mode=reset`
        });
        setForgotLoading(false);
        if (resetErr) {
          setForgotError(resetErr.message || 'Erro ao enviar e-mail de recuperação.');
          return;
        }
        setForgotSent(true);
        return;
      }
    } catch {
      if (isSupabaseConfigured && supabase) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${window.location.origin}/criar-senha?email=${encodeURIComponent(targetEmail)}&mode=reset`
        });
        setForgotLoading(false);
        if (resetErr) {
          setForgotError(resetErr.message || 'Erro ao enviar e-mail de recuperação.');
          return;
        }
        setForgotSent(true);
        return;
      }
    }

    setForgotLoading(false);
    setForgotError('Não foi possível enviar o e-mail de recuperação agora. Tente novamente.');
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-screen-container">
        {/* Ambient Top Glow */}
        <div className="login-glow-orb"></div>

        {/* 1. Header com Título do App */}
        <header className="login-header">
          <h2 className="login-header-welcome">
            Bem vindo ao aplicativo web
          </h2>
          <h1 className="login-header-title">
            POZZOLI <span className="melodico-highlight">MELÓDICO</span> NO<br />BOLSO
          </h1>
        </header>

        {/* Card de Reconexão Rápida em 1 Clique (quando o usuário saiu deste aparelho para usar outro) */}
        {pausedDeviceInfo?.user && (
          <div
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(30, 22, 14, 0.98) 0%, rgba(18, 13, 8, 0.98) 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '20px',
              padding: '24px 18px',
              marginBottom: '20px',
              boxShadow: '0 12px 36px rgba(245, 158, 11, 0.28)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
            }}
          >
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%)',
                border: '1.5px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Smartphone size={30} />
            </div>

            <div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.18)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '3px 12px',
                  borderRadius: '20px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                Sessão em Outro Aparelho
              </span>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '8px 0 4px 0',
                  lineHeight: 1.3
                }}
              >
                Continuar neste dispositivo?
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#d1c4b4', lineHeight: 1.5, margin: 0 }}>
                A conta <strong>{pausedDeviceInfo.user.email}</strong> foi conectada recentemente em{' '}
                <strong style={{ color: '#fbbf24' }}>
                  {pausedDeviceInfo.replacedBy || 'outro aparelho'}
                </strong>.
              </p>
            </div>

            {/* BOTÃO PRINCIPAL: 1 TOQUE PARA RETOMAR */}
            <button
              type="button"
              onClick={handleQuickReconnectDevice}
              disabled={isQuickReconnecting}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '16px 20px',
                fontSize: '0.96rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 6px 22px rgba(245, 158, 11, 0.45)',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 26px rgba(245, 158, 11, 0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 6px 22px rgba(245, 158, 11, 0.45)';
              }}
            >
              {isQuickReconnecting ? (
                <span className="btn-spinner btn-spinner-dark"></span>
              ) : (
                <>
                  <Smartphone size={20} />
                  <span>CONTINUAR NESTE APARELHO</span>
                </>
              )}
            </button>

            <span style={{ fontSize: '0.76rem', color: '#9e8f7c', lineHeight: 1.35 }}>
              ⚡ Toque uma vez no botão acima para voltar a estudar neste aparelho imediatamente de onde parou.
            </span>

            {/* Link para entrar com outra conta se desejar */}
            <button
              type="button"
              onClick={() => {
                clearPausedDeviceUser();
                setPausedDeviceInfo(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#a89a88',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Entrar com outra conta
            </button>
          </div>
        )}

        {/* 2. Banner de Alternância: Validação / Login */}
        <div className="validation-banner">
          <div className="validation-banner-left">
            <Sparkles className="validation-icon" size={20} />
            {isValidationMode ? (
              <span className="validation-text validation-text-active">
                Já possui login e senha?
              </span>
            ) : (
              <span className="validation-text">
                Primeiro acesso ou<br />comprou agora?
              </span>
            )}
          </div>

          <button 
            type="button" 
            className={`validation-btn ${isValidationMode ? 'validation-btn-single' : ''}`}
            onClick={() => {
              if (isValidationMode) {
                setIsValidationMode(false);
                setErrorMessage('');
                setSuccessMessage('');
              } else {
                setValidationEmail(email || '');
                setValidationSuccess(false);
                setValidationError('');
                setIsValidationMode(true);
              }
            }}
          >
            <ShieldCheck size={18} className="shield-icon" />
            {isValidationMode ? (
              <span className="validation-btn-text">FAÇA LOGIN</span>
            ) : (
              <span className="validation-btn-text">
                VALIDE SEU<br />ACESSO AQUI
              </span>
            )}
          </button>
        </div>

        {/* 3. Card Principal (Criar Senha, Validação ou Login) */}
        <div className="login-card">
          {isCreatePasswordMode ? (
            <>
              <div className="login-card-header validation-card-header">
                <h3 className="login-card-title">
                  {isPasswordResetMode ? 'REDEFINIR SUA SENHA' : 'CRIE SUA SENHA'}
                </h3>
                <p className="login-card-subtitle validation-card-subtitle">
                  {isPasswordResetMode
                    ? 'Digite abaixo sua nova senha de acesso ao Pozzoli Melódico no Bolso'
                    : 'Cadastre sua senha de acesso ao Pozzoli Melódico no Bolso'}
                </p>
              </div>

              {createPwdError && (
                <div className="login-alert login-alert-error">
                  <AlertCircle size={18} />
                  <span>{createPwdError}</span>
                </div>
              )}

              {createPwdSuccess && (
                <div className="login-alert login-alert-success">
                  <CheckCircle2 size={18} />
                  <span>Senha criada com sucesso! Entrando no aplicativo...</span>
                </div>
              )}

              <form onSubmit={handleCreatePasswordSubmit} className="login-form">
                <div className="login-input-group">
                  <input
                    type="email"
                    className="login-input"
                    placeholder="Seu e-mail de compra"
                    value={createPwdEmail}
                    onChange={(e) => setCreatePwdEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="login-input-group login-password-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input login-password-input"
                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <div className="login-input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="Confirme sua nova senha"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="validation-card-submit-btn"
                  disabled={createPwdLoading}
                >
                  {createPwdLoading ? (
                    <span className="btn-spinner btn-spinner-dark"></span>
                  ) : (
                    <>
                      <KeyRound size={20} className="shield-icon" />
                      <span>SALVAR SENHA E ENTRAR</span>
                    </>
                  )}
                </button>
              </form>

              <div className="login-forgot-wrapper" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => {
                    setIsCreatePasswordMode(false);
                    window.history.replaceState({}, '', '/');
                  }}
                >
                  Já tenho senha — Voltar para o Login
                </button>
              </div>
            </>
          ) : isValidationMode ? (
            <>
              <div className="login-card-header validation-card-header">
                <h3 className="login-card-title">VALIDE SEU ACESSO</h3>
                <p className="login-card-subtitle validation-card-subtitle">
                  Informe o e-mail usado na compra para validar o seu<br />acesso
                </p>
              </div>

              {validationError && (
                <div className="login-alert login-alert-error">
                  <AlertCircle size={18} />
                  <span>{validationError}</span>
                </div>
              )}

              {validationSuccess && (
                <div className="login-alert login-alert-success">
                  <CheckCircle2 size={18} />
                  <span>
                    {validationSuccessMsg ||
                      'Compra confirmada! Confira seu e-mail para cadastrar sua senha.'}
                  </span>
                </div>
              )}

              <form onSubmit={handleValidateAccess} className="login-form">
                <div className="login-input-group">
                  <input
                    id="validation-email-input"
                    type="email"
                    className="login-input validation-email-input"
                    placeholder="Seu e-mail de compra"
                    value={validationEmail}
                    onChange={(e) => setValidationEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <button
                  id="validation-submit-btn"
                  type="submit"
                  className="validation-card-submit-btn"
                  disabled={validationLoading}
                >
                  {validationLoading ? (
                    <span className="btn-spinner btn-spinner-dark"></span>
                  ) : (
                    <>
                      <ShieldCheck size={20} className="shield-icon" />
                      <span>VALIDAR E-MAIL DE COMPRA</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="login-card-header">
                <h3 className="login-card-title">Acesse sua conta</h3>
                <p className="login-card-subtitle">Faça login para acessar</p>
              </div>

              {/* Feedback messages */}
              {errorMessage && (
                <div className="login-alert login-alert-error">
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="login-alert login-alert-success">
                  <CheckCircle2 size={18} />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Formulário de Login */}
              <form onSubmit={handleLogin} className="login-form">
                {/* Campo E-mail */}
                <div className="login-input-group">
                  <input
                    id="login-email-input"
                    type="email"
                    className="login-input"
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                {/* Campo Senha com Toggle */}
                <div className="login-input-group login-password-group">
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input login-password-input"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Botão Entrar */}
                <button
                  id="login-submit-btn"
                  type="submit"
                  className="login-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="btn-spinner"></span>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>

              {/* Link Esqueceu a Senha */}
              <div className="login-forgot-wrapper">
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => {
                    setForgotEmail(email || '');
                    setForgotSent(false);
                    setForgotError('');
                    setShowForgotModal(true);
                  }}
                >
                  Esqueceu a senha?
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: DISPOSITIVO CONECTADO EM OUTRO LUGAR (SESSÃO ÚNICA)   */}
      {/* ============================================================== */}
      {deviceConflictModal && (
        <div className="login-modal-overlay">
          <div className="login-modal-container" style={{ maxWidth: '410px' }}>
            <div className="login-modal-header">
              <div className="login-modal-header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={22} className="modal-icon-orange" style={{ color: '#f59e0b' }} />
                <h3 style={{ fontSize: '1.02rem' }}>Conta Conectada em Outro Aparelho</h3>
              </div>
              <button
                type="button"
                className="login-modal-close"
                onClick={handleCancelDeviceConflict}
              >
                <X size={20} />
              </button>
            </div>

            <div className="login-modal-body" style={{ textAlign: 'center', padding: '20px 18px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                  color: '#fbbf24'
                }}
              >
                <Smartphone size={26} />
              </div>

              <p className="login-modal-desc" style={{ fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '12px', color: '#efe6d5' }}>
                Sua conta já está conectada em{' '}
                <strong style={{ color: '#fbbf24' }}>
                  {deviceConflictModal.activeDevice?.deviceName || 'outro dispositivo'}
                </strong>.
              </p>

              <p className="login-modal-desc" style={{ fontSize: '0.84rem', lineHeight: 1.45, marginBottom: '20px', color: '#c9b8a3' }}>
                O acesso simultâneo não é permitido (apenas <strong>1 dispositivo por vez</strong>). Clique abaixo para desconectar o aparelho anterior e entrar normalmente aqui.
              </p>

              <button
                type="button"
                className="login-submit-btn"
                disabled={isDisconnectingDevice}
                onClick={handleConfirmDisconnectOtherDevice}
                style={{
                  width: '100%',
                  marginBottom: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '13px 16px'
                }}
              >
                {isDisconnectingDevice ? (
                  <span className="btn-spinner"></span>
                ) : (
                  'Desconectar Aparelho Anterior e Entrar'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancelDeviceConflict}
                disabled={isDisconnectingDevice}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#c9b8a3',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ESQUECEU A SENHA                                      */}
      {/* ============================================================== */}
      {showForgotModal && (
        <div className="login-modal-overlay">
          <div className="login-modal-container">
            <div className="login-modal-header">
              <div className="login-modal-header-title">
                <KeyRound size={22} className="modal-icon-orange" />
                <h3>Recuperação de Senha</h3>
              </div>
              <button 
                type="button"
                className="login-modal-close" 
                onClick={() => setShowForgotModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="login-modal-body">
              {forgotSent ? (
                <div className="modal-success-state">
                  <CheckCircle2 size={56} className="modal-success-icon" />
                  <h4>Instruções Enviadas!</h4>
                  <p>
                    Se o e-mail <strong>{forgotEmail}</strong> estiver cadastrado em nossa base, 
                    enviamos um link com as instruções para redefinir sua senha.
                  </p>
                  <button
                    type="button"
                    className="login-submit-btn"
                    style={{ marginTop: '20px' }}
                    onClick={() => setShowForgotModal(false)}
                  >
                    Voltar para o Login
                  </button>
                </div>
              ) : (
                <>
                  <p className="login-modal-desc">
                    Insira o e-mail cadastrado na sua conta para enviarmos as instruções de redefinição de senha.
                  </p>

                  {forgotError && (
                    <div className="login-alert login-alert-error" style={{ marginBottom: '12px' }}>
                      <AlertCircle size={18} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="login-form">
                    <div className="login-input-group">
                      <label className="modal-input-label">Seu e-mail cadastrado:</label>
                      <input
                        type="email"
                        className="login-input"
                        placeholder="seu@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="login-submit-btn"
                      disabled={forgotLoading}
                      style={{ marginTop: '12px' }}
                    >
                      {forgotLoading ? (
                        <span className="btn-spinner"></span>
                      ) : (
                        'Enviar Link de Recuperação'
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
