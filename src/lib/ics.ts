import type { Settings } from '../db/types'
import { cadenceDays, medLabel } from './domain'
import { currentDoseMg } from './titration'
import { num, parseISODate } from './format'

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dtLocal(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  )
}

function dtUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export interface IcsOptions {
  /** Minutos de antecedencia do alarme extra. 0 = so o alarme na hora. */
  leadMinutes?: number
}

/**
 * Gera um .ics com UM evento recorrente (RRULE). Um arquivo cobre o futuro inteiro;
 * so precisa reexportar se mudar a cadencia, o dia ou o horario.
 */
export function buildReminderIcs(s: Settings, opts: IcsOptions = {}): string {
  const [hh, mm] = s.reminderTime.split(':').map(Number)
  const anchor = parseISODate(s.reminderStartDate)
  anchor.setHours(hh || 9, mm || 0, 0, 0)

  const daily = cadenceDays(s.medication) === 1
  const dose = currentDoseMg(s)
  const doseTxt = dose > 0 ? ` ${num(dose, dose % 1 === 0 ? 0 : 2)} mg` : ''
  const summary = `Pesobic - aplicar ${medLabel(s.medication, s.medicationLabel)}${doseTxt}`

  const rrule = daily
    ? 'RRULE:FREQ=DAILY'
    : `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[s.reminderWeekday] ?? 'SU'}`

  const uid = `pesobic-reminder-${s.createdAt}@pesobic.local`
  const stamp = dtUTC(new Date())

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pesobic//Reminder//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtLocal(anchor)}`,
    `DURATION:PT10M`,
    rrule,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText('Registre a aplicacao no Pesobic depois de aplicar.')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    `DESCRIPTION:${escapeText(summary)}`,
    'END:VALARM',
  ]

  if (opts.leadMinutes && opts.leadMinutes > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-PT${Math.round(opts.leadMinutes)}M`,
      `DESCRIPTION:${escapeText(summary)}`,
      'END:VALARM',
    )
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(s: Settings, opts?: IcsOptions): void {
  const blob = new Blob([buildReminderIcs(s, opts)], { type: 'text/calendar;charset=utf-8' })
  triggerDownload(blob, 'pesobic-lembrete.ics')
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
