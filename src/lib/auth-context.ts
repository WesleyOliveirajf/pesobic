import { createContext, useContext } from 'react'

export const PROFILE_COLUMNS = 'id,email,full_name,blocked,nutrition_enabled,is_admin,created_at,updated_at'
export const PROFILE_COLUMNS_WITHOUT_NUTRITION = 'id,email,full_name,blocked,is_admin,created_at,updated_at'
export const LEGACY_PROFILE_COLUMNS = 'id,email,full_name,access_enabled,is_admin,created_at,updated_at'

export function isMissingProfileColumn(error: { message?: string } | null, column: 'blocked' | 'nutrition_enabled') {
  return Boolean(error?.message?.toLocaleLowerCase('pt-BR').includes(column))
}

export interface AccessProfile {
  id: string
  email: string
  full_name: string | null
<<<<<<< HEAD
  access_enabled: boolean
  account_enabled: boolean
=======
  blocked: boolean
>>>>>>> e0402f92057a06f87c12041e62154f19c7cbe5a6
  nutrition_enabled: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export type TabConfig = { id: string }

export function getVisibleTabs<T extends TabConfig>(tabs: T[], profile: Pick<AccessProfile, 'is_admin' | 'account_enabled' | 'nutrition_enabled' | 'access_enabled'>): T[] {
  if (profile.is_admin) return tabs

  const accountEnabled = profile.account_enabled ?? profile.access_enabled ?? true
  const nutritionEnabled = profile.nutrition_enabled ?? true

  return tabs.filter((tab) => {
    if (tab.id === 'admin') return false
    if (tab.id === 'nutricao') return accountEnabled && nutritionEnabled
    return true
  })
}

export const AuthContext = createContext<AccessProfile | null>(null)

export function useAuthProfile() {
  const profile = useContext(AuthContext)
  if (!profile) throw new Error('AuthContext indisponivel')
  return profile
}
