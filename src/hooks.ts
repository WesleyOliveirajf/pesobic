import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'

export function useSettings() {
  // undefined = carregando; null = sem onboarding; objeto = pronto
  return useLiveQuery(async () => (await db.settings.get('singleton')) ?? null, [])
}

export function useInjections() {
  return useLiveQuery(() => db.injections.orderBy('at').toArray(), [], [])
}

export function useWeighIns() {
  return useLiveQuery(() => db.weighIns.orderBy('at').toArray(), [], [])
}

export function useSymptoms() {
  return useLiveQuery(() => db.symptoms.orderBy('at').toArray(), [], [])
}

export function useNutrition() {
  return useLiveQuery(() => db.nutrition.orderBy('date').toArray(), [], [])
}

export function usePhotos() {
  return useLiveQuery(() => db.photos.orderBy('at').reverse().toArray(), [], [])
}
