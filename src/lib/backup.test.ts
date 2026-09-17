import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Injection, Settings } from '../db/types'

const {
  getSettings,
  photosToArray,
  patchLocalSettings,
  cacheSettings,
  loadAccountSettings,
  getAccountIdentity,
  listInjections,
  listWeighIns,
  listSymptomLogs,
  listNutritionDays,
  wipeAllForUser,
  saveAccountSettings,
  addInjection,
  addWeighIn,
  addSymptomLog,
  upsertNutritionDay,
  triggerDownload,
} = vi.hoisted(() => ({
  getSettings: vi.fn(),
  photosToArray: vi.fn(),
  patchLocalSettings: vi.fn(),
  cacheSettings: vi.fn(),
  loadAccountSettings: vi.fn(),
  getAccountIdentity: vi.fn(),
  listInjections: vi.fn(),
  listWeighIns: vi.fn(),
  listSymptomLogs: vi.fn(),
  listNutritionDays: vi.fn(),
  wipeAllForUser: vi.fn(),
  saveAccountSettings: vi.fn(),
  addInjection: vi.fn(),
  addWeighIn: vi.fn(),
  addSymptomLog: vi.fn(),
  upsertNutritionDay: vi.fn(),
  triggerDownload: vi.fn(),
}))

vi.mock('../db/db', () => ({
  db: {
    settings: { get: getSettings },
    photos: {
      orderBy: () => ({ toArray: photosToArray }),
      add: vi.fn(),
    },
  },
  patchLocalSettings,
  cacheSettings,
}))

vi.mock('./repo', () => ({
  loadAccountSettings,
  getAccountIdentity,
  listInjections,
  listWeighIns,
  listSymptomLogs,
  listNutritionDays,
  wipeAllForUser,
  saveAccountSettings,
  addInjection,
  addWeighIn,
  addSymptomLog,
  upsertNutritionDay,
}))

vi.mock('./ics', () => ({
  triggerDownload,
}))

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackupFile,
  exportAccountBundle,
  exportBackup,
  exportPhotos,
  importBackup,
  parseBackupFile,
  resolveBackupIdentity,
} from './backup'

const USER_ID = '11111111-1111-4111-8111-111111111111'

function asFile(payload: unknown): File {
  return { text: async () => JSON.stringify(payload) } as File
}

async function downloadedJson(call = 0) {
  const blob = triggerDownload.mock.calls[call]?.[0] as Blob
  return JSON.parse(await blob.text()) as Record<string, unknown>
}

describe('identidade do backup', () => {
  it('usa e-mail e nome remotos quando existem', () => {
    expect(
      resolveBackupIdentity(USER_ID, { email: 'ana@example.com', fullName: 'Ana' }, {
        email: 'hint@example.com',
        fullName: 'Hint',
      }),
    ).toEqual({
      userId: USER_ID,
      email: 'ana@example.com',
      full_name: 'Ana',
    })
  })

  it('cai no hint da sessão se a leitura remota falhar', () => {
    expect(
      resolveBackupIdentity(USER_ID, null, { email: 'hint@example.com', fullName: 'Ana Hint' }),
    ).toEqual({
      userId: USER_ID,
      email: 'hint@example.com',
      full_name: 'Ana Hint',
    })
  })

  it('grava e-mail, nome e userId no JSON v2', () => {
    const file = buildBackupFile({
      userId: USER_ID,
      identity: { userId: USER_ID, email: 'ana@example.com', full_name: 'Ana' },
      settings: null,
      injections: [],
      weighIns: [],
      symptoms: [],
      nutrition: [],
      exportedAt: '2026-09-17T12:00:00.000Z',
    })
    expect(file.format).toBe(BACKUP_FORMAT)
    expect(file.version).toBe(BACKUP_VERSION)
    expect(file.identity).toEqual({
      userId: USER_ID,
      email: 'ana@example.com',
      full_name: 'Ana',
    })
  })
})

describe('parseBackupFile', () => {
  it('aceita o arquivo antigo sem identidade', () => {
    const parsed = parseBackupFile({
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      settings: { id: 'singleton' } as Settings,
      injections: [{ id: 'inj-1', doseMg: 0.25 } as Injection],
      weighIns: [],
      symptoms: [],
      nutrition: [],
    })
    expect(parsed.version).toBe(1)
    expect(parsed.identity).toBeNull()
    expect(parsed.injections).toHaveLength(1)
    expect(parsed.settings).toMatchObject({ id: 'singleton' })
  })

  it('rejeita arquivo que nao e backup do Pesobic', () => {
    expect(() => parseBackupFile({ format: 'outro' })).toThrow(/backup do Pesobic/)
  })
})

