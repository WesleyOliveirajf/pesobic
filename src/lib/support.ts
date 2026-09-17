/** Placeholder ate o operador configurar um endereco real. Nao inventar e-mail. */
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() || 'OPERATOR_EMAIL_UNSET'

export function supportContact(): string {
  return SUPPORT_EMAIL === 'OPERATOR_EMAIL_UNSET'
    ? 'e-mail de suporte ainda nao configurado pelo operador'
    : SUPPORT_EMAIL
}
