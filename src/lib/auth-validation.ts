export function validateSignup(input: {
  password: string
  confirmPassword: string
  ageConfirmed: boolean
  termsAccepted: boolean
}): string | null {
  if (!input.ageConfirmed) return 'Voce precisa ter 18 anos ou mais para criar uma conta.'
  if (!input.termsAccepted) return 'Aceite a politica de privacidade e os termos de uso.'
  if (input.password.length < 8) return 'Crie uma senha com pelo menos 8 caracteres.'
  if (input.password !== input.confirmPassword) return 'As senhas nao coincidem.'
  return null
}

export const GENERIC_AUTH_ERROR = 'Nao foi possivel concluir. Confira os dados e tente de novo.'

const authMessages: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Nao foi possivel concluir. Confira os dados e tente de novo.',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 8 caracteres.',
}

export function friendlyAuthError(message: string) {
  if (/already registered|user already/i.test(message)) return GENERIC_AUTH_ERROR
  return authMessages[message] ?? GENERIC_AUTH_ERROR
}
