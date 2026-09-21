import { describe, expect, it } from 'vitest'
import { GENERIC_AUTH_ERROR, friendlyAuthError, validateSignup } from './auth-validation'

describe('cadastro', () => {
  it('recusa cadastro sem autorizacao de dado de saude', () => {
    expect(
      validateSignup({
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh',
        ageConfirmed: true,
        termsAccepted: true,
        healthConsent: false,
      }),
    ).toMatch(/saúde/)
  })

  it('recusa menor de 18', () => {
    expect(
      validateSignup({
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh',
        ageConfirmed: false,
        termsAccepted: true,
        healthConsent: true,
      }),
    ).toMatch(/18/)
  })

  it('recusa cadastro sem aceite', () => {
    expect(
      validateSignup({
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh',
        ageConfirmed: true,
        termsAccepted: false,
        healthConsent: true,
      }),
    ).toMatch(/privacidade|termos/i)
  })

  it('aceita cadastro valido', () => {
    expect(
      validateSignup({
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh',
        ageConfirmed: true,
        termsAccepted: true,
        healthConsent: true,
      }),
    ).toBeNull()
  })

  it('nao revela se o e-mail ja existe', () => {
    expect(friendlyAuthError('User already registered')).toBe(GENERIC_AUTH_ERROR)
  })
})
