import { describe, expect, it } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('preserva a mensagem retornada pelo Supabase', () => {
    expect(errorMessage({ message: 'new row violates row-level security policy' }))
      .toBe('new row violates row-level security policy')
  })

  it('usa uma mensagem segura quando o erro nao informa detalhes', () => {
    expect(errorMessage({})).toBe('Não foi possível concluir. Tente novamente.')
  })
})
