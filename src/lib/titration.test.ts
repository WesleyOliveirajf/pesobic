import { describe, expect, it } from 'vitest'
import type { TitrationPhase } from '../db/types'
import { currentDoseMg, expectedPhaseIndex, phaseWindows } from './titration'

const phases: TitrationPhase[] = [
  { id: 'phase-1', doseMg: 0.25, weeks: 4 },
  { id: 'phase-2', doseMg: 0.5, weeks: 4 },
  { id: 'phase-3', doseMg: 1, weeks: 0, label: 'Manutenção' },
]

describe('cronograma de titulação', () => {
  it('gera janelas consecutivas e deixa manutenção sem fim', () => {
    const windows = phaseWindows(phases, '2026-01-01')

    expect(windows).toEqual([
      expect.objectContaining({ index: 0, startISO: '2026-01-01', endISO: '2026-01-29' }),
      expect.objectContaining({ index: 1, startISO: '2026-01-29', endISO: '2026-02-26' }),
      expect.objectContaining({ index: 2, startISO: '2026-02-26', endISO: null }),
    ])
  })

  it('troca de fase exatamente no início da próxima janela', () => {
    expect(expectedPhaseIndex(phases, '2026-01-01', '2026-01-28')).toBe(0)
    expect(expectedPhaseIndex(phases, '2026-01-01', '2026-01-29')).toBe(1)
    expect(expectedPhaseIndex(phases, '2026-01-01', '2026-02-26')).toBe(2)
  })

  it('permanece na primeira fase antes do início do plano', () => {
    expect(expectedPhaseIndex(phases, '2026-01-01', '2025-12-20')).toBe(0)
  })

  it('limita a fase atual ao último item do plano', () => {
    expect(
      currentDoseMg({ phases, currentPhaseIndex: 99 } as Parameters<typeof currentDoseMg>[0]),
    ).toBe(1)
  })
})
