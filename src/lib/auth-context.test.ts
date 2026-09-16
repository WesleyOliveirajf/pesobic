import { describe, expect, it } from 'vitest'
import { getVisibleTabs } from './auth-context'

describe('getVisibleTabs', () => {
  it('mantém todos os módulos para o administrador', () => {
    const tabs = [
      { id: 'inicio' },
      { id: 'nutricao' },
      { id: 'config' },
      { id: 'admin' },
    ]

    expect(getVisibleTabs(tabs, { access_enabled: true, is_admin: true, account_enabled: false, nutrition_enabled: false })).toHaveLength(4)
  })

  it('mantém os módulos principais ativos e só oculta a nutrição quando a flag estiver desativada', () => {
    const tabs = [
      { id: 'inicio' },
      { id: 'nutricao' },
      { id: 'config' },
      { id: 'peso' },
    ]

    expect(getVisibleTabs(tabs, { access_enabled: true, is_admin: false, account_enabled: true, nutrition_enabled: false })).toEqual([
      { id: 'inicio' },
      { id: 'config' },
      { id: 'peso' },
    ])
  })

  it('mostra módulos específicos quando as flags estiverem ativas', () => {
    const tabs = [
      { id: 'inicio' },
      { id: 'nutricao' },
      { id: 'config' },
      { id: 'peso' },
    ]

    expect(getVisibleTabs(tabs, { access_enabled: true, is_admin: false, account_enabled: true, nutrition_enabled: true })).toEqual(tabs)
  })
})
