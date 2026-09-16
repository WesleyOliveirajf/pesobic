# Pesobic — Especificação de evolução multiusuário

> **Execução atual:** [`TASKS.md`](./TASKS.md) vence este documento. Porteiro `access_enabled`, fila offline, fotos no Storage e admin de assinante **não** fazem parte da barra de “pronto”.

Status: proposta para execução pelos agentes de desenvolvimento  
Projeto Supabase: `bcjtfdhxanfevownlewv`  
Aplicação atual: React 19 + Vite + TypeScript + Dexie/IndexedDB + PWA  
Idioma da interface: português do Brasil

## 1. Objetivo

Evoluir o Pesobic de uma PWA pessoal, sem login e com dados apenas no navegador,
para uma aplicação profissional multiusuário em que cada pessoa:

- cria e acessa uma conta própria;
- visualiza e altera somente os próprios dados;
- sincroniza os registros entre dispositivos;
- continua usando funções essenciais durante períodos offline;
- migra os dados locais atuais sem perda nem duplicação;
- armazena fotos em área privada;
- consegue exportar os próprios dados e encerrar a conta com segurança.

O produto continua sendo uma ferramenta de registro e acompanhamento. Não deve
prescrever doses, diagnosticar condições ou substituir acompanhamento profissional.

## 2. Resultado esperado

Ao final desta especificação:

1. usuário A não consegue consultar, inserir, alterar ou excluir dados do usuário B;
2. o isolamento é imposto pelo Postgres/RLS, não por filtros no React;
3. nenhuma chave `service_role` ou secret é entregue ao navegador;
4. fotos são privadas e acessadas por URL assinada de curta duração;
5. dados existentes no IndexedDB podem ser sincronizados de forma idempotente;
6. falhas de rede não causam perda silenciosa de registros;
7. operações destrutivas exigem confirmação clara e permanecem recuperáveis quando possível;
8. fluxos críticos possuem testes automatizados e evidências de verificação.

## 3. Escopo

### Incluído

- Supabase Auth.
- Postgres com migrations versionadas.
- Row Level Security em todas as tabelas expostas.
- Supabase Storage privado para fotos.
- Camada de acesso a dados desacoplada do Dexie.
- Cache offline e fila de sincronização.
- Migração assistida dos dados locais.
- Redesign responsivo do shell, dashboard e estados da aplicação.
- Testes unitários, integração, RLS e end-to-end.
- Privacidade, exportação de dados, encerramento de conta e observabilidade segura.

### Fora do escopo inicial

- Compartilhamento com médico, nutricionista ou familiar.
- Painel administrativo com acesso a dados clínicos individuais.
- Prescrição, recomendação automática de dose ou diagnóstico.
- Integração com prontuário eletrônico.
- Cobrança e assinatura.
- Analytics contendo peso, sintomas, medicamento, fotos ou anotações pessoais.

Esses itens exigem especificações e autorizações próprias.

## 4. Regras obrigatórias de segurança

- Todas as tabelas pessoais devem ter `user_id uuid not null` referenciando
  `auth.users(id)`.
- Habilitar RLS em toda tabela de schema exposto.
- Criar políticas separadas para `select`, `insert`, `update` e `delete`.
- Políticas de leitura e alteração devem comparar `auth.uid()` com `user_id`.
- Políticas de `insert` e `update` devem usar `with check` para impedir troca de dono.
- `TO authenticated` sem predicado de propriedade não é autorização suficiente.
- Não usar `raw_user_meta_data`/`user_metadata` para decisões de autorização.
- Não criar função `security definer` para contornar RLS. Exceções precisam de revisão
  de segurança, schema não exposto, `search_path` fixo e grants mínimos.
- Views acessíveis pelo cliente devem usar `security_invoker = true` quando suportado.
- Revogar privilégios desnecessários de `anon` e conceder apenas as operações utilizadas
  a `authenticated`.
- Nunca colocar chave secreta, `service_role`, token do MCP ou credencial de banco no frontend.
- O bucket de fotos deve ser privado, com políticas de propriedade em `storage.objects`.
- Nenhuma migration remota será aplicada sem autorização explícita para o projeto exato.
- Testes que escrevem durante auditoria remota devem usar transação com rollback quando possível.

