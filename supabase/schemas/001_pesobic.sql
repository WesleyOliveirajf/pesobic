create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (full_name is null or char_length(full_name) <= 160),
  blocked boolean not null default false,
  is_admin boolean not null default false,
  height_cm numeric(5, 2) check (height_cm between 50 and 300),
  start_weight_kg numeric(6, 2) check (start_weight_kg between 20 and 500),
  start_date date,
  goal_weight_kg numeric(6, 2) check (goal_weight_kg between 20 and 500),
  protein_factor numeric(3, 2) not null default 1.2 check (protein_factor between 0.1 and 5),
  protein_manual_goal numeric(6, 2) check (protein_manual_goal between 1 and 1000),
  water_goal_ml integer not null default 2000 check (water_goal_ml between 100 and 20000),
  timezone text not null default 'America/Sao_Paulo' check (char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;

create or replace function private.is_not_blocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and blocked = false
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Primeiro admin (out-of-band, local/homologacao). NAO rodar no remoto sem ordem no chat:
--   update public.profiles set is_admin = true where id = '<uuid-do-operador>';

create or replace function public.admin_set_user_blocked(target_user_id uuid, is_blocked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'O administrador nao pode bloquear a propria conta';
  end if;

  update public.profiles
  set blocked = is_blocked, updated_at = now()
  where id = target_user_id and is_admin = false;
end;
$$;

create or replace function private.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Nao autenticado';
  end if;
  delete from auth.users where id = uid;
end;
$$;

create or replace function public.delete_own_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_own_account();
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_not_blocked() from public, anon;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.delete_own_account() from public, anon, authenticated;
revoke all on function public.admin_set_user_blocked(uuid, boolean) from public, anon;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_not_blocked() to authenticated;
grant execute on function private.delete_own_account() to authenticated;
grant execute on function public.admin_set_user_blocked(uuid, boolean) to authenticated;
grant execute on function public.delete_own_account() to authenticated;
grant usage on schema private to authenticated;

create table public.medication_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication text not null check (medication in ('semaglutida', 'tirzepatida', 'liraglutida', 'outro')),
  medication_label text check (medication_label is null or char_length(medication_label) <= 120),
  reminder_weekday smallint check (reminder_weekday between 0 and 6),
  reminder_time time not null,
  reminder_start_date date not null,
  current_phase_index integer not null default 0 check (current_phase_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (id, user_id)
);

create table public.titration_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null,
  position integer not null check (position >= 0),
  dose_mg numeric(7, 3) not null check (dose_mg between 0 and 1000),
  weeks integer not null check (weeks between 0 and 520),
  label text check (label is null or char_length(label) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plan_id, user_id)
    references public.medication_plans (id, user_id)
    on delete cascade,
  unique (plan_id, position)
);

create table public.injections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null,
  medication text not null check (medication in ('semaglutida', 'tirzepatida', 'liraglutida', 'outro')),
  dose_mg numeric(7, 3) not null check (dose_mg between 0 and 1000),
  site text not null check (
    site in ('abdomen_esq', 'abdomen_dir', 'coxa_esq', 'coxa_dir', 'braco_esq', 'braco_dir')
  ),
  status text not null check (status in ('aplicada', 'pulada')),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6, 2) not null check (weight_kg between 20 and 500),
  waist_cm numeric(6, 2) check (waist_cm between 10 and 400),
  hip_cm numeric(6, 2) check (hip_cm between 10 and 400),
  arm_cm numeric(6, 2) check (arm_cm between 5 and 200),
  thigh_cm numeric(6, 2) check (thigh_cm between 5 and 250),
  chest_cm numeric(6, 2) check (chest_cm between 10 and 400),
  neck_cm numeric(6, 2) check (neck_cm between 5 and 200),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.symptom_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_at timestamptz not null,
  symptom text not null check (
    symptom in (
      'nausea', 'vomito', 'constipacao', 'diarreia', 'azia', 'dor_abdominal',
      'fadiga', 'dor_cabeca', 'tontura', 'arrotos', 'apetite'
    )
  ),
  severity smallint not null check (severity between 0 and 3),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrition_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tracked_on date not null,
  protein_g numeric(7, 2) not null default 0 check (protein_g between 0 and 5000),
  water_ml integer not null default 0 check (water_ml between 0 and 50000),
  meals integer not null default 0 check (meals between 0 and 100),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tracked_on)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  taken_on date not null,
  storage_path text not null check (char_length(storage_path) between 1 and 500),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_path),
  check (storage_path like user_id::text || '/%')
);

create view public.admin_directory
with (security_invoker = false, security_barrier = true) as
select id, email, full_name, blocked, is_admin, created_at, updated_at
from public.profiles
where (select private.is_admin());

