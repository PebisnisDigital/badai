-- LOOP is a PL/pgSQL keyword; quote this record field when evaluating schedules.
create or replace function public.wa_channel_tick() returns integer language plpgsql security definer set search_path='' as $$
declare s public.wa_channel_settings; sl public.wa_channel_calendar_slots; today date; elapsed integer; due timestamptz; count_jobs integer:=0; job uuid;
begin
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  if not exists(select 1 from public.wa_marketing_live_settings where singleton and enabled and scheduler_enabled) then return 0; end if;
  for s in select * from public.wa_channel_settings where enabled order by id for update loop
    today:=(clock_timestamp() at time zone s.timezone)::date; elapsed:=today-s.start_date;
    if elapsed<0 then continue; end if;
    if not s."loop" and elapsed>=s.duration_days then
      update public.wa_channel_settings set enabled=false,version=version+1,updated_at=clock_timestamp() where id=s.id;
      continue;
    end if;
    for sl in select * from public.wa_channel_calendar_slots where settings_id=s.id and day_number=elapsed%s.duration_days+1 loop
      due:=(today+sl.send_time) at time zone s.timezone;
      -- Never flood old slots after downtime or on first activation.
      if due>clock_timestamp() or due<greatest(s.activated_at,clock_timestamp()-interval '5 minutes') then continue; end if;
      begin
        job:=badai_channel.enqueue(s.id,sl.day_number,sl.send_time,today);
        if job is not null then count_jobs:=count_jobs+1; end if;
      exception when others then
        -- Gate/verification failures leave the schedule intact; no provider call.
        continue;
      end;
    end loop;
  end loop;
  return count_jobs;
end $$;

create or replace function public.wa_group_tick() returns integer language plpgsql security definer set search_path='' as $$
declare s public.wa_group_settings; sl public.wa_group_calendar_slots; today date; elapsed integer; due timestamptz; count_jobs integer:=0; job uuid;
begin
  perform 1 from public.wa_marketing_live_settings where singleton for update;
  if not exists(select 1 from public.wa_marketing_live_settings where singleton and enabled and scheduler_enabled) then return 0; end if;
  for s in select * from public.wa_group_settings where enabled order by id for update loop
    today:=(clock_timestamp() at time zone s.timezone)::date; elapsed:=today-s.start_date;
    if elapsed<0 then continue; end if;
    if not s."loop" and elapsed>=s.duration_days then
      update public.wa_group_settings set enabled=false,version=version+1,updated_at=clock_timestamp() where id=s.id;
      continue;
    end if;
    for sl in select * from public.wa_group_calendar_slots where settings_id=s.id and day_number=elapsed%s.duration_days+1 loop
      due:=(today+sl.send_time) at time zone s.timezone;
      -- Never flood old slots after downtime or on first activation.
      if due>clock_timestamp() or due<greatest(s.activated_at,clock_timestamp()-interval '5 minutes') then continue; end if;
      begin
        job:=badai_group.enqueue(s.id,sl.day_number,sl.send_time,today);
        if job is not null then count_jobs:=count_jobs+1; end if;
      exception when others then
        -- Gate/verification failures leave the schedule intact; no provider call.
        continue;
      end;
    end loop;
  end loop;
  return count_jobs;
end $$;

-- Check schedules in Postgres; an empty queue must not invoke an Edge Function.
-- All existing publication/verification gates remain in the enqueue/claim APIs.
create index wa_channel_active_leases on public.wa_channel_delivery_logs(lease_until)
  where status in ('preparing','dispatching');
create index wa_group_active_leases on public.wa_group_delivery_logs(lease_until)
  where status in ('preparing','dispatching');
create schema badai_wa_scheduler;
revoke all on schema badai_wa_scheduler from public,anon,authenticated;
grant usage on schema badai_wa_scheduler to service_role;

-- One shared HTTP wake-up lease prevents duplicate calls while a request waits
-- in pg_net or while another worker is still preparing/sending a message.
create table badai_wa_scheduler.wakeup (
  singleton boolean primary key default true check(singleton),
  family text check(family in ('live','channel','group')),
  request_id bigint,
  requested_at timestamptz,
  retry_after timestamptz not null default '-infinity'
);
alter table badai_wa_scheduler.wakeup enable row level security;
revoke all on badai_wa_scheduler.wakeup from public,anon,authenticated;
grant all on badai_wa_scheduler.wakeup to service_role;
create policy scheduler_service_only on badai_wa_scheduler.wakeup
  for all to service_role using(true) with check(true);
insert into badai_wa_scheduler.wakeup(singleton) values(true);

create function badai_wa_scheduler.dispatch()
returns integer language plpgsql security definer set search_path='' as $$
declare cfg public.wa_marketing_live_settings; wake badai_wa_scheduler.wakeup;
  chosen_family text; endpoint text; http_status integer; outbound_id bigint;