describe('exportBackup', () => {
  beforeEach(() => {
    getSettings.mockResolvedValue(undefined)
    loadAccountSettings.mockResolvedValue(null)
    getAccountIdentity.mockResolvedValue({ email: 'ana@example.com', fullName: 'Ana Silva' })
    listInjections.mockResolvedValue([{ id: 'inj-1' }])
    listWeighIns.mockResolvedValue([])
    listSymptomLogs.mockResolvedValue([])
    listNutritionDays.mockResolvedValue([])
    photosToArray.mockResolvedValue([])
    patchLocalSettings.mockResolvedValue(undefined)
    triggerDownload.mockReset()
  })

  it('baixa JSON com e-mail e nome', async () => {
    const backup = await exportBackup(USER_ID)
    expect(backup.identity).toEqual({
      userId: USER_ID,
      email: 'ana@example.com',
      full_name: 'Ana Silva',
    })
    const json = await downloadedJson()
    expect(json.identity).toEqual(backup.identity)
    expect(json.version).toBe(2)
    expect(triggerDownload.mock.calls[0][1]).toMatch(/^pesobic-backup-.*\.json$/)
  })

  it('ainda gera o arquivo se uma lista clinica falhar', async () => {
    listInjections.mockRejectedValue(new Error('schema remoto velho'))
    const backup = await exportBackup(USER_ID, { email: 'ana@example.com', fullName: 'Ana Silva' })
    expect(backup.injections).toEqual([])
    expect(backup.identity.email).toBe('ana@example.com')
    expect(triggerDownload).toHaveBeenCalledOnce()
  })

  it('usa o hint quando getAccountIdentity falha', async () => {
    getAccountIdentity.mockRejectedValue(new Error('blocked / coluna ausente'))
    const backup = await exportBackup(USER_ID, { email: 'hint@example.com', fullName: 'Hint' })
    expect(backup.identity).toEqual({
      userId: USER_ID,
      email: 'hint@example.com',
      full_name: 'Hint',
    })
  })
})

describe('fotos e bundle de encerrar', () => {
  beforeEach(() => {
    getSettings.mockResolvedValue(undefined)
    loadAccountSettings.mockResolvedValue(null)
    getAccountIdentity.mockResolvedValue({ email: 'ana@example.com', fullName: 'Ana' })
    listInjections.mockResolvedValue([])
    listWeighIns.mockResolvedValue([])
    listSymptomLogs.mockResolvedValue([])
    listNutritionDays.mockResolvedValue([])
    patchLocalSettings.mockResolvedValue(undefined)
    triggerDownload.mockReset()
  })

  it('nao baixa arquivo de fotos quando o Dexie esta vazio', async () => {
    photosToArray.mockResolvedValue([])
    await expect(exportPhotos()).resolves.toBe(0)
    expect(triggerDownload).not.toHaveBeenCalled()
  })

  it('no Encerrar baixa JSON e fotos quando existem', async () => {
    photosToArray.mockResolvedValue([{ date: '2026-09-17', at: 1, note: 'frente', blob: new Blob(['x']) }])
    class FakeFileReader {
      result = 'data:image/png;base64,abc'
      onload: null | (() => void) = null
      onerror: null | (() => void) = null
      readAsDataURL() {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('FileReader', FakeFileReader)

    const result = await exportAccountBundle(USER_ID, { email: 'ana@example.com', fullName: 'Ana' })
    expect(result.photoCount).toBe(1)
    expect(result.backup.identity.email).toBe('ana@example.com')
    expect(triggerDownload).toHaveBeenCalledTimes(2)
    expect(triggerDownload.mock.calls[1][1]).toMatch(/^pesobic-fotos-.*\.json$/)
    vi.unstubAllGlobals()
  })
})

describe('importBackup', () => {
  beforeEach(() => {
    wipeAllForUser.mockResolvedValue(undefined)
    saveAccountSettings.mockImplementation(async (_userId: string, settings: Settings) => settings)
    cacheSettings.mockResolvedValue(undefined)
    addInjection.mockResolvedValue({})
    addWeighIn.mockResolvedValue({})
    addSymptomLog.mockResolvedValue({})
    upsertNutritionDay.mockResolvedValue({})
  })

  it('importa o JSON v1 sem identidade', async () => {
    const { counts } = await importBackup(
      USER_ID,
      asFile({
        format: BACKUP_FORMAT,
        version: 1,
        injections: [{ at: 1, medication: 'semaglutida', doseMg: 0.25, site: 'abdomen_d', status: 'aplicada' }],
        weighIns: [],
        symptoms: [],
        nutrition: [],
      }),
    )
    expect(counts.injections).toBe(1)
    expect(wipeAllForUser).toHaveBeenCalledWith(USER_ID)
    expect(addInjection).toHaveBeenCalledOnce()
  })
})
