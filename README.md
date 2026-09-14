# Pesobic

PWA pessoal para acompanhar o emagrecimento com canetas GLP-1: aplicacoes, dose e
titulacao, peso e medidas, sintomas e proteina. Roda no iPhone (Safari > Adicionar a
Tela de Inicio), funciona offline e guarda tudo **so no aparelho**.

> Nao prescreve dose, nao da diagnostico e nao substitui acompanhamento profissional.

Detalhes de escopo, modelo de dados e lista de tarefas: [`SPEC.md`](./SPEC.md).

## Desenvolvimento

```sh
npm install
npm run dev
```

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
npm run test:run  # 14 testes de dominio
```

## Supabase local

O schema multiusuario e declarativo e fica em `supabase/schemas/`. Para gerar a
migration e executar os testes de RLS e necessario ter Docker (ou runtime compativel)
em execucao:

```sh
npm exec supabase start
npm run db:diff
npm exec supabase db reset
npm run db:test
```

Revise a migration gerada antes de aplica-la. Esses comandos usam o ambiente local;
nenhuma alteracao deve ser enviada ao projeto remoto sem autorizacao explicita.

## Backup

Config > Exportar backup (JSON). Faca com frequencia: se o iPhone se perder, o arquivo
exportado e a unica copia. Fotos de progresso tem export proprio na aba Peso.

## Stack

Vite · React · TypeScript · Dexie (IndexedDB) · Recharts · vite-plugin-pwa
