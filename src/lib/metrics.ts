import type { Injection, Settings, WeighIn } from '../db/types'
import { cadenceDays } from './domain'
import { daysBetween, parseISODate, todayISO } from './format'

/** Uma medida por dia (a mais recente daquele dia), ordenada do mais antigo ao mais novo. */
export function dailyWeights(weighIns: WeighIn[]): { date: string; weightKg: number }[] {
  const byDate = new Map<string, WeighIn>()
  for (const w of weighIns) {
    const prev = byDate.get(w.date)
    if (!prev || w.at > prev.at) byDate.set(w.date, w)
  }
  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({ date: w.date, weightKg: w.weightKg }))
}

export function latestWeight(weighIns: WeighIn[], settings: Settings): number {
  if (weighIns.length === 0) return settings.startWeightKg
  return weighIns.reduce((acc, w) => (w.at > acc.at ? w : acc)).weightKg
}

export function bmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0
  const m = heightCm / 100
  return weightKg / (m * m)
}

export interface WeightStats {
  current: number
  lostKg: number // positivo = perdeu
  lostPct: number
  toGoalKg: number // quanto falta (positivo) ou passou (negativo)
  goalProgressPct: number // 0..100
  bmiNow: number
  bmiGoal: number
}

export function weightStats(weighIns: WeighIn[], s: Settings): WeightStats {
  const current = latestWeight(weighIns, s)
  const lostKg = s.startWeightKg - current
  const lostPct = s.startWeightKg > 0 ? (lostKg / s.startWeightKg) * 100 : 0
  const toGoalKg = current - s.goalWeightKg
  const span = s.startWeightKg - s.goalWeightKg
  const goalProgressPct = span > 0 ? clamp((lostKg / span) * 100, 0, 100) : current <= s.goalWeightKg ? 100 : 0
  return {
    current,
    lostKg,
    lostPct,
    toGoalKg,
    goalProgressPct,
    bmiNow: bmi(current, s.heightCm),
    bmiGoal: bmi(s.goalWeightKg, s.heightCm),
  }
}

/** Regressao linear simples sobre os ultimos `windowDays` dias. Retorna kg/semana (negativo = perdendo). */
export function weeklyRateKg(weighIns: WeighIn[], windowDays = 28): number | null {
  const daily = dailyWeights(weighIns)
  if (daily.length < 2) return null
  const lastISO = daily[daily.length - 1].date
  const cutoff = daysBetween(daily[0].date, lastISO) - windowDays
  const pts = daily
    .map((d) => ({ x: daysBetween(daily[0].date, d.date), y: d.weightKg }))
    .filter((p) => p.x >= cutoff)
  if (pts.length < 2) return null
  const n = pts.length
  const sx = pts.reduce((a, p) => a + p.x, 0)
  const sy = pts.reduce((a, p) => a + p.y, 0)
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0)
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) return null
  const slopePerDay = (n * sxy - sx * sy) / denom
  return slopePerDay * 7
}

/** Semanas estimadas ate a meta, no ritmo atual. null se nao esta perdendo peso ou ja atingiu. */
export function projectionWeeks(weighIns: WeighIn[], s: Settings): number | null {
  const stats = weightStats(weighIns, s)
  if (stats.toGoalKg <= 0) return 0
  const rate = weeklyRateKg(weighIns)
  if (rate === null || rate >= -0.01) return null
  return stats.toGoalKg / Math.abs(rate)
}

/** Serie para o grafico: peso do dia + media movel de 7 dias. */
export function weightSeries(
  weighIns: WeighIn[],
): { date: string; peso: number; media: number }[] {
  const daily = dailyWeights(weighIns)
  return daily.map((d, i) => {
    const from = parseISODate(d.date).getTime() - 6 * 86_400_000
    let sum = 0
    let count = 0
    for (let j = i; j >= 0; j--) {
      if (parseISODate(daily[j].date).getTime() < from) break
      sum += daily[j].weightKg
      count += 1
    }
    return { date: d.date, peso: round1(d.weightKg), media: round1(count ? sum / count : d.weightKg) }
  })
}

export interface Adherence {
  applied: number
  skipped: number
  expected: number
  pct: number
}

export function adherence(injections: Injection[], s: Settings, onISO = todayISO()): Adherence {
  const applied = injections.filter((i) => i.status === 'aplicada').length
  const skipped = injections.filter((i) => i.status === 'pulada').length
  const elapsed = Math.max(0, daysBetween(s.startDate, onISO))
  const step = cadenceDays(s.medication)
  const expected = Math.max(1, Math.floor(elapsed / step) + 1)
  const pct = clamp((applied / expected) * 100, 0, 100)
  return { applied, skipped, expected, pct }
}

export interface NextDose {
  dueISO: string
  daysUntil: number
  overdue: boolean
}

export function nextDose(injections: Injection[], s: Settings, onISO = todayISO()): NextDose {
  const step = cadenceDays(s.medication)
  const lastApplied = injections
    .filter((i) => i.status === 'aplicada')
    .sort((a, b) => b.at - a.at)[0]

  let dueISO: string
  if (lastApplied) {
    dueISO = todayISO(new Date(lastApplied.at + step * 86_400_000))
  } else {
    dueISO = s.reminderStartDate
  }
  const daysUntil = daysBetween(onISO, dueISO)
  return { dueISO, daysUntil, overdue: daysUntil < 0 }
}

export function proteinGoal(currentWeightKg: number, s: Settings): number {
  if (s.proteinManualGoal && s.proteinManualGoal > 0) return Math.round(s.proteinManualGoal)
  return Math.round(currentWeightKg * s.proteinFactor)
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10
}
