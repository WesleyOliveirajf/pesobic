begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
    'usuario-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated',
    'usuario-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
    'blocked@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated',
    'admin@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated',
    'encerrar@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

update public.profiles
set start_weight_kg = 90, height_cm = 170
where id = '11111111-1111-4111-8111-111111111111';

update public.profiles
set blocked = true
where id = '33333333-3333-4333-8333-333333333333';

update public.profiles
set is_admin = true
where id = '44444444-4444-4444-8444-444444444444';

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$insert into public.injections (
      user_id, occurred_at, medication, dose_mg, site, status
    ) values (
      '11111111-1111-4111-8111-111111111111', now(), 'semaglutida', 0.25, 'abdomen_esq', 'aplicada'
    )$$,
  'signup writes injection without access flag'
);

select lives_ok(
  $$update public.profiles
    set height_cm = 172
    where id = '11111111-1111-4111-8111-111111111111'$$,
  'owner updates height_cm'
);

select throws_ok(
  $$update public.profiles
    set is_admin = true
    where id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  null,
  'owner cannot set is_admin'
);

select results_eq(
  $$select start_weight_kg from public.profiles
    where id = '22222222-2222-4222-8222-222222222222'$$,
  $$select start_weight_kg from public.profiles where false$$,
  'A cannot select B clinical profile'
);

select results_eq(
  $$select count(*)::bigint from public.admin_directory$$,
  array[0::bigint],
  'non-admin sees empty admin_directory'
);

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select throws_ok(
  $$insert into public.injections (
      user_id, occurred_at, medication, dose_mg, site, status
    ) values (
      '33333333-3333-4333-8333-333333333333', now(), 'semaglutida', 0.25, 'abdomen_esq', 'aplicada'
    )$$,
  '42501',
  null,
  'blocked cannot write clinical'
);

select results_eq(
  $$select blocked from public.profiles
    where id = '33333333-3333-4333-8333-333333333333'$$,
  array[true],
  'blocked still reads own profile flag'
);

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';

select results_eq(
  $$select count(*)::bigint from public.admin_directory$$,
  array[5::bigint],
  'admin lists every account row'
);

select results_eq(
  $$select start_weight_kg from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'$$,
  $$select start_weight_kg from public.profiles where false$$,
  'admin cannot select another user clinical profile'
);

select lives_ok(
  $$select public.admin_set_user_blocked('11111111-1111-4111-8111-111111111111', true)$$,
  'admin can block A'
);

select throws_ok(
  $$select public.admin_set_user_blocked('44444444-4444-4444-8444-444444444444', true)$$,
  'P0001',
  'O administrador nao pode bloquear a propria conta',
  'admin cannot block self'
);

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select throws_ok(
  $$insert into public.injections (
      user_id, occurred_at, medication, dose_mg, site, status
    ) values (
      '11111111-1111-4111-8111-111111111111', now(), 'semaglutida', 0.5, 'abdomen_dir', 'aplicada'
    )$$,
  '42501',
  null,
  'blocked A cannot write after admin block'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select lives_ok(
  $$insert into public.injections (
      user_id, occurred_at, medication, dose_mg, site, status
    ) values (
      '22222222-2222-4222-8222-222222222222', now(), 'semaglutida', 0.25, 'coxa_esq', 'aplicada'
    )$$,
  'B still writes after A is blocked'
);

set local request.jwt.claim.sub = '55555555-5555-4555-8555-555555555555';

select lives_ok(
  $$select public.delete_own_account()$$,
  'user can delete own account'
);

reset role;

select is(
  (select count(*)::integer from auth.users where id = '55555555-5555-4555-8555-555555555555'),
  0,
  'deleted account leaves auth'
);

select is(
  (select count(*)::integer from auth.users where id = '22222222-2222-4222-8222-222222222222'),
  1,
  'deleting A-like account does not touch B'
);

select * from finish();
rollback;
