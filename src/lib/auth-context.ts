import { createContext, useContext } from 'react'

export const PROFILE_COLUMNS = 'id,email,full_name,access_enabled,nutrition_enabled,is_admin,created_at,updated_at'
export const LEGACY_PROFILE_COLUMNS = 'id,email,full_name,access_enabled,is_admin,created_at,updated_at'

export function isMissingNutritionEnabledColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.toLocaleLowerCase('pt-BR').includes('nutrition_enabled'))
}

export interface AccessProfile {
  id: string
  email: string
  full_name: string | null
  access_enabled: boolean
  nutrition_enabled: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export const AuthContext = createContext<AccessProfile | null>(null)

export function useAuthProfile() {
  const profile = useContext(AuthContext)
  if (!profile) throw new Error('AuthContext indisponivel')
  return profile
}
