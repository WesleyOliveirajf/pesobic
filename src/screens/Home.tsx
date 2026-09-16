import type { Settings, WeighIn } from '../db/types'
import { Card, EmptyState, ProgressBar, Stat } from '../components/ui'
import { useInjections, useNutrition, useSymptoms, useWeighIns } from '../hooks'
import { medLabel, SEVERITY_LABEL, symptomLabel } from '../lib/domain'
import { fmtDateTime, fmtRelativeDays, num, signed, todayISO } from '../lib/format'
import {
  adherence,
  latestWeight,
  nextDose,
  projectionWeeks,
  proteinGoal,
  weeklyRateKg,
  weightStats,
} from '../lib/metrics'
import { currentPhase, expectedPhaseIndex } from '../lib/titration'
import { useAuthProfile } from '../lib/auth-context'

export function Home({ settings, onGo }: { settings: Settings; onGo: (tab: string) => void }) {
  const profile = useAuthProfile()
  const [injections] = useInjections()
  const [weighIns] = useWeighIns()
  const [symptoms] = useSymptoms()

  const nd = nextDose(injections, settings)
  const phase = currentPhase(settings)
  const expectedIdx = expectedPhaseIndex(settings.phases, settings.startDate)
  const behindPlan = expectedIdx > settings.currentPhaseIndex
  const aheadPlan = expectedIdx < settings.currentPhaseIndex

  const stats = weightStats(weighIns, settings)
  const rate = weeklyRateKg(weighIns)
  const proj = projectionWeeks(weighIns, settings)
  const current = latestWeight(weighIns, settings)

  const adh = adherence(injections, settings)

  const recentSymptoms = [...symptoms].sort((a, b) => b.at - a.at).slice(0, 4)

  return (
    <div className="screen">
      <Card
        title="Proxima dose"
        right={
          <button className="link" onClick={() => onGo('caneta')}>
            Caneta &rsaquo;
          </button>
        }
      >
        <div className="next-dose">
          <div className={`countdown ${nd.overdue ? 'countdown-over' : ''}`}>
            <strong>{fmtRelativeDays(nd.daysUntil)}</strong>
            <span>{nd.overdue ? 'dose atrasada' : nd.daysUntil === 0 ? 'aplicar hoje' : 'ate a proxima'}</span>
          </div>
          <div className="dose-now">
            <span className="dose-mg">
              {phase && phase.doseMg > 0 ? `${num(phase.doseMg, phase.doseMg % 1 === 0 ? 0 : 2)} mg` : 'dose nao definida'}
            </span>
            <span className="dose-med">
              {medLabel(settings.medication, settings.medicationLabel)}
              {phase?.label ? ` - ${phase.label}` : ''}
            </span>
          </div>
        </div>
        {behindPlan && (
          <p className="plan-flag warn">
            Pelo cronograma, a fase esperada agora seria a #{expectedIdx + 1}
            {settings.phases[expectedIdx] ? ` (${num(settings.phases[expectedIdx].doseMg, 2)} mg)` : ''}.
            Voce esta segurando numa dose anterior.
          </p>
        )}
        {aheadPlan && (
          <p className="plan-flag">Voce esta adiante do cronograma planejado.</p>
        )}
        <p className="muted-small">Aderencia: {num(adh.pct, 0)}% ({adh.applied}/{adh.expected} doses previstas)</p>
      </Card>

      <Card
        title="Peso"
        right={
          <button className="link" onClick={() => onGo('peso')}>
            Peso &rsaquo;
          </button>
        }
      >
        <div className="stat-row">
          <Stat label="Atual" value={`${num(current)} kg`} />
          <Stat
            label="Desde o inicio"
            value={`${signed(-stats.lostKg)} kg`}
            tone={stats.lostKg > 0 ? 'ok' : undefined}
            sub={`${signed(-stats.lostPct)}%`}
          />
          <Stat
            label="Tendencia"
            value={rate === null ? '--' : `${signed(rate)} kg/sem`}
            tone={rate !== null && rate < -0.05 ? 'ok' : rate !== null && rate > 0.05 ? 'warn' : undefined}
          />
        </div>
      </Card>

      <Card title="Meta">
        <div className="stat-row">
          <Stat label="Progresso" value={`${num(stats.goalProgressPct, 0)}%`} />
          <Stat
            label={stats.toGoalKg > 0 ? 'Falta' : 'Passou'}
            value={`${num(Math.abs(stats.toGoalKg))} kg`}
            tone={stats.toGoalKg <= 0 ? 'ok' : undefined}
          />
          <Stat
            label="Projecao"
            value={
              proj === null ? '--' : proj === 0 ? 'atingida' : `~${num(proj, 0)} sem`
            }
            sub={proj && proj > 0 ? 'no ritmo atual' : undefined}
          />
        </div>
        <ProgressBar pct={stats.goalProgressPct} tone="ok" />
        <p className="muted-small">
          IMC {num(stats.bmiNow)} &rarr; meta {num(stats.bmiGoal)}
        </p>
      </Card>

      {profile.nutrition_enabled && <NutritionSummary settings={settings} weighIns={weighIns} onGo={onGo} />}

      <Card
        title="Ultimos sintomas"
        right={
          <button className="link" onClick={() => onGo('sintomas')}>
            Sintomas &rsaquo;
          </button>
        }
      >
        {recentSymptoms.length === 0 ? (
          <EmptyState>Nenhum sintoma registrado ainda.</EmptyState>
        ) : (
          <ul className="mini-list">
            {recentSymptoms.map((s) => (
              <li key={s.id}>
                <span>
                  <strong>{symptomLabel(s.symptom)}</strong> — {SEVERITY_LABEL[s.severity]}
                </span>
                <time>{fmtDateTime(s.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function NutritionSummary({ settings, weighIns, onGo }: { settings: Settings; weighIns: WeighIn[]; onGo: (tab: string) => void }) {
  const [nutrition] = useNutrition()
  const todayNut = nutrition.find((n) => n.date === todayISO())
  const pGoal = proteinGoal(latestWeight(weighIns, settings), settings)

  return (
    <Card
      title="Hoje"
      right={
        <button className="link" onClick={() => onGo('nutricao')}>
          Nutrição &rsaquo;
        </button>
      }
    >
      <div className="today-line">
        <span>Proteína</span>
        <strong>{todayNut?.proteinG ?? 0} / {pGoal} g</strong>
      </div>
      <ProgressBar pct={((todayNut?.proteinG ?? 0) / pGoal) * 100} />
      <div className="today-line">
        <span>Água</span>
        <strong>{((todayNut?.waterMl ?? 0) / 1000).toFixed(1)} / {(settings.waterGoalMl / 1000).toFixed(1)} L</strong>
      </div>
      <ProgressBar pct={((todayNut?.waterMl ?? 0) / settings.waterGoalMl) * 100} tone="brand" />
      <div className="today-line">
        <span>Refeições</span>
        <strong>{todayNut?.meals ?? 0}</strong>
      </div>
    </Card>
  )
}