begin
  if not pg_try_advisory_xact_lock(728401,150901) then return 0; end if;
  -- Match the workers' lock order, so gates and the shared send throttle cannot
  -- change while a wake-up is being selected.
  select * into cfg from public.wa_marketing_live_settings where singleton for update;
  if not found then return 0; end if;

  -- Expire abandoned leases without waking a worker just to do housekeeping.
  -- The legacy claim API returns immediately after recovering an expired job;
  -- it never starts another job in that recovery branch.
  if cfg.active_job_id is not null and exists(
    select 1 from public.wa_marketing_live_jobs where id=cfg.active_job_id
      and status in ('preparing','dispatching') and lease_until<=clock_timestamp()
  ) then
    perform public.wa_live_claim();
    select * into cfg from public.wa_marketing_live_settings where singleton;
  end if;
  update public.wa_channel_delivery_logs set
    status=case when status='dispatching' then 'unknown' else 'failed' end,
    error_code=case when status='dispatching' then 'provider_outcome_uncertain' else 'preparation_expired' end,
    claim_token=null,lease_until=null,updated_at=clock_timestamp()
    where status in ('preparing','dispatching') and lease_until<=clock_timestamp();
  update public.wa_group_delivery_logs set
    status=case when status='dispatching' then 'unknown' else 'failed' end,
    error_code=case when status='dispatching' then 'provider_outcome_uncertain' else 'preparation_expired' end,
    claim_token=null,lease_until=null,updated_at=clock_timestamp()
    where status in ('preparing','dispatching') and lease_until<=clock_timestamp();
  update public.wa_channel_delivery_logs set status='cancelled',error_code='slot_expired',updated_at=clock_timestamp()
    where status='queued' and request_key is null and created_at<clock_timestamp()-interval '5 minutes';
  update public.wa_group_delivery_logs set status='cancelled',error_code='slot_expired',updated_at=clock_timestamp()
    where status='queued' and request_key is null and created_at<clock_timestamp()-interval '5 minutes';

  -- Tick inserts only verified, activated, due slots. Its occurrence keys make
  -- repeated SQL checks and the existing worker-side tick idempotent.
  if cfg.enabled and cfg.scheduler_enabled then
    perform public.wa_channel_tick();
    perform public.wa_group_tick();
  end if;
  if cfg.active_job_id is not null or cfg.next_send_at>clock_timestamp()
    or exists(select 1 from public.wa_channel_delivery_logs where status in ('preparing','dispatching'))
    or exists(select 1 from public.wa_group_delivery_logs where status in ('preparing','dispatching')) then return 0; end if;

  select candidate.family into chosen_family from (
    select 'live'::text as family,j.send_after as due,j.id from public.wa_marketing_live_jobs j
      join public.wa_marketing_live_runs r on r.id=j.run_id
      where j.status='queued' and j.send_after<=clock_timestamp() and r.status='active'
        and ((r.mode='test' and cfg.testing_enabled) or (r.mode='single' and cfg.enabled)
          or (r.mode='scheduled' and cfg.enabled and cfg.scheduler_enabled))
    union all
    select 'channel',j.created_at,j.id from public.wa_channel_delivery_logs j
      where j.status='queued' and (j.is_test or (cfg.enabled and cfg.scheduler_enabled))
    union all
    select 'group',j.created_at,j.id from public.wa_group_delivery_logs j
      where j.status='queued' and (j.is_test or (cfg.enabled and cfg.scheduler_enabled))
  ) candidate order by candidate.due,candidate.id limit 1;
  if chosen_family is null then return 0; end if;

  select * into wake from badai_wa_scheduler.wakeup where singleton for update;
  if wake.request_id is not null and wake.retry_after>clock_timestamp() then
    select r.status_code into http_status from net._http_response r where r.id=wake.request_id;
    -- A completed 2xx request releases the wake-up lease. Failed/missing HTTP
    -- responses wait three minutes; they cannot trigger a 15-second retry storm.
    if http_status is null or http_status not between 200 and 299 then return 0; end if;
  end if;

  endpoint:=case chosen_family when 'live' then 'badai-wa-send' when 'channel' then 'badai-wa-channel' else 'badai-wa-group' end;
  select net.http_post(
    url:='https://tlvxlekqrllkvcpgwmic.supabase.co/functions/v1/'||endpoint,
    headers:=public.wa_live_issue_worker_token(),body:='{"action":"worker"}'::jsonb,timeout_milliseconds:=120000
  ) into outbound_id;
  update badai_wa_scheduler.wakeup set family=chosen_family,request_id=outbound_id,
    requested_at=clock_timestamp(),retry_after=clock_timestamp()+interval '3 minutes' where singleton;
  return 1;
end $$;
revoke all on function badai_wa_scheduler.dispatch() from public,anon,authenticated;
grant execute on function badai_wa_scheduler.dispatch() to service_role;

-- Replace all three unconditional HTTP loops atomically. Test/publication flags
-- are deliberately preserved: explicit test sends still work, idle tests cost 0.
do $$ declare j record; begin
  for j in select jobid from cron.job where jobname in
    ('badai-wa-live-worker','badai-wa-channel-worker','badai-wa-group-worker') loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;
select cron.schedule('badai-wa-dispatcher','15 seconds',$cron$
  select badai_wa_scheduler.dispatch();
$cron$);