create index titration_phases_user_id_idx on public.titration_phases (user_id);
create index titration_phases_plan_id_user_id_idx on public.titration_phases (plan_id, user_id);
create index injections_user_id_occurred_at_idx on public.injections (user_id, occurred_at desc);
create index weigh_ins_user_id_measured_on_idx on public.weigh_ins (user_id, measured_on desc);
create index symptom_logs_user_id_occurred_at_idx on public.symptom_logs (user_id, occurred_at desc);
create index progress_photos_user_id_taken_on_idx on public.progress_photos (user_id, taken_on desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger medication_plans_set_updated_at
before update on public.medication_plans
for each row execute function private.set_updated_at();

create trigger titration_phases_set_updated_at
before update on public.titration_phases
for each row execute function private.set_updated_at();

create trigger injections_set_updated_at
before update on public.injections
for each row execute function private.set_updated_at();

create trigger weigh_ins_set_updated_at
before update on public.weigh_ins
for each row execute function private.set_updated_at();

create trigger symptom_logs_set_updated_at
before update on public.symptom_logs
for each row execute function private.set_updated_at();

create trigger nutrition_days_set_updated_at
before update on public.nutrition_days
for each row execute function private.set_updated_at();

create trigger progress_photos_set_updated_at
before update on public.progress_photos
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.medication_plans enable row level security;
alter table public.titration_phases enable row level security;
alter table public.injections enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.symptom_logs enable row level security;
alter table public.nutrition_days enable row level security;
alter table public.progress_photos enable row level security;

revoke all on table
  public.profiles,
  public.medication_plans,
  public.titration_phases,
  public.injections,
  public.weigh_ins,
  public.symptom_logs,
  public.nutrition_days,
  public.progress_photos
from anon, authenticated;

revoke all on public.admin_directory from public, anon, authenticated;

grant select, insert, update, delete on table
  public.medication_plans,
  public.titration_phases,
  public.injections,
  public.weigh_ins,
  public.symptom_logs,
  public.nutrition_days,
  public.progress_photos
to authenticated;

grant select on table public.profiles to authenticated;
grant update (
  full_name,
  height_cm,
  start_weight_kg,
  start_date,
  goal_weight_kg,
  protein_factor,
  protein_manual_goal,
  water_goal_ml,
  timezone
) on table public.profiles to authenticated;
grant select on public.admin_directory to authenticated;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id and (select private.is_not_blocked()))
with check ((select auth.uid()) = id and (select private.is_not_blocked()));

create policy "medication_plans_select_own"
on public.medication_plans for select to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "medication_plans_insert_own"
on public.medication_plans for insert to authenticated
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "medication_plans_update_own"
on public.medication_plans for update to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id)
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "medication_plans_delete_own"
on public.medication_plans for delete to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "titration_phases_select_own"
on public.titration_phases for select to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "titration_phases_insert_own"
on public.titration_phases for insert to authenticated
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "titration_phases_update_own"
on public.titration_phases for update to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id)
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "titration_phases_delete_own"
on public.titration_phases for delete to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "injections_select_own"
on public.injections for select to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "injections_insert_own"
on public.injections for insert to authenticated
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "injections_update_own"
on public.injections for update to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id)
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "injections_delete_own"
on public.injections for delete to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "weigh_ins_select_own"
on public.weigh_ins for select to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "weigh_ins_insert_own"
on public.weigh_ins for insert to authenticated
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "weigh_ins_update_own"
on public.weigh_ins for update to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id)
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "weigh_ins_delete_own"
on public.weigh_ins for delete to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "symptom_logs_select_own"
on public.symptom_logs for select to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "symptom_logs_insert_own"
on public.symptom_logs for insert to authenticated
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "symptom_logs_update_own"
on public.symptom_logs for update to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id)
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "symptom_logs_delete_own"
on public.symptom_logs for delete to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "nutrition_days_select_own"
on public.nutrition_days for select to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "nutrition_days_insert_own"
on public.nutrition_days for insert to authenticated
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "nutrition_days_update_own"
on public.nutrition_days for update to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id)
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "nutrition_days_delete_own"
on public.nutrition_days for delete to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "progress_photos_select_own"
on public.progress_photos for select to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "progress_photos_insert_own"
on public.progress_photos for insert to authenticated
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "progress_photos_update_own"
on public.progress_photos for update to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id)
with check ((select private.is_not_blocked()) and (select auth.uid()) = user_id);

create policy "progress_photos_delete_own"
on public.progress_photos for delete to authenticated
using ((select private.is_not_blocked()) and (select auth.uid()) = user_id);