## 5. Arquitetura alvo

```text
React/Vite PWA
   |
   +-- Supabase Auth (sessão e identidade)
   |
   +-- Camada de repositórios
   |      +-- Postgres/Data API (fonte oficial)
   |      +-- IndexedDB (cache e fila offline)
   |
   +-- Supabase Storage privado (fotos)
   |
   +-- Estado de sincronização e tratamento central de erros
```

O frontend nunca deve decidir sozinho quais linhas o usuário pode acessar. O cliente
envia a sessão e o banco aplica as políticas de autorização.

## 6. Modelo de dados proposto

Todas as chaves primárias remotas devem ser UUIDs. Registros sincronizáveis devem usar
o mesmo UUID local e remoto para permitir reenvio idempotente.

### `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `height_cm numeric`
- `start_weight_kg numeric`
- `start_date date`
- `goal_weight_kg numeric`
- `protein_factor numeric`
- `protein_manual_goal numeric null`
- `water_goal_ml integer`
- `timezone text default 'America/Sao_Paulo'`
- `created_at timestamptz`
- `updated_at timestamptz`

### `medication_plans`

- `id uuid primary key`
- `user_id uuid not null`
- `medication text`
- `medication_label text null`
- `reminder_weekday smallint null`
- `reminder_time time`
- `reminder_start_date date`
- `current_phase_index integer`
- timestamps

### `titration_phases`

- `id uuid primary key`
- `user_id uuid not null`
- `plan_id uuid not null`
- `position integer not null`
- `dose_mg numeric not null`
- `weeks integer not null`
- `label text null`
- timestamps
- unique `(plan_id, position)`

### `injections`

- `id uuid primary key`
- `user_id uuid not null`
- `occurred_at timestamptz not null`
- `medication text not null`
- `dose_mg numeric not null`
- `site text not null`
- `status text not null`
- `note text null`
- timestamps

### `weigh_ins`

- `id uuid primary key`
- `user_id uuid not null`
- `measured_on date not null`
- `weight_kg numeric not null`
- medidas opcionais em centímetros
- `note text null`
- timestamps
- índice `(user_id, measured_on desc)`

### `symptom_logs`

- `id uuid primary key`
- `user_id uuid not null`
- `occurred_at timestamptz not null`
- `symptom text not null`
- `severity smallint not null check (severity between 0 and 3)`
- `note text null`
- timestamps

### `nutrition_days`

- `id uuid primary key`
- `user_id uuid not null`
- `tracked_on date not null`
- `protein_g numeric not null default 0`
- `water_ml integer not null default 0`
- `meals integer not null default 0`
- `note text null`
- timestamps
- unique `(user_id, tracked_on)`

### `progress_photos`

- `id uuid primary key`
- `user_id uuid not null`
- `taken_on date not null`
- `storage_path text not null`
- `mime_type text not null`
- `size_bytes bigint not null`
- `note text null`
- timestamps

O objeto deve ser salvo no caminho `<user_id>/<photo_id>.<ext>`.

### `sync_operations` local

Tabela apenas no IndexedDB:

- `operation_id uuid`
- `entity_type`
- `entity_id uuid`
- `operation` (`insert`, `update`, `delete`)
- `payload`
- `created_at`
- `attempts`
- `last_error`
- `status` (`pending`, `syncing`, `failed`, `done`)

## 7. Backlog executável

### EPIC 0 — Baseline e proteção do trabalho existente

#### PES-001 — Reproduzir o baseline local

Responsável sugerido: agente de qualidade.

Tarefas:

- instalar dependências respeitando o lockfile;
- executar build e lint;
- registrar tamanho dos bundles;
- documentar erros preexistentes sem misturá-los com regressões;
- confirmar que nenhum arquivo de credencial está versionado.

Aceite:

- comandos e resultados registrados no PR;
- working tree revisada antes e depois;
- nenhum dado ou arquivo existente removido.

#### PES-002 — Introduzir suíte de testes

Responsável sugerido: agente de qualidade.

Tarefas:

- adicionar Vitest e Testing Library com versões fixadas;
- criar testes para `metrics`, `titration`, `format` e `backup`;
- adicionar scripts `test`, `test:run` e `check`;
- configurar CI para build, lint e testes.

Aceite:

