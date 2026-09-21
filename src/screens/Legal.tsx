import { supportContact } from '../lib/support'
import { LEGAL_VERSION, legalHref } from '../lib/legal'

export function Legal({ kind, onBack }: { kind: 'privacidade' | 'termos'; onBack: () => void }) {
  const title = kind === 'privacidade' ? 'Política de privacidade' : 'Termos de uso'
  const other = kind === 'privacidade' ? 'termos' : 'privacidade'
  return (
    <main className="pending-page">
      <section className="pending-card legal-card">
        <img src="/logo.svg" alt="" width={48} height={48} />
        <h1>{title}</h1>
        <p className="muted-small">Versão {LEGAL_VERSION}</p>
        {kind === 'privacidade' ? <Privacy /> : <Terms />}
        <p className="legal-links">
          <a href={legalHref(other)}>{other === 'termos' ? 'Ler os termos de uso' : 'Ler a política de privacidade'}</a>
        </p>
        <button type="button" className="auth-submit" onClick={onBack}>Voltar</button>
      </section>
    </main>
  )
}

function Privacy() {
  return (
    <>
      <p>O Pesobic é um caderno pessoal de acompanhamento de tratamento. Não prescreve dose, não dá diagnóstico e não substitui acompanhamento profissional.</p>

      <h2>Quem é o controlador</h2>
      <p>O controlador é o operador do Pesobic. Nome e CNPJ ainda não foram informados pelo operador. Contato do titular: {supportContact()}.</p>

      <h2>O que é tratado</h2>
      <ul>
        <li><strong>Conta:</strong> e-mail, nome e senha (a senha fica só no serviço de autenticação, em forma protegida).</li>
        <li><strong>Saúde (dado sensível):</strong> medicamento, dose, aplicações, peso, medidas, sintomas e nutrição que você registra.</li>
        <li><strong>Fotos de progresso:</strong> ficam apenas neste aparelho nesta versão.</li>
        <li><strong>Cache:</strong> uma cópia dos registros fica no aparelho para o app funcionar.</li>
      </ul>

      <h2>Finalidade e base legal</h2>
      <ul>
        <li>Conta e acesso: execução do serviço que você pediu (LGPD, art. 7º, V).</li>
        <li>Dados de saúde: seu consentimento específico e destacado (LGPD, art. 11, I), dado no cadastro em caixa própria.</li>
      </ul>
      <p>Usamos os dados só para mostrar o seu histórico a você. O administrador não vê dados clínicos; ele só bloqueia abuso da conta.</p>

      <h2>Operadores e transferência internacional</h2>
      <p>Usamos a Supabase (autenticação e banco de dados) e a Vercel (hospedagem do app). Esses servidores podem ficar fora do Brasil; a transferência ocorre nos termos do art. 33 da LGPD.</p>

      <h2>Retenção</h2>
      <p>Guardamos os dados enquanto a conta existir. Encerrar a conta apaga o perfil e os registros na hora, sem quarentena.</p>

      <h2>Seus direitos (art. 18)</h2>
      <ul>
        <li>Acesso e portabilidade: Config &gt; Exportar backup (JSON), inclusive com a conta bloqueada.</li>
        <li>Correção: edite seus registros e o perfil no app.</li>
        <li>Eliminação e revogação do consentimento: Config &gt; Encerrar conta. Sem o consentimento de saúde o app não funciona.</li>
        <li>Demais pedidos (informação, oposição, revisão): {supportContact()}.</li>
      </ul>

      <h2>Sair não é Encerrar</h2>
      <p>Sair apenas encerra a sessão; os dados continuam na conta. Fotos e cache ficam no aparelho até você encerrar a conta ou limpar os dados do navegador. O arquivo .ics do lembrete, quando você o baixa, vai para o seu calendário e sai do nosso controle.</p>

      <h2>Sem rastreamento</h2>
      <p>Não usamos analytics nem pixel de terceiros. Guardamos apenas sessão, cache dos registros e a última aba aberta.</p>

      <h2>Autoridade</h2>
      <p>Você pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD) em gov.br/anpd.</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <p>Ao criar a conta você confirma ter 18 anos ou mais.</p>
      <h2>Uso</h2>
      <ul>
        <li>O Pesobic é um caderno pessoal. Não prescreve dose nem dá diagnóstico.</li>
        <li>Você decide sobre a medicação com o seu acompanhamento profissional.</li>
        <li>A conta é individual; não compartilhe o acesso.</li>
      </ul>
      <h2>Abuso e bloqueio</h2>
      <p>Abuso pode levar ao bloqueio da conta. Conta bloqueada não grava novos registros, mas você ainda pode exportar seus dados e encerrar a conta.</p>
      <h2>Encerramento</h2>
      <p>Encerrar a conta é irreversível depois da confirmação e apaga os registros na hora.</p>
      <p>Contato: {supportContact()}.</p>
    </>
  )
}
