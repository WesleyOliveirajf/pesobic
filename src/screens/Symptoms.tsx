import { useMemo, useState } from 'react'
import * as repo from '../lib/repo'
import { useAuthProfile } from '../lib/auth-context'
import type { Settings, Severity, SymptomKey, SymptomLog } from '../db/types'
import {
  Btn,
  Card,
  Chip,
  ConfirmButton,
  EmptyState,
  Field,
  Modal,
  SeverityPicker,
  TextInput,
} from '../components/ui'
import { SymptomChart, type DoseMarker } from '../components/charts'
import { useSymptoms } from '../hooks'
import { SEVERITY_LABEL, SYMPTOMS, symptomLabel } from '../lib/domain'
import { fmtDateTime, num, todayISO, tsToLocalInput, localInputToTs } from '../lib/format'
import { phaseWindows } from '../lib/titration'

const PALETTE = [
  '#0f766e',
  '#b45309',
  '#7c3aed',
  '#be123c',
  '#0369a1',
  '#4d7c0f',
  '#a21caf',
  '#c2410c',
  '#1d4ed8',
  '#15803d',
  '#9f1239',
]

export function Symptoms({ settings }: { settings: Settings }) {
  const [symptoms, reloadSymptoms] = useSymptoms()
  const [edit, setEdit] = useState<SymptomLog | null>(null)

  const activeKeys = useMemo(() => {
    const set = new Set<SymptomKey>()
    symptoms.forEach((s) => set.add(s.symptom))
    return SYMPTOMS.filter((s) => set.has(s.key))
  }, [symptoms])

  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>()
    for (const s of symptoms) {
      const day = todayISO(new Date(s.at))
      const row = byDate.get(day) ?? {}
      row[s.symptom] = Math.max(row[s.symptom] ?? 0, s.severity)
      byDate.set(day, row)
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, vals]) => ({ date, ...vals }))
  }, [symptoms])

  const markers: DoseMarker[] = useMemo(() => {
    if (chartData.length === 0) return []
    const first = chartData[0].date
    const last = chartData[chartData.length - 1].date
    return phaseWindows(settings.phases, settings.startDate)
      .filter((w) => w.index > 0 && w.startISO >= first && w.startISO <= last)
      .map((w) => ({ date: w.startISO, label: `${num(w.phase.doseMg, 2)}mg` }))
  }, [chartData, settings])

  const keys = activeKeys.map((s, i) => ({
    key: s.key,
    label: s.label,
    color: PALETTE[i % PALETTE.length],
  }))

  const history = [...symptoms].sort((a, b) => b.at - a.at)

  return (
    <div className="screen">
      <QuickLog onSaved={reloadSymptoms} />

      {chartData.length >= 2 && (
        <Card title="Severidade ao longo do tempo">
          <SymptomChart data={chartData} keys={keys} markers={markers} />
          <div className="legend">
            {keys.map((k) => (
              <span key={k.key}>
                <i style={{ background: k.color }} /> {k.label}
              </span>
            ))}
          </div>
          {markers.length > 0 && <p className="muted-small">Linhas tracejadas = mudancas de dose planejadas.</p>}
        </Card>
      )}

      <Card title="Historico" pad={history.length === 0}>
        {history.length === 0 ? (
          <EmptyState>Nenhum sintoma registrado.</EmptyState>
        ) : (
          <ul className="log-list">
            {history.map((s) => (
              <li key={s.id}>
                <button className="log-row" onClick={() => setEdit(s)}>
                  <span className={`log-badge sev-badge sev-${s.severity}`}>{s.severity}</span>
                  <span className="log-main">
                    <strong>{symptomLabel(s.symptom)}</strong> — {SEVERITY_LABEL[s.severity]}
                    {s.note ? ` — ${s.note}` : ''}
                  </span>
                  <time>{fmtDateTime(s.at)}</time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {edit && <EditSymptom row={edit} onClose={() => setEdit(null)} onSaved={reloadSymptoms} />}
    </div>
  )
}

function QuickLog({ onSaved }: { onSaved: () => Promise<void> }) {
  const profile = useAuthProfile()
  const [symptom, setSymptom] = useState<SymptomKey>('nausea')
  const [severity, setSeverity] = useState<Severity>(1)
  const [when, setWhen] = useState(() => tsToLocalInput(Date.now()))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      await repo.addSymptomLog(profile.id, {
        at: localInputToTs(when),
        symptom,
        severity,
        note: note.trim() || undefined,
      })
      await onSaved()
      setSeverity(1)
      setNote('')
      setWhen(tsToLocalInput(Date.now()))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
    setBusy(false)
  }

  return (
    <Card title="Registrar sintoma">
      <div className="chip-wrap">
        {SYMPTOMS.map((s) => (
          <Chip key={s.key} active={symptom === s.key} onClick={() => setSymptom(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>
      <Field label="Intensidade">
        <SeverityPicker value={severity} onChange={setSeverity} labels={SEVERITY_LABEL} />
      </Field>
      <div className="grid-2">
        <Field label="Quando">
          <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Observacao">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" />
        </Field>
      </div>
      {err && <p className="error-box">{err}</p>}
      <Btn variant="primary" block disabled={busy} onClick={save}>
        Registrar
      </Btn>
    </Card>
  )
}

function EditSymptom({
  row,
  onClose,
  onSaved,
}: {
  row: SymptomLog
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [symptom, setSymptom] = useState<SymptomKey>(row.symptom)
  const [severity, setSeverity] = useState<Severity>(row.severity)
  const [when, setWhen] = useState(tsToLocalInput(row.at))
  const [note, setNote] = useState(row.note ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    try {
      await repo.updateSymptomLog(row.id!, {
        symptom,
        severity,
        at: localInputToTs(when),
        note: note.trim() || undefined,
      })
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  return (
    <Modal title="Editar sintoma" onClose={onClose}>
      <div className="chip-wrap">
        {SYMPTOMS.map((s) => (
          <Chip key={s.key} active={symptom === s.key} onClick={() => setSymptom(s.key)}>
            {s.label}
          </Chip>
        ))}
      </div>
      <Field label="Intensidade">
        <SeverityPicker value={severity} onChange={setSeverity} labels={SEVERITY_LABEL} />
      </Field>
      <Field label="Quando">
        <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field label="Observacao">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {err && <p className="error-box">{err}</p>}
      <div className="btn-row">
        <ConfirmButton
          onConfirm={async () => {
            await repo.deleteSymptomLog(row.id!)
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
