import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccessProfile } from '../lib/auth-context'
import { listAdminDirectory, setUserBlocked } from '../lib/repo'
import { fmtDateTime } from '../lib/format'

export function AdminScreen() {
  const [people, setPeople] = useState<AccessProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadPeople = useCallback(async () => {
    try {
      setPeople(await listAdminDirectory())
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao carregar contas.')
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

  async function changeBlocked(person: AccessProfile, blocked: boolean) {
    if (person.is_admin) return
    setChangingId(person.id)
    setError(null)
    try {
      await setUserBlocked(person.id, blocked)
      setPeople((current) => current.map((item) => item.id === person.id ? { ...item, blocked } : item))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao atualizar.')
    }
    setChangingId(null)
  }

  const blockedCount = people.filter((person) => person.blocked && !person.is_admin).length

  return (
    <div className="screen admin-screen">
      <header className="admin-head">
        <div>
          <h1>Contas</h1>
          <p>Bloqueie abuso. Este painel não mostra peso, dose nem sintomas.</p>
        </div>
        <button type="button" className="btn btn-plain" onClick={() => void loadPeople()}>Atualizar</button>
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
      {loading ? <p className="empty">Carregando cadastros…</p> : (
        <div className="subscriber-list">
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
              </div>
              <label className="access-switch" title={person.is_admin ? 'Administrador permanece ativo' : undefined}>
                <input
                  type="checkbox"
                  checked={!person.blocked || person.is_admin}
                  disabled={person.is_admin || changingId === person.id}
                  onChange={(event) => void changeBlocked(person, !event.target.checked)}
                />
                <span aria-hidden="true" />
                <em className="sr-only">{person.blocked ? 'Desbloquear' : 'Bloquear'} {person.full_name || person.email}</em>
              </label>
            </article>
          ))}
          {!filtered.length && <p className="empty">Nenhum cadastro encontrado.</p>}
        </div>
      )}
    </div>
  )
}
