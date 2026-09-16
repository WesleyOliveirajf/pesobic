# Pesobic — produto travado (2026-09-15)

Fonte canônica da barra de **pronto**. Se `SPEC.md` ou `SPEC_MULTIUSUARIO.md`
contradisserem este arquivo, **este arquivo vence**.

Issue-mãe: [WesleyOliveirajf/pesobic#1](https://github.com/WesleyOliveirajf/pesobic/issues/1).

## Produto

Memória do tratamento GLP-1 (dose, peso, sintoma, nutrição leve). Não prescreve.
Porta aberta com e-mail confirmado. Conta = fonte oficial. Grátis. Admin só
bloqueia abuso.

- Recorte Brasil, pt-BR, kg/cm/mg/ml.
- Cadastro por e-mail + senha. Confirmar e-mail. 18+. Aceite de privacidade e termos.
- Sem porteiro `access_enabled`. Conta nova já escreve os próprios dados.
- `blocked` default false. Admin bloqueia abuso; blocked não escreve clínico.
- Admin lista só conta (e-mail, nome, blocked, datas). Nunca clínico.
- Dexie é cache de leitura. Escritas só na rede. Sem fila offline.
- Fotos continuam locais. Sem Storage nesta barra.
- Projeto remoto Supabase `bcjtfdhxanfevownlewv`: **não** aplicar migration
  sem ordem explícita no chat.

## Fora da barra

Fila offline de escrita, Storage de fotos, OAuth (Google/Apple), i18n, billing,
PDF, push, admin de assinante/`access_enabled`.

## Ordem

```
PES-100
   |
   +-> PES-101 ----+-> PES-103 -> PES-104 -> PES-105 -> PES-108
   |               |                 |
   +-> PES-102 ----+                 +-> PES-107
                   |
                   +-> PES-106
PES-109 após 103
PES-110 fecha depois de 104, 106, 107
```

Paralelo: 101 ∥ 102.

---

## PES-100 — Alinhar documentos ao produto travado

Dependências: nenhuma.

1. Topo de `SPEC.md` e `SPEC_MULTIUSUARIO.md`: aviso de que produto e backlog
   estão neste arquivo; v1 “um usuário / só no aparelho” e porteiro
   `access_enabled` revogados.
2. `README.md`: conta + nuvem, não “só no aparelho”; remoto não se altera sem
   autorização.
3. Não reescrever as duas specs inteiras.

**Feito quando:** um agente que só ler README + TASKS.md não conclui que o app
é single-device sem login.

**Guardrail:** não aplicar schema remoto. Não implementar feature nesta task.

---

## PES-101 — Schema: porta aberta + dono atualiza o próprio perfil

Dependências: PES-100. Paralelo com PES-102.

Trocar o porteiro `access_enabled` default false + `has_active_access()` por
`blocked` default false. Dono atualiza o próprio profile. Admin lista só conta,
nunca clínico.

### Fazer

Editar `supabase/schemas/` + testes. **Não** `apply_migration` no projeto
`bcjtfdhxanfevownlewv`.

- Coluna `profiles.blocked boolean not null default false`. Remover
  `access_enabled`.
- `private.is_not_blocked()` no lugar de `has_active_access()`.
- Policies clínicas: dono + não blocked.
- `profiles`: SELECT da própria linha; UPDATE das colunas clínicas/perfil
  (não `is_admin`, não `blocked`, não `id`).
- View `admin_directory` (security definer / `security_invoker = false`) com
  `id, email, full_name, blocked, is_admin, created_at, updated_at` e
  `where (select private.is_admin())`. Sem peso, dose, altura.
- RPC `admin_set_user_blocked(target_user_id uuid, is_blocked boolean)`.
  Admin não bloqueia a si nem outro admin.
- Signup **não** promove admin. `handle_new_user` ignora `user_metadata` para
  privilégio.
- SQL out-of-band para o primeiro admin (local/homologação):

```sql
-- NÃO rodar no remoto sem ordem explícita no chat.
update public.profiles set is_admin = true where id = '<uuid-do-operador>';
```

### Feito quando (local, dois usuários)

- signup escreve injection sem flag de liberação
- blocked não escreve clínico
- A não lê/escreve B
- A atualiza `height_cm` e não consegue `is_admin`
- admin não vê `start_weight_kg` pela API do Admin
- pgTAP verde; advisors sem achado não justificado

---

## PES-102 — Cadastro: confirmar e-mail, 18+, termos

Dependências: PES-100. Paralelo com PES-101.

1. Cadastro: e-mail, senha, checkbox 18+, checkbox privacidade+termos.
2. Páginas curtas de privacidade e termos (produto: não prescreve, dado é da
   pessoa, exportar/apagar, admin não vê clínico).
3. `SUPPORT_EMAIL`: não inventar endereço; placeholder `OPERATOR_EMAIL_UNSET`
   se o operador não estiver no repo.
4. Sessão sem `email_confirmed_at` → tela “confirme o e-mail” (não é
   AccessPending).
5. Recuperação de senha permanece. Erros não revelam se o e-mail existe.
6. README: SMTP Auth é requisito de produção.

**Feito quando:** menor e cadastro sem aceite são recusados; não confirmado
não vê tabs pessoais.

**Guardrail:** não ligar Google/Apple. Não configurar dashboard SMTP nesta task.

---

## PES-103 — AuthGate sem porteiro

Dependências: PES-101, PES-102.

1. Tirar `AccessPending` da rota feliz.
2. Gate: loading → recovery → sem sessão → Auth → e-mail não confirmado →
   blocked → app.
3. Troca de conta não pinta cache da anterior. Logout limpa memória.

**Feito quando:** usuário confirmado e não blocked nunca vê “aguardando
liberação”.

---

## PES-104 — Perfil e titulação na conta

Dependências: PES-103.

Hoje `settings` mora no Dexie. Precisa ser `profiles` + `medication_plans` +
`titration_phases`.

1. `repo.ts` (ou irmão): load/upsert profile, plan, phases. UUID estável.
2. Onboarding e Config gravam a conta.
3. Um plano por usuário. `metrics`/`titration` continuam puros.
4. Telas não importam `db` para settings. Fotos podem ficar no Dexie.
5. Dois browsers, mesma conta, com rede: mudar altura/fase num e ver no outro
   após reload.

**Feito quando:** wipe do IndexedDB não apaga perfil/fases se a sessão existir.
`npm run check` verde.

**Fora:** Storage de fotos. Fila offline.

---

## PES-105 — Dexie vira cache de leitura

Dependências: PES-104.

1. Leituras: rede primeiro; se falhar, último cache. Sem fila de escrita.
2. Escritas: só rede; erro visível offline.
3. Cache por `userId`. Logout/troca de conta não mostra peso da outra.
4. Fotos continuam locais, sem upload.

**Feito quando:** DevTools offline: Home mostra último peso em cache; registrar
dose mostra erro, não grava fantasma.

---

## PES-106 — Admin de abuso

Dependências: PES-101, PES-103.

1. `Admin.tsx`: e-mail, nome, blocked, data. Bloquear/desbloquear via RPC. Sem
   “liberar acesso”.
2. Tab só se `is_admin`.
3. Zero fetch de tabelas clínicas no Admin.
4. Signup nunca promove admin.

**Feito quando:** admin bloqueia A; A para de escrever; B segue; network tab do
Admin não pede injections/weigh_ins.

---

## PES-107 — Exportar e encerrar conta

Dependências: PES-104.

1. Config: **Sair** ≠ **Encerrar conta** (nomes e confirmações distintas).
2. Encerrar: export JSON primeiro; confirma senha ou texto “ENCERRAR”; apaga na
   hora (linhas, profile, Auth). Sem quarentena.
3. Sem `service_role` no Vite. Cliente ou Edge Function com JWT do usuário.
4. Sem nag de 30 dias (pode cair em PES-109, não duplicar).

**Feito quando:** conta de teste some do Auth e das tabelas; B intacta; sem
confirmação não apaga.

---

## PES-108 — Migração assistida do Dexie antigo

Dependências: PES-105.

1. Modal no primeiro login se houver dados v1 no aparelho: “Achei registros
   neste aparelho. Mandar para a sua conta?”
2. Só com confirmação. Uma vez por userId+aparelho.
3. Idempotente (mesmo UUID não duplica).
4. Sem sync silencioso de um segundo aparelho. Fotos não sobem.

**Feito quando:** Dexie pré-carregado + conta vazia → confirma → dados na conta;
repetir não duplica.

---

## PES-109 — Copy, nag, suporte, README

Dependências: PES-103.

1. Remover banner de backup 30 dias (`App.tsx`).
2. Config: e-mail de suporte visível (constante de PES-102; não inventar).
3. README/Config: conta é a cópia oficial.

**Feito quando:** grep não acha o nag na UI; README não promete “única cópia no
iPhone”.

---

## PES-110 — Gate de isolamento (fecha a barra)

Dependências: PES-104, PES-106, PES-107. Fecha a barra de pronto.

Matriz A vs B (local/homologação, **não** produção):

| Operação | Próprio | Do outro |
| --- | --- | --- |
| select logs | ok | zero |
| insert com user_id alheio | rejeitado | — |
| update/delete alheio | zero | — |
| select profile clínico alheio | negado | — |
| admin directory | só conta | sem peso/dose |

Encerrar A não mexe em B. `npm run check` + `npm run db:test` verdes. Advisors
de segurança justificados no PR.

**Feito quando:** a matriz está evidenciada. Sem esta task a barra não está
completa.
