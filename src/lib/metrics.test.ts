import { describe, expect, it } from 'vitest'
import type { Injection, Settings, WeighIn } from '../db/types'
import {
  adherence,
  dailyWeights,
  nextDose,
  proteinGoal,
  weeklyRateKg,
  weightStats,
} from './metrics'

const settings: Settings = {
  id: 'singleton',
  createdAt: 0,
  onboardedAt: 0,
  heightCm: 170,
  startWeightKg: 100,
  startDate: '2026-09-01',
  goalWeightKg: 80,
  medication: 'semaglutida',
  medicationLabel: '',
  proteinFactor: 1.2,
  proteinManualGoal: null,
  waterGoalMl: 2500,
  reminderWeekday: 2,
  reminderTime: '08:00',
  reminderStartDate: '2026-09-01',
  phases: [{ id: 'phase-1', doseMg: 0.25, weeks: 4 }],
  currentPhaseIndex: 0,
  lastExportAt: null,
}

describe('métricas de peso', () => {
  it('mantém apenas a pesagem mais recente de cada dia', () => {
    const rows: WeighIn[] = [
      { id: '1', date: '2026-09-01', at: 100, weightKg: 99.5 },
      { id: '2', date: '2026-09-01', at: 200, weightKg: 99.2 },
      { id: '3', date: '2026-09-02', at: 300, weightKg: 99 },
    ]

    expect(dailyWeights(rows)).toEqual([
      { date: '2026-09-01', weightKg: 99.2 },
      { date: '2026-09-02', weightKg: 99 },
    ])
  })

  it('calcula progresso e limita o percentual a 100%', () => {
    const result = weightStats(
      [{ date: '2026-09-14', at: 1, weightKg: 78 }],
      settings,
    )

    expect(result.lostKg).toBe(22)
    expect(result.toGoalKg).toBe(-2)
    expect(result.goalProgressPct).toBe(100)
    expect(result.bmiNow).toBeCloseTo(26.99, 2)
  })

  it('calcula tendência semanal por regressão linear', () => {
    const rows: WeighIn[] = [
      { date: '2026-09-01', at: 1, weightKg: 100 },
      { date: '2026-09-08', at: 2, weightKg: 99.3 },
      { date: '2026-09-15', at: 3, weightKg: 98.6 },
    ]

    expect(weeklyRateKg(rows)).toBeCloseTo(-0.7, 5)
  })
})

describe('métricas de acompanhamento', () => {
  it('calcula adesão semanal sem ultrapassar 100%', () => {
    const injections: Injection[] = [
      {
        at: new Date(2026, 8, 1, 8).getTime(),
        medication: 'semaglutida',
        doseMg: 0.25,
        site: 'abdomen_esq',
        status: 'aplicada',
      },
      {
        at: new Date(2026, 8, 8, 8).getTime(),
        medication: 'semaglutida',
        doseMg: 0.25,
        site: 'abdomen_dir',
        status: 'pulada',
      },
    ]

    expect(adherence(injections, settings, '2026-09-14')).toEqual({
      applied: 1,
      skipped: 1,
      expected: 2,
      pct: 50,
    })
  })

  it('agenda a próxima dose a partir da última aplicação efetiva', () => {
    const appliedAt = new Date(2026, 8, 7, 12).getTime()
    const injections: Injection[] = [
      {
        at: appliedAt,
        medication: 'semaglutida',
        doseMg: 0.25,
        site: 'coxa_esq',
        status: 'aplicada',
      },
    ]

    expect(nextDose(injections, settings, '2026-09-10')).toEqual({
      dueISO: '2026-09-14',
      daysUntil: 4,
      overdue: false,
    })
  })

  it('prioriza a meta manual de proteína', () => {
    expect(proteinGoal(90, settings)).toBe(108)
    expect(proteinGoal(90, { ...settings, proteinManualGoal: 125 })).toBe(125)
  })
})
