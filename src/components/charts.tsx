import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmtDateShort } from '../lib/format'

const AXIS = { fontSize: 11, fill: 'var(--text-dim)' }
const GRID = 'var(--border)'

export interface DoseMarker {
  date: string
  label: string
}

export function WeightChart({
  data,
  goal,
  markers = [],
}: {
  data: { date: string; peso: number; media: number }[]
  goal?: number
  markers?: DoseMarker[]
}) {
  if (data.length < 2) {
    return <p className="empty">Registre pelo menos 2 pesagens para ver a tendencia.</p>
  }
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={AXIS} minTickGap={24} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={AXIS} width={44} />
          <Tooltip
            labelFormatter={(l) => fmtDateShort(String(l))}
            formatter={(v, name) => [`${v} kg`, name === 'media' ? 'Media 7d' : 'Peso']}
            contentStyle={tooltipStyle}
          />
          {goal !== undefined && (
            <ReferenceLine
              y={goal}
              stroke="var(--ok)"
              strokeDasharray="5 4"
              label={{ value: 'meta', position: 'insideBottomRight', fontSize: 10, fill: 'var(--ok)' }}
            />
          )}
          {markers.map((m) => (
            <ReferenceLine
              key={m.date + m.label}
              x={m.date}
              stroke="var(--brand)"
              strokeDasharray="2 3"
              label={{ value: m.label, position: 'top', fontSize: 9, fill: 'var(--brand)' }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="peso"
            stroke="var(--text-dim)"
            strokeWidth={1}
            dot={false}
            strokeOpacity={0.5}
          />
          <Line type="monotone" dataKey="media" stroke="var(--brand)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SimpleLineChart({
  data,
  dataKey,
  unit = '',
  color = 'var(--brand)',
}: {
  data: { date: string; [k: string]: number | string }[]
  dataKey: string
  unit?: string
  color?: string
}) {
  if (data.length < 2) return <p className="empty">Poucos dados para o grafico.</p>
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={AXIS} minTickGap={24} />
          <YAxis tick={AXIS} width={44} />
          <Tooltip
            labelFormatter={(l) => fmtDateShort(String(l))}
            formatter={(v) => [`${v}${unit ? ' ' + unit : ''}`, '']}
            contentStyle={tooltipStyle}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProteinChart({
  data,
}: {
  data: { date: string; proteina: number; meta: number }[]
}) {
  if (data.length < 2) return <p className="empty">Poucos dias registrados para o grafico.</p>
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={AXIS} minTickGap={24} />
          <YAxis tick={AXIS} width={44} />
          <Tooltip
            labelFormatter={(l) => fmtDateShort(String(l))}
            formatter={(v, name) => [`${v} g`, name === 'meta' ? 'Meta' : 'Proteina']}
            contentStyle={tooltipStyle}
          />
          <Line
            type="monotone"
            dataKey="meta"
            stroke="var(--ok)"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="proteina"
            stroke="var(--brand)"
            strokeWidth={2.5}
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SymptomChart({
  data,
  keys,
  markers = [],
}: {
  data: { date: string; [k: string]: number | string }[]
  keys: { key: string; label: string; color: string }[]
  markers?: DoseMarker[]
}) {
  if (data.length < 2) return <p className="empty">Poucos registros para o grafico.</p>
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={AXIS} minTickGap={24} />
          <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tick={AXIS} width={28} />
          <Tooltip
            labelFormatter={(l) => fmtDateShort(String(l))}
            contentStyle={tooltipStyle}
          />
          {markers.map((m) => (
            <ReferenceLine
              key={m.date + m.label}
              x={m.date}
              stroke="var(--text-dim)"
              strokeDasharray="2 3"
              label={{ value: m.label, position: 'top', fontSize: 9, fill: 'var(--text-dim)' }}
            />
          ))}
          {keys.map((k) => (
            <Line
              key={k.key}
              type="monotone"
              dataKey={k.key}
              name={k.label}
              stroke={k.color}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--text)',
}
