const ptBr = 'pt-BR'

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Interpreta 'yyyy-mm-dd' como data local (evita o deslize de fuso do Date(string)). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return todayISO(d)
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO).getTime()
  const b = parseISODate(toISO).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function fmtDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(ptBr, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function fmtDateShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString(ptBr, { day: '2-digit', month: '2-digit' })
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString(ptBr, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtRelativeDays(days: number): string {
  if (days === 0) return 'hoje'
  if (days === 1) return 'amanha'
  if (days === -1) return 'ontem'
  if (days > 0) return `em ${days} dias`
  return `ha ${Math.abs(days)} dias`
}

export function num(value: number, digits = 1): string {
  return value.toLocaleString(ptBr, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function signed(value: number, digits = 1): string {
  const s = num(Math.abs(value), digits)
  if (value > 0) return `+${s}`
  if (value < 0) return `-${s}`
  return s
}

export function nowTimeHHMM(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Converte um input datetime-local ('yyyy-mm-ddTHH:mm') para timestamp. */
export function localInputToTs(value: string): number {
  return new Date(value).getTime()
}

/** Converte um timestamp para o formato aceito por <input type="datetime-local">. */
export function tsToLocalInput(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}
