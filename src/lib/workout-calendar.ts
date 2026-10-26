import { todayISO } from './format'
import type { WorkoutKind } from '../db/types'

export const WORKOUT_KIND_LABEL: Record<WorkoutKind, string> = {
  musculacao: 'Musculação',
  cardio: 'Cardio',
  caminhada: 'Caminhada',
}

export const WEEKDAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const

export interface MonthCell {
  date: string
  inMonth: boolean
}

/** Grade de 6 semanas, segunda a domingo. */
export function monthCells(year: number, monthIndex: number): MonthCell[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const offset = (firstWeekday + 6) % 7
  const start = new Date(year, monthIndex, 1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return { date: todayISO(day), inMonth: day.getMonth() === monthIndex }
  })
}

export function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; month: number } {
  const next = new Date(year, monthIndex + delta, 1)
  return { year: next.getFullYear(), month: next.getMonth() }
}

export function monthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function countMarkedInMonth(dates: readonly string[], year: number, monthIndex: number): number {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
  return dates.filter((date) => date.startsWith(prefix)).length
}
