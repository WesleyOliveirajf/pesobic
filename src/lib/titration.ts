import type { MedicationKey, Settings, TitrationPhase } from '../db/types'
import { addDays, daysBetween, todayISO } from './format'

let seq = 0
function pid(): string {
  seq += 1
  return `ph_${Date.now().toString(36)}_${seq}`
}

export function phase(doseMg: number, weeks: number, label?: string): TitrationPhase {
  return { id: pid(), doseMg, weeks, label }
}

/**
 * Esquemas de titracao de referencia, baseados em bula dos fabricantes.
 * Nao sao recomendacao clinica: a decisao de dose e sua e do seu acompanhamento.
 * Todos editaveis depois de criados.
 */
export const TITRATION_TEMPLATES: Record<
  MedicationKey,
  { name: string; note: string; phases: () => TitrationPhase[] }
> = {
  semaglutida: {
    name: 'Semaglutida (escalonamento ate 2,4 mg/sem)',
    note: 'Referencia de bula (uso semanal SC). Ajuste conforme sua tolerancia e orientacao.',
    phases: () => [
      phase(0.25, 4),
      phase(0.5, 4),
      phase(1, 4),
      phase(1.7, 4),
      phase(2.4, 0, 'Manutencao'),
    ],
  },
  tirzepatida: {
    name: 'Tirzepatida (escalonamento ate 15 mg/sem)',
    note: 'Referencia de bula (uso semanal SC). Ajuste conforme sua tolerancia e orientacao.',
    phases: () => [
      phase(2.5, 4),
      phase(5, 4),
      phase(7.5, 4),
      phase(10, 4),
      phase(12.5, 4),
      phase(15, 0, 'Manutencao'),
    ],
  },
  liraglutida: {
    name: 'Liraglutida (escalonamento ate 3,0 mg/dia)',
    note: 'Referencia de bula (uso diario SC). Ajuste conforme sua tolerancia e orientacao.',
    phases: () => [
      phase(0.6, 1),
      phase(1.2, 1),
      phase(1.8, 1),
      phase(2.4, 1),
      phase(3, 0, 'Manutencao'),
    ],
  },
  outro: {
    name: 'Sem template',
    note: 'Monte as fases manualmente.',
    phases: () => [phase(0, 0, 'Fase 1')],
  },
}

export interface PhaseWindow {
  index: number
  phase: TitrationPhase
  startISO: string
  endISO: string | null // null = fase de manutencao (sem fim planejado)
  isOpenEnded: boolean
}

/** Calcula as janelas de data de cada fase a partir da data de inicio. */
export function phaseWindows(phases: TitrationPhase[], startDateISO: string): PhaseWindow[] {
  const out: PhaseWindow[] = []
  let cursor = startDateISO
  phases.forEach((ph, index) => {
    const openEnded = ph.weeks <= 0
    const endISO = openEnded ? null : addDays(cursor, ph.weeks * 7)
    out.push({
      index,
      phase: ph,
      startISO: cursor,
      endISO,
      isOpenEnded: openEnded,
    })
    if (endISO) cursor = endISO
  })
  return out
}

/** Indice da fase esperada hoje, so pela passagem do tempo desde o inicio. */
export function expectedPhaseIndex(
  phases: TitrationPhase[],
  startDateISO: string,
  onISO: string = todayISO(),
): number {
  const windows = phaseWindows(phases, startDateISO)
  const elapsed = daysBetween(startDateISO, onISO)
  if (elapsed < 0) return 0
  for (const w of windows) {
    if (w.endISO === null) return w.index
    if (daysBetween(startDateISO, w.endISO) > elapsed) return w.index
  }
  return Math.max(0, phases.length - 1)
}

export function currentPhase(s: Settings): TitrationPhase | undefined {
  return s.phases[Math.min(s.currentPhaseIndex, s.phases.length - 1)]
}

export function currentDoseMg(s: Settings): number {
  return currentPhase(s)?.doseMg ?? 0
}
