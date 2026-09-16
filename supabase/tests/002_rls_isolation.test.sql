begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

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
  );

update public.profiles
set access_enabled = true;

insert into public.weigh_ins (id, user_id, measured_on, weight_kg) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '2026-09-01', 95),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', '2026-09-01', 85);

insert into public.nutrition_days (id, user_id, tracked_on, protein_g) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111', '2026-09-01', 100);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[1::bigint],
  'user A sees only own profile'
);

select results_eq(
  $$select count(*)::bigint from public.weigh_ins$$,
  array[1::bigint],
  'user A sees only own weigh-ins'
);

select results_eq(
  $$select count(*)::bigint from public.nutrition_days$$,
  array[0::bigint],
  'user A cannot read nutrition before the feature is enabled'
);

select throws_ok(
  $$insert into public.nutrition_days (user_id, tracked_on, protein_g)
    values ('11111111-1111-4111-8111-111111111111', '2026-09-02', 90)$$,
  '42501',
  null,
  'user A cannot write nutrition before the feature is enabled'
);

select lives_ok(
  $$insert into public.weigh_ins (user_id, measured_on, weight_kg)
    values ('11111111-1111-4111-8111-111111111111', '2026-09-02', 94.5)$$,
  'user A inserts own weigh-in'
);

select throws_ok(
  $$insert into public.weigh_ins (user_id, measured_on, weight_kg)
    values ('22222222-2222-4222-8222-222222222222', '2026-09-02', 84.5)$$,
  '42501',
  null,
  'user A cannot insert for user B'
);

select results_eq(
  $$update public.weigh_ins set weight_kg = 1
    where user_id = '22222222-2222-4222-8222-222222222222' returning id$$,
  $$select id from public.weigh_ins where false$$,
  'user A cannot update user B row'
);

select throws_ok(
  $$update public.weigh_ins
    set user_id = '22222222-2222-4222-8222-222222222222'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'user A cannot transfer ownership to user B'
);

select results_eq(
  $$delete from public.weigh_ins
    where user_id = '22222222-2222-4222-8222-222222222222' returning id$$,
  $$select id from public.weigh_ins where false$$,
  'user A cannot delete user B row'
);

select lives_ok(
  $$update public.weigh_ins set weight_kg = 94
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'user A updates own row'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[1::bigint],
  'user B sees only own profile'
);

select results_eq(
  $$select count(*)::bigint from public.weigh_ins$$,
  array[1::bigint],
  'user B sees only own weigh-ins'
);

reset role;
update public.profiles set is_admin = true where id = '11111111-1111-4111-8111-111111111111';
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$select public.admin_set_user_nutrition_access('22222222-2222-4222-8222-222222222222', true)$$,
  'admin can enable nutrition for user B'
);

select is(
  (select nutrition_enabled from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  true,
  'admin feature grant is persisted'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select lives_ok(
  $$insert into public.nutrition_days (user_id, tracked_on, protein_g)
    values ('22222222-2222-4222-8222-222222222222', '2026-09-02', 90)$$,
  'user B can write nutrition after the admin enables it'
);

reset role;
set local role anon;
set local request.jwt.claim.role = 'anon';
set local request.jwt.claim.sub = '';

select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  null,
  'anonymous cannot select profiles'
);

select throws_ok(
  $$insert into public.weigh_ins (
      user_id, measured_on, weight_kg
    ) values (
      '11111111-1111-4111-8111-111111111111', '2026-09-03', 93
    )$$,
  '42501',
  null,
  'anonymous cannot insert weigh-ins'
);

select * from finish();
rollback;
