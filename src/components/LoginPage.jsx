import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { saveAuthUser, saveProfile, getProfile, loadUserDataFromSupabase, syncUserDataToSupabase } from '../utils/storage';
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
        const user = {
          id: sbUser.id,
          email: sbUser.email,
          name: sbUser.user_metadata?.full_name || sbUser.email.split('@')[0],
          provider: 'supabase',
          avatar: '🎵',
          loginTime: new Date().toISOString()
        };

        saveAuthUser(user);
        await loadUserDataFromSupabase(sbUser.id);
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

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        setIsLoading(false);
        setErrorMessage(error.message);
      }
      return;
    }

    setTimeout(() => {
      setIsLoading(false);
      const googleUser = {
        id: `google_${Date.now()}`,
        email: 'estudante.google@gmail.com',
        name: 'Estudante Google',
        provider: 'google',
        avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        loginTime: new Date().toISOString()
      };

      saveAuthUser(googleUser);
      const existingProfile = getProfile();
      saveProfile({
        ...existingProfile,
        name: googleUser.name,
        email: googleUser.email,
        photoUrl: googleUser.avatar
      });

      if (onLoginSuccess) onLoginSuccess(googleUser);
    }, 700);
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

        saveAuthUser(user);
        await loadUserDataFromSupabase(sbUser.id);
        const existingProfile = getProfile();
        saveProfile({
          ...existingProfile,
          name: user.name,
          email: user.email,
          plan: planName
        });

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

        {/* 3. Card Principal (Login ou Validação) */}
        <div className="login-card">
          {isValidationMode ? (
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

              {/* Divisor "OU" */}
              <div className="login-divider">
                <span className="login-divider-line"></span>
                <span className="login-divider-text">OU</span>
                <span className="login-divider-line"></span>
              </div>

              {/* Botão Continuar com o Google */}
              <button
                type="button"
                className="login-google-btn"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="google-svg" viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.43 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continuar com o Google</span>
              </button>

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
