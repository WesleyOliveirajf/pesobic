import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function ConfirmEmail({ email }: { email: string }) {
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function resend() {
    if (!supabase) return
    setBusy(true)
    setNotice(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setNotice(error ? 'Nao foi possivel reenviar agora. Tente de novo em instantes.' : 'Se este e-mail estiver pendente, voce recebera outro link.')
    setBusy(false)
  }

  return (
    <main className="pending-page">
      <section className="pending-card">
        <img src="/logo.svg" alt="" width={58} height={58} />
        <span className="pending-status">Confirme o e-mail</span>
        <h1>Abra o link que enviamos</h1>
        <p>Sua conta foi criada. Confirme o e-mail para entrar no Pesobic. Sem isso as abas pessoais nao abrem.</p>
        {notice && <p className="auth-feedback auth-success" role="status">{notice}</p>}
        <button type="button" className="auth-submit" disabled={busy} onClick={() => void resend()}>
          {busy ? 'Enviando…' : 'Reenviar e-mail'}
        </button>
        <button type="button" className="auth-text-btn" onClick={() => supabase?.auth.signOut()}>Sair da conta</button>
      </section>
    </main>
  )
}
