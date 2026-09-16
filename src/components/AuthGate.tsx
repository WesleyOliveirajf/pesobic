import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { activateUserDatabase, deactivateUserDatabase } from '../db/db'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthScreen } from '../screens/Auth'
import { AccountBlocked } from '../screens/AccountBlocked'
import { ConfirmEmail } from '../screens/ConfirmEmail'
import { Legal } from '../screens/Legal'
import { AuthContext, type AccessProfile } from '../lib/auth-context'

function legalFromUrl(): 'privacidade' | 'termos' | null {
  const value = new URLSearchParams(window.location.search).get('legal')
  if (value === 'privacidade' || value === 'termos') return value
  return null
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [recovery, setRecovery] = useState(() => new URLSearchParams(window.location.search).get('auth') === 'recovery')
  const [legal, setLegal] = useState<'privacidade' | 'termos' | null>(() => legalFromUrl())
  const [profile, setProfile] = useState<AccessProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) activateUserDatabase(data.session.user.id)
      else deactivateUserDatabase()
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (nextSession) {
        activateUserDatabase(nextSession.user.id)
        setProfile(null)
        setProfileError(null)
        setLoading(true)
      } else {
        deactivateUserDatabase()
        setProfile(null)
        setProfileError(null)
        setLoading(false)
      }
      setSession(nextSession)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session) return
    const client = supabase
    let active = true

    const loadProfile = async () => {
      const { data, error } = await client
        .from('profiles')
        .select('id,email,full_name,blocked,is_admin,created_at,updated_at')
        .eq('id', session.user.id)
        .single()
      if (!active) return
      setProfileError(error?.message ?? null)
      setProfile((data as AccessProfile | null) ?? null)
      setLoading(false)
    }

    void loadProfile()
    const onVisible = () => { if (document.visibilityState === 'visible') void loadProfile() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session])

  function openLegal(kind: 'privacidade' | 'termos') {
    const url = new URL(window.location.href)
    url.searchParams.set('legal', kind)
    window.history.replaceState({}, '', url)
    setLegal(kind)
  }

  function closeLegal() {
    const url = new URL(window.location.href)
    url.searchParams.delete('legal')
    window.history.replaceState({}, '', url)
    setLegal(null)
  }

  if (legal) return <Legal kind={legal} onBack={closeLegal} />
  if (loading) {
    return <div className="splash"><img src="/logo.svg" alt="Carregando Pesobic" width={64} height={64} /></div>
  }

  if (recovery) return <AuthScreen initialMode="recovery" onOpenLegal={openLegal} />
  if (!session) return <AuthScreen onOpenLegal={openLegal} />
  if (!session.user.email_confirmed_at) {
    return <ConfirmEmail email={session.user.email ?? ''} />
  }
  if (profileError || !profile) {
    return (
      <main className="pending-page">
        <section className="pending-card">
          <img src="/logo.svg" alt="" width={58} height={58} />
          <h1>Não foi possível verificar sua conta</h1>
          <p>{profileError ?? 'O perfil deste usuário ainda não foi criado.'}</p>
          <button type="button" className="auth-submit" onClick={() => window.location.reload()}>Tentar novamente</button>
          <button type="button" className="auth-text-btn" onClick={() => supabase?.auth.signOut()}>Sair da conta</button>
        </section>
      </main>
    )
  }
  if (profile.blocked && !profile.is_admin) return <AccountBlocked name={profile.full_name} />
  return <AuthContext.Provider value={profile}>{children}</AuthContext.Provider>
}
