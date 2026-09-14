import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, parseISODate, todayISO } from './format'

describe('formatos de data civil', () => {
  it('interpreta a data ISO no calendário local', () => {
    const date = parseISODate('2026-09-14')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(14)
  })

  it('mantém a data local ao formatar', () => {
    expect(todayISO(new Date(2026, 8, 14, 23, 45))).toBe('2026-09-14')
  })

  it('soma dias atravessando mês e ano bissexto', () => {
    expect(addDays('2028-02-28', 2)).toBe('2028-03-01')
  })

  it('calcula diferença de dias civis', () => {
    expect(daysBetween('2026-09-01', '2026-09-14')).toBe(13)
    expect(daysBetween('2026-09-14', '2026-09-01')).toBe(-13)
  })
})
