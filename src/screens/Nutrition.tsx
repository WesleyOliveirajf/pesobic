import { useState } from 'react'
import * as repo from '../lib/repo'
import { useAuthProfile } from '../lib/auth-context'
import type { NutritionDay, Settings } from '../db/types'
import { Btn, Card, ConfirmButton, EmptyState, Field, Modal, NumberInput, ProgressBar, TextInput } from '../components/ui'
import { ProteinChart } from '../components/charts'
import { useNutrition, useWeighIns } from '../hooks'
import { fmtDate, num, todayISO } from '../lib/format'
import { latestWeight, proteinGoal } from '../lib/metrics'

export function Nutrition({ settings }: { settings: Settings }) {
  const profile = useAuthProfile()
  const [nutrition, reloadNutrition] = useNutrition()
  const [weighIns] = useWeighIns()
  const [edit, setEdit] = useState<NutritionDay | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const today = todayISO()
  const todayRow = nutrition.find((n) => n.date === today)
  const current = latestWeight(weighIns, settings)
  const pGoal = proteinGoal(current, settings)

  async function upsertToday(patch: Partial<Omit<NutritionDay, 'id' | 'date'>>) {
    setErr(null)
    try {
      await repo.upsertNutritionDay(profile.id, today, patch, todayRow)
      await reloadNutrition()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  const chartData = [...nutrition]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((n) => ({ date: n.date, proteina: n.proteinG, meta: pGoal }))

  const protein = todayRow?.proteinG ?? 0
  const water = todayRow?.waterMl ?? 0
  const meals = todayRow?.meals ?? 0

  const history = [...nutrition].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="screen">
      <Card title="Hoje">
        <div className="today-line">
          <span>Proteina</span>
          <strong>
            {protein} / {pGoal} g
          </strong>
        </div>
        <ProgressBar pct={(protein / pGoal) * 100} tone={protein >= pGoal ? 'ok' : 'brand'} />
        <div className="btn-row wrap">
          {[10, 20, 30, 40].map((g) => (
            <Btn key={g} variant="ghost" onClick={() => upsertToday({ proteinG: protein + g })}>
              +{g}
            </Btn>
          ))}
          <Btn variant="ghost" onClick={() => upsertToday({ proteinG: Math.max(0, protein - 10) })}>
            -10
          </Btn>
        </div>
        <p className="muted-small">Meta = {num(settings.proteinFactor, 1)} g/kg x {num(current)} kg (ajuste em Config).</p>

        <div className="today-line mt">
          <span>Agua</span>
          <strong>
            {(water / 1000).toFixed(2)} / {(settings.waterGoalMl / 1000).toFixed(1)} L
          </strong>
        </div>
        <ProgressBar pct={(water / settings.waterGoalMl) * 100} tone="brand" />
        <div className="btn-row wrap">
          {[200, 250, 500].map((ml) => (
            <Btn key={ml} variant="ghost" onClick={() => upsertToday({ waterMl: water + ml })}>
              +{ml} ml
            </Btn>
          ))}
          <Btn variant="ghost" onClick={() => upsertToday({ waterMl: Math.max(0, water - 250) })}>
            -250
          </Btn>
        </div>

        <div className="today-line mt">
          <span>Refeicoes</span>
          <div className="stepper">
            <Btn variant="ghost" onClick={() => upsertToday({ meals: Math.max(0, meals - 1) })}>
              &minus;
            </Btn>
            <strong>{meals}</strong>
            <Btn variant="ghost" onClick={() => upsertToday({ meals: meals + 1 })}>
              +
            </Btn>
          </div>
        </div>

        <Field label="Observacao do dia">
          <TextInput
            value={todayRow?.note ?? ''}
            onChange={(e) => upsertToday({ note: e.target.value || undefined })}
            placeholder="opcional"
          />
        </Field>
        {err && <p className="error-box">{err}</p>}
      </Card>

      {chartData.length >= 2 && (
        <Card title="Proteina x meta (30 dias)">
          <ProteinChart data={chartData} />
        </Card>
      )}

      <Card title="Historico" pad={history.length === 0}>
        {history.length === 0 ? (
          <EmptyState>Nenhum dia registrado.</EmptyState>
        ) : (
          <ul className="log-list">
            {history.map((n) => (
              <li key={n.id}>
                <button className="log-row" onClick={() => setEdit(n)}>
                  <span className="log-badge">{n.proteinG} g</span>
                  <span className="log-main">
                    {(n.waterMl / 1000).toFixed(2)} L &middot; {n.meals} ref.
                    {n.note ? ` — ${n.note}` : ''}
                  </span>
                  <time>{fmtDate(n.date)}</time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {edit && <EditDay row={edit} onClose={() => setEdit(null)} onSaved={reloadNutrition} />}
    </div>
  )
}

function EditDay({
  row,
  onClose,
  onSaved,
}: {
  row: NutritionDay
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [proteinG, setProteinG] = useState<number | null>(row.proteinG)
  const [waterMl, setWaterMl] = useState<number | null>(row.waterMl)
  const [meals, setMeals] = useState<number | null>(row.meals)
  const [note, setNote] = useState(row.note ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    try {
      await repo.updateNutritionDay(row.id!, {
        proteinG: proteinG ?? 0,
        waterMl: waterMl ?? 0,
        meals: meals ?? 0,
        note: note.trim() || undefined,
      })
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar.')
    }
  }

  return (
    <Modal title={`Dia — ${fmtDate(row.date)}`} onClose={onClose}>
      <div className="grid-2">
        <Field label="Proteina (g)">
          <NumberInput value={proteinG} onValue={setProteinG} step="1" inputMode="numeric" />
        </Field>
        <Field label="Agua (ml)">
          <NumberInput value={waterMl} onValue={setWaterMl} step="50" inputMode="numeric" />
        </Field>
        <Field label="Refeicoes">
          <NumberInput value={meals} onValue={setMeals} step="1" inputMode="numeric" />
        </Field>
        <Field label="Observacao">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      {err && <p className="error-box">{err}</p>}
      <div className="btn-row">
        <ConfirmButton
          onConfirm={async () => {
            await repo.deleteNutritionDay(row.id!)
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
