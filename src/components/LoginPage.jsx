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

  // Estado da rota /criar-senha (vinda do botão "Criar minha senha" do e-mail da Brevo)
  const [isCreatePasswordMode, setIsCreatePasswordMode] = useState(false);
  const [createPwdEmail, setCreatePwdEmail] = useState('');
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
        setErrorMessage(kickedReason);
        sessionStorage.removeItem('pozzoli_kicked_reason');
      }

      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email') || '';
      const tokenParam = params.get('token') || '';
      if (path.includes('/criar-senha') || tokenParam) {
        setIsCreatePasswordMode(true);
        if (emailParam) {
          setCreatePwdEmail(emailParam.trim().toLowerCase());
          setEmail(emailParam.trim().toLowerCase());
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Cadastrar nova senha pelo link enviado no e-mail da Brevo (/criar-senha)
  const handleCreatePasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setCreatePwdError('');
    setCreatePwdSuccess(false);

    const targetEmail = createPwdEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setCreatePwdError('Por favor, informe o e-mail usado na sua compra.');
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
        // 1. Tenta autenticar com a senha inicial gerada pelo Webhook da SyncPay
        let authRes = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: 'Pozzoli123!'
        });

        if (authRes.error) {
          // Caso o aluno já tenha trocado para essa mesma senha antes
          authRes = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: newPassword
          });
        }

        if (authRes.error || !authRes.data?.user) {
          setCreatePwdLoading(false);
          setIsCreatePasswordMode(false);
          window.history.replaceState({}, '', '/');
          setEmail(targetEmail);
          setErrorMessage(
            'Sua senha já foi cadastrada anteriormente ou o e-mail não foi localizado. Faça login com sua senha ou clique em "Esqueceu a senha?".'
          );
          return;
        }

        const sbUser = authRes.data.user;

        // 2. Atualiza a senha do usuário no Supabase Auth para a senha escolhida por ele
        const { error: updateErr } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateErr) {
          setCreatePwdLoading(false);
          setCreatePwdError('Não foi possível salvar a nova senha: ' + updateErr.message);
          return;
        }

        // 3. Ativa o plano em users_plano
        const nowIso = new Date().toISOString();
        await supabase
          .from('users_plano')
          .update({ status: 'ativo', updated_at: nowIso })
          .eq('id', sbUser.id);

        await loadUserDataFromSupabase(sbUser.id);
        await registerActiveDeviceSession(sbUser.id);

        const user = {
          id: sbUser.id,
          email: targetEmail,
          name: sbUser.user_metadata?.full_name || targetEmail.split('@')[0],
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user && targetUser.provider === 'purchase_validation' && targetUser.email) {
          await supabase.auth.signInWithPassword({
            email: targetUser.email,
            password: 'Pozzoli123!'
          });
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

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

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

        // Verifica se a conta já está conectada em outro dispositivo
        const conflict = await checkActiveDeviceConflict(sbUser.id);
        if (conflict.hasConflict) {
          setIsLoading(false);
          setDeviceConflictModal({
            userId: sbUser.id,
            user,
            planName: null,
            isFromValidation: false,
            activeDevice: conflict.activeDevice
          });
          return;
        }

        await loadUserDataFromSupabase(sbUser.id);
        await registerActiveDeviceSession(sbUser.id, false);
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

    setTimeout(() => {
      setIsLoading(false);
      const user = {
        id: `user_${Date.now()}`,
        email: email.trim(),
        name: email.split('@')[0],
        provider: 'email',
        avatar: '🎵',
        loginTime: new Date().toISOString()
      };

      saveAuthUser(user);
      const existingProfile = getProfile();
      saveProfile({
        ...existingProfile,
        name: user.name,
        email: user.email
      });

      setSuccessMessage('Login efetuado com sucesso!');
      if (onLoginSuccess) {
        setTimeout(() => onLoginSuccess(user), 400);
      }
    }, 600);
  };

  // Handle Purchase Access Validation ("VALIDAR E-MAIL DE COMPRA")
  const handleValidateAccess = async (e) => {
    if (e) e.preventDefault();
    setValidationError('');
    setValidationSuccess(false);

    if (!validationEmail.trim() || !validationEmail.includes('@')) {
      setValidationError('Por favor, informe um e-mail válido de compra.');
      return;
    }

    setValidationLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const cleanEmail = validationEmail.trim().toLowerCase();
        const defaultPassword = 'Pozzoli123!';

        // 1. Autentica o comprador que foi cadastrado automaticamente pelo Webhook da SyncPay
        const authResult = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: defaultPassword
        });

        if (authResult.error || !authResult.data?.user) {
          setValidationLoading(false);
          setValidationError(
            'E-mail de compra não encontrado. Verifique se digitou o mesmo e-mail usado na compra ou se o pagamento já foi aprovado.'
          );
          return;
        }

        const sbUser = authResult.data.user;

        // 2. Verifica o plano do comprador na tabela users_plano
        const { data: userPlano } = await supabase
          .from('users_plano')
          .select('id, status, data_inicio, data_final, plano_id, planos(nome, titulo)')
          .eq('id', sbUser.id)
          .maybeSingle();

        if (userPlano?.status === 'cancelado') {
          await supabase.auth.signOut();
          setValidationLoading(false);
          setValidationError('O acesso desta compra encontra-se cancelado ou reembolsado.');
          return;
        }

        if (userPlano?.data_final && new Date(userPlano.data_final) < new Date()) {
          await supabase.auth.signOut();
          setValidationLoading(false);
          setValidationError('Seu plano anual expirou. Renove sua assinatura para continuar acessando.');
          return;
        }

        const planName = userPlano?.planos?.nome || sbUser.user_metadata?.plan || 'vitalicio';
        const nowIso = new Date().toISOString();

        // 3. Muda o status de 'primeiro-acesso' para 'ativo' na tabela users_plano
        if (userPlano) {
          await supabase
            .from('users_plano')
            .update({
              status: 'ativo',
              data_inicio: userPlano.data_inicio || nowIso,
              updated_at: nowIso
            })
            .eq('id', sbUser.id);
        }

        const user = {
          id: sbUser.id,
          email: cleanEmail,
          name: sbUser.user_metadata?.full_name || cleanEmail.split('@')[0],
          provider: 'purchase_validation',
          transactionCode: sbUser.user_metadata?.transaction_code || 'SYNCPAY',
          plan: planName,
          avatar: '⭐',
          loginTime: nowIso
        };

        // Verifica se a conta já está conectada em outro dispositivo
        const conflict = await checkActiveDeviceConflict(sbUser.id);
        if (conflict.hasConflict) {
          setValidationLoading(false);
          setDeviceConflictModal({
            userId: sbUser.id,
            user,
            planName,
            isFromValidation: true,
            activeDevice: conflict.activeDevice
          });
          return;
        }

        await loadUserDataFromSupabase(sbUser.id);
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
        await registerActiveDeviceSession(sbUser.id);
        saveAuthUser(user);

        setValidationLoading(false);
        setValidationSuccess(true);
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(user);
        }, 600);
        return;
      } catch (err) {
        setValidationLoading(false);
        setValidationError('Não foi possível validar o acesso no servidor.');
        return;
      }
    }

    setTimeout(() => {
      setValidationLoading(false);
      setValidationSuccess(true);

      const user = {
        id: `validated_${Date.now()}`,
        email: validationEmail.trim(),
        name: validationEmail.split('@')[0],
        provider: 'purchase_validation',
        transactionCode: 'POZZOLI-VIP',
        plan: 'vitalicio',
        avatar: '⭐',
        loginTime: new Date().toISOString()
      };

      saveAuthUser(user);
      const existingProfile = getProfile();
      saveProfile({
        ...existingProfile,
        name: user.name,
        email: user.email,
        plan: 'vitalicio'
      });

      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(user);
      }, 600);
    }, 800);
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

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      alert('Por favor, informe um e-mail válido.');
      return;
    }

    setForgotLoading(true);
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin
      });
      setForgotLoading(false);
      setForgotSent(true);
      return;
    }

    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
    }, 800);
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
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(30, 22, 14, 0.95) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.55)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 8px 26px rgba(0, 0, 0, 0.45)',
              textAlign: 'center',
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '0.88rem',
                marginBottom: '6px'
              }}
            >
              <Smartphone size={18} />
              <span>Dispositivo Desconectado</span>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#efe6d5', lineHeight: 1.45, margin: '0 0 12px 0' }}>
              A conta <strong>{pausedDeviceInfo.user.email}</strong> foi conectada em{' '}
              <strong style={{ color: '#fbbf24' }}>{pausedDeviceInfo.replacedBy || 'outro aparelho'}</strong>.
              Quando quiser voltar a usar neste dispositivo, basta clicar no botão abaixo:
            </p>

            <button
              type="button"
              onClick={handleQuickReconnectDevice}
              disabled={isQuickReconnecting}
              className="validation-card-submit-btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px 16px',
                fontSize: '0.86rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {isQuickReconnecting ? (
                <span className="btn-spinner btn-spinner-dark"></span>
              ) : (
                <>
                  <Smartphone size={18} />
                  <span>VOLTAR A ENTRAR NESTE DISPOSITIVO</span>
                </>
              )}
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
                <h3 className="login-card-title">CRIE SUA SENHA</h3>
                <p className="login-card-subtitle validation-card-subtitle">
                  Cadastre sua senha de acesso ao Pozzoli Melódico no Bolso
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
                  <span>Acesso validado com sucesso! Entrando...</span>
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
