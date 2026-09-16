import { openLegacyDatabase, type PesobicDB } from '../db/db'
import { stableUuid } from './ids'
import * as repo from './repo'
import type { Injection, NutritionDay, Settings, SymptomLog, WeighIn } from '../db/types'

const LEGACY_NAMES = ['pesobic', 'pesobic:sem-usuario'] as const

export interface LegacyPeek {
  source: string
  settings: Settings | null
  injections: number
  weighIns: number
  symptoms: number
  nutrition: number
}

function migratedKey(userId: string) {
  return `pesobic:legacy-migrated:${userId}`
}

export function wasMigrated(userId: string): boolean {
  try {
    return localStorage.getItem(migratedKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markMigrated(userId: string): void {
  try {
    localStorage.setItem(migratedKey(userId), '1')
  } catch {
    /* ok */
  }
}

export function skipMigration(userId: string): void {
  markMigrated(userId)
}

async function counts(db: PesobicDB) {
  const [settings, injections, weighIns, symptoms, nutrition] = await Promise.all([
    db.settings.get('singleton'),
    db.injections.count(),
    db.weighIns.count(),
    db.symptoms.count(),
    db.nutrition.count(),
  ])
  return { settings: settings ?? null, injections, weighIns, symptoms, nutrition }
}

export async function peekLegacyData(): Promise<LegacyPeek | null> {
  let best: LegacyPeek | null = null
  for (const name of LEGACY_NAMES) {
    const db = openLegacyDatabase(name)
    try {
      await db.open()
      const data = await counts(db)
      const total = data.injections + data.weighIns + data.symptoms + data.nutrition + (data.settings?.onboardedAt ? 1 : 0)
      if (total > 0 && (!best || total > best.injections + best.weighIns + best.symptoms + best.nutrition + (best.settings ? 1 : 0))) {
        best = { source: name, ...data }
      }
    } catch {
      /* banco inexistente */
    } finally {
      db.close()
    }
  }
  return best
}

export async function migrateLegacyToAccount(userId: string, source: string): Promise<void> {
  const db = openLegacyDatabase(source)
  try {
    await db.open()
    const settings = (await db.settings.get('singleton')) ?? null
    const [injections, weighIns, symptoms, nutrition] = await Promise.all([
      db.injections.toArray() as Promise<Injection[]>,
      db.weighIns.toArray() as Promise<WeighIn[]>,
      db.symptoms.toArray() as Promise<SymptomLog[]>,
      db.nutrition.toArray() as Promise<NutritionDay[]>,
    ])

    if (settings?.onboardedAt) {
      await repo.saveAccountSettings(userId, {
        ...settings,
        planId: settings.planId ?? stableUuid(`legacy-plan:${source}`),
        phases: settings.phases.map((phase) => ({
          ...phase,
          id: stableUuid(`legacy-phase:${source}:${phase.id}`),
        })),
      })
    }

    for (const row of injections) {
      await repo.addInjection(userId, {
        ...row,
        id: typeof row.id === 'string' ? stableUuid(`legacy-injection:${source}:${row.id}`) : stableUuid(`legacy-injection:${source}:${row.at}:${row.doseMg}`),
      })
    }
    for (const row of weighIns) {
      await repo.addWeighIn(userId, {
        ...row,
        id: typeof row.id === 'string' ? stableUuid(`legacy-weigh:${source}:${row.id}`) : stableUuid(`legacy-weigh:${source}:${row.date}:${row.at}`),
      })
    }
    for (const row of symptoms) {
      await repo.addSymptomLog(userId, {
        ...row,
        id: typeof row.id === 'string' ? stableUuid(`legacy-symptom:${source}:${row.id}`) : stableUuid(`legacy-symptom:${source}:${row.at}:${row.symptom}`),
      })
    }
    for (const row of nutrition) {
      await repo.upsertNutritionDay(userId, row.date, {
        proteinG: row.proteinG,
        waterMl: row.waterMl,
        meals: row.meals,
        note: row.note,
      })
    }
    markMigrated(userId)
  } finally {
    db.close()
  }
}
