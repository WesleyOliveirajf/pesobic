import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { useAuthProfile } from './lib/auth-context'
import * as repo from './lib/repo'
import type { Injection, NutritionDay, SymptomLog, WeighIn } from './db/types'

export function useSettings() {
  // undefined = carregando; null = sem onboarding; objeto = pronto
  return useLiveQuery(async () => (await db.settings.get('singleton')) ?? null, [])
}

/** Busca uma entidade sincronizavel no Supabase e devolve [linhas, recarregar]. */
function useSyncedEntity<T>(fetcher: (userId: string) => Promise<T[]>): [T[], () => Promise<void>] {
  const profile = useAuthProfile()
  const [rows, setRows] = useState<T[]>([])

  const reload = useCallback(async () => {
    const data = await fetcher(profile.id)
    setRows(data)
  }, [profile.id, fetcher])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- fetch-on-mount, not a derived-state pattern
    void reload()
  }, [reload])

  return [rows, reload]
}

export function useInjections(): [Injection[], () => Promise<void>] {
  return useSyncedEntity(repo.listInjections)
}

export function useWeighIns(): [WeighIn[], () => Promise<void>] {
  return useSyncedEntity(repo.listWeighIns)
}

export function useSymptoms(): [SymptomLog[], () => Promise<void>] {
  return useSyncedEntity(repo.listSymptomLogs)
}

export function useNutrition(): [NutritionDay[], () => Promise<void>] {
  return useSyncedEntity(repo.listNutritionDays)
}

export function usePhotos() {
  return useLiveQuery(() => db.photos.orderBy('at').reverse().toArray(), [], [])
}
