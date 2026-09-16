import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccessProfile } from '../lib/auth-context'
import { supabase } from '../lib/supabase'

/** Formata data ISO para dd/mm/aaaa HH:mm no fuso pt-BR */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Retorna tempo relativo simplificado (ex: "há 3 dias") */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days}d`
  const months = Math.floor(days / 30)
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
}

interface ConfirmDialog {
  person: AccessProfile
  newState: boolean
}

export function AdminScreen() {
  const [people, setPeople] = useState<AccessProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null)

  const loadPeople = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id,email,full_name,access_enabled,is_admin,created_at,updated_at')
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

  function requestAccessChange(person: AccessProfile, enabled: boolean) {
    if (person.is_admin) return
    // Ativar acesso não exige confirmação; desativar exige
    if (enabled) {
      void executeAccessChange(person, enabled)
    } else {
      setConfirm({ person, newState: enabled })
    }
  }

  async function executeAccessChange(person: AccessProfile, enabled: boolean) {
    if (!supabase || person.is_admin) return
    setConfirm(null)
    setChangingId(person.id)
    setError(null)
    setSuccess(null)
    const { error: rpcError } = await supabase.rpc('admin_set_user_access', {
      target_user_id: person.id,
      enabled,
    })
    if (rpcError) {
      setError(rpcError.message)
    } else {
      setPeople((current) => current.map((item) => item.id === person.id ? { ...item, access_enabled: enabled } : item))
      const name = person.full_name || person.email
      setSuccess(enabled ? `Acesso liberado para ${name}.` : `Acesso pausado para ${name}.`)
      setTimeout(() => setSuccess(null), 4000)
    }
    setChangingId(null)
  }

  const activeCount = people.filter((person) => person.access_enabled || person.is_admin).length
  const pendingCount = Math.max(0, people.length - activeCount)

  return (
    <div className="screen admin-screen">
      <header className="admin-head">
        <div>
          <h1>Assinantes</h1>
          <p>Libere ou pause o acesso de cada pessoa.</p>
        </div>
        <button type="button" className="btn btn-plain" onClick={() => void loadPeople()} disabled={loading}>
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>

      <div className="admin-stats">
        <div className="stat-card">
          <strong>{people.length}</strong>
          <span>cadastros</span>
        </div>
        <div className="stat-card stat-ok">
          <strong>{activeCount}</strong>
          <span>com acesso</span>
        </div>
        <div className={`stat-card ${pendingCount > 0 ? 'stat-warn' : ''}`}>
          <strong>{pendingCount}</strong>
          <span>aguardando</span>
        </div>
      </div>

      <label className="admin-search">
        <span className="sr-only">Buscar assinante</span>
        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou e-mail"
        />
      </label>

      {error && <p className="error-box" role="alert">{error}</p>}
      {success && <p className="success-box" role="status">{success}</p>}

      {loading ? <p className="empty">Carregando cadastros…</p> : (
        <div className="subscriber-list">
          {filtered.map((person) => {
            const enabled = person.access_enabled || person.is_admin
            const statusClass = person.is_admin ? 'status-admin' : enabled ? 'status-active' : 'status-pending'
            const statusLabel = person.is_admin ? 'Admin' : enabled ? 'Ativo' : 'Pendente'
            return (
              <article className={`subscriber ${statusClass}`} key={person.id}>
                <div className="subscriber-avatar" aria-hidden="true">
                  {(person.full_name || person.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="subscriber-data">
                  <div className="subscriber-name-row">
                    <strong>{person.full_name || 'Nome não informado'}</strong>
                    <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <span className="subscriber-email">{person.email}</span>
                  <small className="subscriber-meta">
                    Cadastro: {formatDate(person.created_at)} · Atualizado {timeAgo(person.updated_at)}
                  </small>
                </div>
                <label className="access-switch" title={person.is_admin ? 'O administrador master permanece ativo' : undefined}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={person.is_admin || changingId === person.id}
                    onChange={(event) => requestAccessChange(person, event.target.checked)}
                  />
                  <span aria-hidden="true" />
                  <em className="sr-only">{enabled ? 'Desativar acesso' : 'Ativar acesso'} de {person.full_name || person.email}</em>
                </label>
              </article>
            )
          })}
          {!filtered.length && <p className="empty">Nenhum cadastro encontrado.</p>}
        </div>
      )}

      {/* Modal de confirmação para desativar acesso */}
      {confirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar alteração de acesso">
          <div className="confirm-card">
            <h2>Pausar acesso?</h2>
            <p>
              <strong>{confirm.person.full_name || confirm.person.email}</strong> perderá acesso imediato ao Pesobic.
              A pessoa continuará com a conta, mas não poderá acessar os dados até que o acesso seja liberado novamente.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-plain"
                onClick={() => setConfirm(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void executeAccessChange(confirm.person, confirm.newState)}
              >
                Pausar acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
