import { useMemo, useState } from 'react'
import { persistSettings } from '../hooks'
import { useAuthProfile } from '../lib/auth-context'
import type { MedicationKey, Settings } from '../db/types'
import { Btn, Card, Field, NumberInput, Select, TextInput } from '../components/ui'
import { MEDICATIONS } from '../lib/domain'
import { TITRATION_TEMPLATES, expectedPhaseIndex } from '../lib/titration'
import { todayISO } from '../lib/format'

export function Onboarding() {
  const profile = useAuthProfile()
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [startWeightKg, setStartWeightKg] = useState<number | null>(null)
  const [goalWeightKg, setGoalWeightKg] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(todayISO())
  const [medication, setMedication] = useState<MedicationKey>('semaglutida')
  const [medicationLabel, setMedicationLabel] = useState('')
  const [useTemplate, setUseTemplate] = useState(true)
  const [reminderWeekday, setReminderWeekday] = useState(0)
  const [reminderTime, setReminderTime] = useState('09:00')
  const [proteinFactor, setProteinFactor] = useState<number | null>(1.6)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const template = TITRATION_TEMPLATES[medication]
  const proteinPreview = useMemo(() => {
    if (!startWeightKg || !proteinFactor) return null
    return Math.round(startWeightKg * proteinFactor)
  }, [startWeightKg, proteinFactor])

  async function submit() {
    setErr(null)
    if (!heightCm || heightCm < 120 || heightCm > 230) return setErr('Informe a altura em cm (ex: 172).')
    if (!startWeightKg || startWeightKg < 30) return setErr('Informe o peso inicial em kg.')
    if (!goalWeightKg || goalWeightKg < 30) return setErr('Informe o peso alvo em kg.')
    if (goalWeightKg >= startWeightKg) return setErr('O peso alvo deve ser menor que o peso inicial.')
    if (medication === 'outro' && !medicationLabel.trim()) return setErr('Informe o nome do medicamento.')
    if (!proteinFactor || proteinFactor <= 0) return setErr('Informe o fator de proteina (g/kg).')

    setSaving(true)
    const phases = (useTemplate ? template.phases() : TITRATION_TEMPLATES.outro.phases())
    const now = Date.now()
    const settings: Settings = {
      id: 'singleton',
      createdAt: now,
      onboardedAt: now,
      heightCm,
      startWeightKg,
      startDate,
      goalWeightKg,
      medication,
      medicationLabel: medicationLabel.trim(),
      proteinFactor,
      proteinManualGoal: null,
      waterGoalMl: 2000,
      reminderWeekday,
      reminderTime,
      reminderStartDate: startDate,
      phases,
      currentPhaseIndex: useTemplate ? expectedPhaseIndex(phases, startDate) : 0,
      lastExportAt: null,
    }
    try {
      await persistSettings(profile.id, settings)
    } catch (e) {
      setSaving(false)
      setErr(e instanceof Error ? e.message : 'Falha ao salvar. Sem rede a escrita nao e gravada.')
    }
  }

  const isDaily = MEDICATIONS.find((m) => m.key === medication)?.cadence === 'diaria'

  return (
    <div className="screen onboarding">
      <div className="brand-hero">
        <img src="/logo.svg" alt="" width={56} height={56} />
        <div>
          <h1>Pesobic</h1>
          <p>Seu processo de emagrecimento com canetas GLP-1, num lugar so.</p>
        </div>
      </div>

      <Card title="Perfil">
        <div className="grid-2">
          <Field label="Altura (cm)">
            <NumberInput value={heightCm} onValue={setHeightCm} step="1" inputMode="numeric" placeholder="172" />
          </Field>
          <Field label="Inicio">
            <TextInput type="date" value={startDate} max={todayISO()} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Peso inicial (kg)">
            <NumberInput value={startWeightKg} onValue={setStartWeightKg} placeholder="98.0" />
          </Field>
          <Field label="Peso alvo (kg)">
            <NumberInput value={goalWeightKg} onValue={setGoalWeightKg} placeholder="78.0" />
          </Field>
        </div>
      </Card>

      <Card title="Medicacao">
        <Field label="Caneta">
          <Select value={medication} onChange={(e) => setMedication(e.target.value as MedicationKey)}>
            {MEDICATIONS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.cadence})
              </option>
            ))}
          </Select>
        </Field>
        {medication === 'outro' && (
          <Field label="Nome do medicamento">
            <TextInput value={medicationLabel} onChange={(e) => setMedicationLabel(e.target.value)} placeholder="Ex: Dulaglutida" />
          </Field>
        )}
        <label className="check">
          <input type="checkbox" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} />
          <span>
            Comecar com o esquema de titracao de referencia
            {medication !== 'outro' && <em> — {template.name}</em>}
          </span>
        </label>
        {useTemplate && medication !== 'outro' && (
          <p className="disclaimer">{template.note} Voce pode editar todas as fases depois.</p>
        )}
      </Card>

      <Card title="Lembrete de aplicacao">
        <div className="grid-2">
          {!isDaily && (
            <Field label="Dia da semana">
              <Select value={reminderWeekday} onChange={(e) => setReminderWeekday(Number(e.target.value))}>
                {['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'].map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Horario">
            <TextInput type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          </Field>
        </div>
        <p className="disclaimer">
          Depois voce baixa um arquivo .ics e adiciona ao Calendario do iPhone — o alarme nativo cuida do resto.
        </p>
      </Card>

      <Card title="Proteina">
        <Field label="Meta por kg de peso (g/kg)" hint={proteinPreview ? `Hoje daria ~${proteinPreview} g/dia` : 'Faixa comum em deficit: 1,2 a 2,0 g/kg'}>
          <NumberInput value={proteinFactor} onValue={setProteinFactor} step="0.1" />
        </Field>
      </Card>

      {err && <p className="error-box">{err}</p>}

      <Btn variant="primary" block disabled={saving} onClick={submit}>
        {saving ? 'Salvando...' : 'Comecar'}
      </Btn>
      <p className="disclaimer center">
        O Pesobic registra o que voce decide e informa. Ele nao prescreve dose nem substitui acompanhamento de saude.
      </p>
    </div>
  )
}
