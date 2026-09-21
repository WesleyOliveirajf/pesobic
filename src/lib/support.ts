export const OPERATOR_EMAIL_UNSET = 'OPERATOR_EMAIL_UNSET'

/** Endereco real vem de VITE_SUPPORT_EMAIL (operador). Nao inventar e-mail no repo. */
export const SUPPORT_EMAIL: string = import.meta.env.VITE_SUPPORT_EMAIL?.trim() || OPERATOR_EMAIL_UNSET

export function hasSupportEmail(): boolean {
  return SUPPORT_EMAIL !== OPERATOR_EMAIL_UNSET
}

export function supportContact(): string {
  return hasSupportEmail() ? SUPPORT_EMAIL : 'e-mail de suporte ainda nao configurado pelo operador'
}
