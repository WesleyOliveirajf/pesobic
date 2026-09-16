import { createContext, useContext } from 'react'

export interface AccessProfile {
  id: string
  email: string
  full_name: string | null
  blocked: boolean
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