- cálculos críticos possuem casos normais e de borda;
- testes são determinísticos em timezone definido;
- CI falha quando build, lint ou testes falham.

### EPIC 1 — Fundação Supabase

#### PES-010 — Inicializar estrutura local do Supabase

Responsável sugerido: agente de backend/database.

Dependência: PES-001.

Tarefas:

- confirmar se o projeto usa schema declarativo ou migrations imperativas;
- criar estrutura `supabase/` pelo fluxo oficial;
- documentar o project ref sem armazenar tokens;
- preparar `.env.example` somente com nomes e placeholders;
- ignorar `.env.local` e arquivos secretos.

Aceite:

- estrutura local reproduzível;
- nenhum segredo aparece no Git ou no bundle;
- projeto remoto não é alterado nesta task.

#### PES-011 — Criar schema multiusuário

Responsável sugerido: agente de backend/database.

Dependência: PES-010.

Tarefas:

- criar migrations para as tabelas da seção 6;
- adicionar foreign keys, checks, uniques e índices;
- padronizar timestamps em `timestamptz` e datas civis em `date`;
- definir atualização confiável de `updated_at` sem função privilegiada exposta.

Aceite:

- migration sobe do zero em ambiente local;
- migration possui caminho de rollback documentado;
- constraints rejeitam valores e relações inválidas;
- diff revisado antes de qualquer aplicação remota.

#### PES-012 — Implementar e testar RLS

Responsável sugerido: agente de segurança/database.

Dependência: PES-011.

Tarefas:

- habilitar RLS em todas as tabelas pessoais;
- criar políticas por operação e papel;
- revisar grants de `anon` e `authenticated`;
- criar testes pgTAP com usuário A, usuário B e visitante;
- executar advisors de segurança.

Aceite:

- usuário A acessa o próprio registro;
- usuário A recebe zero linhas/erro apropriado ao tentar acessar B;
- usuário A não consegue inserir registro com `user_id` de B;
- usuário A não consegue mudar o proprietário de um registro;
- visitante não autenticado não acessa dados pessoais;
- advisors não apresentam achado de segurança não justificado.

### EPIC 2 — Autenticação e sessão

#### PES-020 — Integrar cliente Supabase

Responsável sugerido: agente frontend.

Dependências: PES-010, PES-012.

Tarefas:

- instalar `@supabase/supabase-js` com versão fixada e lockfile atualizado;
- criar cliente em módulo único;
- usar apenas URL e chave publicável em variáveis `VITE_*`;
- implementar provider/hook de sessão;
- adicionar estados de carregamento, expiração e erro.

Aceite:

- nenhuma chave privilegiada está presente no código ou bundle;
- sessão expirada leva a uma tela segura;
- listeners de autenticação são removidos no unmount;
- erros não exibem token ou detalhes sensíveis.

#### PES-021 — Criar cadastro, login e recuperação

Responsável sugerido: agente frontend/auth.

Dependência: PES-020.

Tarefas:

- criar telas de cadastro, login, confirmação e recuperação;
- validar e normalizar email;
- implementar mensagens claras sem revelar se uma conta existe;
- configurar URLs de redirecionamento por ambiente;
- documentar requisitos de SMTP para produção;
- incluir aceite da política de privacidade quando juridicamente definido.

Aceite:

- cadastro e login funcionam em ambiente de homologação;
- recuperação retorna ao domínio correto;
- tentativa inválida não revela existência da conta;
- fluxo funciona no Safari/iPhone instalado como PWA.

#### PES-022 — Proteção de rotas e encerramento de sessão

Responsável sugerido: agente frontend/auth.

Dependência: PES-021.

Aceite:

- telas pessoais não renderizam sem sessão válida;
- logout limpa estado sensível em memória;
- troca de conta no mesmo aparelho não mostra cache da conta anterior;
- cache local é particionado por `user_id`.

### EPIC 3 — Camada de dados e sincronização

#### PES-030 — Criar interfaces de repositório

Responsável sugerido: agente de arquitetura frontend.

Dependência: PES-002.

Tarefas:

- definir contratos para perfil, aplicações, pesagens, sintomas, nutrição e fotos;
- remover acesso direto ao Dexie das telas gradualmente;
- criar implementação local e implementação Supabase;
- padronizar erros e retornos.

