import { useState, type FormEvent } from 'react'
import type { Provider } from '@supabase/supabase-js'
import { authRedirectUrl, isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthMode = 'login' | 'signup' | 'forgot' | 'recovery'

const authMessages: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Já existe uma conta com este e-mail.',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 8 caracteres.',
}

function friendlyError(message: string) {
  return authMessages[message] ?? message
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.3l3.3 2.6A5.8 5.8 0 0 1 12 5.9Z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M17.1 12.5c0-2.7 2.2-4 2.3-4.1a5 5 0 0 0-3.9-2.1c-1.7-.2-3.2 1-4.1 1-.9 0-2.2-1-3.6-1a5.3 5.3 0 0 0-4.5 2.8c-1.9 3.3-.5 8.2 1.4 10.9.9 1.3 2 2.8 3.5 2.7 1.4 0 1.9-.9 3.6-.9 1.7 0 2.2.9 3.6.9 1.5 0 2.5-1.3 3.4-2.7a12 12 0 0 0 1.5-3.1 4.7 4.7 0 0 1-3.2-4.4ZM14.4 4.6A4.8 4.8 0 0 0 15.5 1a4.9 4.9 0 0 0-3.3 1.7 4.6 4.6 0 0 0-1.2 3.5 4 4 0 0 0 3.4-1.6Z" />
    </svg>
  )
}

export function AuthScreen({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isLogin = mode === 'login'
  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'
  const isRecovery = mode === 'recovery'

  function changeMode(next: AuthMode) {
    setMode(next)
    setError(null)
    setNotice(null)
    setPassword('')
    setConfirmPassword('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!supabase) {
      setError('A conexão com o Supabase ainda precisa ser configurada.')
      return
    }
    if ((isSignup || isRecovery) && password.length < 8) {
      setError('Crie uma senha com pelo menos 8 caracteres.')
      return
    }
    if ((isSignup || isRecovery) && password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setBusy(true)
    try {
      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: authRedirectUrl(),
          },
        })
        if (authError) throw authError
        if (!data.session) {
          setNotice('Cadastro criado. Abra o e-mail enviado para confirmar sua conta.')
        }
      } else if (isForgot) {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl('recovery'),
        })
        if (authError) throw authError
        setNotice('Se este e-mail estiver cadastrado, você receberá o link para redefinir a senha.')
      } else if (isRecovery) {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        window.history.replaceState({}, '', import.meta.env.BASE_URL)
        setNotice('Senha atualizada. Você já pode continuar no Pesobic.')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente novamente.'
      setError(friendlyError(message))
    } finally {
      setBusy(false)
    }
  }

  async function socialLogin(provider: Provider) {
    setError(null)
    if (!supabase) {
      setError('A conexão com o Supabase ainda precisa ser configurada.')
      return
    }
    setBusy(true)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authRedirectUrl() },
    })
    if (authError) {
      setError(friendlyError(authError.message))
      setBusy(false)
    }
  }

  const title = isSignup
    ? 'Crie sua conta'
    : isForgot
      ? 'Recupere seu acesso'
      : isRecovery
        ? 'Defina uma nova senha'
        : 'Que bom ter você aqui'
  const subtitle = isSignup
    ? 'Seus registros ficam vinculados somente ao seu usuário.'
    : isForgot
      ? 'Enviaremos um link seguro para o seu e-mail.'
      : isRecovery
        ? 'Escolha uma senha nova para proteger sua conta.'
        : 'Entre para acompanhar seu tratamento com privacidade.'

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Sobre o Pesobic">
        <a className="auth-brand" href={import.meta.env.BASE_URL} aria-label="Pesobic">
          <img src="/logo.svg" alt="" width={42} height={42} />
          <span>Pesobic</span>
        </a>
        <div className="auth-story-copy">
          <p className="auth-kicker">Seu histórico, no seu ritmo</p>
          <h1>Cuide da jornada.<br />Nós organizamos os sinais.</h1>
          <p>Aplicações, evolução do peso, sintomas e rotina alimentar reunidos em um espaço pessoal.</p>
        </div>
        <div className="auth-timeline" aria-hidden="true">
          <span><i /> Aplicação registrada</span>
          <span><i /> Evolução acompanhada</span>
          <span><i /> Dados protegidos por usuário</span>
        </div>
        <p className="auth-privacy">Privacidade desde o primeiro registro.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <img src="/logo.svg" alt="" width={36} height={36} />
            <span>Pesobic</span>
          </div>
          <header className="auth-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>

          {!isForgot && !isRecovery && (
            <>
              <div className="social-grid">
                <button type="button" className="social-btn" disabled={busy || !isSupabaseConfigured} onClick={() => socialLogin('google')}>
                  <GoogleIcon /> Continuar com Google
                </button>
                <button type="button" className="social-btn social-apple" disabled={busy || !isSupabaseConfigured} onClick={() => socialLogin('apple')}>
                  <AppleIcon /> Continuar com Apple
                </button>
              </div>
              <div className="auth-divider"><span>ou use seu e-mail</span></div>
            </>
          )}

          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label>
                <span>Como podemos chamar você?</span>
                <input type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" required />
              </label>
            )}
            {!isRecovery && (
              <label>
                <span>E-mail</span>
                <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" required />
              </label>
            )}
            {!isForgot && (
              <label>
                <span>{isRecovery ? 'Nova senha' : 'Senha'}</span>
                <div className="password-field">
                  <input type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={isLogin ? undefined : 8} required />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </label>
            )}
            {(isSignup || isRecovery) && (
              <label>
                <span>Confirme a senha</span>
                <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite novamente" minLength={8} required />
              </label>
            )}
            {isLogin && <button type="button" className="auth-text-btn forgot-link" onClick={() => changeMode('forgot')}>Esqueci minha senha</button>}
            {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-feedback auth-success" role="status">{notice}</p>}
            {!isSupabaseConfigured && <p className="auth-feedback auth-warning">Configure as variáveis do Supabase para habilitar o acesso.</p>}
            <button type="submit" className="auth-submit" disabled={busy || !isSupabaseConfigured}>
              {busy ? 'Aguarde…' : isSignup ? 'Criar minha conta' : isForgot ? 'Enviar link de recuperação' : isRecovery ? 'Salvar nova senha' : 'Entrar'}
            </button>
          </form>

          <footer className="auth-switch">
            {isLogin && <>Ainda não tem conta? <button type="button" onClick={() => changeMode('signup')}>Criar cadastro</button></>}
            {isSignup && <>Já tem uma conta? <button type="button" onClick={() => changeMode('login')}>Entrar</button></>}
            {(isForgot || isRecovery) && <button type="button" onClick={() => changeMode('login')}>Voltar para o login</button>}
          </footer>
        </div>
      </section>
    </main>
  )
}
