/** Versao do texto de politica/termos. Mude junto com o conteudo de Legal.tsx. */
export const LEGAL_VERSION = '2026-09-16'

export type LegalKind = 'privacidade' | 'termos'

/** Link permanente (abre a tela legal mesmo logado). */
export function legalHref(kind: LegalKind): string {
  return `${import.meta.env.BASE_URL}?legal=${kind}`
}