Aceite:

- componentes não importam `db` diretamente após sua migração;
- cálculos de domínio continuam independentes da infraestrutura;
- contratos possuem testes.

#### PES-031 — Migrar CRUD textual para Supabase

Responsável sugerido: agente frontend/data.

Dependências: PES-012, PES-020, PES-030.

Tarefas:

- migrar cada entidade separadamente;
- filtrar por período e paginar históricos;
- confiar em RLS para autorização e usar filtros apenas para desempenho;
- apresentar estados de salvamento, sucesso e falha.

Aceite:

- operações funcionam em dois dispositivos da mesma conta;
- nenhum `select` carrega histórico ilimitado;
- teste com duas contas prova o isolamento ponta a ponta.

#### PES-032 — Implementar cache offline e fila

Responsável sugerido: agente PWA/sincronização.

Dependências: PES-030, PES-031.

Tarefas:

- migrar Dexie para schema versionado com `user_id` e UUID;
- manter leitura do cache durante indisponibilidade;
- enfileirar mutações com IDs idempotentes;
- definir retry com backoff e limite;
- sinalizar conflitos e falhas persistentes;
- nunca limpar registros locais após uma falha parcial.

Aceite:

- registro offline aparece imediatamente como pendente;
- reconexão envia a operação uma única vez;
- reenvio não duplica dados;
- logout impede leitura do cache de outra conta;
- indicador informa `sincronizado`, `pendente`, `offline` ou `erro`.

### EPIC 4 — Migração dos usuários atuais

#### PES-040 — Validar e versionar backup

Responsável sugerido: agente de dados/qualidade.

Tarefas:

- validar JSON com schema estrito;
- rejeitar versões, enums, datas e números inválidos;
- impor limite de arquivo e quantidade de registros;
- mostrar prévia antes de substituir ou mesclar;
- criar backup de segurança antes de importação;
- diferenciar claramente `mesclar` de `substituir`.

Aceite:

- arquivo malformado não altera o banco local;
- falha no meio da importação faz rollback;
- ação destrutiva exige confirmação explícita;
- testes cobrem arquivo válido, inválido, grande e de versão futura.

#### PES-041 — Criar assistente de sincronização inicial

Responsável sugerido: agente de migração.

Dependências: PES-032, PES-040.

Tarefas:

- detectar dados legados após o primeiro login;
- mostrar contagens por entidade;
- atribuir UUIDs estáveis aos registros antigos;
- enviar em lotes idempotentes;
- comparar contagens e checks locais/remotos;
- manter a base local até confirmação do usuário;
- gerar relatório de itens migrados, ignorados e falhos.

Aceite:

- interromper e retomar não duplica registros;
- falha parcial preserva todos os dados locais;
- nenhuma limpeza automática ocorre;
- migração é testada com backup representativo anonimizado.

### EPIC 5 — Fotos privadas

#### PES-050 — Preparar bucket e políticas de Storage

Responsável sugerido: agente de segurança/storage.

Dependência: PES-012.

Tarefas:

- criar bucket privado;
- limitar tamanho e tipos MIME;
- criar políticas para caminho pertencente ao usuário;
- permitir somente operações necessárias;
- usar URLs assinadas temporárias.

Aceite:

- usuário A não lista, lê, altera ou exclui arquivo de B;
- URL pública permanente não existe;
- upload com tipo ou tamanho inválido é rejeitado;
- testes cobrem select, insert, update e delete.

#### PES-051 — Otimizar upload e visualização

Responsável sugerido: agente frontend/media.

Dependência: PES-050.

Tarefas:

- corrigir criação e revogação de object URLs;
- redimensionar e comprimir imagens antes do upload;
- remover metadados EXIF quando possível;
- mostrar progresso, cancelamento e erro;
- gerar miniatura adequada para a grade.

Aceite:

- object URLs são sempre revogadas;
- upload não bloqueia a interface;
- fotos grandes recebem tratamento previsível;
- falha não cria metadado remoto órfão.

### EPIC 6 — Experiência profissional e acessibilidade

#### PES-060 — Criar design system do Pesobic

Responsável sugerido: agente de design/frontend.

Tarefas:

