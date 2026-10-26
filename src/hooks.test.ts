import { describe, expect, it } from 'vitest'
import { resolveSettings } from './hooks'
import type { Settings } from './db/types'

const completedSettings = { onboardedAt: Date.now() } as Settings

describe('resolveSettings', () => {
  it('mantem o app carregando quando nao ha cache e a conta ainda esta sendo consultada', () => {
    expect(resolveSettings(null, undefined)).toBeUndefined()
  })

  it('usa o cadastro concluido vindo da conta assim que a consulta termina', () => {
    expect(resolveSettings(null, completedSettings)).toBe(completedSettings)
  })

  it('libera o onboarding apenas quando a consulta confirma que nao existe cadastro', () => {
    expect(resolveSettings(undefined, null)).toBeNull()
  })

  it('depois do load, remote preenchido sobrescreve ausencia de cache', () => {
    expect(resolveSettings(undefined, completedSettings)).toBe(completedSettings)
  })

  it('depois do persist (remote atualizado), ignora cache vazio e libera a home', () => {
    expect(resolveSettings(null, completedSettings)).toBe(completedSettings)
  })
})
