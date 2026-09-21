import { supportContact } from '../lib/support'

export function Legal({ kind, onBack }: { kind: 'privacidade' | 'termos'; onBack: () => void }) {
  const title = kind === 'privacidade' ? 'Politica de privacidade' : 'Termos de uso'
  return (
    <main className="pending-page">
      <section className="pending-card legal-card">
        <img src="/logo.svg" alt="" width={48} height={48} />
        <h1>{title}</h1>
        {kind === 'privacidade' ? (
          <>
            <p><strong>Versão 2026-09-16.</strong> O controlador é o operador do Pesobic. Identificação e contato: {supportContact()}. Não exibimos CNPJ ou outro dado de controlador que não tenha sido informado pelo operador.</p>
            <p>Tratamos dados de conta (e-mail, nome e autenticação) para executar a relação contratual, nos termos do art. 7º, V, da LGPD. Tratamos os dados de saúde que você registra — medicamento, dose, aplicações, peso, medidas, sintomas e nutrição leve — com seu consentimento específico, nos termos do art. 11, I. O Pesobic não prescreve dose, não diagnostica e não substitui acompanhamento profissional.</p>
            <p>A conta e os registros ficam na nuvem. Usamos Supabase para conta e banco de dados e Vercel para publicar o aplicativo; esses operadores podem tratar dados em servidores fora do Brasil, conforme o art. 33 da LGPD. Fotos de progresso permanecem somente neste aparelho nesta versão. O aparelho também guarda cache de leitura e preferências; o arquivo .ics que você baixa é entregue ao seu calendário.</p>
            <p>Conservamos os dados enquanto a conta existir. Em Config, você pode exportar seus dados e encerrar a conta: o encerramento apaga conta, perfil e registros na hora. Sair apenas encerra a sessão neste aparelho e não apaga conta nem fotos locais.</p>
            <p>Você pode confirmar acesso, corrigir dados, pedir portabilidade, anonimização quando aplicável, informação sobre compartilhamento e revogar consentimento pelos recursos de exportar e encerrar conta; também pode contatar o operador no canal acima. Você pode apresentar reclamação à ANPD.</p>
            <p>Não usamos analytics ou pixel de publicidade. Usamos apenas cookies/estado de sessão, cache local e a aba necessária para o funcionamento. O administrador não vê dados clínicos; ele só administra bloqueios por abuso.</p>
          </>
        ) : (
          <>
            <p><strong>Versão 2026-09-16.</strong> O Pesobic é um caderno pessoal para maiores de 18 anos. Não é prescrição, diagnóstico ou substituto de acompanhamento profissional.</p>
            <p>A conta é individual: mantenha sua senha protegida e não use o serviço para inserir dados de outra pessoa. As decisões sobre medicamento e tratamento devem ser tomadas com profissional de saúde.</p>
            <p>O uso abusivo pode resultar em bloqueio de escrita da conta. Mesmo bloqueada, a pessoa continua podendo exportar os próprios dados e encerrar a conta. Encerrar é irreversível e apaga a conta e seus registros na hora.</p>
            <p>Contato do operador: {supportContact()}.</p>
          </>
        )}
        <button type="button" className="auth-submit" onClick={onBack}>Voltar</button>
      </section>
    </main>
  )
}
