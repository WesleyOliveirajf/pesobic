// Camada de acesso a dados: le e grava as entidades sincronizaveis direto no Supabase.
// Fonte oficial dos dados (injections, weigh_ins, symptom_logs, nutrition_days, perfil).
import { supabase } from './supabase'
import { asUuid } from './ids'
import type { AccessProfile } from './auth-context'
import type { Injection, MedicationKey, NutritionDay, Settings, SymptomLog, TitrationPhase, WeighIn } from '../db/types'

function client() {
  if (!supabase) throw new Error('Supabase nao configurado.')
  return supabase
}

function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = error instanceof Error ? error.message : String(error)
  return /Failed to fetch|NetworkError|fetch failed|Load failed|network/i.test(msg)
}

function rethrow(error: unknown, kind: 'read' | 'write'): never {
  if (isNetworkError(error)) {
    throw new Error(
      kind === 'write'
        ? 'Sem rede. A escrita nao foi gravada. Tente de novo quando estiver online.'
        : 'Sem rede. Nao foi possivel atualizar os dados.',
    )
  }
  throw error instanceof Error ? error : new Error(String(error))
}

// ---------- injections ----------

interface InjectionRow {
  id: string
  occurred_at: string
  medication: Injection['medication']
  dose_mg: number
  site: Injection['site']
  status: Injection['status']
  note: string | null
}

function fromInjectionRow(r: InjectionRow): Injection {
  return {
    id: r.id,
    at: new Date(r.occurred_at).getTime(),
    medication: r.medication,
    doseMg: Number(r.dose_mg),
    site: r.site,
    status: r.status,
    note: r.note ?? undefined,
  }
}

export async function listInjections(userId: string): Promise<Injection[]> {
  const { data, error } = await client()
    .from('injections')
    .select('id,occurred_at,medication,dose_mg,site,status,note')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data as InjectionRow[]).map(fromInjectionRow)
}

export async function addInjection(userId: string, row: Omit<Injection, 'id'> & { id?: string }): Promise<Injection> {
  try {
    const { data, error } = await client()
      .from('injections')
      .upsert({
        ...(row.id ? { id: row.id } : {}),
        user_id: userId,
        occurred_at: new Date(row.at).toISOString(),
        medication: row.medication,
        dose_mg: row.doseMg,
        site: row.site,
        status: row.status,
        note: row.note ?? null,
      })
      .select('id,occurred_at,medication,dose_mg,site,status,note')
      .single()
    if (error) throw error
    return fromInjectionRow(data as InjectionRow)
  } catch (error) {
    rethrow(error, 'write')
  }
}

export async function updateInjection(id: string, patch: Partial<Omit<Injection, 'id'>>): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.at !== undefined) payload.occurred_at = new Date(patch.at).toISOString()
  if (patch.medication !== undefined) payload.medication = patch.medication
  if (patch.doseMg !== undefined) payload.dose_mg = patch.doseMg
  if (patch.site !== undefined) payload.site = patch.site
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.note !== undefined) payload.note = patch.note ?? null
  const { error } = await client().from('injections').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteInjection(id: string): Promise<void> {
  const { error } = await client().from('injections').delete().eq('id', id)
  if (error) throw error
}

// ---------- weigh_ins ----------

interface WeighInRow {
  id: string
  measured_on: string
  measured_at: string
  weight_kg: number
  waist_cm: number | null
  hip_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  chest_cm: number | null
  neck_cm: number | null
  note: string | null
}

function fromWeighInRow(r: WeighInRow): WeighIn {
  return {
    id: r.id,
    date: r.measured_on,
    at: new Date(r.measured_at).getTime(),
    weightKg: Number(r.weight_kg),
    waistCm: r.waist_cm === null ? undefined : Number(r.waist_cm),
    hipCm: r.hip_cm === null ? undefined : Number(r.hip_cm),
    armCm: r.arm_cm === null ? undefined : Number(r.arm_cm),
    thighCm: r.thigh_cm === null ? undefined : Number(r.thigh_cm),
    chestCm: r.chest_cm === null ? undefined : Number(r.chest_cm),
    neckCm: r.neck_cm === null ? undefined : Number(r.neck_cm),
    note: r.note ?? undefined,
  }
}

const WEIGH_IN_COLUMNS = 'id,measured_on,measured_at,weight_kg,waist_cm,hip_cm,arm_cm,thigh_cm,chest_cm,neck_cm,note'

