import type { WeighIn } from '../db/types'

/** Faixas aceitas pelo banco (check constraints de public.weigh_ins). Mantenha em sincronia com o schema. */
export const MEASURE_RANGES = {
  weightKg: { label: 'Peso', unit: 'kg', min: 20, max: 500 },
  waistCm: { label: 'Cintura', unit: 'cm', min: 10, max: 400 },
  hipCm: { label: 'Quadril', unit: 'cm', min: 10, max: 400 },
  armCm: { label: 'Braço', unit: 'cm', min: 5, max: 200 },
  thighCm: { label: 'Coxa', unit: 'cm', min: 5, max: 250 },
  chestCm: { label: 'Peito', unit: 'cm', min: 10, max: 400 },
  neckCm: { label: 'Pescoço', unit: 'cm', min: 5, max: 200 },
} as const

export type MeasureKey = keyof typeof MEASURE_RANGES

/** Retorna a primeira mensagem de erro, ou null se todas as medidas informadas estão nas faixas. */
export function validateMeasures(values: Partial<Pick<WeighIn, MeasureKey>>): string | null {
  for (const key of Object.keys(MEASURE_RANGES) as MeasureKey[]) {
    const v = values[key]
    if (v === undefined || v === null) continue
    const { label, unit, min, max } = MEASURE_RANGES[key]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      return `${label} deve estar entre ${min} e ${max} ${unit}.`
    }
  }
  return null
}

const MEASURE_SHORT_LABELS: Record<Exclude<MeasureKey, 'weightKg'>, string> = {
  waistCm: 'cintura/abdômen',
  hipCm: 'quadril',
  armCm: 'braço',
  thighCm: 'coxa',
  chestCm: 'peito',
  neckCm: 'pescoço',
}

const BODY_KEYS = Object.keys(MEASURE_SHORT_LABELS) as Exclude<MeasureKey, 'weightKg'>[]

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

/** Resume as medidas corporais preenchidas, ex.: "cintura/abdômen 90 · braço 35,5 cm". */
export function formatMeasures(w: Partial<Pick<WeighIn, MeasureKey>>): string {
  const parts = BODY_KEYS.filter((k) => typeof w[k] === 'number').map((k) => `${MEASURE_SHORT_LABELS[k]} ${fmt(w[k] as number)}`)
  return parts.length ? `${parts.join(' · ')} cm` : ''
}

export interface MeasureDelta {
  key: Exclude<MeasureKey, 'weightKg'>
  label: string
  firstCm: number
  lastCm: number
  deltaCm: number
}

/** Variação de cada medida entre o primeiro e o último registro que a contém (precisa de 2+ registros). */
export function measureDeltas(rows: (Pick<WeighIn, 'date' | MeasureKey>)[]): MeasureDelta[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
  const out: MeasureDelta[] = []
  for (const key of BODY_KEYS) {
    const values = sorted.map((r) => r[key]).filter((v): v is number => typeof v === 'number')
    if (values.length < 2) continue
    const firstCm = values[0]
    const lastCm = values[values.length - 1]
    out.push({ key, label: MEASURE_SHORT_LABELS[key], firstCm, lastCm, deltaCm: Math.round((lastCm - firstCm) * 10) / 10 })
  }
  return out
}

export interface CurrentMeasure {
  key: Exclude<MeasureKey, 'weightKg'>
  label: string
  cm: number
  date: string
}

/** Último valor registrado de cada medida corporal (mesmo que em pesagens diferentes). */
export function currentMeasures(rows: (Pick<WeighIn, 'date' | 'at' | MeasureKey>)[]): CurrentMeasure[] {
  const sorted = [...rows].sort((a, b) => b.at - a.at)
  const out: CurrentMeasure[] = []
  for (const key of BODY_KEYS) {
    const r = sorted.find((x) => typeof x[key] === 'number')
    if (r) out.push({ key, label: MEASURE_SHORT_LABELS[key], cm: r[key] as number, date: r.date })
  }
  return out
}
