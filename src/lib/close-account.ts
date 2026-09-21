import { wipeAll } from '../db/db'
import { exportBackup } from './backup'
import * as repo from './repo'
import { supabase } from './supabase'

/** Encerra a conta do titular: backup, confirma senha, apaga na nuvem e no aparelho. Serve tambem para conta bloqueada. */
export async function closeOwnAccount(profile: { id: string; email: string }, password: string, confirmText: string) {
  if (confirmText.trim().toUpperCase() !== 'ENCERRAR') throw new Error('Digite ENCERRAR para confirmar.')
  if (!supabase) throw new Error('Supabase nao configurado.')
  await exportBackup(profile.id)
  const { error } = await supabase.auth.signInWithPassword({ email: profile.email, password })
  if (error) throw new Error('Confirme a senha para encerrar a conta.')
  await repo.deleteOwnAccount()
  await wipeAll()
  await supabase.auth.signOut()
}