export async function listWeighIns(userId: string): Promise<WeighIn[]> {
  const { data, error } = await client()
    .from('weigh_ins')
    .select(WEIGH_IN_COLUMNS)
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
  if (error) throw error
  return (data as WeighInRow[]).map(fromWeighInRow)
}

export async function addWeighIn(userId: string, row: Omit<WeighIn, 'id'> & { id?: string }): Promise<WeighIn> {
  const { data, error } = await client()
    .from('weigh_ins')
    .upsert({
      ...(row.id ? { id: row.id } : {}),
      user_id: userId,
      measured_on: row.date,
      measured_at: new Date(row.at).toISOString(),
      weight_kg: row.weightKg,
      waist_cm: row.waistCm ?? null,
      hip_cm: row.hipCm ?? null,
      arm_cm: row.armCm ?? null,
      thigh_cm: row.thighCm ?? null,
      chest_cm: row.chestCm ?? null,
      neck_cm: row.neckCm ?? null,
      note: row.note ?? null,
    })
    .select(WEIGH_IN_COLUMNS)
    .single()
  if (error) rethrow(error, 'write')
  return fromWeighInRow(data as WeighInRow)
}

export async function updateWeighIn(id: string, patch: Partial<Omit<WeighIn, 'id'>>): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.date !== undefined) payload.measured_on = patch.date
  if (patch.at !== undefined) payload.measured_at = new Date(patch.at).toISOString()
  if (patch.weightKg !== undefined) payload.weight_kg = patch.weightKg
  if (patch.waistCm !== undefined) payload.waist_cm = patch.waistCm ?? null
  if (patch.hipCm !== undefined) payload.hip_cm = patch.hipCm ?? null
  if (patch.armCm !== undefined) payload.arm_cm = patch.armCm ?? null
  if (patch.thighCm !== undefined) payload.thigh_cm = patch.thighCm ?? null
  if (patch.chestCm !== undefined) payload.chest_cm = patch.chestCm ?? null
  if (patch.neckCm !== undefined) payload.neck_cm = patch.neckCm ?? null
  if (patch.note !== undefined) payload.note = patch.note ?? null
  const { error } = await client().from('weigh_ins').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteWeighIn(id: string): Promise<void> {
  const { error } = await client().from('weigh_ins').delete().eq('id', id)
  if (error) throw error
}

// ---------- symptom_logs ----------

interface SymptomLogRow {
  id: string
  occurred_at: string
  symptom: SymptomLog['symptom']
  severity: SymptomLog['severity']
  note: string | null
}

function fromSymptomLogRow(r: SymptomLogRow): SymptomLog {
  return {
    id: r.id,
    at: new Date(r.occurred_at).getTime(),
    symptom: r.symptom,
    severity: r.severity,
    note: r.note ?? undefined,
  }
}

export async function listSymptomLogs(userId: string): Promise<SymptomLog[]> {
  const { data, error } = await client()
    .from('symptom_logs')
    .select('id,occurred_at,symptom,severity,note')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data as SymptomLogRow[]).map(fromSymptomLogRow)
}

export async function addSymptomLog(userId: string, row: Omit<SymptomLog, 'id'> & { id?: string }): Promise<SymptomLog> {
  const { data, error } = await client()
    .from('symptom_logs')
    .upsert({
      ...(row.id ? { id: row.id } : {}),
      user_id: userId,
      occurred_at: new Date(row.at).toISOString(),
      symptom: row.symptom,
      severity: row.severity,
      note: row.note ?? null,
    })
    .select('id,occurred_at,symptom,severity,note')
    .single()
  if (error) rethrow(error, 'write')
  return fromSymptomLogRow(data as SymptomLogRow)
}

export async function updateSymptomLog(id: string, patch: Partial<Omit<SymptomLog, 'id'>>): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.at !== undefined) payload.occurred_at = new Date(patch.at).toISOString()
  if (patch.symptom !== undefined) payload.symptom = patch.symptom
  if (patch.severity !== undefined) payload.severity = patch.severity
  if (patch.note !== undefined) payload.note = patch.note ?? null
  const { error } = await client().from('symptom_logs').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteSymptomLog(id: string): Promise<void> {
  const { error } = await client().from('symptom_logs').delete().eq('id', id)
  if (error) throw error
}

// ---------- nutrition_days ----------

interface NutritionDayRow {
  id: string
  tracked_on: string
  protein_g: number
  water_ml: number
  meals: number
  note: string | null
}

function fromNutritionDayRow(r: NutritionDayRow): NutritionDay {
  return {
    id: r.id,
    date: r.tracked_on,
    proteinG: Number(r.protein_g),
    waterMl: r.water_ml,
    meals: r.meals,
    note: r.note ?? undefined,
  }
}

