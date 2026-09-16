-- Migration: proteção contra abuso
-- Adiciona rate limiting, registro de ações admin, e proteção contra cadastro abusivo.

-- ================================================
-- 1. Tabela de log de ações administrativas
-- ================================================
-- Registra cada ação de liberação/bloqueio de acesso feita pelo admin.
-- Não contém dados sensíveis do usuário (sem peso, dose, sintomas).

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('access_enabled', 'access_disabled')),
  created_at timestamptz not null default now()
);

create index admin_audit_log_admin_idx on public.admin_audit_log (admin_id, created_at desc);
create index admin_audit_log_target_idx on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

-- Somente admins podem ler o log de auditoria
create policy "admin_audit_log_select_admin"
on public.admin_audit_log for select to authenticated
using ((select private.is_admin()));

-- Apenas a função admin_set_user_access deve inserir (via security definer)
revoke all on table public.admin_audit_log from anon, authenticated;
grant select on table public.admin_audit_log to authenticated;

-- ================================================
-- 2. Rate limiting no cadastro (proteção contra abuso)
-- ================================================
-- Tabela para rastrear tentativas de cadastro por IP/email.
-- Mantida no schema privado para não ser exposta via API.

create table private.signup_rate_limit (
  id bigint generated always as identity primary key,
  email_hash text not null,
  attempted_at timestamptz not null default now()
);

create index signup_rate_limit_email_hash_idx
on private.signup_rate_limit (email_hash, attempted_at desc);

revoke all on table private.signup_rate_limit from public, anon, authenticated;

-- ================================================
-- 3. Função para verificar rate limit de cadastro
-- ================================================
-- Limite: máximo 5 tentativas de cadastro por hash de email em 1 hora.

create or replace function private.check_signup_rate_limit(p_email_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
begin
  -- Limpar registros antigos (mais de 1 hora)
  delete from private.signup_rate_limit
  where attempted_at < now() - interval '1 hour';

  -- Contar tentativas recentes
  select count(*) into attempt_count
  from private.signup_rate_limit
  where email_hash = p_email_hash
    and attempted_at > now() - interval '1 hour';

  -- Se excedeu o limite, retorna false
  if attempt_count >= 5 then
    return false;
  end if;

  -- Registrar a tentativa
  insert into private.signup_rate_limit (email_hash, attempted_at)
  values (p_email_hash, now());

  return true;
end;
$$;

revoke all on function private.check_signup_rate_limit(text) from public, anon, authenticated;

-- ================================================
-- 4. Atualizar admin_set_user_access para registrar auditoria
-- ================================================

create or replace function public.admin_set_user_access(target_user_id uuid, enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_admin_id uuid;
  action_name text;
begin
  if not private.is_admin() then
    raise exception 'Acesso restrito ao administrador';
  end if;

  current_admin_id := (select auth.uid());

  if target_user_id = current_admin_id then
    raise exception 'O administrador nao pode bloquear o proprio acesso';
  end if;

  update public.profiles
  set access_enabled = enabled, updated_at = now()
  where id = target_user_id and is_admin = false;

  -- Registrar a ação no log de auditoria
  action_name := case when enabled then 'access_enabled' else 'access_disabled' end;
  insert into public.admin_audit_log (admin_id, target_user_id, action)
  values (current_admin_id, target_user_id, action_name);
end;
$$;

-- ================================================
-- 5. Proteção contra alterações no campo is_admin
-- ================================================
-- Trigger que impede qualquer alteração no campo is_admin via UPDATE direto.

create or replace function private.protect_admin_flag()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_admin is distinct from new.is_admin then
    raise exception 'O campo is_admin nao pode ser alterado diretamente';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_admin_flag
before update on public.profiles
for each row execute function private.protect_admin_flag();

revoke all on function private.protect_admin_flag() from public, anon, authenticated;

-- ================================================
-- 6. Proteção contra exclusão de perfil admin
-- ================================================
-- Trigger que impede a exclusão do perfil de um admin via DELETE direto.

create or replace function private.protect_admin_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_admin then
    raise exception 'O perfil de um administrador nao pode ser excluido diretamente';
  end if;
  return old;
end;
$$;

create trigger profiles_protect_admin_delete
before delete on public.profiles
for each row execute function private.protect_admin_delete();

revoke all on function private.protect_admin_delete() from public, anon, authenticated;

-- ================================================
-- 7. Limite de registros por usuário (proteção contra abuso de dados)
-- ================================================
-- Limita o número de registros por tabela para evitar abuso de armazenamento.

create or replace function private.check_entity_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  row_count integer;
  max_rows integer := 10000;
begin
  execute format(
    'select count(*) from %I.%I where user_id = $1',
    tg_table_schema, tg_table_name
  ) into row_count using new.user_id;

  if row_count >= max_rows then
    raise exception 'Limite de registros atingido para esta entidade (max: %)', max_rows;
  end if;

  return new;
end;
$$;

revoke all on function private.check_entity_limit() from public, anon, authenticated;

-- Aplicar o limite em todas as tabelas de dados do usuário
create trigger injections_entity_limit
before insert on public.injections
for each row execute function private.check_entity_limit();

create trigger weigh_ins_entity_limit
before insert on public.weigh_ins
for each row execute function private.check_entity_limit();

create trigger symptom_logs_entity_limit
before insert on public.symptom_logs
for each row execute function private.check_entity_limit();

create trigger nutrition_days_entity_limit
before insert on public.nutrition_days
for each row execute function private.check_entity_limit();

create trigger progress_photos_entity_limit
before insert on public.progress_photos
for each row execute function private.check_entity_limit();

-- ================================================
-- 8. Conceder UPDATE e DELETE ao profiles (apenas own, via RLS)
-- ================================================
-- O perfil precisa de UPDATE para que o usuário possa editar seus dados.
-- A política RLS garante que só acessa o próprio registro.

grant update on table public.profiles to authenticated;

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
