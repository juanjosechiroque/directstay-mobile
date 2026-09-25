#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:55322/postgres}"
unit_id="33333333-3333-3333-3333-333333333303"
guest_a="a9000000-0000-0000-0000-000000000001"
guest_b="a9000000-0000-0000-0000-000000000002"
tmp="$(mktemp -d)"
pid_a=""
pid_b=""
cleanup() {
  [[ -n "$pid_a" ]] && kill "$pid_a" 2>/dev/null || true
  [[ -n "$pid_b" ]] && kill "$pid_b" 2>/dev/null || true
  psql_db -v ON_ERROR_STOP=1 -q -c "delete from public.availability_blocks where reason = 'RACE_TEST'; delete from public.bookings where guest_profile_id in ('$guest_a', '$guest_b'); delete from auth.users where id in ('$guest_a', '$guest_b');" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT

psql_db() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" "$@"
  else
    docker exec -i supabase_db_directstay-mobile psql -U postgres -d postgres "$@"
  fi
}

psql_db -v ON_ERROR_STOP=1 -q -c "insert into auth.users (id, email) values ('$guest_a','race-a@example.test'), ('$guest_b','race-b@example.test') on conflict (id) do nothing; delete from public.bookings where guest_profile_id in ('$guest_a', '$guest_b');"

start_booking() {
  local guest="$1" name="$2" log="$3"
  psql_db -v ON_ERROR_STOP=1 -q >"$log" 2>&1 <<SQL
begin;
set local statement_timeout = '12s';
set local role authenticated;
set local request.jwt.claims = '{"sub":"$guest","role":"authenticated"}';
select (public.create_booking('ayni-hospitality', '$unit_id', current_date + 400, current_date + 402, 2, '$name', '$name@example.test', null)).id;
select pg_sleep(2);
commit;
SQL
}

# Two independent psql processes overlap: A holds the transaction's unit lock while B
# enters create_booking. Exactly one must commit and the other must report unavailable.
start_booking "$guest_a" RaceA "$tmp/booking-a.log" & pid_a=$!
sleep 0.25
start_booking "$guest_b" RaceB "$tmp/booking-b.log" & pid_b=$!
status_a=0; wait "$pid_a" || status_a=$?; pid_a=""
status_b=0; wait "$pid_b" || status_b=$?; pid_b=""
if [[ $(( (status_a == 0) + (status_b == 0) )) -ne 1 ]]; then
  cat "$tmp/booking-a.log" "$tmp/booking-b.log"
  echo "Expected exactly one booking transaction to commit (statuses $status_a/$status_b)." >&2
  exit 1
fi
if ! rg -q 'unit_unavailable' "$tmp/booking-a.log" "$tmp/booking-b.log"; then
  echo "Losing booking transaction did not report unit_unavailable." >&2
  cat "$tmp/booking-a.log" "$tmp/booking-b.log"
  exit 1
fi
claims="$(psql_db -At -v ON_ERROR_STOP=1 -c "select count(*) from public.bookings where unit_id='$unit_id' and check_in=current_date + 400 and status='PENDING_PAYMENT' and hold_expires_at > now() and guest_profile_id in ('$guest_a','$guest_b');")"
[[ "$claims" == 1 ]] || { echo "Expected one persisted live claim; found $claims." >&2; exit 1; }
echo "PASS booking race: two independent PostgreSQL connections, one hold, one unit_unavailable, one persisted claim."

# Race a second booking against an administrative block insert on the same unit and dates.
# The admin connection blocks behind the booking's unit lock and then sees its committed row.
psql_db -v ON_ERROR_STOP=1 -q >"$tmp/block-booking.log" 2>&1 <<SQL & pid_a=$!
begin;
set local statement_timeout = '12s';
set local role authenticated;
set local request.jwt.claims = '{"sub":"$guest_a","role":"authenticated"}';
select (public.create_booking('ayni-hospitality', '$unit_id', current_date + 410, current_date + 412, 2, 'RaceA', 'racea@example.test', null)).id;
select pg_sleep(2);
commit;
SQL
sleep 0.25
status_block=0
psql_db -v ON_ERROR_STOP=1 -q >"$tmp/block-insert.log" 2>&1 <<SQL || status_block=$?
set statement_timeout = '12s';
insert into public.availability_blocks (unit_id, check_in, check_out, reason)
values ('$unit_id', current_date + 410, current_date + 412, 'RACE_TEST');
SQL
status_book=0; wait "$pid_a" || status_book=$?; pid_a=""
if [[ $status_book -ne 0 || $status_block -eq 0 ]] || ! rg -q 'unit_unavailable' "$tmp/block-insert.log"; then
  cat "$tmp/block-booking.log" "$tmp/block-insert.log"
  echo "Booking/block race did not serialize and reject the overlapping block." >&2
  exit 1
fi
echo "PASS booking/block race: independent PostgreSQL connections serialized on the unit lock."
