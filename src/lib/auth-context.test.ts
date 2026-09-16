import { describe, expect, it } from 'vitest'
import { isMissingNutritionEnabledColumn } from './auth-context'

describe('isMissingNutritionEnabledColumn', () => {
  it('reconhece a ausência da coluna de nutrição no schema remoto', () => {
    expect(isMissingNutritionEnabledColumn({ message: 'column profiles.nutrition_enabled does not exist' })).toBe(true)
  })

  it('não esconde outros erros de perfil', () => {
    expect(isMissingNutritionEnabledColumn({ message: 'permission denied for table profiles' })).toBe(false)
  })
})
