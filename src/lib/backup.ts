import { cacheSettings, db, patchLocalSettings } from '../db/db'
import * as repo from './repo'
import type {
  Injection,
  NutritionDay,
  Settings,
  SymptomLog,
  WeighIn,
} from '../db/types'
import { todayISO } from './format'
import { triggerDownload } from './ics'

export const BACKUP_FORMAT = 'pesobic-backup'
export const BACKUP_VERSION = 2

export interface BackupIdentity {
  userId: string
  email: string | null
  full_name: string | null
}

export interface BackupIdentityHint {
  email?: string | null
  fullName?: string | null
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  identity: BackupIdentity
  settings: Settings | null
  injections: Injection[]
  weighIns: WeighIn[]
  symptoms: SymptomLog[]
  nutrition: NutritionDay[]
}

export function resolveBackupIdentity(
  userId: string,
  remote: repo.AccountIdentity | null,
  hint?: BackupIdentityHint,
): BackupIdentity {
  return {
    userId,
    email: remote?.email ?? hint?.email ?? null,
    full_name: remote?.fullName ?? hint?.fullName ?? null,
  }
}

export function buildBackupFile(input: {
  userId: string
  identity: BackupIdentity
  settings: Settings | null
  injections: Injection[]
  weighIns: WeighIn[]
  symptoms: SymptomLog[]
  nutrition: NutritionDay[]
  exportedAt?: string
}): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    identity: input.identity,
    settings: input.settings,
    injections: input.injections,
    weighIns: input.weighIns,
    symptoms: input.symptoms,
    nutrition: input.nutrition,
  }
}

/** Aceita v2 (com identidade) e o JSON antigo sem o campo. */
export function parseBackupFile(raw: unknown): {
  version: number
  identity: BackupIdentity | null
  settings: Settings | null
  injections: Injection[]
  weighIns: WeighIn[]
  symptoms: SymptomLog[]
  nutrition: NutritionDay[]
} {
  const data = raw as Partial<BackupFile> | null
  if (!data || data.format !== BACKUP_FORMAT) {
    throw new Error('Arquivo nao e um backup do Pesobic.')
  }
  const identity = data.identity
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    identity: identity?.userId
      ? {
          userId: identity.userId,
          email: identity.email ?? null,
          full_name: identity.full_name ?? null,
        }
      : null,
    settings: data.settings ?? null,
    injections: data.injections ?? [],
    weighIns: data.weighIns ?? [],
    symptoms: data.symptoms ?? [],
    nutrition: data.nutrition ?? [],
  }
}

export async function exportBackup(userId: string, identityHint?: BackupIdentityHint): Promise<BackupFile> {
  const results = await Promise.allSettled([
    db.settings.get('singleton'),
    repo.loadAccountSettings(userId),
    repo.getAccountIdentity(userId),
    repo.listInjections(userId),
    repo.listWeighIns(userId),
    repo.listSymptomLogs(userId),
    repo.listNutritionDays(userId),
  ])
  const value = <T,>(index: number, fallback: T): T =>
    results[index].status === 'fulfilled' ? results[index].value as T : fallback
  const cached = value<Settings | undefined>(0, undefined)
  const remoteSettings = value<Settings | null>(1, null)
  const remoteIdentity = value<repo.AccountIdentity | null>(2, null)
  const injections = value<Injection[]>(3, [])
  const weighIns = value<WeighIn[]>(4, [])
  const symptoms = value<SymptomLog[]>(5, [])
  const nutrition = value<NutritionDay[]>(6, [])
  const settings = remoteSettings
    ? { ...remoteSettings, lastExportAt: cached?.lastExportAt ?? null }
    : cached ?? null
  const data = buildBackupFile({
    userId,
    identity: resolveBackupIdentity(userId, remoteIdentity, identityHint),
    settings: settings ?? null,
    injections,
    weighIns,
    symptoms,
    nutrition,
  })
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `pesobic-backup-${todayISO()}.json`)
  await patchLocalSettings({ lastExportAt: Date.now() })
  return data
}

/** JSON principal e, se existirem, o arquivo de fotos. Usado em Encerrar. */
export async function exportAccountBundle(
  userId: string,
  identityHint?: BackupIdentityHint,
): Promise<{ backup: BackupFile; photoCount: number }> {
  const backup = await exportBackup(userId, identityHint)
  const photoCount = await exportPhotos()
  return { backup, photoCount }
}

/** Importa um backup: substitui os registros do usuario no banco (perfil local fica intacto). */
export async function importBackup(userId: string, file: File): Promise<{ counts: Record<string, number> }> {
  const data = parseBackupFile(JSON.parse(await file.text()))

  await repo.wipeAllForUser(userId)
  if (data.settings) {
    const saved = await repo.saveAccountSettings(userId, { ...data.settings, id: 'singleton' })
    await cacheSettings(saved)
  }
  for (const row of data.injections) await repo.addInjection(userId, stripId(row))
  for (const row of data.weighIns) await repo.addWeighIn(userId, stripId(row))
  for (const row of data.symptoms) await repo.addSymptomLog(userId, stripId(row))
  for (const row of data.nutrition) {
    await repo.upsertNutritionDay(userId, row.date, {
      proteinG: row.proteinG,
      waterMl: row.waterMl,
      meals: row.meals,
      note: row.note,
    })
  }

  return {
    counts: {
      injections: data.injections.length,
      weighIns: data.weighIns.length,
      symptoms: data.symptoms.length,
      nutrition: data.nutrition.length,
    },
  }
}

function stripId<T extends { id?: string }>(row: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = row
  return rest
}

// --- Fotos: export/import separado (base64), para nao inchar o backup principal ---

interface PhotosFile {
  format: 'pesobic-fotos'
  version: number
  exportedAt: string
  photos: { date: string; at: number; note?: string; dataUrl: string }[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function exportPhotos(): Promise<number> {
  const rows = await db.photos.orderBy('at').toArray()
  if (!rows.length) return 0
  const photos = await Promise.all(
    rows.map(async (p) => ({
      date: p.date,
      at: p.at,
      note: p.note,
      dataUrl: await blobToDataUrl(p.blob),
    })),
  )
  const data: PhotosFile = {
    format: 'pesobic-fotos',
    version: 1,
    exportedAt: new Date().toISOString(),
    photos,
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  triggerDownload(blob, `pesobic-fotos-${todayISO()}.json`)
  return rows.length
}

export async function importPhotos(file: File): Promise<number> {
  const data = JSON.parse(await file.text()) as Partial<PhotosFile>
  if (data.format !== 'pesobic-fotos' || !data.photos) {
    throw new Error('Arquivo nao e um export de fotos do Pesobic.')
  }
  let added = 0
  for (const p of data.photos) {
    const blob = await dataUrlToBlob(p.dataUrl)
    await db.photos.add({ date: p.date, at: p.at, note: p.note, blob })
    added += 1
  }
  return added
}
