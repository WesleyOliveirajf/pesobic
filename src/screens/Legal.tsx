import { SUPPORT_EMAIL, supportContact } from '../lib/support'

export function Legal({ kind, onBack }: { kind: 'privacidade' | 'termos'; onBack: () => void }) {
  const title = kind === 'privacidade' ? 'Politica de privacidade' : 'Termos de uso'
  return (
    <main className="pending-page">
      <section className="pending-card legal-card">
        <img src="/logo.svg" alt="" width={48} height={48} />
        <h1>{title}</h1>
        {kind === 'privacidade' ? (
          <>
            <p>O Pesobic guarda o que voce registra sobre o seu tratamento (aplicacoes, peso, sintomas e nutricao leve). Nao prescreve dose, nao da diagnostico e nao substitui acompanhamento profissional.</p>
            <p>A conta na nuvem e a copia oficial. Voce pode exportar os proprios dados e encerrar a conta. Encerrar apaga os registros na hora.</p>
            <p>O administrador nao ve dados clinicos (peso, dose, sintomas). Ele so bloqueia abuso da conta.</p>
            <p>Fotos de progresso ficam neste aparelho nesta versao. Contato: {supportContact()}{SUPPORT_EMAIL !== 'OPERATOR_EMAIL_UNSET' ? '' : '.'}</p>
          </>
        ) : (
          <>
            <p>Ao criar a conta voce confirma ter 18 anos ou mais e usa o Pesobic como caderno pessoal, nao como prescricao.</p>
            <p>Contas sao individuais. Voce e responsavel pelas decisoes de medicacao com o seu acompanhamento profissional.</p>
            <p>Abuso pode levar ao bloqueio da conta. Encerrar a conta e irreversivel depois da confirmacao.</p>
            <p>Contato: {supportContact()}.</p>
          </>
        )}
        <button type="button" className="auth-submit" onClick={onBack}>Voltar</button>
      </section>
    </main>
  )
}
