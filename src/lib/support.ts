/** Placeholder ate o operador configurar um endereco real. Nao inventar e-mail. */
export const SUPPORT_EMAIL = 'OPERATOR_EMAIL_UNSET'

export function supportContact(): string {
  return SUPPORT_EMAIL === 'OPERATOR_EMAIL_UNSET'
    ? 'e-mail de suporte ainda nao configurado pelo operador'
    : SUPPORT_EMAIL
}
