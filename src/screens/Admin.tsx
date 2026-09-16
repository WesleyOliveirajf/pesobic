import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccessProfile } from '../lib/auth-context'
import { supabase } from '../lib/supabase'

export function AdminScreen() {
  const [people, setPeople] = useState<AccessProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadPeople = useCallback(async () => {
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id,email,full_name,access_enabled,nutrition_enabled,is_admin,created_at,updated_at')
      .order('created_at', { ascending: false })
    if (queryError) setError(queryError.message)
    else {
      setPeople((data ?? []) as AccessProfile[])
      setError(null)
    }
    setLoading(false)
  }, [])

  // oxlint-disable-next-line react/set-state-in-effect -- fetch-on-mount, not a derived-state pattern
  useEffect(() => { void loadPeople() }, [loadPeople])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return people
    return people.filter((person) => `${person.full_name ?? ''} ${person.email}`.toLocaleLowerCase('pt-BR').includes(term))
  }, [people, query])

  async function changeAccess(person: AccessProfile, enabled: boolean) {
    if (!supabase || person.is_admin) return
    setChangingId(person.id)
    setError(null)
    const { error: rpcError } = await supabase.rpc('admin_set_user_access', {
      target_user_id: person.id,
      enabled,
    })
    if (rpcError) setError(rpcError.message)
    else setPeople((current) => current.map((item) => item.id === person.id ? { ...item, access_enabled: enabled } : item))
    setChangingId(null)
  }

  async function changeNutritionAccess(person: AccessProfile, enabled: boolean) {
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

  const activeCount = people.filter((person) => person.access_enabled || person.is_admin).length

  return (
    <div className="screen admin-screen">
      <header className="admin-head">
        <div>
          <h1>Assinantes</h1>
          <p>Libere ou pause o acesso de cada pessoa.</p>
        </div>
        <button type="button" className="btn btn-plain" onClick={() => void loadPeople()}>Atualizar</button>
      </header>

      <div className="admin-stats">
        <div><strong>{people.length}</strong><span>cadastros</span></div>
        <div><strong>{activeCount}</strong><span>com acesso</span></div>
        <div><strong>{Math.max(0, people.length - activeCount)}</strong><span>aguardando</span></div>
      </div>

      <label className="admin-search">
        <span className="sr-only">Buscar assinante</span>
        <input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" />
      </label>

      {error && <p className="error-box" role="alert">{error}</p>}
      {loading ? <p className="empty">Carregando cadastros…</p> : (
        <div className="subscriber-list">
          {filtered.map((person) => {
            const enabled = person.access_enabled || person.is_admin
            return (
              <article className="subscriber" key={person.id}>
                <div className="subscriber-avatar" aria-hidden="true">{(person.full_name || person.email).slice(0, 1).toUpperCase()}</div>
                <div className="subscriber-data">
                  <strong>{person.full_name || 'Nome não informado'}</strong>
                  <span>{person.email}</span>
                  <small>{person.is_admin ? 'Administrador master' : enabled ? 'Acesso liberado' : 'Aguardando liberação'}</small>
                </div>
                <div className="subscriber-controls">
                  <label className="subscriber-control" title={person.is_admin ? 'O administrador master permanece ativo' : undefined}>
                    <span>Acesso</span>
                    <span className="access-switch">
                      <input type="checkbox" checked={enabled} disabled={person.is_admin || changingId === person.id} onChange={(event) => void changeAccess(person, event.target.checked)} />
                      <span aria-hidden="true" />
                    </span>
                    <em className="sr-only">{enabled ? 'Desativar acesso' : 'Ativar acesso'} de {person.full_name || person.email}</em>
                  </label>
                  <label className="subscriber-control" title={person.is_admin ? 'O administrador master sempre tem acesso à nutrição' : undefined}>
                    <span>Nutrição</span>
                    <span className="access-switch">
                      <input type="checkbox" checked={person.nutrition_enabled || person.is_admin} disabled={person.is_admin || changingId === person.id} onChange={(event) => void changeNutritionAccess(person, event.target.checked)} />
                      <span aria-hidden="true" />
                    </span>
                    <em className="sr-only">{person.nutrition_enabled || person.is_admin ? 'Desativar nutrição' : 'Ativar nutrição'} de {person.full_name || person.email}</em>
                  </label>
                </div>
              </article>
            )
          })}
          {!filtered.length && <p className="empty">Nenhum cadastro encontrado.</p>}
        </div>
      )}
    </div>
  )
}
