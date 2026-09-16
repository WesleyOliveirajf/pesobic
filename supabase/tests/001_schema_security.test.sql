begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select has_table('public', 'profiles', 'profiles exists');
select has_column('public', 'profiles', 'nutrition_enabled', 'profiles controls nutrition access');
select has_table('public', 'medication_plans', 'medication_plans exists');
select has_table('public', 'titration_phases', 'titration_phases exists');
select has_table('public', 'injections', 'injections exists');
select has_table('public', 'weigh_ins', 'weigh_ins exists');
select has_table('public', 'symptom_logs', 'symptom_logs exists');
select has_table('public', 'nutrition_days', 'nutrition_days exists');
select has_table('public', 'progress_photos', 'progress_photos exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS enabled on profiles'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.medication_plans'::regclass),
  'RLS enabled on medication_plans'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.titration_phases'::regclass),
  'RLS enabled on titration_phases'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.injections'::regclass),
  'RLS enabled on injections'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.weigh_ins'::regclass),
  'RLS enabled on weigh_ins'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.symptom_logs'::regclass),
  'RLS enabled on symptom_logs'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.nutrition_days'::regclass),
  'RLS enabled on nutrition_days'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.progress_photos'::regclass),
  'RLS enabled on progress_photos'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'profiles'),
  2,
  'profiles exposes only own profile and the admin listing'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'medication_plans'),
  4,
  'medication_plans has one policy per operation'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'titration_phases'),
  4,
  'titration_phases has one policy per operation'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'injections'),
  4,
  'injections has one policy per operation'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'weigh_ins'),
  4,
  'weigh_ins has one policy per operation'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'symptom_logs'),
  4,
  'symptom_logs has one policy per operation'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'nutrition_days'),
  4,
  'nutrition_days has one policy per operation'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'progress_photos'),
  4,
  'progress_photos has one policy per operation'
);

select has_index('public', 'titration_phases', 'titration_phases_user_id_idx');
select has_index('public', 'injections', 'injections_user_id_occurred_at_idx');
select has_index('public', 'weigh_ins', 'weigh_ins_user_id_measured_on_idx');
select has_index('public', 'symptom_logs', 'symptom_logs_user_id_occurred_at_idx');

select * from finish();
rollback;
