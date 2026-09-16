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

Para **GitHub Pages de projeto** (`usuario.github.io/pesobic/`), builde com a base certa:

```sh
# PowerShell
$env:DEPLOY_BASE='/pesobic/'; npm run build
```

Em dominio proprio, Netlify ou Vercel, deixe `DEPLOY_BASE` em branco.

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
