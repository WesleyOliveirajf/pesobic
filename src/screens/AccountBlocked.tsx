import { supabase } from '../lib/supabase'
import { supportContact } from '../lib/support'

export function AccountBlocked({ name }: { name?: string | null }) {
  return (
    <main className="pending-page">
      <section className="pending-card">
        <img src="/logo.svg" alt="" width={58} height={58} />
        <span className="pending-status">Conta bloqueada</span>
        <h1>{name ? `${name}, esta conta` : 'Esta conta'} foi bloqueada</h1>
        <p>O acesso de escrita foi pausado por abuso ou revisao. Se foi um engano, fale com o suporte: {supportContact()}.</p>
        <button type="button" className="auth-submit" onClick={() => supabase?.auth.signOut()}>Sair da conta</button>
      </section>
    </main>
  )
}
