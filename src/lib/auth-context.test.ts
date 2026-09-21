import { describe, expect, it } from 'vitest'
import { isMissingProfileColumn } from './auth-context'

describe('isMissingProfileColumn', () => {
  it('reconhece a ausência da coluna de nutrição no schema remoto', () => {
    expect(isMissingProfileColumn({ message: 'column profiles.nutrition_enabled does not exist' }, 'nutrition_enabled')).toBe(true)
  })

  it('reconhece o schema anterior sem bloqueio e não esconde outros erros', () => {
    expect(isMissingProfileColumn({ message: 'column profiles.blocked does not exist' }, 'blocked')).toBe(true)
    expect(isMissingProfileColumn({ message: 'permission denied for table profiles' }, 'blocked')).toBe(false)
  })
})
