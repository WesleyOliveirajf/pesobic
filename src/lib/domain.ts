import type { InjectionSite, MedicationKey, SymptomKey } from '../db/types'

export const MEDICATIONS: { key: MedicationKey; label: string; cadence: 'semanal' | 'diaria' }[] = [
  { key: 'semaglutida', label: 'Semaglutida', cadence: 'semanal' },
  { key: 'tirzepatida', label: 'Tirzepatida', cadence: 'semanal' },
  { key: 'liraglutida', label: 'Liraglutida', cadence: 'diaria' },
  { key: 'outro', label: 'Outro', cadence: 'semanal' },
]

export function medLabel(key: MedicationKey, custom: string): string {
  if (key === 'outro') return custom.trim() || 'Outro'
  return MEDICATIONS.find((m) => m.key === key)?.label ?? key
}

export function cadenceDays(key: MedicationKey): number {
  return MEDICATIONS.find((m) => m.key === key)?.cadence === 'diaria' ? 1 : 7
}

// --- Locais de aplicacao, na ordem de rodizio ---
export const SITE_ORDER: InjectionSite[] = [
  'abdomen_esq',
  'abdomen_dir',
  'coxa_esq',
  'coxa_dir',
  'braco_esq',
  'braco_dir',
]

export const SITE_LABEL: Record<InjectionSite, string> = {
  abdomen_esq: 'Abdome esq.',
  abdomen_dir: 'Abdome dir.',
  coxa_esq: 'Coxa esq.',
  coxa_dir: 'Coxa dir.',
  braco_esq: 'Braco esq.',
  braco_dir: 'Braco dir.',
}

/** Proximo local sugerido no rodizio, a partir do ultimo usado. */
export function nextSite(lastSite: InjectionSite | undefined): InjectionSite {
  if (!lastSite) return SITE_ORDER[0]
  const i = SITE_ORDER.indexOf(lastSite)
  return SITE_ORDER[(i + 1) % SITE_ORDER.length]
}

// --- Sintomas ---
export const SYMPTOMS: { key: SymptomKey; label: string }[] = [
  { key: 'nausea', label: 'Nausea' },
  { key: 'vomito', label: 'Vomito' },
  { key: 'constipacao', label: 'Constipacao' },
  { key: 'diarreia', label: 'Diarreia' },
  { key: 'azia', label: 'Azia / refluxo' },
  { key: 'dor_abdominal', label: 'Dor abdominal' },
  { key: 'fadiga', label: 'Fadiga' },
  { key: 'dor_cabeca', label: 'Dor de cabeca' },
  { key: 'tontura', label: 'Tontura' },
  { key: 'arrotos', label: 'Arrotos' },
  { key: 'apetite', label: 'Apetite reduzido' },
]

export function symptomLabel(key: SymptomKey): string {
  return SYMPTOMS.find((s) => s.key === key)?.label ?? key
}

export const SEVERITY_LABEL = ['Nenhum', 'Leve', 'Moderado', 'Intenso'] as const
