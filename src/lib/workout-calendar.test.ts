import { describe, expect, it } from 'vitest'
import { countMarkedInMonth, monthCells, shiftMonth } from './workout-calendar'

describe('calendario de treino', () => {
  it('comeca na segunda e cobre o mes inteiro', () => {
    const cells = monthCells(2026, 9)
    expect(cells).toHaveLength(42)
    expect(cells[0]?.date).toBe('2026-09-28')
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31)
    expect(cells.find((cell) => cell.date === '2026-10-01')?.inMonth).toBe(true)
    expect(cells.find((cell) => cell.date === '2026-10-26')?.inMonth).toBe(true)
  })

  it('conta so os dias marcados do mes visivel', () => {
    expect(countMarkedInMonth(['2026-10-01', '2026-10-26', '2026-11-02'], 2026, 9)).toBe(2)
  })

  it('vira o ano ao sair de dezembro', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })
})
