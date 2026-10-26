import { useState } from 'react'
import type { WorkoutDay, WorkoutKind } from '../db/types'
import { Btn, Card, Field, TextInput } from '../components/ui'
import { useWorkouts } from '../hooks'
import { useAuthProfile } from '../lib/auth-context'
import { parseISODate, todayISO } from '../lib/format'
import * as repo from '../lib/repo'
import {
  WORKOUT_KIND_LABEL,
  WEEKDAY_LABELS,
  countMarkedInMonth,
  monthCells,
  monthTitle,
  shiftMonth,
} from '../lib/workout-calendar'

const KINDS = Object.keys(WORKOUT_KIND_LABEL) as WorkoutKind[]

function workoutError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : ''
  if (/workout_days/i.test(message) && /schema cache|does not exist|could not find/i.test(message)) {
    return 'Treinos ainda não estão no banco. Falta criar a tabela workout_days.'
  }
  return message || 'Não foi possível salvar o treino.'
}

export function Workouts() {
  const profile = useAuthProfile()
  const [rows, reload] = useWorkouts()
  const today = todayISO()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState(today)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const byDate = new Map(rows.map((row) => [row.date, row]))
  const selectedRow = byDate.get(selected)
  const note = noteDraft ?? selectedRow?.note ?? ''
  const cells = monthCells(cursor.year, cursor.month)
  const monthCount = countMarkedInMonth(rows.map((row) => row.date), cursor.year, cursor.month)

  function pick(date: string, inMonth: boolean) {
    if (!inMonth) {
      const day = parseISODate(date)
      setCursor({ year: day.getFullYear(), month: day.getMonth() })
    }
    setSelected(date)
    setNoteDraft(null)
    setErr(null)
  }

  async function save(date: string, patch: Partial<Omit<WorkoutDay, 'id' | 'date'>>, existing?: WorkoutDay) {
    setBusy(true)
    setErr(null)
    try {
      await repo.upsertWorkoutDay(profile.id, date, patch, existing)
      await reload()
    } catch (caught) {
      setErr(workoutError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function unmark(row: WorkoutDay) {
    if (!row.id) return
    setBusy(true)
    setErr(null)
    try {
      await repo.deleteWorkoutDay(row.id)
      setNoteDraft(null)
      await reload()
    } catch (caught) {
      setErr(workoutError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <Card title="Academia">
        <div className="month-nav">
          <button type="button" className="cal-nav" onClick={() => setCursor((current) => shiftMonth(current.year, current.month, -1))} aria-label="Mês anterior">
            ‹
          </button>
          <strong>{monthTitle(cursor.year, cursor.month)}</strong>
          <button type="button" className="cal-nav" onClick={() => setCursor((current) => shiftMonth(current.year, current.month, 1))} aria-label="Próximo mês">
            ›
          </button>
        </div>
        <p className="muted-small">{monthCount === 1 ? '1 dia neste mês' : `${monthCount} dias neste mês`}</p>
        <div className="cal-week" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="cal-grid" role="grid" aria-label="Dias de academia">
          {cells.map((cell) => {
            const marked = byDate.has(cell.date)
            const day = Number(cell.date.slice(8))
            return (
              <button
                key={cell.date}
                type="button"
                role="gridcell"
                className={`cal-day${cell.inMonth ? '' : ' out'}${marked ? ' on' : ''}${cell.date === selected ? ' selected' : ''}${cell.date === today ? ' today' : ''}`}
                aria-pressed={marked}
                aria-label={`${cell.date}${marked ? ' marcado' : ''}`}
                onClick={() => pick(cell.date, cell.inMonth)}
              >
                {day}
              </button>
            )
          })}
        </div>
      </Card>

      <Card title={selected === today ? 'Hoje' : selected.split('-').reverse().join('/')}>
        {selectedRow ? (
          <>
            <div className="btn-row wrap">
              {KINDS.map((kind) => (
                <Btn
                  key={kind}
                  variant={selectedRow.kind === kind ? 'primary' : 'ghost'}
                  disabled={busy}
                  onClick={() => void save(selected, { kind }, selectedRow)}
                >
                  {WORKOUT_KIND_LABEL[kind]}
                </Btn>
              ))}
            </div>
            <Field label="Nota">
              <TextInput
                value={note}
                maxLength={2000}
                placeholder="opcional"
                disabled={busy}
                onChange={(event) => setNoteDraft(event.target.value)}
                onBlur={() => {
                  const next = note.trim()
                  if (next === (selectedRow.note ?? '')) return
                  void save(selected, { note: next || undefined }, selectedRow)
                }}
              />
            </Field>
            <Btn variant="ghost" disabled={busy} onClick={() => void unmark(selectedRow)}>
              Desmarcar este dia
            </Btn>
          </>
        ) : (
          <Btn variant="primary" disabled={busy} onClick={() => void save(selected, { kind: 'musculacao' })}>
            Marcar este dia
          </Btn>
        )}
        {err && <p className="error-box">{err}</p>}
      </Card>
    </div>
  )
}
