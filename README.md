# Pesobic

PWA para acompanhar o emagrecimento com canetas GLP-1: aplicacoes, dose e
titulacao, peso e medidas, sintomas e proteina. **Conta na nuvem (Supabase) e a
copia oficial**; o aparelho e cache. Recorte Brasil, pt-BR.

Barra de produto e tasks dos agentes: [`TASKS.md`](./TASKS.md).

> Nao prescreve dose, nao da diagnostico e nao substitui acompanhamento profissional.

Detalhes historicos de escopo: [`SPEC.md`](./SPEC.md). A execucao atual esta em
[`TASKS.md`](./TASKS.md).

## Desenvolvimento

```sh
npm install
npm run dev
```

Cadastro por e-mail e senha (sem Google/Apple nesta barra). Confirmacao de
e-mail e recuperacao de senha exigem SMTP do Auth no ambiente de producao.

## Build

```sh
npm run build     # dist/ com base "/"
npm run preview   # serve o dist/ localmente
```

### Deploy na Vercel

A Vercel detecta este projeto Vite e publica automaticamente cada push na branch
configurada no projeto. O build gera `dist/` com base `/`, adequada ao dominio da
Vercel. O arquivo [`vercel.json`](./vercel.json) registra essa configuracao e
mantem o fallback da aplicacao de pagina unica.

O Vite embute `VITE_*` no JavaScript **durante o build**. Sem essas duas
variaveis o login mostra "Configure as variaveis do Supabase".

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

A chave publicavel e a URL ja vao em [`.env.production`](./.env.production) (so
valores de cliente; nunca `service_role`). O build da Vercel le esse arquivo.
Variaveis no dashboard da Vercel, se existirem, tem prioridade. `.env.local`
continua so para desenvolvimento local.

Inclua `https://pesobic.vercel.app` em **Supabase > Authentication > URL
Configuration** (Site URL e Redirect URLs). Isso permite que confirmacao de e-mail
e recuperacao de senha voltem para o app.

## Qualidade

```sh
npm run check     # lint + testes + build
npm run test:run  # testes de dominio
```

## Supabase local

O schema e declarativo e fica em `supabase/schemas/`. Para gerar a
migration e executar os testes de RLS e necessario ter Docker (ou runtime compativel)
em execucao:

```sh
npm exec supabase start
npm run db:diff
npm exec supabase db reset
npm run db:test
```

Revise a migration gerada antes de aplica-la. Esses comandos usam o ambiente local.
**Nao aplicar migration no projeto remoto `bcjtfdhxanfevownlewv` sem ordem
explicita no chat.**

SMTP do Auth (confirmacao e recuperacao de e-mail) e requisito de producao. Nao
configure o dashboard SMTP por acidente nesta barra.

## Backup

Config > Exportar backup (JSON). A conta na nuvem e a copia oficial; o export
local e extra. Fotos de progresso ainda ficam so no aparelho (aba Peso).

## Stack

Vite · React · TypeScript · Dexie (cache IndexedDB) · Recharts · vite-plugin-pwa · Supabase
