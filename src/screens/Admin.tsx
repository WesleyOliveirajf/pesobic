import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccessProfile } from '../lib/auth-context'
import { listAdminDirectory, setUserBlocked, setUserNutritionEnabled } from '../lib/repo'
import { fmtDateTime } from '../lib/format'

export function AdminScreen() {
  const [people, setPeople] = useState<AccessProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadPeople = useCallback(async () => {
<<<<<<< HEAD
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id,email,full_name,access_enabled,account_enabled,nutrition_enabled,is_admin,created_at,updated_at')
      .order('created_at', { ascending: false })
    if (queryError) setError(queryError.message)
    else {
      setPeople((data ?? []) as AccessProfile[])
=======
    setRefreshing(true)
    try {
      setPeople(await listAdminDirectory())
>>>>>>> e0402f92057a06f87c12041e62154f19c7cbe5a6
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao carregar contas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // oxlint-disable-next-line react/set-state-in-effect -- fetch-on-mount, not a derived-state pattern
  useEffect(() => { void loadPeople() }, [loadPeople])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return people
    return people.filter((person) => `${person.full_name ?? ''} ${person.email}`.toLocaleLowerCase('pt-BR').includes(term))
  }, [people, query])

  async function changeBlocked(person: AccessProfile, blocked: boolean) {
    if (person.is_admin) return
    setChangingId(person.id)
    setError(null)
<<<<<<< HEAD
    const { error: rpcError } = await supabase.rpc('admin_set_user_access', {
      target_user_id: person.id,
      enabled,
    })
    if (rpcError) setError(rpcError.message)
    else setPeople((current) => current.map((item) => item.id === person.id ? { ...item, access_enabled: enabled, account_enabled: enabled } : item))
    setChangingId(null)
  }

  async function changeNutrition(person: AccessProfile, enabled: boolean) {
    if (!supabase || person.is_admin) return
    setChangingId(person.id)
    setError(null)
    const { error: rpcError } = await supabase.rpc('admin_set_user_nutrition_access', {
      target_user_id: person.id,
      enabled,
    })
    if (rpcError) setError(rpcError.message)
    else setPeople((current) => current.map((item) => item.id === person.id ? { ...item, nutrition_enabled: enabled } : item))
    setChangingId(null)
  }

  const activeCount = people.filter((person) => (person.account_enabled ?? person.access_enabled) || person.is_admin).length
=======
    try {
      await setUserBlocked(person.id, blocked)
      setPeople((current) => current.map((item) => item.id === person.id ? { ...item, blocked } : item))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao atualizar.')
    }
    setChangingId(null)
  }

  async function changeNutritionEnabled(person: AccessProfile, enabled: boolean) {
    setChangingId(person.id)
    setError(null)
    try {
      await setUserNutritionEnabled(person.id, enabled)
      setPeople((current) => current.map((item) => item.id === person.id ? { ...item, nutrition_enabled: enabled } : item))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao atualizar a Nutrição.')
    }
    setChangingId(null)
  }

  const blockedCount = people.filter((person) => person.blocked && !person.is_admin).length
>>>>>>> e0402f92057a06f87c12041e62154f19c7cbe5a6

  return (
    <div className="screen admin-screen">
      <header className="admin-head">
        <div>
<<<<<<< HEAD
          <h1>Assinantes</h1>
          <p>Ative ou pause o acesso da conta e do módulo de nutrição de cada pessoa.</p>
=======
          <h1>Contas</h1>
          <p>Bloqueie abuso e habilite Nutrição por pessoa, sem acessar dados clínicos.</p>
>>>>>>> e0402f92057a06f87c12041e62154f19c7cbe5a6
        </div>
        <button type="button" className="btn btn-plain" disabled={loading || refreshing} onClick={() => void loadPeople()}>
          {refreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>

      <div className="admin-stats">
        <div><strong>{people.length}</strong><span>cadastros</span></div>
        <div><strong>{people.length - blockedCount}</strong><span>ativas</span></div>
        <div><strong>{blockedCount}</strong><span>bloqueadas</span></div>
      </div>

      <label className="admin-search">
        <span className="sr-only">Buscar conta</span>
        <input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" />
      </label>

      {error && <p className="error-box" role="alert">{error}</p>}
      {loading ? <p className="empty">Carregando contas…</p> : (
        <div className="subscriber-list">
<<<<<<< HEAD
          {filtered.map((person) => {
            const accountEnabled = person.account_enabled ?? person.access_enabled ?? false
            const nutritionEnabled = person.nutrition_enabled ?? true
            const enabled = accountEnabled || person.is_admin
            return (
              <article className="subscriber" key={person.id}>
                <div className="subscriber-avatar" aria-hidden="true">{(person.full_name || person.email).slice(0, 1).toUpperCase()}</div>
                <div className="subscriber-data">
                  <strong>{person.full_name || 'Nome não informado'}</strong>
                  <span>{person.email}</span>
                  <small>{person.is_admin ? 'Administrador master' : enabled ? 'Acesso liberado' : 'Aguardando liberação'}</small>
                </div>
                <div className="subscriber-flags" aria-label={`Controles de acesso para ${person.full_name || person.email}`}>
                  <label className="access-switch" title={person.is_admin ? 'O administrador master permanece ativo' : 'Ativar ou desativar acesso da conta'}>
                    <input type="checkbox" checked={accountEnabled || person.is_admin} disabled={person.is_admin || changingId === person.id} onChange={(event) => void changeAccess(person, event.target.checked)} />
                    <span aria-hidden="true" />
                    <em className="sr-only">{accountEnabled ? 'Desativar conta' : 'Ativar conta'} de {person.full_name || person.email}</em>
                    <span className="flag-label">Conta</span>
                  </label>
                  <label className="access-switch" title={person.is_admin ? 'A nutrição do administrador permanece ativa' : 'Ativar ou desativar módulo de nutrição'}>
                    <input type="checkbox" checked={person.is_admin ? true : nutritionEnabled} disabled={person.is_admin || changingId === person.id} onChange={(event) => void changeNutrition(person, event.target.checked)} />
                    <span aria-hidden="true" />
                    <em className="sr-only">{nutritionEnabled ? 'Desativar nutrição' : 'Ativar nutrição'} de {person.full_name || person.email}</em>
                    <span className="flag-label">Nutrição</span>
                  </label>
                </div>
              </article>
            )
          })}
          {!filtered.length && <p className="empty">Nenhum cadastro encontrado.</p>}
=======
          {filtered.map((person) => (
            <article className="subscriber" key={person.id}>
              <div className="subscriber-avatar" aria-hidden="true">{(person.full_name || person.email).slice(0, 1).toUpperCase()}</div>
              <div className="subscriber-data">
                <strong>{person.full_name || 'Nome não informado'}</strong>
                <span>{person.email}</span>
                <small>
                  {person.is_admin ? 'Administrador' : person.blocked ? 'Bloqueada' : 'Ativa'}
                  {' · '}
                  {fmtDateTime(new Date(person.created_at).getTime())}
                </small>
                {person.is_admin && <small>A conta do administrador permanece ativa.</small>}
              </div>
              <div className="subscriber-controls">
                <label className="subscriber-control" title={person.is_admin ? 'Administrador permanece ativo' : undefined}>
                  <span>Conta</span>
                  <span className="access-switch">
                    <input
                      type="checkbox"
                      checked={!person.blocked || person.is_admin}
                      disabled={person.is_admin || changingId === person.id}
                      onChange={(event) => void changeBlocked(person, !event.target.checked)}
                    />
                    <span aria-hidden="true" />
                  </span>
                  <em className="sr-only">{person.blocked ? 'Desbloquear' : 'Bloquear'} {person.full_name || person.email}</em>
                </label>
                <label className="subscriber-control">
                  <span>Nutrição</span>
                  <span className="access-switch">
                    <input
                      type="checkbox"
                      checked={person.nutrition_enabled}
                      disabled={changingId === person.id}
                      onChange={(event) => void changeNutritionEnabled(person, event.target.checked)}
                    />
                    <span aria-hidden="true" />
                  </span>
                  <em className="sr-only">{person.nutrition_enabled ? 'Desabilitar Nutrição para' : 'Habilitar Nutrição para'} {person.full_name || person.email}</em>
                </label>
              </div>
            </article>
          ))}
          {!filtered.length && <p className="empty">Nenhuma conta encontrada.</p>}
>>>>>>> e0402f92057a06f87c12041e62154f19c7cbe5a6
        </div>
      )}
    </div>
  )
}
