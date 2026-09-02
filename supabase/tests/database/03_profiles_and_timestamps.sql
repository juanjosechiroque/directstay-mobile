-- Profiles lifecycle and updated_at maintenance:
--   * inserting an auth.users row auto-creates its profile (on_auth_user_created)
--   * updating display_name or phone advances updated_at to now()
--   * the trigger leaves created_at alone
--   * a client (role authenticated) cannot write id / created_at / updated_at directly
-- Runs inside a transaction and ends with rollback.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select * from no_plan();

-- ---- profile is auto-created for a new auth user ----
insert into auth.users (id, email)
values ('b0000000-0000-0000-0000-000000000001', 'profile-user-1@example.test');

select is(
  (select count(*)::int from public.profiles where id = 'b0000000-0000-0000-0000-000000000001'),
  1,
  'inserting an auth.users row auto-creates the matching profile');

select is(
  (select display_name from public.profiles where id = 'b0000000-0000-0000-0000-000000000001'),
  null,
  'the auto-created profile starts with a null display_name');

-- ---- updating display_name advances updated_at ----
-- Backdate created_at/updated_at without firing triggers (replica role skips them),
-- so the later real UPDATE is observably moving updated_at forward.
set local session_replication_role = replica;
update public.profiles
   set created_at = timestamptz '2000-01-01 00:00:00+00',
       updated_at = timestamptz '2000-01-01 00:00:00+00'
 where id = 'b0000000-0000-0000-0000-000000000001';
set local session_replication_role = origin;

update public.profiles set display_name = 'Nombre Uno'
 where id = 'b0000000-0000-0000-0000-000000000001';

select is(
  (select updated_at from public.profiles where id = 'b0000000-0000-0000-0000-000000000001'),
  now(),
  'updating display_name sets updated_at to now() (transaction time)');
select cmp_ok(
  (select updated_at from public.profiles where id = 'b0000000-0000-0000-0000-000000000001'),
  '>', timestamptz '2000-01-01 00:00:00+00',
  'updated_at moved forward after the display_name update');
select is(
  (select created_at from public.profiles where id = 'b0000000-0000-0000-0000-000000000001'),
  timestamptz '2000-01-01 00:00:00+00',
  'the trigger does not touch created_at');

-- ---- updating phone advances updated_at too ----
set local session_replication_role = replica;
update public.profiles set updated_at = timestamptz '2000-01-01 00:00:00+00'
 where id = 'b0000000-0000-0000-0000-000000000001';
set local session_replication_role = origin;

update public.profiles set phone = '+51 999 000 111'
 where id = 'b0000000-0000-0000-0000-000000000001';

select cmp_ok(
  (select updated_at from public.profiles where id = 'b0000000-0000-0000-0000-000000000001'),
  '>', timestamptz '2000-01-01 00:00:00+00',
  'updating phone also advances updated_at');

-- ---- a client can only write display_name / phone on its own row ----
set local role authenticated;
set local request.jwt.claims to '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}';

select throws_ok($$
  update public.profiles set updated_at = now() where id = 'b0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'authenticated cannot write profiles.updated_at directly');
select throws_ok($$
  update public.profiles set created_at = now() where id = 'b0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'authenticated cannot write profiles.created_at directly');
select throws_ok($$
  update public.profiles set id = gen_random_uuid() where id = 'b0000000-0000-0000-0000-000000000001'
$$, '42501', null, 'authenticated cannot write profiles.id directly');
select lives_ok($$
  update public.profiles set display_name = 'Editado', phone = '+51 111 222 333'
   where id = 'b0000000-0000-0000-0000-000000000001'
$$, 'authenticated can update display_name and phone on its own row');

reset role;

select * from finish();
rollback;
