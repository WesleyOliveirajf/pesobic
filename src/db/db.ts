import Dexie, { type Table } from 'dexie'
import type {
  Injection,
  NutritionDay,
  PhotoEntry,
  Settings,
  SymptomLog,
  WeighIn,
} from './types'

export class PesobicDB extends Dexie {
  settings!: Table<Settings, string>
  injections!: Table<Injection, number>
  weighIns!: Table<WeighIn, number>
  photos!: Table<PhotoEntry, number>
  symptoms!: Table<SymptomLog, number>
  nutrition!: Table<NutritionDay, number>

  constructor() {
    super('pesobic')
    this.version(1).stores({
      settings: 'id',
      injections: '++id, at, status',
      weighIns: '++id, date, at',
      photos: '++id, at, date',
      symptoms: '++id, at, symptom',
      nutrition: '++id, &date',
    })
  }
}

export const db = new PesobicDB()

export const SETTINGS_ID = 'singleton' as const

/** Retorna as settings, ou null se o onboarding ainda nao foi feito. undefined = carregando. */
export async function loadSettings(): Promise<Settings | null> {
  return (await db.settings.get(SETTINGS_ID)) ?? null
}

export async function patchSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.update(SETTINGS_ID, patch)
}

export async function wipeAll(): Promise<void> {
  await db.transaction(
    'rw',
    [db.settings, db.injections, db.weighIns, db.photos, db.symptoms, db.nutrition],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.injections.clear(),
        db.weighIns.clear(),
        db.photos.clear(),
        db.symptoms.clear(),
        db.nutrition.clear(),
      ])
    },
  )
}