- definir tokens de cor, tipografia, espaçamento, elevação e raios por função;
- definir estados de foco, hover, pressed, disabled, loading e error;
- verificar contraste WCAG AA;
- criar tema claro, escuro e sistema;
- documentar padrões de conteúdo e linguagem.

Direção:

- identidade de diário de saúde pessoal, discreta e precisa;
- números clínicos com alta legibilidade;
- cores de risco reservadas para risco real;
- evitar cards idênticos para todos os conteúdos;
- linha do tempo do tratamento como elemento visual característico.

Aceite:

- tokens são usados pelos componentes base;
- contraste e foco passam na auditoria automatizada e revisão visual;
- reduced motion é respeitado.

#### PES-061 — Refazer shell responsivo

Responsável sugerido: agente frontend/UI.

Dependência: PES-060.

Tarefas:

- manter navegação inferior no celular;
- reduzir destinos principais e agrupar ações secundárias;
- usar sidebar no desktop/tablet;
- suportar safe areas e teclado virtual do iOS;
- adicionar identidade da conta e logout sem expor dados sensíveis.

Aceite:

- funciona de 320 px a desktop amplo;
- navegação possui `aria-current` e foco visível;
- nenhum conteúdo fica encoberto pela barra inferior;
- troca de orientação não perde contexto.

#### PES-062 — Reorganizar dashboard e linha do tempo

Responsável sugerido: agente frontend/UI.

Dependências: PES-031, PES-060.

Tarefas:

- priorizar `Hoje`, próxima aplicação e registros rápidos;
- criar linha do tempo combinando aplicação, peso e sintomas;
- manter projeções claramente identificadas como estimativas;
- criar estados vazios com próxima ação útil;
- adicionar skeletons e estados de erro acionáveis.

Aceite:

- principais registros exigem poucos passos no celular;
- dashboard não apresenta dados de cache pertencentes a outra conta;
- todos os estados carregando/vazio/erro/offline estão implementados.

#### PES-063 — Corrigir componentes acessíveis

Responsável sugerido: agente frontend/acessibilidade.

Tarefas:

- adicionar semântica, título associado e foco preso aos modais;
- devolver foco ao elemento disparador;
- tornar gráficos compreensíveis por texto/tabela alternativa;
- adicionar labels e descrições de erro nos campos;
- validar alvos de toque e navegação por teclado.

Aceite:

- axe não apresenta violações críticas ou sérias;
- fluxos principais funcionam apenas com teclado;
- leitor de tela identifica modal, aba atual, erros e progresso.

### EPIC 7 — Privacidade, conta e operação

#### PES-070 — Implementar central de privacidade

Responsável sugerido: agente frontend/backend, com revisão jurídica externa.

Tarefas:

- exibir política de privacidade e termos versionados;
- permitir exportação dos dados do próprio usuário;
- permitir solicitação de encerramento de conta;
- definir retenção e processo de remoção;
- documentar canal de contato e resposta a incidentes.

Aceite:

- usuário exporta somente os próprios dados;
- encerramento exige reautenticação e confirmação explícita;
- sessão é revogada antes do processamento definitivo;
- comportamento de retenção está documentado e testado.

#### PES-071 — Observabilidade sem conteúdo sensível

Responsável sugerido: agente de plataforma.

Tarefas:

- registrar falhas técnicas com correlation ID;
- excluir tokens, emails, peso, dose, sintomas, notas e caminhos de fotos dos logs;
- adicionar monitoramento de disponibilidade e erros agregados;
- definir alertas e runbook de incidente.

Aceite:

- revisão de logs confirma ausência de conteúdo sensível;
- erro do usuário pode ser investigado via correlation ID;
- alertas possuem responsável e procedimento.

### EPIC 8 — Performance, entrega e produção

#### PES-080 — Melhorar carregamento e bundle

Responsável sugerido: agente de performance.

Tarefas:

- carregar gráficos sob demanda;
- dividir rotas/telas;
- paginar históricos;
- medir Web Vitals e tamanho do bundle;
- evitar recriação de URLs e cálculos caros em renderizações.

Aceite:

- orçamento de performance documentado;
- regressões de bundle aparecem no CI;
- dashboard inicial não baixa gráficos que não estão visíveis.

#### PES-081 — Preparar ambientes e deploy

