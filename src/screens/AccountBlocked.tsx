import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { supportContact } from '../lib/support'
import { exportBackup } from '../lib/backup'
import { closeOwnAccount } from '../lib/close-account'
import { legalHref } from '../lib/legal'
import { Btn, Field, TextInput } from '../components/ui'

export function AccountBlocked({ id, email, name }: { id: string; email: string; name?: string | null }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true)
    setMsg(null)
    try {
      await action()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : fallback)
      setBusy(false)
    }
  }

  return (
    <main className="pending-page">
      <section className="pending-card">
        <img src="/logo.svg" alt="" width={58} height={58} />
        <span className="pending-status">Conta bloqueada</span>
        <h1>{name ? `${name}, esta conta` : 'Esta conta'} foi bloqueada</h1>
        <p>O acesso de escrita foi pausado por abuso ou revisao. Se foi um engano, fale com o suporte: {supportContact()}.</p>
        <p className="muted-small">Mesmo bloqueado, voce pode exportar os seus dados ou encerrar a conta.</p>

        <div className="rights-card">
          <Btn
            variant="primary"
            block
            disabled={busy}
            onClick={() => void run(async () => {
              await exportBackup(id)
              setMsg('Backup exportado.')
              setBusy(false)
            }, 'Nao foi possivel exportar.')}
          >
            Exportar meus dados (JSON)
          </Btn>
          <p className="muted-small">
            Encerrar apaga a conta, o perfil e os registros na hora, sem quarentena. Confirme a senha e digite ENCERRAR. Um backup JSON e baixado antes.
          </p>
          <Field label="Senha">
            <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="Digite ENCERRAR">
            <TextInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="ENCERRAR" />
          </Field>
          <Btn variant="danger" block disabled={busy} onClick={() => void run(() => closeOwnAccount({ id, email }, password, confirm), 'Nao foi possivel encerrar a conta.')}>
            {busy ? 'Aguarde…' : 'Encerrar conta'}
          </Btn>
          {msg && <p className="muted-small" role="status">{msg}</p>}
        </div>

        <p className="legal-links">
          <a href={legalHref('privacidade')}>Política de privacidade</a>
          <a href={legalHref('termos')}>Termos de uso</a>
        </p>
        <button type="button" className="auth-submit" onClick={() => supabase?.auth.signOut()}>Sair da conta</button>
      </section>
    </main>
  )
}
