import { useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { cacheSettings, db, replaceCache } from './db/db'
import { useAuthProfile } from './lib/auth-context'
import * as repo from './lib/repo'
import type { Injection, NutritionDay, Settings, SymptomLog, WeighIn } from './db/types'

export function useSettings() {
  const profile = useAuthProfile()
  const cached = useLiveQuery(async () => (await db.settings.get('singleton')) ?? null, [profile.id])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const remote = await repo.loadAccountSettings(profile.id)
        if (!active) return
        if (remote) {
          const local = await db.settings.get('singleton')
          await cacheSettings({ ...remote, lastExportAt: local?.lastExportAt ?? null })
        }
      } catch {
        /* keep last cache */
      }
    })()
    return () => {
      active = false
    }
  }, [profile.id])

  return cached
}

export async function persistSettings(userId: string, next: Settings): Promise<Settings> {
  const saved = await repo.saveAccountSettings(userId, next)
  const local = await db.settings.get('singleton')
  const merged = { ...saved, lastExportAt: next.lastExportAt ?? local?.lastExportAt ?? null }
  await cacheSettings(merged)
  return merged
}

function useSyncedEntity<T extends { id?: string }>(
  fetcher: (userId: string) => Promise<T[]>,
  cached: T[],
  writeCache: (rows: T[]) => Promise<void>,
): [T[], () => Promise<void>] {
  const profile = useAuthProfile()

  const reload = useCallback(async () => {
    try {
      const data = await fetcher(profile.id)
      await writeCache(data)
    } catch {
      /* keep last cache */
    }
  }, [profile.id, fetcher, writeCache])

  useEffect(() => {
    void reload()
  }, [reload])

  return [cached, reload]
}

export function useInjections(): [Injection[], () => Promise<void>] {
  const cached = useLiveQuery(() => db.injections.toArray(), []) ?? []
  const writeCache = useCallback((rows: Injection[]) => replaceCache(db.injections, rows), [])
  return useSyncedEntity(repo.listInjections, cached, writeCache)
}

export function useWeighIns(): [WeighIn[], () => Promise<void>] {
  const cached = useLiveQuery(() => db.weighIns.toArray(), []) ?? []
  const writeCache = useCallback((rows: WeighIn[]) => replaceCache(db.weighIns, rows), [])
  return useSyncedEntity(repo.listWeighIns, cached, writeCache)
}

export function useSymptoms(): [SymptomLog[], () => Promise<void>] {
  const cached = useLiveQuery(() => db.symptoms.toArray(), []) ?? []
  const writeCache = useCallback((rows: SymptomLog[]) => replaceCache(db.symptoms, rows), [])
  return useSyncedEntity(repo.listSymptomLogs, cached, writeCache)
}

export function useNutrition(): [NutritionDay[], () => Promise<void>] {
  const cached = useLiveQuery(() => db.nutrition.toArray(), []) ?? []
  const writeCache = useCallback((rows: NutritionDay[]) => replaceCache(db.nutrition, rows), [])
  return useSyncedEntity(repo.listNutritionDays, cached, writeCache)
}

export function usePhotos() {
  return useLiveQuery(() => db.photos.orderBy('at').reverse().toArray(), [], [])
}
