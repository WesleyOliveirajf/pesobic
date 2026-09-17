import { useState } from 'react'
import { wipeAll } from '../db/db'
import type { AccessProfile } from '../lib/auth-context'
import { exportBackup, exportPhotos } from '../lib/backup'
import { deleteOwnAccount } from '../lib/repo'
import { supabase } from '../lib/supabase'
import { supportContact } from '../lib/support'

export function AccountBlocked({ profile }: { profile: AccessProfile }) {
  const [closeText, setCloseText] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function exportOwnData() {
    setBusy(true)
    setMessage(null)
    try {
      await exportBackup(profile.id)
      const photos = await exportPhotos()
      setMessage(photos ? 'Backup e arquivo de fotos exportados.' : 'Backup exportado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível exportar agora.')
    } finally {
      setBusy(false)
    }
  }

  async function closeAccount() {
    if (closeText.trim().toUpperCase() !== 'ENCERRAR') {
      setMessage('Digite ENCERRAR para confirmar.')
      return
    }
    if (!supabase) {
      setMessage('Supabase não configurado.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      await exportBackup(profile.id)
      await exportPhotos()
      const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password })
      if (error) throw new Error('Confirme a senha para encerrar a conta.')
      await deleteOwnAccount()
      await wipeAll()
      await supabase.auth.signOut()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível encerrar a conta.')
      setBusy(false)
    }
  }

  return (
    <main className="pending-page">
      <section className="pending-card">
        <img src="/logo.svg" alt="" width={58} height={58} />
        <span className="pending-status">Conta bloqueada</span>
        <h1>{profile.full_name ? `${profile.full_name}, esta conta` : 'Esta conta'} foi bloqueada</h1>
        <p>O acesso de escrita foi pausado por abuso ou revisão. Se foi um engano, fale com o suporte: {supportContact()}.</p>
        <p>Você ainda pode exportar seus próprios dados e encerrar a conta.</p>
        <div className="btn-row wrap">
          <button type="button" className="auth-text-btn" onClick={() => void exportOwnData()} disabled={busy}>Exportar meus dados</button>
          <a className="auth-text-btn" href="?legal=privacidade">Política de privacidade</a>
          <a className="auth-text-btn" href="?legal=termos">Termos de uso</a>
        </div>
        <label className="auth-form"><span>Senha para encerrar</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
        <label className="auth-form"><span>Digite ENCERRAR</span><input value={closeText} onChange={(event) => setCloseText(event.target.value)} placeholder="ENCERRAR" /></label>
        {message && <p className="auth-feedback auth-warning" role="status">{message}</p>}
        <button type="button" className="auth-submit" onClick={() => void closeAccount()} disabled={busy}>{busy ? 'Aguarde…' : 'Encerrar conta'}</button>
        <button type="button" className="auth-submit" onClick={() => supabase?.auth.signOut()}>Sair da conta</button>
      </section>
    </main>
  )
}
