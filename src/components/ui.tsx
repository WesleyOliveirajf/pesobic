import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { useEffect, useId, useRef, useState } from 'react'

export function Card({
  title,
  right,
  children,
  pad = true,
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  pad?: boolean
}) {
  return (
    <section className="card">
      {(title || right) && (
        <header className="card-head">
          <h2>{title}</h2>
          {right}
        </header>
      )}
      <div className={pad ? 'card-body' : undefined}>{children}</div>
    </section>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'plain'
  block?: boolean
}

export function Btn({ variant = 'plain', block, className = '', ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`btn btn-${variant} ${block ? 'btn-block' : ''} ${className}`.trim()}
    />
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`.trim()} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`input ${props.className ?? ''}`.trim()} />
}

/** Input numerico controlado que devolve number (ou null quando vazio). */
export function NumberInput({
  value,
  onValue,
  step = '0.1',
  min,
  max,
  placeholder,
  inputMode = 'decimal',
}: {
  value: number | null
  onValue: (v: number | null) => void
  step?: string
  min?: number
  max?: number
  placeholder?: string
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <input
      className="input"
      type="number"
      inputMode={inputMode}
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={value === null || Number.isNaN(value) ? '' : String(value)}
      onChange={(e) => {
        const raw = e.target.value
        onValue(raw === '' ? null : Number(raw))
      }}
    />
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'ok' | 'warn' | 'danger'
}) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`.trim()}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export function ProgressBar({ pct, tone = 'brand' }: { pct: number; tone?: 'brand' | 'ok' | 'warn' }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="progress">
      <div className={`progress-fill progress-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={`chip ${active ? 'chip-active' : ''}`.trim()} onClick={onClick}>
      {children}
    </button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

/** Botao que exige um segundo toque para confirmar acoes destrutivas. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Confirmar?',
  variant = 'danger',
}: {
  onConfirm: () => void
  children: ReactNode
  confirmLabel?: string
  variant?: 'danger' | 'ghost'
}) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <Btn
      variant={armed ? 'danger' : variant}
      onClick={() => {
        if (armed) {
          window.clearTimeout(timer.current)
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
          timer.current = window.setTimeout(() => setArmed(false), 3000)
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Btn>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement
    dialogRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
          )
        )
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      triggerRef.current?.focus()
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function SeverityPicker({
  value,
  onChange,
  labels,
}: {
  value: number
  onChange: (v: 0 | 1 | 2 | 3) => void
  labels: readonly string[]
}) {
  return (
    <div className="sev-picker">
      {[0, 1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          className={`sev sev-${n} ${value === n ? 'sev-on' : ''}`.trim()}
          onClick={() => onChange(n as 0 | 1 | 2 | 3)}
        >
          {n}
          <span>{labels[n]}</span>
        </button>
      ))}
    </div>
  )
}
