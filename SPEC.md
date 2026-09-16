# Pesobic — Especificacao

> **Execução atual:** produto travado e backlog dos agentes estão em [`TASKS.md`](./TASKS.md). As decisões desta página (“um usuário, sem login, só no aparelho”) estão **revogadas**.

Ferramenta pessoal (usuario unico) para acompanhar o processo de emagrecimento com
canetas GLP-1: aplicacoes, dose/titulacao, peso e medidas, sintomas e proteina.

> Pesobic registra o que voce decide e calcula indicadores. **Nao** prescreve dose,
> nao da diagnostico e nao substitui acompanhamento profissional. As decisoes sobre a
> medicacao sao suas.

---

## 1. Decisoes de projeto (arvore fechada no grilling)

| Eixo | Decisao |
| --- | --- |
| Plataforma | PWA instalavel (Safari > Adicionar a Tela de Inicio). Offline total. |
| Stack | Vite + React + TypeScript + Dexie (IndexedDB) + `vite-plugin-pwa` + Recharts |
| Usuario | Um so. Sem login, sem servidor, sem analytics. |
| Dados | 100% no aparelho. Export/import JSON manual. Aviso de backup apos 30 dias. |
| Lembrete | Evento recorrente `.ics` (RRULE) -> Calendario do iOS dispara o alarme nativo. |
| Titulacao | Auto-gerenciada. App tem builder de fases + templates de bula editaveis. |
| Nutricao | Leve: proteina (meta por g/kg), agua, refeicoes, observacao. Sem banco de alimentos. |
| Unidades | pt-BR, kg, cm, mg, ml. |
| Tema | Automatico (segue o iOS). |
| Hospedagem | GitHub Pages. |
| Nome | Pesobic. |

## 2. Modelo de dados (`src/db/types.ts`)

- **Settings** (singleton): perfil (altura, peso inicial, data inicio, peso alvo),
  medicacao, fator de proteina / meta fixa, meta de agua, ancora do lembrete,
  `phases[]` + `currentPhaseIndex`, `lastExportAt`.
- **Injection**: `at`, medicamento, `doseMg`, `site` (rodizio de 6 locais), `status`
  (`aplicada` | `pulada`), nota.
- **WeighIn**: `date`, `weightKg`, `waistCm` + medidas opcionais (quadril, braco, coxa,
  peito, pescoco), nota.
- **PhotoEntry**: blob local, fora do backup JSON principal.
- **SymptomLog**: `symptom` (11 tipos), `severity` 0-3, `at`, nota.
- **NutritionDay**: `date` unico, `proteinG`, `waterMl`, `meals`, nota.

## 3. Indicadores calculados (`src/lib/metrics.ts`)

% do peso perdido, kg ate a meta, % da meta, variacao semanal (regressao linear 28d),
projecao linear ("meta em ~X semanas"), IMC atual e alvo, aderencia
(doses aplicadas / previstas pela cadencia).

## 4. Telas

`Inicio` (painel) · `Caneta` (aplicacao + rodizio + cronograma) · `Peso` (pesagem +
graficos + fotos) · `Sintomas` (registro + grafico com marcadores de dose) ·
`Nutricao` (proteina/agua/refeicoes do dia + grafico) · `Config`.

---

## 5. Tarefas

### Feito (v1)

- [x] Scaffold Vite + React + TS; deps (Dexie, Recharts, vite-plugin-pwa)
- [x] Config PWA: manifest pt-BR, tema, `pwaAssets` a partir de `public/logo.svg`, `base` configuravel p/ GitHub Pages
- [x] Schema Dexie v1 + helpers (`loadSettings`, `patchSettings`, `wipeAll`)
- [x] `lib/format` — datas locais sem deslize de fuso, numeros pt-BR
- [x] `lib/domain` — medicamentos, cadencia, locais de aplicacao + rodizio, sintomas
- [x] `lib/titration` — fases, janelas de data, fase esperada x atual, templates de bula (semaglutida, tirzepatida, liraglutida)
- [x] `lib/metrics` — peso, tendencia, projecao, IMC, aderencia, meta de proteina, proxima dose
- [x] `lib/ics` — evento recorrente RRULE + VALARM, download
- [x] `lib/backup` — export/import JSON; export/import de fotos separado
- [x] Componentes UI (Card, Btn, Field, NumberInput, Modal, SeverityPicker, ConfirmButton, ProgressBar)
- [x] Graficos Recharts (peso + media 7d + linha de meta; cintura; proteina x meta; severidade com marcadores de dose)
- [x] Onboarding (perfil, medicacao, template de titulacao, lembrete, proteina)
- [x] Tela Inicio (proxima dose, peso, meta, hoje, ultimos sintomas)
- [x] Tela Caneta (registrar aplicacao/pulada, rodizio, cronograma editavel, avancar/segurar dose, historico)
- [x] Tela Peso (pesagem rapida, medidas opcionais, graficos, fotos de progresso, historico)
- [x] Tela Sintomas (chips, escala 0-3, grafico, historico)
- [x] Tela Nutricao (proteina/agua/refeicoes do dia com atalhos, grafico 30d, historico)
- [x] Tela Config (editar tudo, baixar .ics, backup export/import, apagar tudo)
- [x] App shell: tabbar, splash, banner de backup apos 30 dias, aba lembrada em localStorage
- [x] Estilos tema-aware (claro/escuro via prefers-color-scheme), safe-area iOS
- [x] `npm run build` verde (tsc + vite + PWA)

### Backlog (v2+)

- [ ] Deploy GitHub Pages: criar repo, workflow `deploy.yml`, buildar com `DEPLOY_BASE=/pesobic/`
- [ ] Testar instalacao real no iPhone (Safari > Adicionar a Tela de Inicio) e o fluxo do `.ics` no Calendario
- [ ] Code-split do Recharts (bundle ~700 kB) via `manualChunks` ou import dinamico dos graficos
- [ ] Web Push real (iOS 16.4+): Cloudflare Worker com VAPID, permissao e agendamento — substitui/complementa o `.ics`
- [ ] Backup automatico opcional (arquivo no iCloud Drive via Atalhos, ou Supabase)
- [ ] Editar `reminderStartDate`/cadencia deve avisar para reexportar o `.ics`
- [ ] Grafico de composicao corporal (todas as circunferencias juntas, normalizadas)
- [ ] Marcadores de aplicacao real (nao so fases planejadas) nos graficos de peso e sintomas
- [ ] Lembrete de pesagem semanal (outro `.ics` opcional)
- [ ] Exportar relatorio em PDF/CSV para levar na consulta
- [ ] Migracao de schema Dexie v2 quando novos campos entrarem
- [ ] PWA: tela de "atualizacao disponivel" (prompt) em vez de `autoUpdate` silencioso
- [ ] Testes: unit para `lib/metrics` e `lib/titration` (Vitest)

## 6. Rodar e publicar

```sh
npm install
npm run dev            # desenvolvimento
npm run build          # gera dist/ (base "/")

# build para GitHub Pages de projeto:
$env:DEPLOY_BASE='/pesobic/'; npm run build
```
