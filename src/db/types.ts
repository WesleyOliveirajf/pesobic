// Modelo de dados do Pesobic. Unidades fixas: kg, cm, mg, ml.

export type MedicationKey = 'semaglutida' | 'tirzepatida' | 'liraglutida' | 'outro'

export interface TitrationPhase {
  id: string
  doseMg: number
  /** Duracao planejada da fase em semanas. 0 = manutencao / por tempo indeterminado. */
  weeks: number
  label?: string
}

export interface Settings {
  id: 'singleton'
  planId?: string
  createdAt: number
  onboardedAt: number | null

  // Perfil
  heightCm: number
  startWeightKg: number
  startDate: string // yyyy-mm-dd
  goalWeightKg: number

  // Medicacao
  medication: MedicationKey
  medicationLabel: string // usado quando medication === 'outro'

  // Proteina
  proteinFactor: number // g por kg de peso atual
  proteinManualGoal: number | null // se preenchido, sobrescreve o calculo

  // Agua
  waterGoalMl: number

  // Lembrete (.ics)
  reminderWeekday: number // 0=domingo ... 6=sabado (usado quando a cadencia e semanal)
  reminderTime: string // 'HH:mm'
  reminderStartDate: string // yyyy-mm-dd, ancora do evento recorrente

  // Titracao
  phases: TitrationPhase[]
  currentPhaseIndex: number

  // Backup
  lastExportAt: number | null
}

export type InjectionSite =
  | 'abdomen_esq'
  | 'abdomen_dir'
  | 'coxa_esq'
  | 'coxa_dir'
  | 'braco_esq'
  | 'braco_dir'

export type InjectionStatus = 'aplicada' | 'pulada'

export interface Injection {
  id?: string
  at: number // timestamp da aplicacao (ou do registro, se pulada)
  medication: MedicationKey
  doseMg: number
  site: InjectionSite
  status: InjectionStatus
  note?: string
}

export interface WeighIn {
  id?: string
  date: string // yyyy-mm-dd
  at: number
  weightKg: number
  waistCm?: number
  hipCm?: number
  armCm?: number
  thighCm?: number
  chestCm?: number
  neckCm?: number
  note?: string
}

export interface PhotoEntry {
  id?: number
  at: number
  date: string // yyyy-mm-dd
  blob: Blob
  note?: string
}

export type SymptomKey =
  | 'nausea'
  | 'vomito'
  | 'constipacao'
  | 'diarreia'
  | 'azia'
  | 'dor_abdominal'
  | 'fadiga'
  | 'dor_cabeca'
  | 'tontura'
  | 'arrotos'
  | 'apetite'

export type Severity = 0 | 1 | 2 | 3

export interface SymptomLog {
  id?: string
  at: number
  symptom: SymptomKey
  severity: Severity
  note?: string
}

export interface NutritionDay {
  id?: string
  date: string // yyyy-mm-dd (chave unica)
  proteinG: number
  waterMl: number
  meals: number
  note?: string
}