const NUTRITION_COLUMNS = 'id,tracked_on,protein_g,water_ml,meals,note'

export async function listNutritionDays(userId: string): Promise<NutritionDay[]> {
  const { data, error } = await client()
    .from('nutrition_days')
    .select(NUTRITION_COLUMNS)
    .eq('user_id', userId)
    .order('tracked_on', { ascending: false })
  if (error) throw error
  return (data as NutritionDayRow[]).map(fromNutritionDayRow)
}

/** Cria ou atualiza o dia (chave unica user_id+tracked_on), aplicando o patch sobre o existente. */
export async function upsertNutritionDay(
  userId: string,
  date: string,
  patch: Partial<Omit<NutritionDay, 'id' | 'date'>>,
  existing?: NutritionDay,
): Promise<NutritionDay> {
  const merged = {
    protein_g: patch.proteinG ?? existing?.proteinG ?? 0,
    water_ml: patch.waterMl ?? existing?.waterMl ?? 0,
    meals: patch.meals ?? existing?.meals ?? 0,
    note: patch.note !== undefined ? (patch.note ?? null) : (existing?.note ?? null),
  }
  const { data, error } = await client()
    .from('nutrition_days')
    .upsert(
      { user_id: userId, tracked_on: date, ...merged },
      { onConflict: 'user_id,tracked_on' },
    )
    .select(NUTRITION_COLUMNS)
    .single()
  if (error) rethrow(error, 'write')
  return fromNutritionDayRow(data as NutritionDayRow)
}

export async function updateNutritionDay(id: string, patch: Partial<Omit<NutritionDay, 'id' | 'date'>>): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (patch.proteinG !== undefined) payload.protein_g = patch.proteinG
  if (patch.waterMl !== undefined) payload.water_ml = patch.waterMl
  if (patch.meals !== undefined) payload.meals = patch.meals
  if (patch.note !== undefined) payload.note = patch.note ?? null
  const { error } = await client().from('nutrition_days').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteNutritionDay(id: string): Promise<void> {
  const { error } = await client().from('nutrition_days').delete().eq('id', id)
  if (error) throw error
}

// ---------- backup / wipe ----------

export async function wipeAllForUser(userId: string): Promise<void> {
  const c = client()
  try {
    const results = await Promise.all([
      c.from('injections').delete().eq('user_id', userId),
      c.from('weigh_ins').delete().eq('user_id', userId),
      c.from('symptom_logs').delete().eq('user_id', userId),
      c.from('nutrition_days').delete().eq('user_id', userId),
      c.from('medication_plans').delete().eq('user_id', userId),
    ])
    const firstError = results.find((result) => result.error)?.error
    if (firstError) throw firstError
  } catch (error) {
    rethrow(error, 'write')
  }
}

const PROFILE_CLINICAL =
  'id,email,full_name,height_cm,start_weight_kg,start_date,goal_weight_kg,protein_factor,protein_manual_goal,water_goal_ml,timezone,created_at,updated_at'

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  height_cm: number | null
  start_weight_kg: number | null
  start_date: string | null
  goal_weight_kg: number | null
  protein_factor: number
  protein_manual_goal: number | null
  water_goal_ml: number
  timezone: string
  created_at: string
  updated_at: string
}

interface PlanRow {
  id: string
  medication: MedicationKey
  medication_label: string | null
  reminder_weekday: number | null
  reminder_time: string
  reminder_start_date: string
  current_phase_index: number
}

interface PhaseRow {
  id: string
  position: number
  dose_mg: number
  weeks: number
  label: string | null
}

function asTime(value: string): string {
  return value.slice(0, 5)
}

