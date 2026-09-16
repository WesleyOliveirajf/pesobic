import Dexie, { type Table } from 'dexie'
import type {
  Injection,
  NutritionDay,
  PhotoEntry,
  Settings,
  SymptomLog,
  WeighIn,
} from './types'

const V1_STORES = {
  settings: 'id',
  injections: '++id, at, status',
  weighIns: '++id, date, at',
  photos: '++id, at, date',
  symptoms: '++id, at, symptom',
  nutrition: '++id, &date',
}

export class PesobicDB extends Dexie {
  settings!: Table<Settings, string>
  injections!: Table<Injection, string>
  weighIns!: Table<WeighIn, string>
  photos!: Table<PhotoEntry, number>
  symptoms!: Table<SymptomLog, string>
  nutrition!: Table<NutritionDay, string>

  constructor(databaseName = 'pesobic:sem-usuario', legacy = false) {
    super(databaseName)
    this.version(1).stores(V1_STORES)
    if (!legacy) {
      this.version(2)
        .stores({
          settings: 'id',
          injections: 'id, at, status',
          weighIns: 'id, date, at',
          photos: '++id, at, date',
          symptoms: 'id, at, symptom',
          nutrition: 'id, &date',
        })
        .upgrade(async (tx) => {
          await Promise.all([
            tx.table('injections').clear(),
            tx.table('weighIns').clear(),
            tx.table('symptoms').clear(),
            tx.table('nutrition').clear(),
          ])
        })
    }
  }
}

export let db = new PesobicDB()

let activeUserId: string | null = null

/** Mantem os dados locais separados por usuario sem remover bancos anteriores. */
export function activateUserDatabase(userId: string): void {
  if (activeUserId === userId) return
  db.close()
  db = new PesobicDB(`pesobic:${userId}`)
  activeUserId = userId
}

export function deactivateUserDatabase(): void {
  db.close()
  db = new PesobicDB()
  activeUserId = null
}

export function openLegacyDatabase(name: string): PesobicDB {
  return new PesobicDB(name, true)
}

export const SETTINGS_ID = 'singleton' as const

export async function loadSettings(): Promise<Settings | null> {
  return (await db.settings.get(SETTINGS_ID)) ?? null
}

export async function cacheSettings(settings: Settings): Promise<void> {
  await db.settings.put({ ...settings, id: SETTINGS_ID })
}

export async function patchLocalSettings(patch: Partial<Settings>): Promise<void> {
  const current = (await db.settings.get(SETTINGS_ID)) ?? null
  if (!current) return
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID })
}

export async function replaceCache<T extends { id?: string }>(
  table: Table<T, string>,
  rows: T[],
): Promise<void> {
  await table.clear()
  const withIds = rows.filter((row): row is T & { id: string } => typeof row.id === 'string')
  if (withIds.length) await table.bulkPut(withIds)
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
