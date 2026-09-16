import { useMemo, useState } from 'react'
import * as repo from '../lib/repo'
import { persistSettings, useInjections } from '../hooks'
import { useAuthProfile } from '../lib/auth-context'
import type { Injection, InjectionSite, MedicationKey, Settings, TitrationPhase } from '../db/types'
import {
  Btn,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  Modal,
  NumberInput,
  Select,
  TextInput,
} from '../components/ui'
import {
  MEDICATIONS,
  SITE_LABEL,
  SITE_ORDER,
  cadenceDays,
  medLabel,
  nextSite,
} from '../lib/domain'
import { fmtDate, fmtDateTime, num, tsToLocalInput, localInputToTs, todayISO } from '../lib/format'
import { adherence, nextDose } from '../lib/metrics'
import {
  TITRATION_TEMPLATES,
  currentPhase,
  expectedPhaseIndex,
  phase as makePhase,
  phaseWindows,
} from '../lib/titration'

export function Injections({ settings }: { settings: Settings }) {
  const profile = useAuthProfile()
  const [injections, reloadInjections] = useInjections()
  const [showAdd, setShowAdd] = useState<null | 'aplicada' | 'pulada'>(null)
  const [editPhases, setEditPhases] = useState(false)
  const [editRow, setEditRow] = useState<Injection | null>(null)
  const [phaseErr, setPhaseErr] = useState<string | null>(null)

  const applied = useMemo(
    () => injections.filter((i) => i.status === 'aplicada').sort((a, b) => b.at - a.at),
    [injections],
  )
  const lastSite = applied[0]?.site
  const suggestedSite = nextSite(lastSite)
  const nd = nextDose(injections, settings)
  const adh = adherence(injections, settings)
  const phase = currentPhase(settings)
  const expectedIdx = expectedPhaseIndex(settings.phases, settings.startDate)
  const windows = phaseWindows(settings.phases, settings.startDate)

  async function movePhase(delta: number) {
    const next = Math.max(0, Math.min(settings.phases.length - 1, settings.currentPhaseIndex + delta))
    try {
      await persistSettings(profile.id, { ...settings, currentPhaseIndex: next })
      setPhaseErr(null)
    } catch (e) {
      setPhaseErr(e instanceof Error ? e.message : 'Falha ao salvar a fase.')
    }
  }

  const history = [...injections].sort((a, b) => b.at - a.at)

  return (
    <div className="screen">
      <Card title="Proxima aplicacao">
        <div className={`next-dose ${nd.overdue ? 'over' : ''}`}>
          <div className={`countdown ${nd.overdue ? 'countdown-over' : ''}`}>
            <strong>{nd.overdue ? `${Math.abs(nd.daysUntil)}d` : nd.daysUntil === 0 ? 'hoje' : `${nd.daysUntil}d`}</strong>
            <span>{nd.overdue ? 'em atraso' : 'prevista ' + fmtDate(nd.dueISO)}</span>
          </div>
          <div className="dose-now">
            <span className="dose-mg">
              {phase && phase.doseMg > 0 ? `${num(phase.doseMg, phase.doseMg % 1 === 0 ? 0 : 2)} mg` : 'sem dose'}
            </span>
            <span className="dose-med">{medLabel(settings.medication, settings.medicationLabel)}</span>
          </div>
        </div>
        <div className="rotation">
          <span>
            Ultimo local: <strong>{lastSite ? SITE_LABEL[lastSite] : '--'}</strong>
          </span>
          <span>
            Proximo sugerido: <strong>{SITE_LABEL[suggestedSite]}</strong>
          </span>
        </div>
        <div className="btn-row">
          <Btn variant="primary" onClick={() => setShowAdd('aplicada')}>
            Registrar aplicacao
          </Btn>
          <Btn variant="ghost" onClick={() => setShowAdd('pulada')}>
            Dose pulada
          </Btn>
        </div>
        <p className="muted-small">
          Cadencia {cadenceDays(settings.medication) === 1 ? 'diaria' : 'semanal'} &middot; aderencia {num(adh.pct, 0)}% ({adh.applied}/{adh.expected}) &middot; {adh.skipped} puladas
        </p>
        {phaseErr && <p className="error-box">{phaseErr}</p>}
      </Card>

      <Card
        title="Cronograma de titracao"
        right={
          <button className="link" onClick={() => setEditPhases(true)}>
            Editar
          </button>
        }
      >
        <ul className="phase-list">
          {windows.map((w) => {
            const isCurrent = w.index === settings.currentPhaseIndex
            const isExpected = w.index === expectedIdx
            return (
              <li key={w.phase.id} className={`phase ${isCurrent ? 'phase-current' : ''}`}>
                <div className="phase-main">
                  <span className="phase-dose">
                    {w.phase.doseMg > 0 ? `${num(w.phase.doseMg, w.phase.doseMg % 1 === 0 ? 0 : 2)} mg` : 'sem dose'}
                  </span>
                  <span className="phase-when">
                    {w.isOpenEnded
                      ? `a partir de ${fmtDate(w.startISO)} (manutencao)`
                      : `${fmtDate(w.startISO)} - ${fmtDate(w.endISO!)} (${w.phase.weeks} sem)`}
                  </span>
                </div>
                <div className="phase-tags">
                  {isCurrent && <span className="tag tag-current">atual</span>}
                  {isExpected && !isCurrent && <span className="tag tag-plan">plano</span>}
                  {w.phase.label && <span className="tag">{w.phase.label}</span>}
                </div>
              </li>
            )
          })}
        </ul>
        <div className="btn-row">
          <Btn variant="ghost" onClick={() => movePhase(-1)} disabled={settings.currentPhaseIndex === 0}>
            &larr; Voltar dose
          </Btn>
          <Btn
            variant="primary"
            onClick={() => movePhase(1)}
            disabled={settings.currentPhaseIndex >= settings.phases.length - 1}
          >
            Avancar dose &rarr;
          </Btn>
        </div>
        {expectedIdx !== settings.currentPhaseIndex && (
          <p className="plan-flag warn">
            Plano x real: cronograma aponta fase #{expectedIdx + 1}, voce esta na #{settings.currentPhaseIndex + 1}.
          </p>
        )}
      </Card>

      <Card title="Historico" pad={history.length === 0}>
        {history.length === 0 ? (
          <EmptyState>Nenhuma aplicacao registrada.</EmptyState>
        ) : (
          <ul className="log-list">
            {history.map((inj) => (
              <li key={inj.id}>
                <button className="log-row" onClick={() => setEditRow(inj)}>
                  <span className={`log-badge ${inj.status === 'pulada' ? 'badge-skip' : ''}`}>
                    {inj.status === 'pulada' ? 'pulada' : `${num(inj.doseMg, inj.doseMg % 1 === 0 ? 0 : 2)} mg`}
                  </span>
                  <span className="log-main">
                    <strong>{SITE_LABEL[inj.site]}</strong>
                    {inj.note ? ` — ${inj.note}` : ''}
                  </span>
                  <time>{fmtDateTime(inj.at)}</time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showAdd && (
        <AddInjectionModal
          settings={settings}
          status={showAdd}
          suggestedSite={suggestedSite}
          onClose={() => setShowAdd(null)}
          onSaved={reloadInjections}
        />
      )}
      {editPhases && (
        <EditPhasesModal settings={settings} onClose={() => setEditPhases(false)} />
      )}
      {editRow && (
        <EditInjectionModal row={editRow} onClose={() => setEditRow(null)} onSaved={reloadInjections} />
      )}
    </div>
  )
}

function AddInjectionModal({
  settings,
  status,
  suggestedSite,
  onClose,
  onSaved,
}: {
  settings: Settings
  status: 'aplicada' | 'pulada'
  suggestedSite: InjectionSite
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const profile = useAuthProfile()
  const phase = currentPhase(settings)
  const [when, setWhen] = useState(() => tsToLocalInput(Date.now()))
  const [doseMg, setDoseMg] = useState<number | null>(phase?.doseMg ?? 0)
  const [site, setSite] = useState<InjectionSite>(suggestedSite)
  const [med, setMed] = useState<MedicationKey>(settings.medication)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    const row: Omit<Injection, 'id'> = {
      at: localInputToTs(when),
      medication: med,
      doseMg: doseMg ?? 0,
      site,
      status,
      note: note.trim() || undefined,
    }
    try {
      await repo.addInjection(profile.id, row)
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
      setBusy(false)
    }
  }

  return (
    <Modal title={status === 'pulada' ? 'Registrar dose pulada' : 'Registrar aplicacao'} onClose={onClose}>
      <Field label="Data e hora">
        <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field label="Medicamento">
        <Select value={med} onChange={(e) => setMed(e.target.value as MedicationKey)}>
          {MEDICATIONS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid-2">
        <Field label="Dose (mg)">
          <NumberInput value={doseMg} onValue={setDoseMg} step="0.05" />
        </Field>
        <Field label="Local">
          <Select value={site} onChange={(e) => setSite(e.target.value as InjectionSite)}>
            {SITE_ORDER.map((s) => (
              <option key={s} value={s}>
                {SITE_LABEL[s]}
                {s === suggestedSite ? ' (sugerido)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Observacao">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" />
      </Field>
      {err && <p className="error-box">{err}</p>}
      <Btn variant="primary" block disabled={busy} onClick={save}>
        Salvar
      </Btn>
    </Modal>
  )
}

function EditInjectionModal({
  row,
  onClose,
  onSaved,
}: {
  row: Injection
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [when, setWhen] = useState(tsToLocalInput(row.at))
  const [doseMg, setDoseMg] = useState<number | null>(row.doseMg)
  const [site, setSite] = useState<InjectionSite>(row.site)
  const [status, setStatus] = useState(row.status)
  const [note, setNote] = useState(row.note ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    try {
      await repo.updateInjection(row.id!, {
        at: localInputToTs(when),
        doseMg: doseMg ?? 0,
        site,
        status,
        note: note.trim() || undefined,
      })
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  return (
    <Modal title="Editar aplicacao" onClose={onClose}>
      <Field label="Data e hora">
        <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Dose (mg)">
          <NumberInput value={doseMg} onValue={setDoseMg} step="0.05" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as Injection['status'])}>
            <option value="aplicada">Aplicada</option>
            <option value="pulada">Pulada</option>
          </Select>
        </Field>
      </div>
      <Field label="Local">
        <Select value={site} onChange={(e) => setSite(e.target.value as InjectionSite)}>
          {SITE_ORDER.map((s) => (
            <option key={s} value={s}>
              {SITE_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Observacao">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {err && <p className="error-box">{err}</p>}
      <div className="btn-row">
        <ConfirmButton
          onConfirm={async () => {
            await repo.deleteInjection(row.id!)
            await onSaved()
            onClose()
          }}
        >
          Excluir
        </ConfirmButton>
        <Btn variant="primary" onClick={save}>
          Salvar
        </Btn>
      </div>
    </Modal>
  )
}

function EditPhasesModal({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const profile = useAuthProfile()
  const [err, setErr] = useState<string | null>(null)
  const [phases, setPhases] = useState<TitrationPhase[]>(settings.phases.map((p) => ({ ...p })))
  const [tpl, setTpl] = useState<MedicationKey | ''>('')

  function update(i: number, patch: Partial<TitrationPhase>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function remove(i: number) {
    setPhases((prev) => prev.filter((_, idx) => idx !== i))
  }
  function add() {
    const last = phases[phases.length - 1]
    setPhases((prev) => [...prev, makePhase(last ? last.doseMg : 0, 4)])
  }
  function applyTemplate(key: MedicationKey) {
    setPhases(TITRATION_TEMPLATES[key].phases())
    setTpl(key)
  }

  async function save() {
    const clean = phases.filter((p) => p.doseMg >= 0)
    const idx = Math.min(settings.currentPhaseIndex, Math.max(0, clean.length - 1))
    try {
      await persistSettings(profile.id, { ...settings, phases: clean, currentPhaseIndex: idx })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  return (
    <Modal title="Editar cronograma" onClose={onClose}>
      <Field label="Aplicar template de referencia">
        <Select
          value={tpl}
          onChange={(e) => e.target.value && applyTemplate(e.target.value as MedicationKey)}
        >
          <option value="">Manter fases atuais</option>
          {MEDICATIONS.filter((m) => m.key !== 'outro').map((m) => (
            <option key={m.key} value={m.key}>
              {TITRATION_TEMPLATES[m.key].name}
            </option>
          ))}
        </Select>
      </Field>
      <p className="disclaimer">
        Templates seguem a bula do fabricante como ponto de partida. Nao sao recomendacao de dose — a
        decisao e sua e do seu acompanhamento.
      </p>

      <ul className="phase-edit-list">
        {phases.map((p, i) => (
          <li key={p.id}>
            <div className="grid-3">
              <Field label={`Fase ${i + 1} — mg`}>
                <NumberInput value={p.doseMg} onValue={(v) => update(i, { doseMg: v ?? 0 })} step="0.05" />
              </Field>
              <Field label="Semanas (0=manut.)">
                <NumberInput
                  value={p.weeks}
                  onValue={(v) => update(i, { weeks: Math.max(0, Math.round(v ?? 0)) })}
                  step="1"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Rotulo">
                <TextInput
                  value={p.label ?? ''}
                  onChange={(e) => update(i, { label: e.target.value || undefined })}
                  placeholder="opcional"
                />
              </Field>
            </div>
            <button className="link danger" onClick={() => remove(i)} disabled={phases.length <= 1}>
              Remover fase
            </button>
          </li>
        ))}
      </ul>
      <Btn variant="ghost" block onClick={add}>
        + Adicionar fase
      </Btn>
      <p className="disclaimer">Inicio do cronograma: {fmtDate(settings.startDate)} (data de inicio no perfil).</p>
      {err && <p className="error-box">{err}</p>}
      <Btn variant="primary" block onClick={save}>
        Salvar cronograma
      </Btn>
      <p className="muted-small center">Hoje: {todayISO()}</p>
    </Modal>
  )
}
