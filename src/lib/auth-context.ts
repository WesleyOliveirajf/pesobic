import { createContext, useContext } from 'react'

export interface AccessProfile {
  id: string
  email: string
  full_name: string | null
  access_enabled: boolean
  account_enabled: boolean
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
