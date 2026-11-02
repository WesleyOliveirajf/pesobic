import { describe, expect, it } from 'vitest'
import { validateMeasures } from './measures'

describe('validateMeasures', () => {
  it('aceita medidas ausentes e dentro da faixa', () => {
    expect(validateMeasures({ weightKg: 97.4 })).toBeNull()
    expect(validateMeasures({ weightKg: 97.4, waistCm: 100, armCm: 5, neckCm: 200 })).toBeNull()
  })

  it('rejeita valores fora da faixa do banco', () => {
    expect(validateMeasures({ waistCm: 9 })).toBe('Cintura deve estar entre 10 e 400 cm.')
    expect(validateMeasures({ armCm: 201 })).toBe('Braço deve estar entre 5 e 200 cm.')
    expect(validateMeasures({ weightKg: 19 })).toBe('Peso deve estar entre 20 e 500 kg.')
  })

  it('rejeita NaN e infinito', () => {
    expect(validateMeasures({ thighCm: Number.NaN })).not.toBeNull()
    expect(validateMeasures({ chestCm: Infinity })).not.toBeNull()
  })
})

import { formatMeasures, measureDeltas } from './measures'

describe('formatMeasures', () => {
  it('lista só as medidas preenchidas', () => {
    expect(formatMeasures({ weightKg: 90 })).toBe('')
    expect(formatMeasures({ weightKg: 90, hipCm: 100, armCm: 35.5 })).toBe('quadril 100 · braço 35,5 cm')
  })
})

describe('measureDeltas', () => {
  it('calcula a variação entre o primeiro e o último registro', () => {
    const rows = [
      { date: '2026-10-10', weightKg: 90, armCm: 36, waistCm: 100 },
      { date: '2026-11-02', weightKg: 88, armCm: 34.5 },
      { date: '2026-10-20', weightKg: 89, waistCm: 98 },
    ]
    const d = measureDeltas(rows)
    expect(d.find((x) => x.key === 'armCm')?.deltaCm).toBe(-1.5)
    expect(d.find((x) => x.key === 'waistCm')?.deltaCm).toBe(-2)
    expect(d.find((x) => x.key === 'hipCm')).toBeUndefined()
  })
})
