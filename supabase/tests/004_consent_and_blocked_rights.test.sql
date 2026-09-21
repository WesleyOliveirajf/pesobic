begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
    'aceite@example.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Aceite","legal_version":"2026-09-16","terms_accepted":true,"privacy_accepted":true,"health_data_consent":true,"age_confirmed":true,"is_admin":true,"blocked":false}',
    now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
    'sem-metadata@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
    'bloqueado@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

-- signup com metadata deixa prova; metadata nunca vira privilegio
select results_eq(
  $$select legal_version, health_data_consent_at is not null, terms_accepted_at is not null,
           privacy_accepted_at is not null, age_confirmed_at is not null
    from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  $$values ('2026-09-16'::text, true, true, true, true)$$,
  'signup with consent metadata records version and timestamps'
);

select results_eq(
  $$select is_admin, blocked from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  $$values (false, false)$$,
  'signup metadata does not grant is_admin'
);

select results_eq(
  $$select legal_version is null, health_data_consent_at is null, terms_accepted_at is null
    from public.profiles where id = '22222222-2222-4222-8222-222222222222'$$,
  $$values (true, true, true)$$,
  'signup without metadata does not fabricate consent'
);

select hasnt_column('public', 'admin_directory', 'health_data_consent_at', 'admin_directory hides consent timestamps');
select hasnt_column('public', 'admin_directory', 'legal_version', 'admin_directory hides legal_version');

-- dados clinicos do bloqueado (inseridos como superuser)
update public.profiles
set blocked = true, nutrition_enabled = true
where id = '33333333-3333-4333-8333-333333333333';

insert into public.weigh_ins (user_id, measured_on, weight_kg)
values ('33333333-3333-4333-8333-333333333333', '2026-09-01', 90);
insert into public.nutrition_days (user_id, tracked_on, protein_g)
values ('33333333-3333-4333-8333-333333333333', '2026-09-01', 100);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select throws_ok(
  $$update public.profiles set health_data_consent_at = null
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot rewrite consent timestamp'
);

select throws_ok(
  $$update public.profiles set legal_version = 'x'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot rewrite legal_version'
);

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select results_eq(
  $$select count(*)::bigint from public.weigh_ins$$,
  array[1::bigint],
  'blocked reads own clinical row'
);

select results_eq(
  $$select count(*)::bigint from public.nutrition_days$$,
  array[1::bigint],
  'blocked with nutrition flag reads own nutrition row'
);

select throws_ok(
  $$insert into public.weigh_ins (user_id, measured_on, weight_kg)
    values ('33333333-3333-4333-8333-333333333333', '2026-09-02', 89)$$,
  '42501',
  null,
  'blocked cannot insert clinical'
);

select throws_ok(
  $$insert into public.nutrition_days (user_id, tracked_on, protein_g)
    values ('33333333-3333-4333-8333-333333333333', '2026-09-02', 90)$$,
  '42501',
  null,
  'blocked cannot write nutrition'
);

select lives_ok(
  $$select public.delete_own_account()$$,
  'blocked can close own account'
);

select * from finish();
rollback;
