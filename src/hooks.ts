import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { cacheSettings, db, replaceCache } from './db/db'
import { useAuthProfile } from './lib/auth-context'
import * as repo from './lib/repo'
import type { Injection, Settings, SymptomLog, WeighIn, WorkoutDay } from './db/types'

/**
 * Enquanto a conta e consultada, a ausencia do cache local nao significa que
 * o usuario ainda precisa concluir o onboarding.
 *
 * Depois da consulta: `remote` manda. Escrita via `persistSettings` atualiza
 * `remote` pelos listeners para a UI sair do onboarding / refletir fases sem reload.
 */
export function resolveSettings(
  cached: Settings | null | undefined,
  remote: Settings | null | undefined,
): Settings | null | undefined {
  return remote === undefined ? cached ?? undefined : remote
}

type SettingsListener = (settings: Settings) => void

const settingsListeners = new Set<SettingsListener>()

function notifySettingsPersisted(settings: Settings) {
  for (const listener of settingsListeners) listener(settings)
}

export function useSettings() {
  const profile = useAuthProfile()
  const cached = useLiveQuery(async () => (await db.settings.get('singleton')) ?? null, [profile.id])
  const [remote, setRemote] = useState<Settings | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    setRemote(undefined)
    void (async () => {
      try {
        const settings = await repo.loadAccountSettings(profile.id)
        if (!active) return
        if (settings) {
          const local = await db.settings.get('singleton')
          await cacheSettings({ ...settings, lastExportAt: local?.lastExportAt ?? null })
        } else {
          await db.settings.clear()
        }
        if (active) setRemote(settings)
      } catch {
        /* keep last cache */
        const local = await db.settings.get('singleton')
        if (active) setRemote(local ?? null)
      }
    })()
    return () => {
      active = false
    }
  }, [profile.id])

  useEffect(() => {
    const onPersist: SettingsListener = (settings) => setRemote(settings)
    settingsListeners.add(onPersist)
    return () => {
      settingsListeners.delete(onPersist)
    }
  }, [])

  return resolveSettings(cached, remote)
}

export async function persistSettings(userId: string, next: Settings): Promise<Settings> {
  const saved = await repo.saveAccountSettings(userId, next)
  const local = await db.settings.get('singleton')
  const merged = { ...saved, lastExportAt: next.lastExportAt ?? local?.lastExportAt ?? null }
  await cacheSettings(merged)
  notifySettingsPersisted(merged)
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

export function useWorkouts(): [WorkoutDay[], () => Promise<void>] {
  const cached = useLiveQuery(() => db.workouts.toArray(), []) ?? []
  const writeCache = useCallback((rows: WorkoutDay[]) => replaceCache(db.workouts, rows), [])
  return useSyncedEntity(repo.listWorkoutDays, cached, writeCache)
}

export function usePhotos() {
  return useLiveQuery(() => db.photos.orderBy('at').reverse().toArray(), [], [])
}
