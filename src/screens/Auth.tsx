import { useState, type FormEvent } from 'react'
import { authRedirectUrl, isSupabaseConfigured, supabase } from '../lib/supabase'
import { friendlyAuthError, validateSignup } from '../lib/auth-validation'

export const LEGAL_VERSION = '2026-09-16'

type AuthMode = 'login' | 'signup' | 'forgot' | 'recovery'

export function AuthScreen({
  initialMode = 'login',
  onOpenLegal,
}: {
  initialMode?: AuthMode
  onOpenLegal?: (kind: 'privacidade' | 'termos') => void
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [healthDataConsent, setHealthDataConsent] = useState(false)
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
    if (isSignup) {
      const invalid = validateSignup({ password, confirmPassword, ageConfirmed, termsAccepted, healthDataConsent })
      if (invalid) {
        setError(invalid)
        return
      }
    }
    if (isRecovery && password.length < 8) {
      setError('Crie uma senha com pelo menos 8 caracteres.')
      return
    }
    if (isRecovery && password !== confirmPassword) {
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
            data: {
              full_name: name.trim(),
              legal_version: LEGAL_VERSION,
              age_confirmed: ageConfirmed,
              privacy_accepted: termsAccepted,
              terms_accepted: termsAccepted,
              health_data_consent: healthDataConsent,
            },
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
      setError(friendlyAuthError(message))
    } finally {
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
    ? 'Seus registros ficam vinculados somente à sua conta na nuvem.'
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
          <p>Aplicações, evolução do peso, sintomas e rotina alimentar reunidos na sua conta.</p>
        </div>
        <div className="auth-timeline" aria-hidden="true">
          <span><i /> Aplicação registrada</span>
          <span><i /> Evolução acompanhada</span>
          <span><i /> Dados protegidos por usuário</span>
        </div>
        <p className="auth-privacy">A conta é a cópia oficial. O aparelho é cache.</p>
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
            {isSignup && (
              <div className="auth-checks">
                <label className="auth-check">
                  <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} />
                  <span>Tenho 18 anos ou mais</span>
                </label>
                <label className="auth-check">
                  <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                  <span>
                    Li e aceito a{' '}
                    <button type="button" className="auth-text-btn inline" onClick={() => onOpenLegal?.('privacidade')}>política de privacidade</button>
                    {' '}e os{' '}
                    <button type="button" className="auth-text-btn inline" onClick={() => onOpenLegal?.('termos')}>termos de uso</button>
                  </span>
                </label>
                <label className="auth-check auth-check-health">
                  <input type="checkbox" checked={healthDataConsent} onChange={(event) => setHealthDataConsent(event.target.checked)} />
                  <span>
                    Autorizo o tratamento dos meus dados de saúde (medicamento, dose, peso, sintomas e medidas) para manter meu caderno pessoal na conta. Sem essa autorização, não é possível criar a conta.
                  </span>
                </label>
              </div>
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
            <span className="auth-legal-links">
              <button type="button" onClick={() => onOpenLegal?.('privacidade')}>Política de privacidade</button>
              {' · '}
              <button type="button" onClick={() => onOpenLegal?.('termos')}>Termos de uso</button>
            </span>
          </footer>
        </div>
      </section>
    </main>
  )
}
