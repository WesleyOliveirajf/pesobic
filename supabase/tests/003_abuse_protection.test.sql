begin;

select plan(12);

-- ================================================
-- Testes para a migration de proteção contra abuso
-- ================================================

-- 1. Verificar que a tabela admin_audit_log existe
select has_table('public', 'admin_audit_log', 'Tabela admin_audit_log deve existir');

-- 2. Verificar que admin_audit_log tem RLS habilitado
select policies_are(
  'public', 'admin_audit_log',
  array['admin_audit_log_select_admin'],
  'admin_audit_log deve ter politica de select somente para admin'
);

-- 3. Verificar que a tabela signup_rate_limit existe no schema privado
select has_table('private', 'signup_rate_limit', 'Tabela signup_rate_limit deve existir no schema private');

-- 4. Verificar que a função check_signup_rate_limit existe
select has_function(
  'private', 'check_signup_rate_limit', array['text'],
  'Funcao check_signup_rate_limit deve existir'
);

-- 5. Verificar que o trigger protect_admin_flag existe em profiles
select has_trigger(
  'public', 'profiles', 'profiles_protect_admin_flag',
  'Trigger de protecao do campo is_admin deve existir'
);

-- 6. Verificar que o trigger protect_admin_delete existe em profiles
select has_trigger(
  'public', 'profiles', 'profiles_protect_admin_delete',
  'Trigger de protecao contra exclusao de admin deve existir'
);

-- 7. Verificar que os triggers de limite de entidade existem
select has_trigger(
  'public', 'injections', 'injections_entity_limit',
  'Trigger de limite de entidade em injections deve existir'
);

select has_trigger(
  'public', 'weigh_ins', 'weigh_ins_entity_limit',
  'Trigger de limite de entidade em weigh_ins deve existir'
);

select has_trigger(
  'public', 'symptom_logs', 'symptom_logs_entity_limit',
  'Trigger de limite de entidade em symptom_logs deve existir'
);

select has_trigger(
  'public', 'nutrition_days', 'nutrition_days_entity_limit',
  'Trigger de limite de entidade em nutrition_days deve existir'
);

select has_trigger(
  'public', 'progress_photos', 'progress_photos_entity_limit',
  'Trigger de limite de entidade em progress_photos deve existir'
);

-- 8. Verificar que profiles tem política de update own
select policies_are(
  'public', 'profiles',
  array['profiles_select_own_or_admin', 'profiles_update_own'],
  'profiles deve ter politicas de select (own/admin) e update (own)'
);

select * from finish();
rollback;