export async function loadAccountSettings(userId: string): Promise<Settings | null> {
  try {
    const { data: profile, error: profileError } = await client()
      .from('profiles')
      .select(PROFILE_CLINICAL)
      .eq('id', userId)
      .single()
    if (profileError) throw profileError
    const row = profile as ProfileRow
    if (!row.height_cm || !row.start_weight_kg || !row.start_date || !row.goal_weight_kg) return null

    const { data: plan, error: planError } = await client()
      .from('medication_plans')
      .select('id,medication,medication_label,reminder_weekday,reminder_time,reminder_start_date,current_phase_index')
      .eq('user_id', userId)
      .maybeSingle()
    if (planError) throw planError
    if (!plan) return null
    const planRow = plan as PlanRow

    const { data: phases, error: phaseError } = await client()
      .from('titration_phases')
      .select('id,position,dose_mg,weeks,label')
      .eq('plan_id', planRow.id)
      .order('position', { ascending: true })
    if (phaseError) throw phaseError

    return {
      id: 'singleton',
      planId: planRow.id,
      createdAt: new Date(row.created_at).getTime(),
      onboardedAt: new Date(row.updated_at).getTime(),
      heightCm: Number(row.height_cm),
      startWeightKg: Number(row.start_weight_kg),
      startDate: row.start_date,
      goalWeightKg: Number(row.goal_weight_kg),
      medication: planRow.medication,
      medicationLabel: planRow.medication_label ?? '',
      proteinFactor: Number(row.protein_factor),
      proteinManualGoal: row.protein_manual_goal === null ? null : Number(row.protein_manual_goal),
      waterGoalMl: row.water_goal_ml,
      reminderWeekday: planRow.reminder_weekday ?? 0,
      reminderTime: asTime(planRow.reminder_time),
      reminderStartDate: planRow.reminder_start_date,
      phases: ((phases ?? []) as PhaseRow[]).map((phase) => ({
        id: phase.id,
        doseMg: Number(phase.dose_mg),
        weeks: phase.weeks,
        label: phase.label ?? undefined,
      })),
      currentPhaseIndex: planRow.current_phase_index,
      lastExportAt: null,
    }
  } catch (error) {
    rethrow(error, 'read')
  }
}

export async function saveAccountSettings(userId: string, settings: Settings): Promise<Settings> {
  try {
    const planId = settings.planId && settings.planId.length > 0 ? asUuid(settings.planId) : crypto.randomUUID()
    const phases: TitrationPhase[] = settings.phases.map((phase) => ({
      ...phase,
      id: asUuid(phase.id),
    }))

    const { error: profileError } = await client()
      .from('profiles')
      .update({
        height_cm: settings.heightCm,
        start_weight_kg: settings.startWeightKg,
        start_date: settings.startDate,
        goal_weight_kg: settings.goalWeightKg,
        protein_factor: settings.proteinFactor,
        protein_manual_goal: settings.proteinManualGoal,
        water_goal_ml: settings.waterGoalMl,
      })
      .eq('id', userId)
    if (profileError) throw profileError

    const { error: planError } = await client()
      .from('medication_plans')
      .upsert({
        id: planId,
        user_id: userId,
        medication: settings.medication,
        medication_label: settings.medicationLabel || null,
        reminder_weekday: settings.reminderWeekday,
        reminder_time: settings.reminderTime,
        reminder_start_date: settings.reminderStartDate,
        current_phase_index: settings.currentPhaseIndex,
      })
    if (planError) throw planError

    const { data: existing, error: existingError } = await client()
      .from('titration_phases')
      .select('id')
      .eq('plan_id', planId)
    if (existingError) throw existingError
    const keep = new Set(phases.map((phase) => phase.id))
    const stale = ((existing ?? []) as { id: string }[]).filter((row) => !keep.has(row.id)).map((row) => row.id)
    if (stale.length) {
      const { error: deleteError } = await client().from('titration_phases').delete().in('id', stale)
      if (deleteError) throw deleteError
    }

    if (phases.length) {
      const { error: phaseError } = await client()
        .from('titration_phases')
        .upsert(
          phases.map((phase, position) => ({
            id: phase.id,
            user_id: userId,
            plan_id: planId,
            position,
            dose_mg: phase.doseMg,
            weeks: phase.weeks,
            label: phase.label ?? null,
          })),
        )
      if (phaseError) throw phaseError
    }

    return { ...settings, planId, phases }
  } catch (error) {
    rethrow(error, 'write')
  }
}

export async function listAdminDirectory(): Promise<AccessProfile[]> {
  const { data, error } = await client()
    .from('admin_directory')
    .select('id,email,full_name,blocked,is_admin,created_at,updated_at')
    .order('created_at', { ascending: false })
  if (error) rethrow(error, 'read')
  return (data ?? []) as AccessProfile[]
}

export async function setUserBlocked(targetUserId: string, isBlocked: boolean): Promise<void> {
  const { error } = await client().rpc('admin_set_user_blocked', {
    target_user_id: targetUserId,
    is_blocked: isBlocked,
  })
  if (error) rethrow(error, 'write')
}

export async function deleteOwnAccount(): Promise<void> {
  const { error } = await client().rpc('delete_own_account')
  if (error) rethrow(error, 'write')
}
