import { useMemo, useState } from 'react'
import { db } from '../db/db'
import * as repo from '../lib/repo'
import { useAuthProfile } from '../lib/auth-context'
import type { Settings, WeighIn } from '../db/types'
import {
  Btn,
  Card,
  ConfirmButton,
  EmptyState,
  Field,
  Modal,
  NumberInput,
  TextInput,
} from '../components/ui'
import { usePhotos, useWeighIns } from '../hooks'
import { SimpleLineChart, WeightChart } from '../components/charts'
import { exportPhotos, importPhotos } from '../lib/backup'
import { fmtDate, fmtDateTime, num, signed, todayISO } from '../lib/format'
import { latestWeight, weightSeries, weightStats } from '../lib/metrics'

const OPTIONAL_MEASURES: { key: keyof WeighIn; label: string }[] = [
  { key: 'hipCm', label: 'Quadril (cm)' },
  { key: 'armCm', label: 'Braco (cm)' },
  { key: 'thighCm', label: 'Coxa (cm)' },
  { key: 'chestCm', label: 'Peito (cm)' },
  { key: 'neckCm', label: 'Pescoco (cm)' },
]

export function Weight({ settings }: { settings: Settings }) {
  const [weighIns, reloadWeighIns] = useWeighIns()
  const [edit, setEdit] = useState<WeighIn | null>(null)
  const [showPhotos, setShowPhotos] = useState(false)

  const series = useMemo(() => weightSeries(weighIns), [weighIns])
  const waistSeries = useMemo(
    () =>
      weighIns
        .filter((w) => typeof w.waistCm === 'number')
        .map((w) => ({ date: w.date, cintura: w.waistCm as number }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [weighIns],
  )
  const stats = weightStats(weighIns, settings)
  const current = latestWeight(weighIns, settings)
  const history = [...weighIns].sort((a, b) => b.at - a.at)

  return (
    <div className="screen">
      <QuickAdd onSaved={reloadWeighIns} />

      <Card title="Resumo">
        <div className="stat-row">
          <div className="stat">
            <span className="stat-value">{num(current)} kg</span>
            <span className="stat-label">Atual</span>
          </div>
          <div className="stat">
            <span className="stat-value">{signed(-stats.lostKg)} kg</span>
            <span className="stat-label">Desde o inicio</span>
          </div>
          <div className="stat">
            <span className="stat-value">{num(stats.toGoalKg)} kg</span>
            <span className="stat-label">Falta p/ meta</span>
          </div>
        </div>
      </Card>

      <Card title="Peso e media de 7 dias">
        <WeightChart data={series} goal={settings.goalWeightKg} />
      </Card>

      {waistSeries.length >= 2 && (
        <Card title="Cintura">
          <SimpleLineChart data={waistSeries} dataKey="cintura" unit="cm" color="var(--warn)" />
        </Card>
      )}

      <Card
        title="Fotos de progresso"
        right={
          <button className="link" onClick={() => setShowPhotos(true)}>
            Abrir
          </button>
        }
      >
        <p className="muted-small">
          Guardadas so no aparelho. Nao entram no backup principal — use o export de fotos a parte.
        </p>
      </Card>

      <Card title="Historico" pad={history.length === 0}>
        {history.length === 0 ? (
          <EmptyState>Nenhuma pesagem registrada.</EmptyState>
        ) : (
          <ul className="log-list">
            {history.map((w) => (
              <li key={w.id}>
                <button className="log-row" onClick={() => setEdit(w)}>
                  <span className="log-badge">{num(w.weightKg)} kg</span>
                  <span className="log-main">
                    {w.waistCm ? `cintura ${num(w.waistCm)} cm` : ''}
                    {w.note ? `${w.waistCm ? ' — ' : ''}${w.note}` : ''}
                  </span>
                  <time>{fmtDate(w.date)}</time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {edit && <EditWeighIn row={edit} onClose={() => setEdit(null)} onSaved={reloadWeighIns} />}
      {showPhotos && <PhotosModal onClose={() => setShowPhotos(false)} />}
    </div>
  )
}

function emptyMeasures() {
  return { hipCm: null, armCm: null, thighCm: null, chestCm: null, neckCm: null } as Record<
    string,
    number | null
  >
}

function QuickAdd({ onSaved }: { onSaved: () => Promise<void> }) {
  const profile = useAuthProfile()
  const [date, setDate] = useState(todayISO())
  const [weightKg, setWeightKg] = useState<number | null>(null)
  const [waistCm, setWaistCm] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [more, setMore] = useState(false)
  const [extra, setExtra] = useState<Record<string, number | null>>(emptyMeasures())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function extraValue(key: string): number | undefined {
    const v = extra[key]
    return typeof v === 'number' && !Number.isNaN(v) ? v : undefined
  }

  async function save() {
    setErr(null)
    if (!weightKg || weightKg < 30 || weightKg > 400) {
      setErr('Informe um peso valido em kg.')
      return
    }
    setBusy(true)
    const row: Omit<WeighIn, 'id'> = {
      date,
      at: date === todayISO() ? Date.now() : new Date(`${date}T12:00`).getTime(),
      weightKg,
      waistCm: waistCm ?? undefined,
      hipCm: extraValue('hipCm'),
      armCm: extraValue('armCm'),
      thighCm: extraValue('thighCm'),
      chestCm: extraValue('chestCm'),
      neckCm: extraValue('neckCm'),
      note: note.trim() || undefined,
    }
    try {
      await repo.addWeighIn(profile.id, row)
      await onSaved()
      setWeightKg(null)
      setWaistCm(null)
      setNote('')
      setExtra(emptyMeasures())
      setMore(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
    setBusy(false)
  }

  return (
    <Card title="Nova pesagem">
      <div className="grid-2">
        <Field label="Data">
          <TextInput type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Peso (kg)">
          <NumberInput value={weightKg} onValue={setWeightKg} placeholder="97.4" />
        </Field>
        <Field label="Cintura (cm)">
          <NumberInput value={waistCm} onValue={setWaistCm} placeholder="opcional" />
        </Field>
        <Field label="Observacao">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" />
        </Field>
      </div>

      {more && (
        <div className="grid-2">
          {OPTIONAL_MEASURES.map((m) => (
            <Field key={m.key} label={m.label}>
              <NumberInput
                value={extra[m.key as string] ?? null}
                onValue={(v) => setExtra((p) => ({ ...p, [m.key as string]: v }))}
              />
            </Field>
          ))}
        </div>
      )}

      {err && <p className="error-box">{err}</p>}
      <div className="btn-row">
        <Btn variant="ghost" onClick={() => setMore((v) => !v)}>
          {more ? 'Menos campos' : 'Mais medidas'}
        </Btn>
        <Btn variant="primary" disabled={busy} onClick={save}>
          Registrar
        </Btn>
      </div>
    </Card>
  )
}

function EditWeighIn({
  row,
  onClose,
  onSaved,
}: {
  row: WeighIn
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [weightKg, setWeightKg] = useState<number | null>(row.weightKg)
  const [waistCm, setWaistCm] = useState<number | null>(row.waistCm ?? null)
  const [date, setDate] = useState(row.date)
  const [note, setNote] = useState(row.note ?? '')
  const [extra, setExtra] = useState<Record<string, number | null>>({
    hipCm: row.hipCm ?? null,
    armCm: row.armCm ?? null,
    thighCm: row.thighCm ?? null,
    chestCm: row.chestCm ?? null,
    neckCm: row.neckCm ?? null,
  })
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    const patch: Partial<Omit<WeighIn, 'id'>> = {
      date,
      weightKg: weightKg ?? row.weightKg,
      waistCm: waistCm ?? undefined,
      hipCm: extra.hipCm ?? undefined,
      armCm: extra.armCm ?? undefined,
      thighCm: extra.thighCm ?? undefined,
      chestCm: extra.chestCm ?? undefined,
      neckCm: extra.neckCm ?? undefined,
      note: note.trim() || undefined,
    }
    try {
      await repo.updateWeighIn(row.id!, patch)
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  return (
    <Modal title={`Pesagem — ${fmtDate(row.date)}`} onClose={onClose}>
      <div className="grid-2">
        <Field label="Data">
          <TextInput type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Peso (kg)">
          <NumberInput value={weightKg} onValue={setWeightKg} />
        </Field>
        <Field label="Cintura (cm)">
          <NumberInput value={waistCm} onValue={setWaistCm} />
        </Field>
        <Field label="Observacao">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {OPTIONAL_MEASURES.map((m) => (
          <Field key={m.key} label={m.label}>
            <NumberInput
              value={extra[m.key as string] ?? null}
              onValue={(v) => setExtra((p) => ({ ...p, [m.key as string]: v }))}
            />
          </Field>
        ))}
      </div>
      {err && <p className="error-box">{err}</p>}
      <div className="btn-row">
        <ConfirmButton
          onConfirm={async () => {
            await repo.deleteWeighIn(row.id!)
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

function PhotosModal({ onClose }: { onClose: () => void }) {
  const photos = usePhotos() ?? []
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    for (const f of Array.from(files)) {
      await db.photos.add({ at: Date.now(), date: todayISO(), blob: f })
    }
    setBusy(false)
  }

  return (
    <Modal title="Fotos de progresso" onClose={onClose}>
      <label className="btn btn-primary btn-block file-btn">
        Adicionar fotos
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onPick(e.target.files)}
        />
      </label>

      {photos.length === 0 ? (
        <EmptyState>Nenhuma foto ainda.</EmptyState>
      ) : (
        <div className="photo-grid">
          {photos.map((p) => (
            <figure key={p.id}>
              <img src={URL.createObjectURL(p.blob)} alt={fmtDate(p.date)} loading="lazy" />
              <figcaption>
                <span>{fmtDateTime(p.at)}</span>
                <ConfirmButton
                  variant="ghost"
                  onConfirm={async () => {
                    await db.photos.delete(p.id!)
                  }}
                >
                  excluir
                </ConfirmButton>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="btn-row">
        <Btn
          variant="ghost"
          disabled={busy}
          onClick={async () => {
            const n = await exportPhotos()
            setMsg(`${n} foto(s) exportada(s).`)
          }}
        >
          Exportar fotos
        </Btn>
        <label className="btn btn-ghost file-btn">
          Importar fotos
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setBusy(true)
              try {
                const n = await importPhotos(f)
                setMsg(`${n} foto(s) importada(s).`)
              } catch (err) {
                setMsg(err instanceof Error ? err.message : 'Falha ao importar.')
              }
              setBusy(false)
            }}
          />
        </label>
      </div>
      {msg && <p className="muted-small">{msg}</p>}
    </Modal>
  )
}
