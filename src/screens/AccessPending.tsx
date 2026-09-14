import { supabase } from '../lib/supabase'

export function AccessPending({ name }: { name?: string | null }) {
  return (
    <main className="pending-page">
      <section className="pending-card">
        <img src="/logo.svg" alt="" width={58} height={58} />
        <span className="pending-status">Cadastro recebido</span>
        <h1>{name ? `${name}, seu acesso` : 'Seu acesso'} está em análise</h1>
        <p>Seu cadastro foi concluído. Assim que a mensalidade for confirmada, o acesso ao Pesobic será liberado pelo administrador.</p>
        <div className="pending-note">
          <span aria-hidden="true">✓</span>
          <p>Você não precisa criar outra conta. Entre novamente após receber a confirmação.</p>
        </div>
        <button type="button" className="auth-submit" onClick={() => supabase?.auth.signOut()}>Sair da conta</button>
      </section>
    </main>
  )
}