Responsável sugerido: agente DevOps/plataforma.

Dependências: todos os épicos críticos.

Tarefas:

- separar desenvolvimento, homologação e produção;
- configurar redirects do Auth por ambiente;
- validar headers de segurança e cache da PWA;
- criar processo de migrations com aprovação;
- criar backup/restauração e testar restauração;
- implementar estratégia segura de atualização do service worker.

Aceite:

- produção não usa credenciais ou banco de desenvolvimento;
- migration é revisada antes do deploy;
- rollback da aplicação está documentado;
- restauração de backup é testada;
- atualização da PWA não perde operações offline pendentes.

## 8. Ordem e paralelismo recomendado

```text
PES-001 -> PES-002
   |
   +-> PES-010 -> PES-011 -> PES-012 -> PES-020 -> PES-021 -> PES-022
   |                              |
   |                              +-> PES-050 -> PES-051
   |
   +-> PES-030 -> PES-031 -> PES-032 -> PES-041
                    |
                    +-> PES-062

PES-040 pode começar após PES-002.
PES-060 e PES-063 podem começar após PES-001.
PES-061 depende de PES-060.
PES-070 e PES-071 podem avançar em paralelo após a arquitetura de Auth.
PES-080 pode começar após PES-031.
PES-081 fecha a preparação de produção.
```

Agentes trabalhando em paralelo devem possuir arquivos/responsabilidades exclusivos,
não reverter alterações de outros agentes e avisar antes de modificar contratos compartilhados.

## 9. Gates de liberação

### Gate A — Backend seguro

- migrations revisadas;
- RLS em todas as tabelas expostas;
- testes A versus B aprovados;
- grants mínimos verificados;
- advisors sem vulnerabilidade não justificada.

### Gate B — Migração segura

- importação validada e transacional;
- sincronização idempotente;
- teste de interrupção e retomada;
- nenhuma exclusão local automática.

### Gate C — Produto utilizável

- cadastro, login, recuperação e logout aprovados;
- responsividade e acessibilidade verificadas;
- offline e reconexão testados em dispositivo real;
- fotos privadas verificadas com duas contas.

### Gate D — Produção

- política de privacidade e termos revisados;
- backups e restauração testados;
- logs livres de dados sensíveis;
- headers, rate limits e proteção contra abuso verificados;
- plano de rollback aprovado.

## 10. Definition of Done global

Uma task somente pode ser marcada como concluída quando:

- código, migration e documentação necessária estão no repositório;
- build, lint e testes relevantes passam;
- comportamento foi verificado, não apenas implementado;
- alterações de banco possuem evidência e project ref confirmado;
- nenhuma credencial foi exposta;
- acessibilidade e estados de erro foram considerados;
- não houve exclusão ou sobrescrita de dados sem autorização explícita;
- PR informa riscos, validações, limitações e próximos passos;
- mudanças não relacionadas foram preservadas.

## 11. Critérios finais de aceite do produto

Executar a matriz abaixo com duas contas reais de teste, A e B:

| Operação | Próprio registro | Registro de outra conta |
| --- | --- | --- |
| Consultar | permitido | negado/zero linhas |
| Inserir | permitido | impossível atribuir outro dono |
| Alterar | permitido | negado/zero linhas |
| Excluir | permitido com confirmação | negado/zero linhas |
| Listar fotos | permitido | negado |
| Abrir foto | URL assinada temporária | negado |

Também devem passar:

- migração local com interrupção simulada;
- uso offline seguido de sincronização;
- troca de conta no mesmo navegador;
- expiração de sessão;
- importação de backup inválido;
- upload de foto inválida ou excessivamente grande;
- navegação por teclado e leitor de tela;
- instalação e atualização da PWA em iPhone real.

## 12. Restrições para os agentes

- Não apagar arquivos, tabelas, buckets, migrations ou dados sem ordem expressa do usuário.
- Não aplicar mudanças ao Supabase remoto sem autorização específica.
- Não usar o banco de outro projeto para testes.
- Não alterar a lógica clínica ou os cálculos sem testes e aprovação.
- Não introduzir compartilhamento de dados implicitamente.
- Não usar produção como ambiente de experimento.
- Não declarar uma task concluída sem apresentar evidência de verificação.
