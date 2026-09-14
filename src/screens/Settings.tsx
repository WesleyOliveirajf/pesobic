import { useState } from 'react'
import { patchSettings, wipeAll } from '../db/db'
import * as repo from '../lib/repo'
import { useAuthProfile } from '../lib/auth-context'
import type { MedicationKey, Settings } from '../db/types'
import {
  Btn,
  Card,
  ConfirmButton,
  Field,
  NumberInput,
  Select,
  TextInput,
} from '../components/ui'
import { MEDICATIONS, cadenceDays } from '../lib/domain'
import { downloadIcs } from '../lib/ics'
import { exportBackup, importBackup } from '../lib/backup'
import { fmtDateTime, todayISO } from '../lib/format'

const WEEKDAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

export function SettingsScreen({ settings }: { settings: Settings }) {
  const profile = useAuthProfile()
  const [f, setF] = useState({
    heightCm: settings.heightCm as number | null,
    startWeightKg: settings.startWeightKg as number | null,
    goalWeightKg: settings.goalWeightKg as number | null,
    startDate: settings.startDate,
    medication: settings.medication,
    medicationLabel: settings.medicationLabel,
    proteinFactor: settings.proteinFactor as number | null,
    proteinManualGoal: settings.proteinManualGoal as number | null,
    waterGoalMl: settings.waterGoalMl as number | null,
    reminderWeekday: settings.reminderWeekday,
    reminderTime: settings.reminderTime,
    reminderStartDate: settings.reminderStartDate,
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }))
  }

  async function save() {
    await patchSettings({
      heightCm: f.heightCm ?? settings.heightCm,
      startWeightKg: f.startWeightKg ?? settings.startWeightKg,
      goalWeightKg: f.goalWeightKg ?? settings.goalWeightKg,
      startDate: f.startDate,
      medication: f.medication,
      medicationLabel: f.medicationLabel.trim(),
      proteinFactor: f.proteinFactor ?? settings.proteinFactor,
      proteinManualGoal: f.proteinManualGoal && f.proteinManualGoal > 0 ? f.proteinManualGoal : null,
      waterGoalMl: f.waterGoalMl ?? settings.waterGoalMl,
      reminderWeekday: f.reminderWeekday,
      reminderTime: f.reminderTime,
      reminderStartDate: f.reminderStartDate,
    })
    setSavedAt(Date.now())
  }

  const isDaily = cadenceDays(f.medication) === 1

  return (
    <div className="screen">
      <Card title="Perfil">
        <div className="grid-2">
          <Field label="Altura (cm)">
            <NumberInput value={f.heightCm} onValue={(v) => set('heightCm', v)} step="1" inputMode="numeric" />
          </Field>
          <Field label="Data de inicio">
            <TextInput
              type="date"
              value={f.startDate}
              max={todayISO()}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </Field>
          <Field label="Peso inicial (kg)">
            <NumberInput value={f.startWeightKg} onValue={(v) => set('startWeightKg', v)} />
          </Field>
          <Field label="Peso alvo (kg)">
            <NumberInput value={f.goalWeightKg} onValue={(v) => set('goalWeightKg', v)} />
          </Field>
        </div>
      </Card>

      <Card title="Medicacao">
        <Field label="Caneta">
          <Select
            value={f.medication}
            onChange={(e) => set('medication', e.target.value as MedicationKey)}
          >
            {MEDICATIONS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.cadence})
              </option>
            ))}
          </Select>
        </Field>
        {f.medication === 'outro' && (
          <Field label="Nome do medicamento">
            <TextInput
              value={f.medicationLabel}
              onChange={(e) => set('medicationLabel', e.target.value)}
            />
          </Field>
        )}
        <p className="muted-small">
          O cronograma de titracao e editado na aba Caneta.
        </p>
      </Card>

      <Card title="Proteina e agua">
        <div className="grid-2">
          <Field label="Fator (g/kg)" hint="usado quando nao ha meta fixa">
            <NumberInput value={f.proteinFactor} onValue={(v) => set('proteinFactor', v)} step="0.1" />
          </Field>
          <Field label="Meta fixa (g)" hint="opcional, sobrescreve o fator">
            <NumberInput
              value={f.proteinManualGoal}
              onValue={(v) => set('proteinManualGoal', v)}
              step="5"
              inputMode="numeric"
            />
          </Field>
          <Field label="Meta de agua (ml)">
            <NumberInput
              value={f.waterGoalMl}
              onValue={(v) => set('waterGoalMl', v)}
              step="100"
              inputMode="numeric"
            />
          </Field>
        </div>
      </Card>

      <Card title="Lembrete de aplicacao">
        <div className="grid-2">
          {!isDaily && (
            <Field label="Dia da semana">
              <Select
                value={f.reminderWeekday}
                onChange={(e) => set('reminderWeekday', Number(e.target.value))}
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Horario">
            <TextInput
              type="time"
              value={f.reminderTime}
              onChange={(e) => set('reminderTime', e.target.value)}
            />
          </Field>
          <Field label="A partir de">
            <TextInput
              type="date"
              value={f.reminderStartDate}
              onChange={(e) => set('reminderStartDate', e.target.value)}
            />
          </Field>
        </div>
        <p className="muted-small">
          Salve primeiro, depois baixe o .ics e adicione ao Calendario do iPhone. Um arquivo cobre o
          futuro inteiro (evento recorrente {isDaily ? 'diario' : 'semanal'}). So reexporte se mudar
          dia, hora ou cadencia.
        </p>
        <div className="btn-row wrap">
          <Btn variant="ghost" onClick={() => downloadIcs(settings)}>
            Baixar .ics
          </Btn>
          <Btn variant="ghost" onClick={() => downloadIcs(settings, { leadMinutes: 60 })}>
            .ics + alarme 1h antes
          </Btn>
        </div>
      </Card>

      <Btn variant="primary" block onClick={save}>
        Salvar alteracoes
      </Btn>
      {savedAt && <p className="muted-small center">Salvo {fmtDateTime(savedAt)}.</p>}

      <Card title="Backup dos dados">
        <p className="muted-small">
          Aplicacoes, pesagens, sintomas e nutricao ficam salvos na sua conta (sincronizados). Exporte
          tambem um backup local por seguranca.
          {settings.lastExportAt
            ? ` Ultimo export: ${fmtDateTime(settings.lastExportAt)}.`
            : ' Nenhum export feito ainda.'}
        </p>
        <div className="btn-row wrap">
          <Btn
            variant="primary"
            onClick={async () => {
              await exportBackup(profile.id)
              setMsg('Backup exportado.')
            }}
          >
            Exportar backup (JSON)
          </Btn>
          <label className="btn btn-ghost file-btn">
            Importar backup
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const { counts } = await importBackup(profile.id, file)
                  setMsg(
                    `Importado: ${counts.injections} aplicacoes, ${counts.weighIns} pesagens, ${counts.symptoms} sintomas, ${counts.nutrition} dias.`,
                  )
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : 'Falha ao importar.')
                }
              }}
            />
          </label>
        </div>
        {msg && <p className="muted-small">{msg}</p>}
        <p className="muted-small">Fotos de progresso tem export proprio na aba Peso.</p>
      </Card>

      <Card title="Zona de risco">
        <p className="muted-small">Apaga perfil, cronograma e todos os registros salvos na sua conta. Sem volta.</p>
        <ConfirmButton
          confirmLabel="Apagar tudo mesmo?"
          onConfirm={async () => {
            await repo.wipeAllForUser(profile.id)
            await wipeAll()
            location.reload()
          }}
        >
          Apagar todos os dados
        </ConfirmButton>
      </Card>

      <p className="disclaimer center">
        Pesobic v1 — ferramenta pessoal de registro. Nao prescreve dose, nao da diagnostico e nao
        substitui acompanhamento profissional. As decisoes sobre a medicacao sao suas.
      </p>
    </div>
  )
}
